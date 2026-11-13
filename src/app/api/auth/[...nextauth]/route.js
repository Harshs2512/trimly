import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";

// Ensure NEXTAUTH_URL defaults to the canonical domain on Vercel so OAuth redirect_uri
// matches the Authorized Redirect URIs registered in Google Cloud Console.
if (
  (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.includes(".vercel.app")) &&
  (process.env.NODE_ENV === "production" || process.env.VERCEL)
) {
  process.env.NEXTAUTH_URL = "https://trimlly.solvantis.in";
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

