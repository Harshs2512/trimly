"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devLink, setDevLink] = useState("");

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    setDevLink("");

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        const text = typeof data.error === "string"
          ? data.error
          : data.error?.fieldErrors
            ? Object.values(data.error.fieldErrors).flat().join(" ")
            : "Unable to send a verification email.";
        throw new Error(text || "Unable to send a verification email.");
      }
      setMessage(data.message || "If the account needs verification, a new link has been sent.");
      if (data.developmentVerificationUrl) setDevLink(data.developmentVerificationUrl);
    } catch (err) {
      setError(err.message || "Unable to send a verification email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Resend verification email</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter the email used for your Trimlly account.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          {message && <p className="text-sm text-green-600" role="status">{message}</p>}
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          {devLink && <Link className="text-sm text-primary underline break-all" href={devLink}>Open development verification link</Link>}
          <Button className="w-full" disabled={loading}>{loading ? "Sending..." : "Send verification link"}</Button>
        </form>
        <Link href="/login" className="mt-6 block text-center text-sm text-primary hover:underline">Back to sign in</Link>
      </div>
    </div>
  );
}
