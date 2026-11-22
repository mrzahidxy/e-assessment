"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { register, isLoading } = useAuthStore();

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    try {
      await register(name, email, password);
      router.push("/student/assessments");
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      <section className="relative flex min-h-[28vh] flex-col overflow-hidden bg-white px-6 py-7 sm:px-10 lg:min-h-screen lg:px-16 lg:py-10">
        <Image src="/login-geometric.png" alt="" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="pointer-events-none object-cover" />
        <div className="relative z-10 inline-flex w-fit items-center gap-3 text-foreground">
          <span className="flex size-10 items-center justify-center bg-primary text-primary-foreground">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <span className="text-sm font-bold tracking-tight">eAssessment</span>
        </div>
        <div className="relative z-10 mt-auto max-w-xl py-10 lg:pb-[18vh]">
          <h1 className="max-w-lg text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-foreground sm:text-5xl xl:text-[3.75rem]">
            Your next assessment starts here.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground sm:text-lg">
            Create a student account to request access and keep track of your work.
          </p>
        </div>
      </section>

      <section className="flex min-h-[72vh] items-center justify-center border-t border-border bg-white px-5 py-10 sm:px-10 lg:min-h-screen lg:border-l lg:border-t-0">
        <div className="w-full max-w-md">
          <p className="text-sm font-semibold text-muted-foreground">Student workspace</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">
            Create your account
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Register with the email you use at school.
          </p>

          <form onSubmit={handleSignup} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" type="text" autoComplete="name" placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} required disabled={isLoading} className="h-12 border-border bg-input px-4" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="you@school.edu" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isLoading} className="h-12 border-border bg-input px-4" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Create a password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isLoading} className="h-12 border-border bg-input px-4 pr-12" />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {error && <div role="alert" className="border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

            <Button type="submit" className="h-12 w-full text-base" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create account"}
              {!isLoading && <ArrowRight className="size-4" aria-hidden="true" />}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button type="button" onClick={() => router.push("/auth/login")} className="font-semibold text-primary underline-offset-4 hover:underline">
                Sign in
              </button>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
