"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const urlEmail = searchParams.get("email") || "";
  const urlToken = searchParams.get("token") || searchParams.get("code") || "";

  const [email, setEmail] = useState(urlEmail);
  const [token, setToken] = useState(urlToken);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (urlEmail) setEmail(urlEmail);
    if (urlToken) setToken(urlToken);

    // Auto-verify if both are present in URL on mount
    if (urlEmail && urlToken) {
      verifyCode(urlEmail, urlToken);
    }
  }, [urlEmail, urlToken]);

  async function verifyCode(emailToVerify, tokenToVerify) {
    const e = (emailToVerify || email).trim();
    const t = (tokenToVerify || token).trim();

    if (!e || !t) {
      setStatus("error");
      setMessage("Please enter both your email and the verification code.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, token: t, code: t }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : typeof data.message === "string"
            ? data.message
            : "Invalid or expired verification code."
        );
      }
      setStatus("success");
      setMessage(data.message || "Email verified successfully!");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to verify this email.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm text-center space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verify your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Confirm your email address to activate your Trimly account.
          </p>
        </div>

        {status === "success" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-5 text-green-700">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 text-2xl font-bold text-green-600">
                ✓
              </div>
              <p className="font-semibold text-base">{message}</p>
              <p className="mt-1 text-xs text-green-600">Your account is now fully active.</p>
            </div>
            <Link href="/login" className="block">
              <Button className="w-full py-6 text-base font-semibold">
                Sign In to Trimly
              </Button>
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyCode();
            }}
            className="space-y-4 text-left"
          >
            {message ? (
              <div
                role="status"
                className={`rounded-lg border p-3 text-sm text-center ${
                  status === "error"
                    ? "bg-red-500/10 border-red-500/20 text-red-600 font-medium"
                    : "bg-blue-500/10 border-blue-500/20 text-blue-700"
                }`}
              >
                {message}
              </div>
            ) : null}

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@gmail.com"
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                6-Digit Code or Verification Token
              </label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter 6-digit code from email"
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm tracking-widest font-mono text-center outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <Button
              type="submit"
              className="w-full py-6 text-base font-semibold mt-2"
              disabled={status === "loading" || !email.trim() || !token.trim()}
            >
              {status === "loading" ? "Verifying..." : "Verify Email"}
            </Button>

            <div className="space-y-2 text-center pt-2">
              <Link
                href="/login"
                className="block text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Back to login
              </Link>
              <Link
                href="/resend-verification"
                className="block text-sm text-primary hover:underline font-medium"
              >
                Request a new verification code
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}><VerifyEmailContent /></Suspense>;
}
