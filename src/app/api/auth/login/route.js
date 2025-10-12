// app/api/auth/login/route.js
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { sign } from "@/lib/jwt";

export async function POST(request) {
  const { email, password } = await request.json();
  if (!email || !password) return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });

  const client = await clientPromise;
  const db = client.db();
  const users = db.collection("users");

  const user = await users.findOne({ email });
  if (!user) return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });

  const token = sign({ id: user._id.toString(), role: user.role, name: user.name });
  return new Response(JSON.stringify({ token, user: { name: user.name, email: user.email, role: user.role } }), { status: 200 });
}
