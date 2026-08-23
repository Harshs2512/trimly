"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function verify() {
    if (!email || !token) {
      setStatus("error");
      setMessage("The verification link is incomplete.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to verify this email.");
      setStatus("success");
      setMessage(data.message || "Email verified successfully.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to verify this email.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm text-center space-y-5">
        <div><h1 className="text-3xl font-bold">Verify your email</h1><p className="mt-2 text-sm text-muted-foreground">Confirm the email address used for your Trimlly account.</p></div>
        {message && <div role="status" className={`rounded-lg border p-3 text-sm ${status === "success" ? "bg-green-500/10 border-green-500/20 text-green-700" : "bg-red-500/10 border-red-500/20 text-red-700"}`}>{message}</div>}
        {status !== "success" ? <Button className="w-full" onClick={verify} disabled={status === "loading" || !email || !token}>{status === "loading" ? "Verifying..." : "Verify Email"}</Button> : <Link href="/login"><Button className="w-full">Sign In</Button></Link>}
        <div className="space-y-2"><Link href="/login" className="block text-sm text-muted-foreground hover:text-primary">Back to login</Link>{status === "error" && <Link href="/resend-verification" className="block text-sm text-primary hover:underline">Request a new verification link</Link>}</div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}><VerifyEmailContent /></Suspense>;
}
