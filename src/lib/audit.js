export async function writeAuditLog(db, { actorId, action, targetType, targetId, metadata = {} }) {
  try {
    await db.collection("audit_logs").insertOne({
      actorId,
      action,
      targetType,
      targetId: String(targetId),
      metadata,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("[audit] Failed to write audit log", error);
  }
}
