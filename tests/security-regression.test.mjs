import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function packageLock() {
  return JSON.parse(read("package-lock.json"));
}

test("legacy custom JWT/Auth.js adapter implementation is removed", () => {
  assert.equal(fs.existsSync(path.join(root, "src/app/api/auth/login/route.js")), false);
  assert.equal(fs.existsSync(path.join(root, "src/lib/jwt.js")), false);
  const pkg = JSON.parse(read("package.json"));
  const lock = packageLock();
  assert.equal("jsonwebtoken" in pkg.dependencies, false);
  assert.equal("@auth/mongodb-adapter" in pkg.dependencies, false);
  assert.equal("node_modules/jsonwebtoken" in lock.packages, false);
  assert.equal("node_modules/@auth/mongodb-adapter" in lock.packages, false);
  assert.equal("node_modules/@auth/core" in lock.packages, false);
});

test("profile updates cannot accept role changes", () => {
  const profileRoute = read("src/app/api/users/profile/route.js");
  const validations = read("src/lib/validations.js");
  assert.match(profileRoute, /profileUpdateSchema/);
  const profileSchema = validations.match(/export const profileUpdateSchema = z\.object\(\{([\s\S]*?)\}\);/);
  assert.ok(profileSchema, "profile update schema should exist");
  assert.doesNotMatch(profileSchema[1], /\brole\b/);
});

test("new credential accounts require email verification and can resend", () => {
  const auth = read("src/lib/authOptions.js");
  const register = read("src/app/api/auth/register/route.js");
  const resend = read("src/app/api/auth/resend-verification/route.js");
  assert.match(auth, /user\.emailVerified === false/);
  assert.match(auth, /profile\?\.email_verified === false/);
  assert.match(auth, /emailVerified:\s*true/);
  assert.match(register, /emailVerified:\s*false/);
  assert.match(register, /sendVerificationEmail/);
  assert.match(resend, /GENERIC_MESSAGE/);
  assert.equal(fs.existsSync(path.join(root, "src/app/(auth)/resend-verification/page.jsx")), true);
});

test("booking creation derives identity/status and requires a verified barber", () => {
  const route = read("src/app/api/bookings/route.js");
  assert.match(route, /getActiveSession\(\)/);
  assert.match(route, /userId:\s*session\.user\.id/);
  assert.match(route, /status:\s*"pending"/);
  assert.match(route, /barber\.verificationStatus !== "verified"/);
  assert.doesNotMatch(route, /const\s*\{[^}]*\buserId\b[^}]*\}\s*=\s*validation\.data/);
});

test("booking updates use actor transitions, availability rules and atomic status preconditions", () => {
  const route = read("src/app/api/bookings/[id]/route.js");
  assert.match(route, /canTransition\(actor, existing\.status, status\)/);
  assert.match(route, /hasBookingConflict/);
  assert.match(route, /validateBookingWindow/);
  assert.match(route, /updateFields\.endTime/);
  assert.match(route, /status:\s*existing\.status/);
  assert.match(route, /scheduledEnd > now/);
  assert.match(route, /barber\.verificationStatus !== "verified"/);
});

test("booking window enforces exact aligned appointment times", () => {
  const booking = read("src/lib/booking.js");
  assert.match(booking, /parts\.second !== 0/);
  assert.match(booking, /start\.getMilliseconds\(\) !== 0/);
  assert.match(booking, /\(startMinutes - openMinutes\) % interval !== 0/);
});

test("barber ownership is protected and only verified profiles are public", () => {
  const list = read("src/app/api/barbers/route.js");
  const item = read("src/app/api/barbers/[id]/route.js");
  assert.match(list, /query\.verificationStatus = "verified"/);
  assert.match(list, /session\.user\.role !== "barber"/);
  assert.match(item, /session\.user\.role === "barber" && existing\.userId === session\.user\.id/);
  assert.match(item, /const isPublic = barber\.verificationStatus === "verified"/);
  assert.match(item, /cancelActiveBookingsForBarber/);
});

test("legacy booking barber identifiers are resolved to canonical profile IDs", () => {
  const list = read("src/app/api/bookings/route.js");
  const dashboard = read("src/app/dashboard/page.jsx");
  assert.match(list, /legacyBarberIdentifiers\(barber\)/);
  assert.match(list, /barberProfileId:/);
  assert.match(dashboard, /barberProfileId:/);
});

test("admin mutations protect the last admin and cancel invalidated account bookings", () => {
  const route = read("src/app/api/admin/users/[id]/route.js");
  assert.match(route, /acquireMongoLock/);
  assert.match(route, /last active administrator/i);
  assert.match(route, /cancelActiveBookingsForBarber/);
  assert.match(route, /cancelActiveBookingsForCustomer/);
  assert.match(route, /sessionVersion/);
});

test("state-changing custom APIs include cross-site request protection", () => {
  const required = [
    "src/app/api/admin/barbers/[id]/route.js",
    "src/app/api/admin/users/[id]/route.js",
    "src/app/api/auth/register/route.js",
    "src/app/api/auth/forgot-password/route.js",
    "src/app/api/auth/resend-verification/route.js",
    "src/app/api/auth/reset-password/route.js",
    "src/app/api/auth/verify-email/route.js",
    "src/app/api/barbers/[id]/route.js",
    "src/app/api/barbers/route.js",
    "src/app/api/bookings/[id]/route.js",
    "src/app/api/bookings/route.js",
    "src/app/api/notifications/route.js",
    "src/app/api/users/profile/route.js",
  ];
  for (const file of required) {
    assert.match(read(file), /rejectCrossSiteRequest/, `${file} should reject cross-site mutations`);
  }
});

test("public barber directory uses escaped server-side search and bounded pagination", () => {
  const route = read("src/app/api/barbers/route.js");
  const page = read("src/app/barbers/page.jsx");
  assert.match(route, /escapeRegex\(search\)/);
  assert.match(route, /parsePagination/);
  assert.match(route, /\.skip\(skip\)\.limit\(limit\)/);
  assert.match(page, /response\.data\.pagination/);
  assert.match(page, /PAGE_SIZE = 24/);
});

test("public navigation has no placeholder hash-only links", () => {
  const navbar = read("src/components/Navbar.jsx");
  const footer = read("src/components/Footer.tsx");
  assert.doesNotMatch(navbar, /href=["']#["']/);
  assert.doesNotMatch(footer, /href=["']#["']/);
});

test("database indexes include ownership, reservation, token and lock protection", () => {
  const indexes = read("src/lib/indexes.js");
  assert.match(indexes, /uniq_users_email/);
  assert.match(indexes, /uniq_barber_owner/);
  assert.match(indexes, /uniq_barber_active_minutes/);
  assert.match(indexes, /uniq_user_active_minutes/);
  assert.match(indexes, /uniq_password_reset_token/);
  assert.match(indexes, /uniq_email_verification_token/);
  assert.match(indexes, /system_lock_ttl/);
});

test("package-lock direct dependencies match package.json", () => {
  const pkg = JSON.parse(read("package.json"));
  const lock = packageLock();
  assert.deepEqual(lock.packages[""].dependencies, pkg.dependencies);
  assert.deepEqual(lock.packages[""].devDependencies, pkg.devDependencies);
});

test("availability expires stale requests and validates calendar dates", () => {
  const route = read("src/app/api/barbers/[id]/availability/route.js");
  assert.match(route, /ensureIndexes\(\)/);
  assert.match(route, /expirePendingBookings\(db/);
  assert.match(route, /normalizedDate !== date/);
  assert.match(route, /nextDateString/);
});

test("booking list returns pagination metadata and resolves customer IDs", () => {
  const route = read("src/app/api/bookings/route.js");
  assert.match(route, /countDocuments\(filter\)/);
  assert.match(route, /userIds = \[\.\.\.new Set\(bookings\.map/);
  assert.match(route, /pagination: \{ total, page:/);
});

test("authorization refresh fails closed on database errors", () => {
  const auth = read("src/lib/authOptions.js");
  assert.match(auth, /Failed to refresh user authorization state/);
  assert.match(auth, /token\.active = false/);
  assert.match(auth, /token\.invalidated = true/);
});
