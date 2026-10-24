"use client";

import { useEffect, useState, Suspense } from "react";
import { getProviders, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, Sparkles } from "lucide-react";
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
  const [devCode, setDevCode] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");

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
    setIsLoading(true); setError(""); setMessage(""); setDevVerificationLink(""); setDevCode("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    try {
      if (!isRegister) {
        const result = await signIn("credentials", { redirect: false, email, password });
        if (result?.error) {
          throw new Error("Unable to sign in. Please verify your email or check your credentials.");
        }
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
      setRegisteredEmail(email);
      if (data.code) setDevCode(data.code);
      if (data.developmentVerificationUrl) setDevVerificationLink(data.developmentVerificationUrl);
      setMessage(data.message || "Account created! Check your email to verify your account.");
      setIsRegister(false);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally { setIsLoading(false); }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-900 border-r flex-col justify-end">
        <Image src="/auth-bg.png" alt="Premium barbershop interior" fill sizes="(max-width: 1024px) 100vw, 50vw" priority className="object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/40 to-transparent" />
        <div className="relative z-10 p-12 pb-16 space-y-6"><h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">Appointment requests with <span className="text-primary">clear availability and status.</span></h1><p className="text-zinc-300 text-lg max-w-md">Customers choose validated times. Barbers control confirmations, services and booking rules.</p><div className="space-y-3 text-zinc-300"><Point text="Server-validated available slots" /><Point text="Pending, confirmed and completed booking states" /><Point text="Protected customer, barber and admin workspaces" /></div></div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8"><h2 className="text-3xl font-bold">{isRegister ? "Create an account" : "Welcome back"}</h2><p className="mt-2 text-sm text-muted-foreground">{isRegister ? "Register as a customer or barber." : "Sign in to access your dashboard."}</p></div>
          <div className="bg-card border rounded-2xl shadow-sm p-8">
            {/* Prominently Highlighted Google Sign-In */}
            {googleEnabled && (
              <div className="mb-6 p-4 rounded-xl border-2 border-primary/30 bg-primary/[0.04] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wide">
                    <Sparkles className="w-3.5 h-3.5" />
                    Recommended • 1-Click
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">No password needed</span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-sm font-semibold border-2 hover:border-primary/60 hover:bg-background transition-all shadow-sm flex items-center justify-center gap-3 relative group"
                  disabled={isLoading}
                  onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                >
                  <GoogleIcon className="w-5 h-5 shrink-0" />
                  <span className="text-foreground font-medium">Continue with Google</span>
                </Button>
                <p className="text-[11px] text-center text-muted-foreground">
                  Skip creating or remembering complex passwords.
                </p>
              </div>
            )}

            <div className="relative my-6 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
              <span className="relative bg-card px-3 text-xs uppercase font-medium text-muted-foreground">
                or sign in with email & password
              </span>
            </div>

            <Tabs value={isRegister ? "register" : "login"} onValueChange={(value) => { setIsRegister(value === "register"); setError(""); setMessage(""); }}>
              <TabsList className="grid grid-cols-2 mb-8"><TabsTrigger value="login">Login</TabsTrigger><TabsTrigger value="register">Register</TabsTrigger></TabsList>
              {message && (
                <div className="mb-5 rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-sm text-green-800 space-y-2.5" role="status">
                  <p className="font-semibold">{message}</p>
                  {devCode ? (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-green-500/15 border border-green-500/30 rounded-lg p-2.5">
                      <span className="text-xs font-medium">Your 6-Digit Code: <strong className="font-mono text-base tracking-widest text-green-950 font-bold ml-1">{devCode}</strong></span>
                      <Link
                        href={`/verify-email?email=${encodeURIComponent(registeredEmail)}&code=${encodeURIComponent(devCode)}`}
                        className="inline-flex items-center justify-center text-xs bg-primary text-primary-foreground font-semibold px-3 py-1.5 rounded-md hover:opacity-90 shadow-sm"
                      >
                        Verify &amp; Sign In (1-Click)
                      </Link>
                    </div>
                  ) : (
                    <Link
                      href={`/verify-email?email=${encodeURIComponent(registeredEmail)}`}
                      className="inline-block text-xs font-semibold text-primary underline"
                    >
                      Enter 6-digit verification code &rarr;
                    </Link>
                  )}
                  {devVerificationLink && (
                    <Link href={devVerificationLink} className="block text-xs text-muted-foreground hover:underline">
                      Or open direct link
                    </Link>
                  )}
                </div>
              )}
              {error && (
                <div className="mb-5 rounded-lg bg-red-500/10 border border-red-500/20 p-3.5 text-sm text-red-700 space-y-2" role="alert">
                  <div>{error}</div>
                  {error.toLowerCase().includes("verify") && (
                    <div className="flex gap-3 text-xs pt-1 border-t border-red-500/20">
                      <Link href="/verify-email" className="font-bold underline text-red-800">
                        Go to Verify Email &rarr;
                      </Link>
                      <Link href="/resend-verification" className="font-medium underline text-red-700">
                        Resend Code
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <TabsContent value="login"><form onSubmit={handleSubmit} className="space-y-5"><EmailField /><PasswordField id="login-password" show={showPassword} toggle={() => setShowPassword((value) => !value)} /><div className="flex flex-wrap justify-between gap-2"><Link href="/resend-verification" className="text-xs text-primary hover:underline">Resend verification email</Link><Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link></div><Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? "Signing in..." : "Sign In"}</Button></form></TabsContent>

              <TabsContent value="register"><form onSubmit={handleSubmit} className="space-y-5"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="firstName">First Name</Label><Input id="firstName" name="firstName" required maxLength={60} /></div><div className="space-y-2"><Label htmlFor="lastName">Last Name</Label><Input id="lastName" name="lastName" required maxLength={60} /></div></div><EmailField /><div className="space-y-2"><Label htmlFor="role">Account Type</Label><select id="role" name="role" className="w-full h-10 rounded-md border bg-background px-3"><option value="user">Customer</option><option value="barber">Barber / Shop Owner</option></select><p className="text-xs text-muted-foreground">Barber profiles require administrator verification before public booking.</p></div><PasswordField id="register-password" show={showPassword} toggle={() => setShowPassword((value) => !value)} /><div className="space-y-2"><Label htmlFor="confirmPassword">Confirm Password</Label><Input id="confirmPassword" name="confirmPassword" type={showPassword ? "text" : "password"} minLength={8} required /></div><Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? "Creating account..." : "Create Account"}</Button></form></TabsContent>
            </Tabs>
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

function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z" />
    </svg>
  );
}
