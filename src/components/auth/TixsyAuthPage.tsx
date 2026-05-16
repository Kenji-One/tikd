"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Music2,
  PartyPopper,
  ShieldCheck,
  Ticket,
  TicketCheck,
  User,
} from "lucide-react";
import clsx from "classnames";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import LabelledInput from "@/components/ui/LabelledInput";

type AuthTab = "login" | "register";
type AuthMode = AuthTab | "forgot" | "verify" | "reset";
type FieldName = "username" | "email" | "password" | "agreeTerms";
type FieldErrors = Partial<Record<FieldName, string>>;

type Props = {
  initialMode: AuthTab;
};

function getSafeCallbackUrl(rawCallbackUrl: string | null) {
  if (!rawCallbackUrl) return "/";
  if (rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")) {
    return rawCallbackUrl;
  }

  if (typeof window === "undefined") return "/";

  try {
    const parsed = new URL(rawCallbackUrl);
    if (parsed.origin === window.location.origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return "/";
  }

  return "/";
}

const panelVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

const contentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const ticketParticles = [
  { left: "8%", top: "16%", delay: 0, x: 36, y: -42, rotate: -12 },
  { left: "18%", top: "72%", delay: 1.2, x: -44, y: -34, rotate: 18 },
  { left: "34%", top: "28%", delay: 2.1, x: 54, y: 38, rotate: 9 },
  { left: "45%", top: "84%", delay: 0.6, x: -28, y: -52, rotate: -20 },
  { left: "58%", top: "14%", delay: 1.8, x: 46, y: 46, rotate: 16 },
  { left: "70%", top: "64%", delay: 2.8, x: -56, y: 24, rotate: -10 },
  { left: "84%", top: "34%", delay: 0.9, x: 38, y: -46, rotate: 22 },
  { left: "92%", top: "78%", delay: 2.4, x: -42, y: 34, rotate: 12 },
];

const barHeights = [18, 26, 16, 34, 24, 38, 28, 44];

function FloatingPanel({
  children,
  delay = 0,
  duration = 20,
  x = [0, 80],
  y = [0, -80],
  className,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  x?: number[];
  y?: number[];
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.86 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0.86, 1, 1, 0.88],
        x,
        y,
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={clsx("absolute", className)}
    >
      {children}
    </motion.div>
  );
}

function MiniEventStrip() {
  const events = [
    { src: "/dummy/event-1.png", name: "Night Run", date: "May 24" },
    { src: "/dummy/event-card-2.png", name: "Skyline Set", date: "Jun 02" },
    { src: "/dummy/event-avalon.png", name: "Avalon", date: "Jun 18" },
  ];

  return (
    <div className="w-[260px] rounded-2xl border border-white/10 bg-neutral-950/70 p-3 shadow-2xl backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/20 text-primary-300">
            <CalendarDays className="h-4 w-4" />
          </div>
          <span className="font-semibold">Tonight</span>
        </div>
        <span className="rounded-full bg-primary-500/15 px-2 py-1 text-xs font-semibold text-primary-200">
          12 live
        </span>
      </div>
      <div className="space-y-2">
        {events.map((event) => (
          <div
            key={event.name}
            className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-2"
          >
            <Image
              src={event.src}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {event.name}
              </p>
              <p className="text-xs text-neutral-400">{event.date}</p>
            </div>
            <Ticket className="h-4 w-4 text-primary-300" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TixsyAnimatedBackground() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-neutral-950">
      <motion.div
        animate={{
          background: [
            "radial-gradient(circle at 18% 42%, rgba(154,70,255,0.26) 0%, transparent 46%), radial-gradient(circle at 78% 18%, rgba(170,115,255,0.16) 0%, transparent 38%), #08080f",
            "radial-gradient(circle at 72% 26%, rgba(154,70,255,0.24) 0%, transparent 48%), radial-gradient(circle at 34% 78%, rgba(255,123,69,0.11) 0%, transparent 38%), #08080f",
            "radial-gradient(circle at 48% 82%, rgba(154,70,255,0.24) 0%, transparent 46%), radial-gradient(circle at 86% 62%, rgba(199,160,255,0.13) 0%, transparent 36%), #08080f",
            "radial-gradient(circle at 18% 42%, rgba(154,70,255,0.26) 0%, transparent 46%), radial-gradient(circle at 78% 18%, rgba(170,115,255,0.16) 0%, transparent 38%), #08080f",
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0"
      />

      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,15,0.92)_0%,rgba(8,8,15,0.28)_32%,rgba(8,8,15,0.74)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(8,8,15,0.78)_72%)]" />

      {ticketParticles.map((particle) => (
        <motion.div
          key={`${particle.left}-${particle.top}`}
          className="absolute text-white/10"
          animate={{
            x: [0, particle.x, 0],
            y: [0, particle.y, 0],
            rotate: [0, particle.rotate, 0],
            opacity: [0, 0.55, 0],
          }}
          transition={{
            duration: 11,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ left: particle.left, top: particle.top }}
        >
          <Ticket className="h-5 w-5" />
        </motion.div>
      ))}

      <FloatingPanel
        delay={0}
        duration={24}
        x={[30, 120]}
        y={[100, 46]}
        className="left-[8%] top-[4%]"
      >
        <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-5 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-500/15 text-success-400">
              <TicketCheck className="h-5 w-5" />
            </div>
            <span className="font-semibold text-white/90">Tickets Sold</span>
          </div>
          <div className="text-3xl font-black text-success-400">1,284</div>
          <div className="mt-1 text-sm text-neutral-400">+18% this week</div>
        </div>
      </FloatingPanel>

      <FloatingPanel
        delay={4}
        duration={30}
        x={[280, 388]}
        y={[150, 102]}
        className="left-[16%] top-[14%]"
      >
        <MiniEventStrip />
      </FloatingPanel>

      <FloatingPanel
        delay={9}
        duration={32}
        x={[110, 214]}
        y={[430, 356]}
        className="left-[6%] top-[20%]"
      >
        <div className="w-[228px] rounded-2xl border border-white/10 bg-neutral-950/70 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-semibold text-white/90">Lineup Pulse</span>
            <div className="flex items-center gap-1 text-sm text-primary-200">
              <Music2 className="h-4 w-4" />
              Live
            </div>
          </div>
          <div className="flex h-12 items-end gap-1.5">
            {barHeights.map((height, index) => (
              <motion.div
                key={height}
                className="w-3 rounded-sm bg-gradient-to-t from-primary-700 to-primary-300"
                animate={{
                  height: [height, height + 12, height],
                  opacity: [0.65, 1, 0.65],
                }}
                transition={{
                  duration: 2.1,
                  delay: index * 0.16,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </div>
      </FloatingPanel>

      <FloatingPanel
        delay={14}
        duration={28}
        x={[420, 510]}
        y={[360, 298]}
        className="left-[12%] top-[24%]"
      >
        <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary-300" />
            <span className="text-sm font-semibold text-white/90">
              Secure Checkout
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-8">
              <span className="text-neutral-400">Payment</span>
              <span className="font-semibold text-success-400">Verified</span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="text-neutral-400">Tickets</span>
              <span className="font-semibold text-primary-200">Instant</span>
            </div>
          </div>
        </div>
      </FloatingPanel>

      <div className="absolute inset-0 flex items-center justify-center px-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.7 }}
          className="relative z-10 max-w-[620px] text-center"
        >
          <motion.h2
            animate={{ opacity: [0.78, 1, 0.78] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="text-5xl font-black leading-[0.95] text-white xl:text-6xl"
          >
            Find Your Next
            <br />
            Night Out
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="mx-auto mt-7 max-w-[520px] text-xl leading-8 text-neutral-300"
          >
            Discover live events, grab
            <span className="font-semibold text-primary-300">
              {" "}
              secure tickets
            </span>
            , and keep every pass ready for the door.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="14"
      viewBox="0 0 15 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7.584 6.475v1.594h3.811c-.116.895-.414 1.55-.868 2.01-.558.557-1.426 1.166-2.943 1.166-2.346 0-4.18-1.892-4.18-4.239 0-2.346 1.834-4.239 4.18-4.239 1.264 0 2.191.5 2.872 1.141l1.121-1.121c-.946-.92-2.217-1.62-3.993-1.62-3.215 0-5.917 2.619-5.917 5.833s2.702 5.833 5.917 5.833c1.737 0 3.047-.57 4.07-1.633 1.05-1.05 1.381-2.534 1.381-3.727 0-.369-.026-.713-.084-.998H7.584Z"
        fill="white"
      />
    </svg>
  );
}

function PasswordEye({
  shown,
  onClick,
}: {
  shown: boolean;
  onClick: () => void;
}) {
  const Icon = shown ? EyeOff : Eye;
  return (
    <button
      type="button"
      aria-label={shown ? "Hide password" : "Show password"}
      onClick={onClick}
      className="text-neutral-400 transition hover:text-white focus:outline-none"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

function AuthModeBadge({ mode }: { mode: AuthMode }) {
  const Icon =
    mode === "register" ? PartyPopper : mode === "login" ? TicketCheck : Lock;

  return (
    <motion.div
      key={mode === "register" || mode === "login" ? mode : "recovery"}
      initial={{ opacity: 0, scale: 0.9, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-primary-500/35 bg-[radial-gradient(circle_at_35%_20%,rgba(255,255,255,0.16),transparent_34%),linear-gradient(145deg,rgba(154,70,255,0.22),rgba(28,0,58,0.22))] text-primary-100 shadow-[0_0_28px_rgba(154,70,255,0.22)]"
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={2.15} />
    </motion.div>
  );
}

function VerificationDigits({
  code,
  setCode,
}: {
  code: string;
  setCode: (value: string) => void;
}) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const handleDigitInput = (digit: string, index: number) => {
    const digits = code.padEnd(6, " ").split("");
    digits[index] = digit.replace(/\D/g, "").slice(-1);
    setCode(digits.join("").trim());
    if (digit && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="grid grid-cols-6 gap-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <input
          key={index}
          ref={(node) => {
            inputsRef.current[index] = node;
          }}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Verification digit ${index + 1}`}
          value={code[index] ?? ""}
          onChange={(event) => handleDigitInput(event.target.value, index)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          className="h-12 rounded-xl border border-white/10 bg-white/[0.04] text-center text-lg font-bold text-white outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
        />
      ))}
    </div>
  );
}

export default function TixsyAuthPage({ initialMode }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, error, fieldErrors, loading } = useAuth();

  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const authHref = (target: AuthTab) => {
    const query =
      callbackUrl !== "/"
        ? `?callbackUrl=${encodeURIComponent(callbackUrl)}`
        : "";
    return `/auth/${target}${query}`;
  };

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [flowLoading, setFlowLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [focused, setFocused] = useState<FieldName | null>(null);
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({
    username: false,
    email: false,
    password: false,
    agreeTerms: false,
  });
  const [apiFieldErrors, setApiFieldErrors] = useState<{
    register: FieldErrors;
    login: FieldErrors;
  }>({ register: {}, login: {} });
  const [apiGlobalErrors, setApiGlobalErrors] = useState<{
    register: string | null;
    login: string | null;
  }>({ register: null, login: null });

  const lastSubmitModeRef = useRef<AuthTab | null>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.endsWith("/register")) setAuthTab("register", false);
      if (path.endsWith("/login")) setAuthTab("login", false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const submittedMode = lastSubmitModeRef.current;
    if (!submittedMode) return;

    const nextFieldErrors = (fieldErrors ?? {}) as FieldErrors;
    setApiFieldErrors((prev) => ({
      ...prev,
      [submittedMode]: {
        ...prev[submittedMode],
        ...nextFieldErrors,
      },
    }));
    setApiGlobalErrors((prev) => ({
      ...prev,
      [submittedMode]: error ?? null,
    }));
  }, [error, fieldErrors]);

  const passwordStrengthError = useMemo(() => {
    if (mode !== "register" || password.length === 0) return null;
    if (password.length < 8) return "At least 8 characters.";
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    if (!(hasLower && hasUpper && hasDigit)) {
      return "Use upper and lower case, plus a number.";
    }
    const lowered = password.toLowerCase();
    const local = (email.split("@")[0] ?? "").toLowerCase();
    if (username && lowered.includes(username.toLowerCase())) {
      return "Password must not contain your username.";
    }
    if (local && lowered.includes(local)) {
      return "Password must not contain your email name.";
    }
    return null;
  }, [email, mode, password, username]);

  const uiErrors: Record<FieldName, string | null> = {
    username:
      touched.username && !username.trim() ? "Username is required." : null,
    email:
      touched.email &&
      (mode === "register" || mode === "forgot") &&
      !email.trim()
        ? "Email is required."
        : null,
    password:
      touched.password && !password.trim() ? "Password is required." : null,
    agreeTerms:
      touched.agreeTerms && mode === "register" && !agreeTerms
        ? "Please agree before creating your account."
        : null,
  };

  const isAuthTab = (value: AuthMode): value is AuthTab =>
    value === "login" || value === "register";

  const getApiFieldError = (field: FieldName): string | null => {
    if (!isAuthTab(mode)) return null;
    return apiFieldErrors[mode][field] ?? null;
  };

  const getApiGlobalError = (): string | null => {
    if (!isAuthTab(mode)) return null;
    return apiGlobalErrors[mode];
  };

  const allLoginEmpty = username.trim() === "" && password.trim() === "";
  const submitting = loading || flowLoading;

  const canSubmit = useMemo(() => {
    if (mode === "login") return Boolean(username.trim() && password.trim());
    if (mode === "register") {
      return Boolean(
        username.trim() &&
          email.trim() &&
          password.trim() &&
          agreeTerms &&
          !passwordStrengthError,
      );
    }
    if (mode === "forgot") return Boolean(email.trim());
    if (mode === "verify") return code.trim().length === 6;
    if (mode === "reset") {
      return Boolean(
        password.trim() &&
          confirmPassword.trim() &&
          password === confirmPassword &&
          password.length >= 8,
      );
    }
    return false;
  }, [
    agreeTerms,
    code,
    confirmPassword,
    email,
    mode,
    password,
    passwordStrengthError,
    username,
  ]);

  const setAuthTab = (nextMode: AuthTab, updateUrl = false) => {
    setMode(nextMode);
    setNotice(null);
    setLocalError(null);
    setFocused(null);
    setTouched({
      username: false,
      email: false,
      password: false,
      agreeTerms: false,
    });

    if (updateUrl && typeof window !== "undefined") {
      window.history.pushState(null, "", authHref(nextMode));
    }
  };

  const clearApiFieldError = (field: FieldName) => {
    if (!isAuthTab(mode)) return;
    setApiFieldErrors((prev) => {
      const current = prev[mode];
      if (!current[field]) return prev;
      const nextTabErrors = { ...current };
      delete nextTabErrors[field];
      return { ...prev, [mode]: nextTabErrors };
    });
  };

  const markBlur = (field: FieldName) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFocused((current) => (current === field ? null : current));
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    setNotice(null);
    setFlowLoading(true);

    try {
      if (mode === "forgot") {
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (!response.ok) throw new Error("Could not send the reset code.");
        setMode("verify");
        setNotice("Code sent. Check your inbox for the six-digit reset code.");
        return;
      }

      if (mode === "verify") {
        const response = await fetch("/api/auth/verify-2fa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code }),
        });
        if (!response.ok) throw new Error("Invalid or expired code.");
        setMode("reset");
        setNotice("Code verified. Choose a new password.");
        return;
      }

      if (mode === "reset") {
        if (password !== confirmPassword) {
          setLocalError("Passwords do not match.");
          return;
        }
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!response.ok) throw new Error("Password reset failed.");
        setPassword("");
        setConfirmPassword("");
        setCode("");
        setAuthTab("login", true);
        setNotice("Password updated. Log in with your username.");
        return;
      }

      if (mode === "register") {
        lastSubmitModeRef.current = "register";
        const ok = await register(
          username,
          email,
          password,
          agreeTerms,
          referralCode,
        );
        if (ok) {
          router.replace(callbackUrl);
          router.refresh();
        } else {
          setTouched({
            username: true,
            email: true,
            password: true,
            agreeTerms: true,
          });
        }
        return;
      }

      lastSubmitModeRef.current = "login";
      const ok = await login(username, password, rememberMe);
      if (ok) {
        router.replace(callbackUrl);
        router.refresh();
      } else {
        setTouched({
          username: true,
          email: true,
          password: true,
          agreeTerms: true,
        });
      }
    } catch (submitError) {
      setLocalError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setFlowLoading(false);
    }
  }

  const handleResend = async () => {
    setResendLoading(true);
    setLocalError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error("Failed to resend code.");
      setNotice("Code resent. Check your inbox.");
    } catch {
      setLocalError("Error sending code. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const formTitle =
    mode === "login"
      ? "Welcome back"
      : mode === "register"
        ? "Create your Tixsy account"
        : mode === "forgot"
          ? "Reset your password"
          : mode === "verify"
            ? "Enter your code"
            : "Create new password";

  const formSubtitle =
    mode === "login"
      ? "Sign in to manage tickets, events, and checkout faster."
      : mode === "register"
        ? "Join Tixsy and keep your tickets, events, and seller tools in one place."
        : mode === "forgot"
          ? "Enter your email and we will send a six-digit reset code."
          : mode === "verify"
            ? `Use the six-digit code sent to ${email}.`
            : "Choose a new password for your Tixsy account.";

  const submitLabel =
    mode === "login"
      ? "Log in"
      : mode === "register"
        ? "Register now"
        : mode === "forgot"
          ? "Send reset code"
          : mode === "verify"
            ? "Verify code"
            : "Reset password";

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-[minmax(420px,44%)_1fr]">
        <section className="relative flex min-h-screen items-center justify-center overflow-y-auto px-4 py-10 sm:px-8 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(154,70,255,0.18),transparent_34%),linear-gradient(180deg,#08080f_0%,#050509_100%)]" />
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.34, ease: "easeOut" }}
            className="relative z-10 w-full max-w-[460px] rounded-[24px] border border-white/10 bg-black/30 px-5 py-6 shadow-[0_26px_90px_rgba(0,0,0,0.66)] backdrop-blur-xl sm:px-7 sm:py-7 lg:max-w-[480px]"
          >
            <Link
              href="/"
              aria-label="Go to Tixsy home"
              className="mx-auto mb-7 flex w-fit items-center"
            >
              <Image
                src="/Logo.svg"
                alt="Tixsy"
                width={98}
                height={41}
                priority
                className="h-auto w-[98px]"
              />
            </Link>

            {(mode === "login" || mode === "register") && (
              <div className="relative mb-7 flex">
                {(["register", "login"] as AuthTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setAuthTab(tab, true)}
                    className={clsx(
                      "flex-1 px-3 pb-4 text-center text-sm font-semibold leading-none transition-colors",
                      mode === tab ? "text-white" : "text-neutral-400",
                    )}
                  >
                    {tab === "register" ? "Sign up" : "Login"}
                  </button>
                ))}
                <div className="absolute bottom-0 left-0 h-px w-full bg-white/10" />
                <motion.div
                  layout
                  className={clsx(
                    "absolute bottom-0 h-[2px] w-1/2 bg-primary-500",
                    mode === "register" ? "left-0" : "left-1/2",
                  )}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                />
              </div>
            )}

            <motion.div
              key={`heading-${mode}`}
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mb-6 text-center"
            >
              <AuthModeBadge mode={mode} />
              <h1 className="mx-auto max-w-[390px] text-[30px] font-black leading-[1.05] text-white sm:text-[34px]">
                {formTitle}
              </h1>
              <p className="mx-auto mt-3 max-w-[360px] text-sm leading-6 text-neutral-400">
                {formSubtitle}
              </p>
            </motion.div>

            <motion.form
              key={`form-${mode}`}
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.18, ease: "easeOut" }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {(mode === "login" || mode === "register") && (
                <>
                  <LabelledInput
                    label="Username*"
                    placeholder="Enter username"
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value);
                      clearApiFieldError("username");
                    }}
                    onFocus={() => setFocused("username")}
                    onBlur={() => markBlur("username")}
                    id="auth-username"
                    name="username"
                    autoComplete="username"
                    size="md"
                    variant="frosted"
                    icon={<User className="h-4 w-4" />}
                    iconClassName="text-neutral-400"
                    error={
                      focused === "username"
                        ? null
                        : uiErrors.username ||
                          getApiFieldError("username") ||
                          null
                    }
                  />

                  {mode === "register" && (
                    <LabelledInput
                      label="Email*"
                      type="email"
                      placeholder="Enter email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        clearApiFieldError("email");
                      }}
                      onFocus={() => setFocused("email")}
                      onBlur={() => markBlur("email")}
                      id="auth-email"
                      name="email"
                      autoComplete="email"
                      size="md"
                      variant="frosted"
                      icon={<Mail className="h-4 w-4" />}
                      iconClassName="text-neutral-400"
                      error={
                        focused === "email"
                          ? null
                          : uiErrors.email || getApiFieldError("email") || null
                      }
                    />
                  )}

                  <div>
                    <LabelledInput
                      label="Password*"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        clearApiFieldError("password");
                      }}
                      onFocus={() => setFocused("password")}
                      onBlur={() => markBlur("password")}
                      id="auth-password"
                      name="password"
                      autoComplete={
                        mode === "register"
                          ? "new-password"
                          : "current-password"
                      }
                      size="md"
                      variant="frosted"
                      icon={<Lock className="h-4 w-4" />}
                      iconClassName="text-neutral-400"
                      endAdornment={
                        <PasswordEye
                          shown={showPassword}
                          onClick={() => setShowPassword((shown) => !shown)}
                        />
                      }
                      error={
                        focused === "password"
                          ? null
                          : mode === "login"
                            ? getApiFieldError("password") ||
                              (allLoginEmpty ? null : getApiGlobalError()) ||
                              uiErrors.password ||
                              null
                            : uiErrors.password ||
                              passwordStrengthError ||
                              getApiFieldError("password") ||
                              null
                      }
                    />

                    {mode === "login" && (
                      <button
                        type="button"
                        className="ml-auto mt-2 flex text-sm font-medium text-primary-300 transition hover:text-primary-200 hover:underline"
                        onClick={() => {
                          setMode("forgot");
                          setNotice(null);
                          setLocalError(null);
                        }}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>

                  {mode === "register" ? (
                    <>
                      <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-neutral-300">
                        <input
                          type="checkbox"
                          checked={agreeTerms}
                          onChange={(event) => {
                            setAgreeTerms(event.target.checked);
                            clearApiFieldError("agreeTerms");
                          }}
                          onBlur={() => markBlur("agreeTerms")}
                          className="mt-1 h-4 w-4 rounded border-white/20 bg-white/[0.04] text-primary-500 focus:ring-primary-500"
                        />
                        <span>
                          I agree to the Terms &amp; Conditions and Privacy
                          Policy.
                        </span>
                      </label>
                      {(uiErrors.agreeTerms ||
                        getApiFieldError("agreeTerms")) && (
                        <p className="text-xs leading-snug text-error-500">
                          {uiErrors.agreeTerms ||
                            getApiFieldError("agreeTerms")}
                        </p>
                      )}

                      <details className="group border-y border-white/10 py-4">
                        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-white">
                          <span>Referral Code (Optional)</span>
                          <ChevronDown className="h-5 w-5 transition group-open:rotate-180" />
                        </summary>
                        <div className="mt-3">
                          <LabelledInput
                            noLabel
                            placeholder="Referral code"
                            value={referralCode}
                            onChange={(event) =>
                              setReferralCode(event.target.value)
                            }
                            maxLength={32}
                            size="md"
                            variant="frosted"
                          />
                        </div>
                      </details>
                    </>
                  ) : (
                    <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-300">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(event) => setRememberMe(event.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-white/[0.04] text-primary-500 focus:ring-primary-500"
                      />
                      <span>Remember me</span>
                    </label>
                  )}
                </>
              )}

              {mode === "forgot" && (
                <LabelledInput
                  label="Email address*"
                  type="email"
                  placeholder="Enter email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onFocus={() => setFocused("email")}
                  onBlur={() => markBlur("email")}
                  id="forgot-email"
                  name="email"
                  autoComplete="email"
                  size="md"
                  variant="frosted"
                  icon={<Mail className="h-4 w-4" />}
                  iconClassName="text-neutral-400"
                  error={focused === "email" ? null : uiErrors.email}
                />
              )}

              {mode === "verify" && (
                <div className="space-y-4">
                  <VerificationDigits code={code} setCode={setCode} />
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="mx-auto flex text-sm font-medium text-primary-300 transition hover:text-primary-200 hover:underline disabled:opacity-50"
                  >
                    {resendLoading ? "Sending..." : "Resend code"}
                  </button>
                </div>
              )}

              {mode === "reset" && (
                <>
                  <LabelledInput
                    label="New Password*"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    id="new-password"
                    name="new-password"
                    autoComplete="new-password"
                    size="md"
                    variant="frosted"
                    icon={<Lock className="h-4 w-4" />}
                    iconClassName="text-neutral-400"
                    endAdornment={
                      <PasswordEye
                        shown={showNewPassword}
                        onClick={() =>
                          setShowNewPassword((shown) => !shown)
                        }
                      />
                    }
                  />
                  <LabelledInput
                    label="Confirm New Password*"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    id="confirm-new-password"
                    name="confirm-new-password"
                    autoComplete="new-password"
                    size="md"
                    variant="frosted"
                    icon={<Lock className="h-4 w-4" />}
                    iconClassName="text-neutral-400"
                    endAdornment={
                      <PasswordEye
                        shown={showConfirmPassword}
                        onClick={() =>
                          setShowConfirmPassword((shown) => !shown)
                        }
                      />
                    }
                    error={
                      confirmPassword && password !== confirmPassword
                        ? "Passwords do not match."
                        : null
                    }
                  />
                </>
              )}

              {notice && (
                <div className="flex items-start gap-2 rounded-xl border border-success-500/20 bg-success-500/10 p-3 text-sm leading-6 text-success-200">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{notice}</span>
                </div>
              )}

              {(localError ||
                (isAuthTab(mode) && mode !== "login" && getApiGlobalError())) && (
                <div className="rounded-xl border border-error-500/20 bg-error-500/10 p-3 text-sm leading-6 text-error-200">
                  {localError || getApiGlobalError()}
                </div>
              )}

              <Button
                type="submit"
                variant="premium"
                size="md"
                loading={submitting}
                disabled={!canSubmit || submitting}
                animation
                className="h-12 w-full text-sm font-bold"
              >
                {submitLabel}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </Button>

              {(mode === "login" || mode === "register") && (
                <>
                  <p className="text-center text-sm text-neutral-500">
                    Or continue with
                  </p>
                  <Button
                    type="button"
                    size="md"
                    variant="default"
                    className="h-12 w-full border border-white/5 bg-white/[0.04] hover:border-primary-500"
                    icon={<GoogleIcon />}
                  >
                    Google
                  </Button>
                </>
              )}
            </motion.form>

            {mode === "login" && (
              <p className="mt-7 text-center text-sm leading-6 text-neutral-400">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setAuthTab("register", true)}
                  className="font-semibold text-primary-300 transition hover:text-primary-200"
                >
                  Sign up for free
                </button>
              </p>
            )}

            {mode === "register" && (
              <p className="mt-7 text-center text-sm leading-6 text-neutral-400">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setAuthTab("login", true)}
                  className="font-semibold text-primary-300 transition hover:text-primary-200"
                >
                  Log in
                </button>
              </p>
            )}

            {(mode === "forgot" || mode === "verify" || mode === "reset") && (
              <p className="mt-7 text-center text-sm leading-6 text-neutral-400">
                Remembered it?{" "}
                <button
                  type="button"
                  onClick={() => setAuthTab("login", true)}
                  className="font-semibold text-primary-300 transition hover:text-primary-200 hover:underline"
                >
                  Back to login
                </button>
              </p>
            )}
          </motion.div>
        </section>

        <aside className="relative hidden min-h-screen lg:block">
          <TixsyAnimatedBackground />
        </aside>
      </div>
    </div>
  );
}
