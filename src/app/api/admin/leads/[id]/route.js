import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getSessionWithRole } from "@/lib/authz";
import { json, rejectCrossSiteRequest, safeInternalError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { leadAdminUpdateSchema } from "@/lib/validations";

export async function PATCH(request, context) {
  try {
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;

    const { session, error } = await getSessionWithRole(["admin"]);
    if (error) return error;

    const params = await context.params;
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return json({ error: "Invalid lead ID" }, 400);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON payload" }, 400);
    }

    const parsed = leadAdminUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, 400);
    }

    const { status, assignedTo, note } = parsed.data;
    const db = await getDb();
    const collection = db.collection("leads");

    const updateSet = { updatedAt: new Date() };
    if (status !== undefined) updateSet.status = status;
    if (assignedTo !== undefined) updateSet.assignedTo = assignedTo;

    const updateOps = { $set: updateSet };

    if (note) {
      updateOps.$push = {
        notes: {
          text: note,
          authorId: session.user.id,
          authorName: session.user.name || "Admin",
          at: new Date(),
        },
      };
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id), isDeleted: { $ne: true } },
      updateOps,
      { returnDocument: "after" }
    );

    if (!result) {
      return json({ error: "Lead not found" }, 404);
    }

    await writeAuditLog(db, {
      actorId: session.user.id,
      action: "ADMIN_LEAD_UPDATE",
      targetType: "lead",
      targetId: id,
      metadata: { status, assignedTo, noteAdded: Boolean(note) },
    });

    return json({ success: true, lead: result });
  } catch (error) {
    return safeInternalError(error, "admin-lead-patch");
  }
}

export async function DELETE(request, context) {
  try {
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;

    const { session, error } = await getSessionWithRole(["admin"]);
    if (error) return error;

    const params = await context.params;
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return json({ error: "Invalid lead ID" }, 400);
    }

    const db = await getDb();
    const collection = db.collection("leads");

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return json({ error: "Lead not found" }, 404);
    }

    await writeAuditLog(db, {
      actorId: session.user.id,
      action: "ADMIN_LEAD_DELETE",
      targetType: "lead",
      targetId: id,
      metadata: { reason: "DPDP erasure request" },
    });

    return json({ success: true, message: "Lead erased successfully" });
  } catch (error) {
    return safeInternalError(error, "admin-lead-delete");
  }
}

