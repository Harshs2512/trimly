import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const { name, email, password, role } = await req.json();

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

    return Response.json({ message: "User registered successfully" });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
