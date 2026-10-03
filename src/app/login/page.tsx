"use client";

/**
 * MadrashaOS — Login Page
 *
 * Task B2.4 — Authentication Verification UI
 *
 * A clean, branded login form wired to NextAuth's `signIn()` client
 * helper. Supports the full MFA-gated flow:
 *
 *   1. User enters email + password.
 *   2. NextAuth CredentialsProvider validates → issues JWT.
 *   3. If `mfa_pending === true` on the returned session, the form
 *      swaps to the MFA step (6-digit TOTP input via InputOTP).
 *   4. User enters the 6-digit code from Google Authenticator.
 *   5. The form POSTs to /api/v1/auth/mfa/verify with the code.
 *   6. On success, the form re-calls signIn() to refresh the JWT
 *      with `mfa_pending = false` + permissions restored.
 *   7. On full auth, router.replace("/dashboard") routes to the
 *      role-appropriate dashboard.
 *
 * Design (FROZEN tokens only — see docs/DESIGN_QA_CONTRACT.md):
 *   - Two-column on desktop: brand panel (left) + form (right)
 *   - Single-column on mobile, brand panel hidden
 *   - Sticky footer pattern at viewport bottom (per UI/UX design spec)
 *   - Deep teal primary + warm gold accent
 *
 * Sandbox note: this page is reachable at /login. The middleware
 * redirects unauthenticated browser navigations to /login.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  ShieldCheck,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  Eye,
  EyeOff,
  Building2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";

/** Three high-level form modes — gates the rendered UI. */
type LoginMode = "credentials" | "mfa" | "success";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // --- Form state ---------------------------------------------------------
  const [mode, setMode] = React.useState<LoginMode>("credentials");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [mfaToken, setMfaToken] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Phase 2: madrasha-code login state
  const [madrashaCode, setMadrashaCode] = React.useState("");
  // Whether to show the madrasha-code field (auto-detected via check-email)
  const [showCodeField, setShowCodeField] = React.useState(false);
  // Whether the email exists in multiple orgs (requires the code)
  const [emailMultiOrg, setEmailMultiOrg] = React.useState(false);
  const [checkingEmail, setCheckingEmail] = React.useState(false);

  // If the middleware redirected with ?mfa=1, jump straight to the MFA step
  // (the user has an MFA-pending session cookie already).
  React.useEffect(() => {
    if (searchParams.get("mfa") === "1") {
      setMode("mfa");
    }
  }, [searchParams]);

  // Phase 2: debounced check-email — when the user types a valid email,
  // call /api/v1/auth/check-email to determine if the madrasha-code field
  // should be shown (email exists in multiple orgs → show field).
  React.useEffect(() => {
    // Only check if the email looks valid and we're in credentials mode
    if (mode !== "credentials") return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@") || trimmed.length < 5) {
      setShowCodeField(false);
      setEmailMultiOrg(false);
      return;
    }

    // Debounce 500ms after the user stops typing
    const timer = setTimeout(async () => {
      setCheckingEmail(true);
      try {
        const res = await fetch(
          `/api/v1/auth/check-email?email=${encodeURIComponent(trimmed)}`,
        );
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.multiOrg) {
            // Email exists in multiple orgs — MUST provide the madrasha code
            setShowCodeField(true);
            setEmailMultiOrg(true);
          } else if (data.exists) {
            // Email exists in exactly 1 org — code is optional, hide the field
            setShowCodeField(false);
            setEmailMultiOrg(false);
          } else {
            // Email doesn't exist — keep the field hidden (error will show on submit)
            setShowCodeField(false);
            setEmailMultiOrg(false);
          }
        }
      } catch {
        // Network error — silently keep the field hidden
      }
      setCheckingEmail(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [email, mode]);

  // --- Step 1: email + password submit ------------------------------------
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Phase 2: if the email exists in multiple orgs, the madrasha code is required
    if (emailMultiOrg && !madrashaCode.trim()) {
      setError(
        "Multiple accounts exist with this email. Please enter your Madrasha Code to identify your organization.",
      );
      setShowCodeField(true);
      return;
    }

    setSubmitting(true);

    try {
      // signIn() returns a result object — `ok: true` means the JWT was
      // issued successfully. We pass `redirect: false` so the page can
      // decide what to do next (MFA step OR /dashboard redirect).
      // Phase 2: pass the madrasha code if provided (resolves the tenant org)
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        // Pass the madrasha code if the user typed it. NextAuth CredentialsProvider
        // receives it as credentials.organizationCode (see config.ts Phase 0d fix)
        organizationCode: madrashaCode.trim().toUpperCase() || undefined,
        redirect: false,
      });

      if (!result || result.error) {
        const errMsg = result?.error ?? "";
        // Phase 2: check for the MULTIPLE_ACCOUNTS error from the authorize callback
        if (errMsg.includes("MULTIPLE_ACCOUNTS")) {
          setError(
            "Multiple accounts exist with this email. Please enter your Madrasha Code below to identify your organization.",
          );
          setShowCodeField(true);
          setEmailMultiOrg(true);
          setSubmitting(false);
          return;
        }
        // Phase 4: trial expiry + suspension errors (show the full message)
        if (errMsg.includes("TRIAL_EXPIRED")) {
          setError(
            "Your 14-day free trial has ended. Please contact the platform operator to activate your subscription and continue using MadrashaOS.",
          );
          setSubmitting(false);
          return;
        }
        if (errMsg.includes("ACCOUNT_SUSPENDED")) {
          setError(
            "Your madrasha account has been suspended. Please contact the platform operator to reactivate your subscription.",
          );
          setSubmitting(false);
          return;
        }
        setError(
          "Invalid credentials. Please check your email, password, and madrasha code, then try again.",
        );
        setSubmitting(false);
        return;
      }

      // Fetch the session to check if MFA is pending.
      // NextAuth's client exposes /api/auth/session.
      const sessionRes = await fetch("/api/v1/auth/session", {
        cache: "no-store",
      });
      if (sessionRes.status === 403) {
        const body = await sessionRes.json().catch(() => ({}));
        if (body?.error === "MFA_REQUIRED") {
          setMode("mfa");
          setMfaToken("");
          setSubmitting(false);
          return;
        }
      }
      if (sessionRes.status === 200) {
        // No MFA required — fully authenticated.
        // Phase 3: check the role to decide the redirect target.
        // Super-admin → /platform, everyone else → /dashboard
        const sessionBody = await sessionRes.json().catch(() => ({}));
        const userRole = sessionBody?.user?.role ?? "";
        const redirectPath = userRole === "super-admin" ? "/platform" : "/dashboard";

        setMode("success");
        toast({
          title: "Welcome back!",
          description: "You are now signed in.",
        });
        // Brief delay so the toast renders before the navigation.
        setTimeout(() => router.replace(redirectPath), 400);
        return;
      }

      // Unexpected state — surface a generic error.
      setError("Sign-in failed unexpectedly. Please try again.");
      setSubmitting(false);
    } catch (err) {
      setError("Network error. Please check your connection and retry.");
      setSubmitting(false);
    }
  };

  // --- Step 2: MFA verify submit ------------------------------------------
  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mfaToken.length !== 6) {
      setError("The verification code must be 6 digits.");
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch("/api/v1/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: mfaToken }),
      });

      if (res.status === 401) {
        setError("Your session has expired. Please sign in again.");
        setMode("credentials");
        setSubmitting(false);
        return;
      }
      if (res.status === 400) {
        const body = await res.json().catch(() => ({}));
        setError(body?.message ?? "Invalid verification code. Try again.");
        setMfaToken("");
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.message ?? "MFA verification failed. Please retry.");
        setSubmitting(false);
        return;
      }

      // MFA verified — re-sign in so the JWT is upgraded to a full session.
      // The credentials provider will see mfa_enabled=true but since the
      // session is now MFA-verified server-side, the verify route has
      // already flipped the server-side state. We re-call signIn() to
      // refresh the JWT cookie cleanly.
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        // Phase 2: pass the madrasha code again so the tenant is resolved correctly
        organizationCode: madrashaCode.trim().toUpperCase() || undefined,
        redirect: false,
      });

      if (!result || result.error) {
        // Fallback — the session is likely already valid; just navigate.
        // Phase 3: super-admin → /platform
        const fbSession = await fetch("/api/v1/auth/session", { cache: "no-store" }).then(r => r.json()).catch(() => ({}));
        router.replace(fbSession?.user?.role === "super-admin" ? "/platform" : "/dashboard");
        return;
      }

      setMode("success");
      toast({
        title: "Verified",
        description: "Multi-factor authentication complete.",
      });
      // Phase 3: fetch session to determine redirect target
      const mfaSession = await fetch("/api/v1/auth/session", { cache: "no-store" }).then(r => r.json()).catch(() => ({}));
      const mfaRedirect = mfaSession?.user?.role === "super-admin" ? "/platform" : "/dashboard";
      setTimeout(() => router.replace(mfaRedirect), 400);
    } catch {
      setError("Network error. Please retry.");
      setSubmitting(false);
    }
  };

  // --- Back to credentials step --------------------------------------------
  const handleBackToCredentials = () => {
    setMode("credentials");
    setMfaToken("");
    setError(null);
  };

  // -------------------------------------------------------------------------
  return (
    <div className="flex min-h-screen flex-col bg-surface-canvas">
      <main className="flex flex-1 items-stretch">
        {/* Left brand panel — hidden on mobile, 50% width on desktop */}
        <aside
          aria-hidden
          className="hidden w-1/2 flex-col justify-between bg-primary-700 px-12 py-12 text-primary-foreground md:flex"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-md bg-accent-500 text-accent-foreground">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="text-headline font-semibold tracking-tight">
              MadrashaOS
            </div>
          </div>

          <div className="space-y-6">
            <h1 className="text-display font-bold leading-tight tracking-tight">
              Madrasha
              <br />
              Management OS
            </h1>
            <p className="max-w-md text-body text-primary-100">
              Securely manage students, attendance, fees, accounting, and
              operations across all your branches — trilingual, multi-tenant,
              and built for Madrasha workflows.
            </p>
          </div>

          <div className="text-caption text-primary-200">
            &copy; {new Date().getFullYear()} MadrashaOS. All rights reserved.
          </div>
        </aside>

        {/* Right form panel — full width on mobile, 50% on desktop */}
        <section className="flex w-full flex-col items-center justify-center px-6 py-12 md:w-1/2">
          <div className="w-full max-w-md">
            <Card className="shadow-elevation-3">
              <CardHeader className="space-y-2 text-center">
                <div className="mx-auto mb-2 grid size-12 place-items-center rounded-lg bg-primary-500 text-primary-foreground md:hidden">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <CardTitle className="text-headline">
                  {mode === "mfa" ? "Verify Your Identity" : "Sign In"}
                </CardTitle>
                <CardDescription>
                  {mode === "mfa"
                    ? "Enter the 6-digit code from your authenticator app."
                    : "Enter your credentials to access the MadrashaOS dashboard."}
                </CardDescription>
              </CardHeader>

              <CardContent>
                {/* ---------- Step 1: Credentials ---------- */}
                {mode === "credentials" && (
                  <form
                    onSubmit={handleCredentialsSubmit}
                    className="space-y-4"
                    aria-label="Sign in form"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail
                          aria-hidden
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          autoFocus
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="abdul@madrasha.edu"
                          className="pl-9"
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <Link
                          href="#"
                          className="text-caption font-medium text-primary-500 hover:text-primary-600"
                          onClick={(e) => {
                            e.preventDefault();
                            toast({
                              title: "Password reset",
                              description:
                                "Contact your administrator to reset your password.",
                            });
                          }}
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock
                          aria-hidden
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-9 pr-10"
                          disabled={submitting}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Phase 2: Madrasha Code field — shown when:
                        - the email exists in multiple orgs (auto-detected), OR
                        - the user manually toggles it (link below) */}
                    {(showCodeField || madrashaCode) && (
                      <div className="space-y-2">
                        <Label htmlFor="madrasha-code">
                          Madrasha Code
                          {emailMultiOrg && (
                            <span className="ms-1 text-semantic-danger">*</span>
                          )}
                        </Label>
                        <div className="relative">
                          <Building2
                            aria-hidden
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                          />
                          <Input
                            id="madrasha-code"
                            name="organizationCode"
                            type="text"
                            autoComplete="off"
                            autoCapitalize="characters"
                            autoCorrect="off"
                            spellCheck={false}
                            value={madrashaCode}
                            onChange={(e) => setMadrashaCode(e.target.value.toUpperCase())}
                            placeholder="e.g. DUM001"
                            className="pl-9 font-mono uppercase"
                            disabled={submitting}
                            maxLength={10}
                            autoFocus={emailMultiOrg}
                          />
                        </div>
                        {emailMultiOrg && (
                          <p className="text-caption text-semantic-warning">
                            Your email is registered with multiple madrashas.
                            Enter your 6-character code to identify your organization.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Toggle link to show/hide the madrasha-code field manually */}
                    {!showCodeField && !madrashaCode && (
                      <button
                        type="button"
                        onClick={() => setShowCodeField(true)}
                        className="text-caption font-medium text-text-muted hover:text-primary-500"
                      >
                        Have a madrasha code? Enter it →
                      </button>
                    )}

                    {checkingEmail && (
                      <p className="flex items-center gap-1.5 text-caption text-text-muted">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Checking email…
                      </p>
                    )}

                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Sign-in failed</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={submitting || !email || !password}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Signing in…
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                )}

                {/* ---------- Step 2: MFA ---------- */}
                {mode === "mfa" && (
                  <form
                    onSubmit={handleMfaSubmit}
                    className="space-y-6"
                    aria-label="MFA verification form"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="mfa-token">Verification Code</Label>
                      <div className="flex justify-center pt-2">
                        <InputOTP
                          id="mfa-token"
                          maxLength={6}
                          value={mfaToken}
                          onChange={(val) => setMfaToken(val)}
                          disabled={submitting}
                          autoFocus
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                          </InputOTPGroup>
                          <InputOTPSeparator />
                          <InputOTPGroup>
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      <p className="pt-2 text-center text-caption text-muted-foreground">
                        Open Google Authenticator (or any TOTP app) and enter
                        the current 6-digit code.
                      </p>
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Verification failed</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={submitting || mfaToken.length !== 6}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Verifying…
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-4 w-4" />
                          Verify & Continue
                        </>
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={handleBackToCredentials}
                      className="flex w-full items-center justify-center gap-1.5 text-caption font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to sign in
                    </button>
                  </form>
                )}

                {/* ---------- Success state ---------- */}
                {mode === "success" && (
                  <div className="flex flex-col items-center gap-4 py-8 text-center">
                    <div className="grid size-14 place-items-center rounded-full bg-success-50 text-success">
                      <ShieldCheck className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-subtitle font-semibold text-foreground">
                        Authentication successful
                      </p>
                      <p className="text-body text-muted-foreground">
                        Redirecting to your dashboard…
                      </p>
                    </div>
                    <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                <p className="text-center text-caption text-muted-foreground">
                  New madrasha?{" "}
                  <Link
                    href="/signup"
                    className="font-medium text-primary-500 hover:underline"
                  >
                    Request access
                  </Link>
                </p>
              </CardFooter>
            </Card>

            {/* Demo hint — only shown in development */}
            {process.env.NODE_ENV === "development" && (
              <p className="mt-6 text-center text-caption text-muted-foreground">
                <span className="font-medium">Dev hint:</span> the seed script
                creates 8 demo users — e.g.{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-caption text-foreground">
                  admin@madrashaos.org
                </code>{" "}
                /{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-caption text-foreground">
                  password123
                </code>
              </p>
            )}
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-border-default bg-surface-card px-6 py-3 text-center text-caption text-muted-foreground">
        MadrashaOS — Secure authentication. All sign-in attempts are logged.
      </footer>
    </div>
  );
}
