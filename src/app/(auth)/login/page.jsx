"use client";

import { useEffect, useState, Suspense } from "react";
import { getProviders, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams ? searchParams.get("error") : null;
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [devVerificationLink, setDevVerificationLink] = useState("");

  useEffect(() => {
    getProviders().then((providers) => setGoogleEnabled(Boolean(providers?.google))).catch(() => setGoogleEnabled(false));
    if (authError) {
      if (authError === "OAuthSignin" || authError === "OAuthCallback" || authError === "Callback") {
        setError("Sign in with Google encountered an issue. Please try again.");
      } else if (authError !== "CredentialsSignin") {
        setError(authError);
      }
    }
  }, [authError]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsLoading(true); setError(""); setMessage(""); setDevVerificationLink("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    try {
      if (!isRegister) {
        const result = await signIn("credentials", { redirect: false, email, password });
        if (result?.error) throw new Error("Unable to sign in. Check your credentials or account status.");
        router.push("/dashboard");
        router.refresh();
        return;
      }

      const firstName = String(form.get("firstName") || "").trim();
      const lastName = String(form.get("lastName") || "").trim();
      const confirmPassword = String(form.get("confirmPassword") || "");
      const role = String(form.get("role") || "user");
      if (password !== confirmPassword) throw new Error("Passwords do not match.");

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${firstName} ${lastName}`.trim(), email, password, role }),
      });
      const data = await response.json();
      if (!response.ok) {
        const text = typeof data.error === "string" ? data.error : data.error?.fieldErrors ? Object.values(data.error.fieldErrors).flat().join(" ") : "Registration failed.";
        throw new Error(text || "Registration failed.");
      }
      setMessage(data.message || "Account created. Check your email to verify the account before signing in.");
      if (data.developmentVerificationUrl) setDevVerificationLink(data.developmentVerificationUrl);
      setIsRegister(false);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally { setIsLoading(false); }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-900 border-r flex-col justify-end">
        <Image src="/auth-bg.png" alt="Premium barbershop interior" fill priority className="object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/40 to-transparent" />
        <div className="relative z-10 p-12 pb-16 space-y-6"><h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">Appointment requests with <span className="text-primary">clear availability and status.</span></h1><p className="text-zinc-300 text-lg max-w-md">Customers choose validated times. Barbers control confirmations, services and booking rules.</p><div className="space-y-3 text-zinc-300"><Point text="Server-validated available slots" /><Point text="Pending, confirmed and completed booking states" /><Point text="Protected customer, barber and admin workspaces" /></div></div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8"><h2 className="text-3xl font-bold">{isRegister ? "Create an account" : "Welcome back"}</h2><p className="mt-2 text-sm text-muted-foreground">{isRegister ? "Register as a customer or barber." : "Sign in to access your dashboard."}</p></div>
          <div className="bg-card border rounded-2xl shadow-sm p-8">
            <Tabs value={isRegister ? "register" : "login"} onValueChange={(value) => { setIsRegister(value === "register"); setError(""); setMessage(""); }}>
              <TabsList className="grid grid-cols-2 mb-8"><TabsTrigger value="login">Login</TabsTrigger><TabsTrigger value="register">Register</TabsTrigger></TabsList>
              {message && <div className="mb-5 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-700" role="status">{message}{devVerificationLink && <Link href={devVerificationLink} className="mt-2 block font-medium underline">Open development verification link</Link>}</div>}
              {error && <div className="mb-5 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-700" role="alert">{error}</div>}

              <TabsContent value="login"><form onSubmit={handleSubmit} className="space-y-5"><EmailField /><PasswordField id="login-password" show={showPassword} toggle={() => setShowPassword((value) => !value)} /><div className="flex flex-wrap justify-between gap-2"><Link href="/resend-verification" className="text-xs text-primary hover:underline">Resend verification email</Link><Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link></div><Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? "Signing in..." : "Sign In"}</Button></form></TabsContent>

              <TabsContent value="register"><form onSubmit={handleSubmit} className="space-y-5"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="firstName">First Name</Label><Input id="firstName" name="firstName" required maxLength={60} /></div><div className="space-y-2"><Label htmlFor="lastName">Last Name</Label><Input id="lastName" name="lastName" required maxLength={60} /></div></div><EmailField /><div className="space-y-2"><Label htmlFor="role">Account Type</Label><select id="role" name="role" className="w-full h-10 rounded-md border bg-background px-3"><option value="user">Customer</option><option value="barber">Barber / Shop Owner</option></select><p className="text-xs text-muted-foreground">Barber profiles require administrator verification before public booking.</p></div><PasswordField id="register-password" show={showPassword} toggle={() => setShowPassword((value) => !value)} /><div className="space-y-2"><Label htmlFor="confirmPassword">Confirm Password</Label><Input id="confirmPassword" name="confirmPassword" type={showPassword ? "text" : "password"} minLength={8} required /></div><Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? "Creating account..." : "Create Account"}</Button></form></TabsContent>
            </Tabs>

            {googleEnabled && <><div className="my-6 flex items-center gap-4"><div className="h-px bg-border flex-1" /><span className="text-xs text-muted-foreground uppercase">or</span><div className="h-px bg-border flex-1" /></div><Button type="button" variant="outline" className="w-full" disabled={isLoading} onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>Continue with Google</Button></>}
          </div>
          <Link href="/" className="mt-6 block text-center text-sm text-muted-foreground hover:text-primary">Back to Trimlly</Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AuthPageContent />
    </Suspense>
  );
}

function Point({ text }) { return <div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /><span>{text}</span></div>; }
function EmailField() { return <div className="space-y-2"><Label htmlFor="email">Email Address</Label><Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></div>; }
function PasswordField({ id, show, toggle }) { return <div className="space-y-2"><Label htmlFor={id}>Password</Label><div className="relative"><Input id={id} name="password" type={show ? "text" : "password"} autoComplete={id.startsWith("login") ? "current-password" : "new-password"} minLength={8} required className="pr-11" /><button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>{!id.startsWith("login") && <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>}</div>; }
