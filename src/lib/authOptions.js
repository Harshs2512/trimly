import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { normalizeEmail } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { ensureIndexes } from "@/lib/indexes";

const providers = [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = normalizeEmail(credentials?.email);
      const password = credentials?.password || "";
      if (!email || !password) return null;

      try {
        await ensureIndexes();
      } catch (err) {
        console.warn("[auth] ensureIndexes warning during authorize:", err);
      }
      const limiter = await rateLimit(`login:${email}`, 10, 15 * 60 * 1000);
      if (!limiter.allowed) throw new Error("Too many login attempts. Please try again later.");

      const db = await getDb();
      const user = await db.collection("users").findOne({ email });
      if (!user || user.active === false || !user.password) return null;

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return null;

      if (user.emailVerified === false) return null;

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role || "user",
        active: user.active !== false,
        sessionVersion: user.sessionVersion || 0,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: normalizeEmail(profile.email),
          image: profile.picture,
          role: "user",
          active: true,
          sessionVersion: 0,
        };
      },
    })
  );
}

export const authOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user?.email) return false;
      try {
        await ensureIndexes();
      } catch (err) {
        console.warn("[auth] ensureIndexes warning during signIn:", err);
      }

      const db = await getDb();
      const email = normalizeEmail(user.email);
      let existing = await db.collection("users").findOne({ email });
      if (existing?.active === false) return false;

      if (account?.provider === "google") {
        if (profile?.email_verified === false) return false;

        const now = new Date();
        await db.collection("users").updateOne(
          { email },
          {
            $setOnInsert: {
              name: user.name || email.split("@")[0],
              email,
              image: user.image || null,
              role: "user",
              active: true,
              sessionVersion: 0,
              authProvider: "google",
              createdAt: now,
            },
            $set: {
              emailVerified: true,
              emailVerifiedAt: now,
              updatedAt: now,
            },
          },
          { upsert: true },
        );
        existing = await db.collection("users").findOne({ email });
      }

      if (!existing) return false;

      user.id = existing._id.toString();
      user.role = existing.role || "user";
      user.active = existing.active !== false;
      user.sessionVersion = existing.sessionVersion || 0;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || "user";
        token.active = user.active !== false;
        token.sessionVersion = user.sessionVersion || 0;
        token.invalidated = false;
      }

      if (!token.email && !token.id) return token;

      try {
        const db = await getDb();
        const query = token.id && /^[0-9a-fA-F]{24}$/.test(String(token.id))
          ? { _id: new ObjectId(String(token.id)) }
          : { email: normalizeEmail(token.email) };
        const current = await db.collection("users").findOne(query, {
          projection: { name: 1, email: 1, role: 1, active: 1, sessionVersion: 1 },
        });

        if (!current) {
          token.active = false;
          token.invalidated = true;
          return token;
        }

        const currentVersion = current.sessionVersion || 0;
        const tokenVersion = token.sessionVersion || 0;
        if (currentVersion !== tokenVersion) {
          token.active = false;
          token.invalidated = true;
          return token;
        }

        token.id = current._id.toString();
        token.name = current.name;
        token.email = current.email;
        token.role = current.role || "user";
        token.active = current.active !== false;
        token.invalidated = current.active === false;
      } catch (error) {
        console.error("[auth] Failed to refresh user authorization state", error);
        token.active = false;
        token.invalidated = true;
      }

      return token;
    },
    async session({ session, token }) {
      if (session?.user && token) {
        session.user.id = token.id;
        session.user.name = token.name || session.user.name;
        session.user.email = token.email || session.user.email;
        session.user.role = token.role || "user";
        session.user.active = token.active !== false;
        session.user.invalidated = token.invalidated === true;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default authOptions;
