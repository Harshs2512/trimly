import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { userSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "global-ip";
    const isAllowed = rateLimit(ip, 5, 15 * 60 * 1000); // 5 attempts per 15 mins
    if (!isAllowed) {
      return Response.json({ error: "Too many registration attempts. Please try again later." }, { status: 429 });
    }

    const body = await req.json();

    // Validate request body
    const validation = userSchema.safeParse(body);
    if (!validation.success) {
      return Response.json({ error: validation.error.format() }, { status: 400 });
    }

    const { name, email, password, role: requestedRole } = validation.data;

    // Security Fix (Item 4): Hardcode allowed roles. Prevent privilege escalation to "admin".
    const allowedRoles = ["user", "barber"];
    const safeRole = allowedRoles.includes(requestedRole) ? requestedRole : "user";

    const client = await clientPromise;
    const db = client.db("trimly");

    const existingUser = await db.collection("users").findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return Response.json({ message: "User already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.collection("users").insertOne({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: safeRole,
      createdAt: new Date(),
    });

    return Response.json({ message: "User registered successfully" }, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
