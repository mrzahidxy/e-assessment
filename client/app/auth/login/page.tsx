"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Settings,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginView = "select" | "admin" | "student";

const demoCredentials = {
  student: { email: "student1@exam.io", password: "changeMeStudent1!" },
};

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<LoginView>("select");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login, isLoading } = useAuthStore();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    try {
      await login(email, password);
      const user = useAuthStore.getState().user;

      if (user?.role.toLowerCase() === "admin") {
        router.push("/admin/questions");
      } else if (user?.role.toLowerCase() === "student") {
        router.push("/student/assessments");
      } else {
        router.push("/admin/questions");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid credentials");
    }
  };

  const isRoleSelection = view === "select";
  const title =
    view === "admin" ? "Admin sign in" : "Student sign in";

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      <section className="relative flex min-h-[34vh] flex-col overflow-hidden bg-white px-6 py-7 sm:px-10 lg:min-h-screen lg:px-16 lg:py-10">
        <Image
          src="/login-geometric.png"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="pointer-events-none object-cover"
        />
        <div className="relative z-10 inline-flex w-fit items-center gap-3 text-foreground">
          <span className="flex size-10 items-center justify-center bg-primary text-primary-foreground">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <span className="text-sm font-bold tracking-tight">eAssessment</span>
        </div>

        <div className="relative z-10 mt-auto max-w-xl py-12 lg:pb-[18vh]">
          <h1 className="max-w-lg text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-foreground sm:text-5xl xl:text-[3.75rem]">
            Welcome to eAssessment
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground sm:text-lg">
            A clear place to prepare, take, and review assessments.
          </p>
        </div>
      </section>

      <section className="flex min-h-[66vh] items-center justify-center border-t border-border bg-white px-5 py-10 sm:px-10 lg:min-h-screen lg:border-l lg:border-t-0">
        <div className="w-full max-w-md">
          {isRoleSelection ? (
            <>
              <p className="text-sm font-semibold text-muted-foreground">
                Sign in to continue
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">
                Choose your role
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Select the workspace you need to access.
              </p>

              <div className="mt-9 space-y-3">
                <Button
                  onClick={() => setView("student")}
                  className="h-[74px] w-full justify-between px-5 text-base"
                >
                  <span className="flex items-center gap-4">
                    <GraduationCap className="size-5" aria-hidden="true" />
                    Student Login
                  </span>
                  <ArrowRight className="size-5" aria-hidden="true" />
                </Button>
                <Button
                  onClick={() => setView("admin")}
                  variant="outline"
                  className="h-[74px] w-full justify-between border-border px-5 text-base text-foreground hover:bg-muted"
                >
                  <span className="flex items-center gap-4">
                    <Settings className="size-5" aria-hidden="true" />
                    Admin Login
                  </span>
                  <ArrowRight className="size-5" aria-hidden="true" />
                </Button>
              </div>
              <div className="mt-8 flex items-start gap-3 border-t border-border pt-5 text-sm leading-6 text-muted-foreground">
                <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>Use your school account to access your assessments securely.</p>
              </div>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                className="-ml-3 mb-8 px-3 text-muted-foreground"
                onClick={() => {
                  setError("");
                  setView("select");
                }}
                disabled={isLoading}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Change role
              </Button>
              <p className="text-sm font-semibold text-muted-foreground">
                eAssessment workspace
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {view === "admin"
                  ? "Sign in to manage question papers and submissions."
                  : "Sign in to access your assessments and feedback."}
              </p>

              <form onSubmit={handleLogin} className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder={view === "admin" ? "admin@school.edu" : "you@school.edu"}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 border-border bg-input px-4"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      disabled={isLoading}
                      className="h-12 border-border bg-input px-4 pr-12"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" aria-hidden="true" />
                      ) : (
                        <Eye className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    {error}
                  </div>
                )}

                <Button type="submit" className="h-12 w-full text-base" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign in"}
                  {!isLoading && <ArrowRight className="size-4" aria-hidden="true" />}
                </Button>

                {view === "student" && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(demoCredentials.student.email);
                      setPassword(demoCredentials.student.password);
                      setError("");
                    }}
                    disabled={isLoading}
                    className="w-full border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Fill demo student credentials
                  </button>
                )}

                {view === "student" && (
                  <p className="text-center text-sm text-muted-foreground">
                    Need an account?{" "}
                    <button
                      type="button"
                      onClick={() => router.push("/auth/signup")}
                      className="font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      Create one
                    </button>
                  </p>
                )}
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
