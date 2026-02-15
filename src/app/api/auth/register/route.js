import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { userSchema } from "@/lib/validations";

export async function POST(req) {
  try {
    const body = await req.json();

    // Validate request body
    const validation = userSchema.safeParse(body);
    if (!validation.success) {
      return Response.json({ error: validation.error.format() }, { status: 400 });
    }

    const { name, email, password, role } = validation.data;

    const client = await clientPromise;
    const db = client.db("trimly");

    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser)
      return Response.json({ message: "User already exists" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.collection("users").insertOne({
      name,
      email,
      password: hashedPassword,
      role: role || "user",
      createdAt: new Date(),
    });

    return Response.json({ message: "User registered successfully" }, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
