"use client";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { login, signup } from "@/lib/auth";
import {
  BarChart3,
  Eye,
  EyeOff,
  FileStack,
  Lock,
  Mail,
  Scan,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const HIGHLIGHTS = [
  { icon: FileStack, text: "5 document types — resumes, invoices, statements, prescriptions, emails" },
  { icon: ShieldCheck, text: "Every record validated before it reaches your data" },
  { icon: BarChart3, text: "Live pipeline analytics, from upload to structured storage" },
];

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(name, email, password);
      }

      toast({
        variant: "success",
        title: mode === "login" ? "Welcome back" : "Account created",
        description: "Redirecting to your dashboard...",
      });
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
      toast({
        variant: "error",
        title: mode === "login" ? "Login failed" : "Sign up failed",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Branding panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-12 text-white lg:flex">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <Scan className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">DocIntel</span>
        </div>

        <div className="relative max-w-md">
          <Sparkles className="mb-4 h-8 w-8 text-white/80" />
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Turn unstructured documents into structured, trustworthy data.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            Upload a file and watch it move through OCR, classification, extraction,
            validation, and storage — automatically.
          </p>

          <div className="mt-8 flex flex-col gap-3.5">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <p className="text-sm text-white/85">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/60">
          Built on Databricks · PySpark · Delta Lake
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Scan className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-foreground">DocIntel</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "login"
              ? "Log in to view and manage your documents."
              : "Start processing your documents in minutes."}
          </p>

          <div className="mt-6 grid grid-cols-2 rounded-xl bg-muted p-1 text-sm font-medium">
            <button
              onClick={() => setMode("login")}
              className={`cursor-pointer rounded-lg py-2 transition-colors ${
                mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Log in
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`cursor-pointer rounded-lg py-2 transition-colors ${
                mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  placeholder="Jatin Rana"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                icon={<Mail className="h-4 w-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label htmlFor="password" className="mb-0">
                  Password
                </Label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() =>
                      toast({
                        variant: "info",
                        title: "Password reset",
                        description: "This will send a reset link once the backend is connected.",
                      })
                    }
                    className="cursor-pointer text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  icon={<Lock className="h-4 w-4" />}
                  className="pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
              {mode === "login" ? "Log in" : "Create account"}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing, you agree to the demo Terms & Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
