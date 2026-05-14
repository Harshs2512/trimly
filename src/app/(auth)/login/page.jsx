"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const router = useRouter();

  // ✅ Login / Register Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      if (!isRegister) {
        // 🔹 LOGIN using NextAuth Credentials provider
        const res = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (res?.error) {
          alert("Invalid credentials, please try again!");
        } else {
          router.push("/dashboard"); // redirect after login
        }
      } else {
        // 🔹 REGISTER - Call your API route for user creation
        const firstName = formData.get("firstName");
        const lastName = formData.get("lastName");
        const name = `${firstName} ${lastName}`.trim();

        const registerRes = await fetch("/api/auth/register", { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        if (!registerRes.ok) throw new Error("Registration failed");
        alert("Account created successfully! Please log in.");
        setIsRegister(false); // Switch to login tab
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ OAuth Login Handler
  const handleOAuthLogin = async (provider) => {
    setIsLoading(true);
    await signIn(provider, { callbackUrl: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen bg-background relative overflow-hidden">
      {/* Decorative Blur Orbs for extra ambience in Dark/Light mode */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[50%] rounded-full bg-accent/20 blur-[120px] pointer-events-none -z-10" />

      {/* Left Sidebar - High-End Imagery & Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-900 border-r border-border shadow-2xl flex-col justify-between">
        <Image 
          src="/auth-bg.png" 
          alt="Premium Barbershop" 
          fill 
          priority 
          className="object-cover opacity-60 z-0" 
        />
        {/* Soft gradient overlay to blend the image into the background */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/40 to-transparent z-10" />

        {/* Bottom Value Proposition */}
        <div className="relative z-20 p-12 pb-16 animate-in slide-in-from-bottom-8 duration-700 fade-in flex flex-col justify-center gap-6">
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight drop-shadow-sm">
              The ultimate grooming experience, <span className="text-primary/90">without the wait.</span>
            </h1>
            <p className="text-zinc-300 text-lg max-w-md font-medium">
              Join thousands of elevated clients and top-tier barbers streamlining their chairs with Trimly.
            </p>
          </div>
          
          <div className="flex flex-col gap-3 mt-4">
             <div className="flex items-center gap-3 text-zinc-300">
               <CheckCircle2 className="w-5 h-5 text-primary" />
               <span>Instant real-time booking confirmation</span>
             </div>
             <div className="flex items-center gap-3 text-zinc-300">
               <CheckCircle2 className="w-5 h-5 text-primary" />
               <span>Skip the queue with digital walk-ins</span>
             </div>
             <div className="flex items-center gap-3 text-zinc-300">
               <CheckCircle2 className="w-5 h-5 text-primary" />
               <span>Exclusive access to highly-rated professionals</span>
             </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative animate-in fade-in duration-500">
        <div className="w-full max-w-md flex flex-col items-center">

          <div className="w-full text-center mb-8 space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              {isRegister ? "Create an account" : "Welcome back"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isRegister 
                ? "Enter your details below to create your account and get started." 
                : "Enter your email and password to access your dashboard."}
            </p>
          </div>

          {/* Form Card with Glassmorphism subtle effects */}
          <div className="w-full bg-card/60 backdrop-blur-xl border border-border/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
            <Tabs
              defaultValue="login"
              value={isRegister ? "register" : "login"}
              onValueChange={(v) => setIsRegister(v === "register")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1">
                <TabsTrigger value="login" className="rounded-md transition-all">Login</TabsTrigger>
                <TabsTrigger value="register" className="rounded-md transition-all">Register</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login" className="animate-in slide-in-from-left-2 duration-300">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2 group">
                    <Label htmlFor="email" className="group-focus-within:text-primary transition-colors">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      className="bg-background/50 focus:bg-background transition-all border-border/80 focus:border-primary/50"
                      required
                    />
                  </div>

                  <div className="space-y-2 group">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="group-focus-within:text-primary transition-colors">Password</Label>
                      <a href="#" className="text-xs text-primary/80 hover:text-primary hover:underline transition-colors">
                        Forgot password?
                      </a>
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className="bg-background/50 focus:bg-background transition-all border-border/80 focus:border-primary/50"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full h-11 shadow-md hover:shadow-lg transition-all" disabled={isLoading}>
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                         <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                         Logging in...
                      </div>
                    ) : "Sign In to Trimly"}
                  </Button>
                </form>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register" className="animate-in slide-in-from-right-2 duration-300">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 group">
                      <Label htmlFor="firstName" className="group-focus-within:text-primary transition-colors">First Name</Label>
                      <Input id="firstName" name="firstName" type="text" placeholder="John" className="bg-background/50 focus:bg-background transition-all" required />
                    </div>
                    <div className="space-y-2 group">
                      <Label htmlFor="lastName" className="group-focus-within:text-primary transition-colors">Last Name</Label>
                      <Input id="lastName" name="lastName" type="text" placeholder="Doe" className="bg-background/50 focus:bg-background transition-all" required />
                    </div>
                  </div>

                  <div className="space-y-2 group">
                    <Label htmlFor="email" className="group-focus-within:text-primary transition-colors">Email Address</Label>
                    <Input id="email" name="email" type="email" placeholder="you@example.com" className="bg-background/50 focus:bg-background transition-all" required />
                  </div>

                  <div className="space-y-2 group">
                    <Label htmlFor="password" className="group-focus-within:text-primary transition-colors">Password</Label>
                    <Input id="password" name="password" type="password" placeholder="••••••••" className="bg-background/50 focus:bg-background transition-all" required />
                  </div>

                  <div className="space-y-2 group">
                    <Label htmlFor="confirmPassword" className="group-focus-within:text-primary transition-colors">Confirm Password</Label>
                    <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" className="bg-background/50 focus:bg-background transition-all" required />
                  </div>

                  <Button type="submit" className="w-full h-11 shadow-md hover:shadow-lg transition-all" disabled={isLoading}>
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                         <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                         Creating account...
                      </div>
                    ) : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/80"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card/60 backdrop-blur-sm px-4 text-muted-foreground font-medium">Or continue with</span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" type="button" className="h-11 bg-background/50 hover:bg-muted/50 border-border/80 shadow-sm transition-all" onClick={() => handleOAuthLogin("google")} disabled={isLoading}>
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </Button>

              <Button variant="outline" type="button" className="h-11 bg-background/50 hover:bg-muted/50 border-border/80 shadow-sm transition-all" onClick={() => handleOAuthLogin("github")} disabled={isLoading}>
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.562 21.8 24 17.302 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </Button>
            </div>
          </div>

          {/* Footer Links */}
          <p className="text-center text-sm text-muted-foreground mt-8 animate-in fade-in duration-700 delay-200">
            By continuing, you agree to Trimly’s{" "}
            <Link href="/terms" className="text-primary hover:underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-primary rounded-sm transition-all">Terms of Service</Link> and{" "}
            <Link href="/privacy" className="text-primary hover:underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-primary rounded-sm transition-all">Privacy Policy</Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default Auth;
