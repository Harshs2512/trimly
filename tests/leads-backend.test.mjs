import test from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import fs from "node:fs";
import path from "node:path";

// Load environment from .env.local if present
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

import clientPromise, { getDb } from "../src/lib/mongodb.js";
import { ensureIndexes } from "../src/lib/indexes.js";
import {
  leadCreateSchema,
  leadEventSchema,
  leadAdminUpdateSchema,
  INDIAN_PHONE_REGEX,
} from "../src/lib/validations.js";
import {
  normalizeIndianPhone,
  hashIp,
  createOrDedupeLead,
} from "../src/lib/leads.js";
import { rejectCrossSiteRequest } from "../src/lib/api.js";
import { rateLimit } from "../src/lib/rateLimit.js";

const TEST_RUN = `lead_test_${Date.now().toString(36)}`;

test("Leads Backend System Test: Validation, Deduplication, Security & Lifecycle", async (t) => {
  const db = await getDb();
  await ensureIndexes();

  await t.test("1. Zod Validation & Phone Normalization", () => {
    // Valid customer lead
    const validCustomer = leadCreateSchema.safeParse({
      type: "customer",
      name: "Aman Sharma",
      phone: "9876543210",
      city: "Indore",
      interest: "Haircut & Beard Styling",
      consent: true,
    });
    assert.equal(validCustomer.success, true);
    assert.equal(validCustomer.data.type, "customer");

    // Valid owner lead with +91
    const validOwner = leadCreateSchema.safeParse({
      type: "owner",
      name: "Vikram Salon",
      phone: "+919876543210",
      city: "Bhopal",
      interest: "4 styling chairs",
      consent: true,
    });
    assert.equal(validOwner.success, true);
    assert.equal(validOwner.data.type, "owner");

    // Invalid phone number: too short
    const invalidPhone = leadCreateSchema.safeParse({
      name: "Bad Phone",
      phone: "12345",
      city: "Delhi",
      consent: true,
    });
    assert.equal(invalidPhone.success, false);

    // Invalid phone number: does not start with 6-9
    const invalidPrefix = leadCreateSchema.safeParse({
      name: "Bad Prefix",
      phone: "5876543210",
      city: "Delhi",
      consent: true,
    });
    assert.equal(invalidPrefix.success, false);

    // Missing consent must fail
    const missingConsent = leadCreateSchema.safeParse({
      name: "No Consent",
      phone: "9876543210",
      city: "Indore",
      consent: false,
    });
    assert.equal(missingConsent.success, false);

    // Phone normalizations
    assert.equal(normalizeIndianPhone("9876543210"), "+919876543210");
    assert.equal(normalizeIndianPhone("09876543210"), "+919876543210");
    assert.equal(normalizeIndianPhone("+919876543210"), "+919876543210");
    assert.equal(normalizeIndianPhone("919876543210"), "+919876543210");
  });

  await t.test("2. Salted IP Hashing (No raw IP stored)", () => {
    const rawIp = "103.21.244.2";
    const hashed = hashIp(rawIp);
    assert.notEqual(hashed, rawIp);
    assert.equal(typeof hashed, "string");
    assert.equal(hashed.length, 32);
    // Deterministic with same salt
    assert.equal(hashIp(rawIp), hashed);
  });

  await t.test("3. Same-Origin & CSRF Defense", () => {
    // Cross-site request
    const crossSiteReq = new Request("https://trimly.in/api/leads", {
      headers: {
        "sec-fetch-site": "cross-site",
      },
    });
    const crossSiteError = rejectCrossSiteRequest(crossSiteReq);
    assert.ok(crossSiteError);
    assert.equal(crossSiteError.status, 403);

    // Valid same-origin request
    const sameOriginReq = new Request("https://trimly.in/api/leads", {
      headers: {
        origin: "https://trimly.in",
      },
    });
    const noError = rejectCrossSiteRequest(sameOriginReq);
    assert.equal(noError, null);
  });

  await t.test("4. 24-Hour Deduplication Logic", async () => {
    const testPhone = "+919999900001";
    const clientIp = "127.0.0.1";

    // Clean up any test records
    await db.collection("leads").deleteMany({ phone: testPhone });

    // Step A: First lead submission
    const firstSubmission = await createOrDedupeLead(
      db,
      {
        type: "customer",
        name: "First Lead",
        phone: testPhone,
        city: "Indore",
        interest: "Men's Haircut",
        message: "Need a slot this evening",
        source: "chatbot",
        page: "/barbers/city/indore",
        consent: true,
      },
      clientIp
    );

    assert.equal(firstSubmission.isDuplicate, false);
    assert.ok(firstSubmission.leadId);

    // Verify record in database
    const initialLead = await db.collection("leads").findOne({ _id: firstSubmission.leadId });
    assert.ok(initialLead);
    assert.equal(initialLead.phone, testPhone);
    assert.equal(initialLead.status, "new");
    assert.equal(initialLead.notes.length, 1);
    assert.equal(typeof initialLead.consent.ipHash, "string");
    assert.notEqual(initialLead.consent.ipHash, clientIp); // Salted hash, not raw IP

    // Step B: Second submission with same phone within 24h
    const secondSubmission = await createOrDedupeLead(
      db,
      {
        type: "customer",
        name: "First Lead Updated",
        phone: testPhone,
        city: "Indore",
        interest: "Beard Trim as well",
        message: "Also want beard grooming",
        source: "exit_intent",
        page: "/barbers",
        consent: true,
      },
      clientIp
    );

    assert.equal(secondSubmission.isDuplicate, true);
    assert.equal(String(secondSubmission.leadId), String(firstSubmission.leadId));

    // Verify count did NOT increase
    const count = await db.collection("leads").countDocuments({ phone: testPhone });
    assert.equal(count, 1, "Duplicate phone must not create an extra document within 24h");

    // Verify updated details
    const updatedLead = await db.collection("leads").findOne({ _id: firstSubmission.leadId });
    assert.ok(updatedLead.message.includes("Also want beard grooming"));
    assert.equal(updatedLead.notes.length, 2, "Second message appended to notes");

    // Clean up
    await db.collection("leads").deleteMany({ phone: testPhone });
  });

  await t.test("5. Rate Limiting Enforcement", async () => {
    const rateLimitKey = `test_limit_${TEST_RUN}`;

    // Should allow up to 3
    const res1 = await rateLimit(rateLimitKey, 3, 60000);
    assert.equal(res1.allowed, true);
    assert.equal(res1.remaining, 2);

    const res2 = await rateLimit(rateLimitKey, 3, 60000);
    assert.equal(res2.allowed, true);
    assert.equal(res2.remaining, 1);

    const res3 = await rateLimit(rateLimitKey, 3, 60000);
    assert.equal(res3.allowed, true);
    assert.equal(res3.remaining, 0);

    // 4th request must be blocked
    const res4 = await rateLimit(rateLimitKey, 3, 60000);
    assert.equal(res4.allowed, false);

    // Clean up
    await db.collection("rate_limits").deleteOne({ _id: rateLimitKey });
  });

  await t.test("6. Event Tracking Schema & Validation", async () => {
    // Valid event
    const validWhatsApp = leadEventSchema.safeParse({
      type: "whatsapp_click",
      page: "/for-barbers",
      source: "cta_button",
    });
    assert.equal(validWhatsApp.success, true);

    const validCall = leadEventSchema.safeParse({
      type: "call",
      page: "/contact",
    });
    assert.equal(validCall.success, true);

    // Invalid event type
    const invalidType = leadEventSchema.safeParse({
      type: "unsupported_action",
    });
    assert.equal(invalidType.success, false);

    // Test inserting event into DB
    const insertRes = await db.collection("lead_events").insertOne({
      type: "whatsapp_click",
      page: "/test",
      source: "web",
      createdAt: new Date(),
    });
    assert.ok(insertRes.insertedId);

    // Clean up
    await db.collection("lead_events").deleteOne({ _id: insertRes.insertedId });
  });

  await t.test("7. Admin Lead Management & DPDP Soft Delete", async () => {
    // Seed a lead for admin operations
    const leadId = new ObjectId();
    await db.collection("leads").insertOne({
      _id: leadId,
      type: "customer",
      name: "Admin Managed Lead",
      phone: "+919876500002",
      city: "Mumbai",
      interest: "Facial & Haircut",
      status: "new",
      notes: [],
      assignedTo: null,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 1. Validate Admin Update Schema
    const updateValid = leadAdminUpdateSchema.safeParse({
      status: "contacted",
      note: "Called customer, confirmed appointment for Saturday.",
      assignedTo: "admin_user_1",
    });
    assert.equal(updateValid.success, true);

    // 2. Apply status and note update
    const patchResult = await db.collection("leads").findOneAndUpdate(
      { _id: leadId },
      {
        $set: {
          status: "contacted",
          assignedTo: "admin_user_1",
          updatedAt: new Date(),
        },
        $push: {
          notes: {
            text: "Called customer, confirmed appointment for Saturday.",
            authorId: "admin_user_1",
            authorName: "Admin Vikram",
            at: new Date(),
          },
        },
      },
      { returnDocument: "after" }
    );

    assert.equal(patchResult.status, "contacted");
    assert.equal(patchResult.notes.length, 1);

    // 3. DPDP Erasure / Soft Delete
    const deleteResult = await db.collection("leads").findOneAndUpdate(
      { _id: leadId },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    assert.equal(deleteResult.isDeleted, true);

    // Active leads query must not include soft-deleted record
    const activeLead = await db.collection("leads").findOne({ _id: leadId, isDeleted: { $ne: true } });
    assert.equal(activeLead, null);

    // Clean up
    await db.collection("leads").deleteOne({ _id: leadId });
  });

  await t.test("8. Multi-Source Leads & Metrics Aggregations", async () => {
    const testIds = [];

    // Seed multiple leads with different sources
    const s1 = await db.collection("leads").insertOne({
      type: "customer",
      name: "Exit Intent Lead",
      phone: "+919876599901",
      city: "Indore",
      source: "exit_intent",
      status: "new",
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    testIds.push(s1.insertedId);

    const s2 = await db.collection("leads").insertOne({
      type: "owner",
      name: "Salon Owner Lead",
      phone: "+919876599902",
      city: "Bhopal",
      source: "contact_form",
      status: "qualified",
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    testIds.push(s2.insertedId);

    // Verify aggregation query matches sources
    const exitCount = await db.collection("leads").countDocuments({ source: "exit_intent", isDeleted: { $ne: true } });
    assert.ok(exitCount >= 1);

    const contactCount = await db.collection("leads").countDocuments({ source: "contact_form", isDeleted: { $ne: true } });
    assert.ok(contactCount >= 1);

    // Clean up test data
    await db.collection("leads").deleteMany({ _id: { $in: testIds } });
  });
});

