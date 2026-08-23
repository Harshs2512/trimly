import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function getActiveSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  if (session.user.active === false || session.user.invalidated === true) return null;
  return session;
}

export async function getSessionWithRole(roles = []) {
  const session = await getActiveSession();
  if (!session) return { session: null, error: Response.json({ error: "Not authenticated" }, { status: 401 }) };
  if (roles.length && !roles.includes(session.user.role)) {
    return { session: null, error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, error: null };
}
