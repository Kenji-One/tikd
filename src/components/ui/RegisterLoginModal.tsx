"use client";

import { useEffect, useState, FormEvent, useRef } from "react";
import { Dialog, DialogPanel, Checkbox, Field, Label } from "@headlessui/react";
import Image from "next/image";
import clsx from "classnames";
import { useAuth } from "@/context/AuthContext";
import LabelledInput from "@/components/ui/LabelledInput";
import { Button } from "@/components/ui/Button";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
}

export default function RegisterLoginModal({
  isOpen,
  onClose,
  initialMode = "register",
}: Props) {
  /* ――― state ――― */
  type Mode = "register" | "login" | "forgot" | "verify" | "reset";
  type ModeTab = "register" | "login";
  type FieldName = "username" | "email" | "password";
  type FieldErrors = Partial<Record<FieldName, string>>;

  const [mode, setMode] = useState<Mode>(initialMode);

  /* Auth context (we’ll capture its errors and scope them to a tab locally) */
  const { login, register, error, fieldErrors, loading } = useAuth();

  /* form values */
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [code, setCode] = useState(""); // 6-digit 2FA code
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  /* required-on-blur + reset-error-on-focus */
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({
    username: false,
    email: false,
    password: false,
  });
  const [focused, setFocused] = useState<FieldName | null>(null);

  /* ★ keep local mode in-sync with prop */
  useEffect(() => setMode(initialMode), [initialMode]);

  /* ──────────────────────────────────────────────────────────────────────
     Local, per-tab API error store
     - Keeps API field + global errors separately for login and register
     - We only render the active tab’s errors; no bleed across tabs
     - We clear only the changed field’s error on change
  ────────────────────────────────────────────────────────────────────── */
  const [apiFieldErrors, setApiFieldErrors] = useState<{
    register: FieldErrors;
    login: FieldErrors;
  }>({ register: {}, login: {} });

  const [apiGlobalErrors, setApiGlobalErrors] = useState<{
    register: string | null;
    login: string | null;
  }>({ register: null, login: null });

  const lastSubmitModeRef = useRef<ModeTab | null>(null);

  /* Capture latest context auth errors into the correct tab bucket
     right after a submit that failed. */
  useEffect(() => {
    const m = lastSubmitModeRef.current;
    if (!m) return;

    const fe = (fieldErrors ?? {}) as FieldErrors;
    setApiFieldErrors((prev) => ({
      ...prev,
      [m]: { ...prev[m], ...fe },
    }));
    setApiGlobalErrors((prev) => ({
      ...prev,
      [m]: error ?? null,
    }));
    // do NOT reset lastSubmitModeRef; we keep it for subsequent updates until next submit
    // because context might update error/fieldErrors once.
  }, [error, fieldErrors]);

  /* Password policy (register only) */
  const getPasswordPolicyError = (
    pw: string,
    uname: string,
    mail: string
  ): string | null => {
    if (!pw) return "Password is required.";
    if (pw.length < 8) return "At least 8 characters.";
    const hasLower = /[a-z]/.test(pw);
    const hasUpper = /[A-Z]/.test(pw);
    const hasDigit = /\d/.test(pw);
    if (!(hasLower && hasUpper && hasDigit)) {
      return "Use upper & lower case, and a number.";
    }
    const lowered = pw.toLowerCase();
    const local = (mail.split("@")[0] ?? "").toLowerCase();
    if (uname && lowered.includes(uname.toLowerCase()))
      return "Password must not contain your username.";
    if (local && lowered.includes(local))
      return "Password must not contain your email name.";
    return null;
  };

  const passwordStrengthError =
    mode === "register" && password.length > 0
      ? getPasswordPolicyError(password, username, email)
      : null;

  /* ――― client “required” errors (only after blur) ――― */
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
  };

  /* helpers to read active tab safely */
  const isAuthTab = (m: Mode): m is ModeTab =>
    m === "login" || m === "register";
  const getApiFieldError = (field: FieldName): string | null => {
    if (!isAuthTab(mode)) return null;
    return apiFieldErrors[mode][field] ?? null;
  };
  const getApiGlobalErrorForTab = (): string | null => {
    if (!isAuthTab(mode)) return null;
    return apiGlobalErrors[mode];
  };

  /* ――― validation ――― */
  const canSubmit = (() => {
    if (mode === "login") return Boolean(username.trim() && password.trim());
    if (mode === "register")
      return (
        Boolean(username) &&
        Boolean(email) &&
        Boolean(password) &&
        agreeTerms &&
        !passwordStrengthError
      );
    if (mode === "forgot") return Boolean(email.trim());
    if (mode === "verify") return code.trim().length === 6;
    if (mode === "reset")
      return (
        Boolean(password.trim()) &&
        Boolean(confirmPassword.trim()) &&
        password === confirmPassword
      );
    return false;
  })();

  /* ――― submit ――― */
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (mode === "forgot") {
        await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        setMode("verify");
        return;
      }

      if (mode === "verify") {
        const res = await fetch("/api/auth/verify-2fa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code }),
        });
        if (res.ok) setMode("reset");
        else console.error("Invalid code");
        return;
      }

      if (mode === "reset") {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) throw new Error("Reset failed");
        const ok = await login(username, password, rememberMe);
        if (ok) onClose();
        return;
      }

      if (mode === "register") {
        lastSubmitModeRef.current = "register";
        const ok = await register(
          username,
          email,
          password,
          agreeTerms,
          referralCode
        );
        if (ok) onClose();
        else setTouched({ username: true, email: true, password: true });
        return;
      }

      if (mode === "login") {
        lastSubmitModeRef.current = "login";
        const ok = await login(username, password, rememberMe);
        if (ok) onClose();
        else setTouched({ username: true, email: true, password: true });
        return;
      }
    } catch (err) {
      console.error(err);
    }
  }

  /* Resend (verify step) */
  const handleResend = async () => {
    setResendLoading(true);
    setResendMessage(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed to resend code");
      setResendMessage("Code resent! Check your inbox.");
    } catch {
      setResendMessage("Error sending code. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  /* 2FA code helpers */
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const handleDigitInput = (digit: string, idx: number) => {
    const arr = code.padEnd(6, " ").split("");
    arr[idx] = digit.slice(-1);
    setCode(arr.join("").trim());
    if (digit && idx < 5) inputsRef.current[idx + 1]?.focus();
  };
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  /* focus/blur markers (for showing required errors only after blur) */
  const markBlur = (name: FieldName) =>
    setTouched((t) => ({ ...t, [name]: true }));
  const markFocus = (name: FieldName) => setFocused(name);
  const clearFocus = (name: FieldName) =>
    setFocused((f) => (f === name ? null : f));

  /* Helper: all empty per mode (used for login’s global error suppression) */
  const isAllEmpty = (current: Mode): boolean => {
    if (current === "login") {
      return username.trim() === "" && password.trim() === "";
    }
    if (current === "register") {
      return (
        username.trim() === "" &&
        email.trim() === "" &&
        password.trim() === "" &&
        referralCode.trim() === ""
      );
    }
    return false;
  };

  /* Tab change:
     - NEVER reset inputs
     - Reset client “required” errors (touched) so required messages don’t linger
     - Do NOT clear API errors (they’re scoped and won’t show on the other tab anyway) */
  const handleTabChange = (next: ModeTab): void => {
    setMode(next);
    setTouched({ username: false, email: false, password: false });
    setFocused(null);
  };

  /* Per-field change handlers:
     - update value
     - clear ONLY that field’s API error for the active tab
     - (leave global error as-is until next submit) */
  const clearApiFieldErrorForActiveTab = (field: FieldName) => {
    if (!isAuthTab(mode)) return;
    setApiFieldErrors((prev) => {
      const current = prev[mode];
      if (!current[field]) return prev;
      const nextTabErrors = { ...current };
      delete nextTabErrors[field];
      return { ...prev, [mode]: nextTabErrors };
    });
  };

  const onChangeUsername = (v: string) => {
    setUsername(v);
    clearApiFieldErrorForActiveTab("username");
  };
  const onChangeEmail = (v: string) => {
    setEmail(v);
    // Only register uses email among tabs; still scoped by active tab
    clearApiFieldErrorForActiveTab("email");
  };
  const onChangePassword = (v: string) => {
    setPassword(v);
    clearApiFieldErrorForActiveTab("password");
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
    >
      {/* overlay */}
      <div className="fixed inset-0 bg-[#08080FB2]" aria-hidden />

      <DialogPanel
        className={clsx(
          mode === "forgot" || mode === "verify" || mode === "reset"
            ? "min-h-[674px]"
            : "min-h-[758px]",
          "relative flex w-full max-w-[960px] overflow-hidden rounded-2xl bg-neutral-950"
        )}
      >
        {/* Left graphic – unchanged */}
        <div className="relative hidden w-1/2 lg:block">
          <Image
            src="/assets/loginRegisterModalFrame.svg"
            alt=""
            fill
            className="object-cover"
            priority
          />

          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="67"
            height="24"
            viewBox="0 0 67 24"
            fill="none"
            className="absolute left-1/2 top-6 -translate-x-1/2"
          >
            <g clipPath="url(#clip0_539_1330)">
              <path
                d="M0.0435181 1.33157H16.8467V7.48217H11.6155V23.5244H5.27469V7.48217H0.0435181V1.33157Z"
                fill="white"
              />
              <path
                d="M22.9911 5.51651C22.357 6.15059 21.6067 6.46764 20.7401 6.46764C19.8735 6.46764 19.1021 6.15059 18.4257 5.51651C17.7916 4.84016 17.4746 4.07926 17.4746 3.23382C17.4746 2.36724 17.7916 1.61691 18.4257 0.982827C19.0809 0.327609 19.8524 0 20.7401 0C21.6067 0 22.357 0.327609 22.9911 0.982827C23.6463 1.61691 23.9739 2.36724 23.9739 3.23382C23.9739 4.1004 23.6463 4.86129 22.9911 5.51651ZM23.6569 23.5244H17.7916V7.67239H23.6569V23.5244Z"
                fill="white"
              />
              <path
                d="M36.581 15.5984L41.7171 23.5244H35.2177L31.4132 17.1836V23.5244H25.548V1.33157H31.4132V13.823L34.7422 7.67239H41.4L36.581 15.5984Z"
                fill="white"
              />
              <path
                d="M52.0415 9.09908V1.33157H57.9067V23.5244H52.0415V22.0978C51.0269 23.3448 49.6108 23.9683 47.7931 23.9683C45.6584 23.9683 43.9146 23.1757 42.5619 21.5905C41.2092 20.0264 40.5329 18.0291 40.5329 15.5984C40.5329 13.1678 41.2092 11.1704 42.5619 9.60634C43.9146 8.02114 45.6584 7.22854 47.7931 7.22854C49.6108 7.22854 51.0269 7.85205 52.0415 9.09908ZM47.159 17.7226C47.7086 18.2933 48.3955 18.5786 49.2198 18.5786C50.0652 18.5786 50.7416 18.2933 51.2488 17.7226C51.7772 17.1519 52.0415 16.4439 52.0415 15.5984C52.0415 14.753 51.7772 14.0449 51.2488 13.4742C50.7416 12.9036 50.0652 12.6182 49.2198 12.6182C48.3955 12.6182 47.7086 12.9036 47.159 13.4742Z"
                fill="white"
              />
              <path
                d="M65.8786 22.9538C65.1811 23.6513 64.3251 24 63.3105 24C62.296 24 61.4294 23.6513 60.7108 22.9538C60.0133 22.2351 59.6646 21.3686 59.6646 20.354C59.6646 19.3395 60.0133 18.4835 60.7108 17.786C61.4294 17.0674 62.296 16.7081 63.3105 16.7081C64.3251 16.7081 65.1811 17.0674 65.8786 17.786C66.5972 18.4835 66.9565 19.3395 66.9565 20.354C66.9565 21.3686 66.5972 22.2351 65.8786 22.9538Z"
                fill="#6100EA"
              />
            </g>
            <defs>
              <clipPath id="clip0_539_1330">
                <rect width="67" height="24" fill="white" />
              </clipPath>
            </defs>
          </svg>
          <h2 className="absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 text-[81.101px] text-center text-white tracking-[-1.622px] uppercase italic leading-[80%] font-[950]">
            LET’s PARTY!
          </h2>
        </div>

        {/* Right panel */}
        <div
          className={clsx(
            (mode === "forgot" || mode === "verify" || mode === "reset") &&
              "flex flex-col items-center justify-center",
            "w-full overflow-y-auto p-6 text-white sm:p-10 lg:w-1/2"
          )}
        >
          {/* close */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-0 top-0 p-3 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M6 18L18 6M6 6L18 18"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {(mode === "login" || mode === "register") && (
            <div className="relative mb-10 flex">
              {["register", "login"].map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => handleTabChange(t as ModeTab)}
                  className={clsx(
                    "flex-1 pb-5 px-3 leading-[90%] transition-colors cursor-pointer",
                    mode === t ? "text-white" : "text-neutral-400"
                  )}
                >
                  {t === "register" ? "Sign up" : "Login"}
                </button>
              ))}

              {/* bottom borders + slider – unchanged */}
              <div className="absolute bottom-0 left-0 h-[1.5px] w-full bg-[#171721]" />
              <div
                className={clsx(
                  "absolute bottom-0 h-[2px] w-1/2 bg-purple-500 transition-transform duration-300",
                  mode === "register" ? "translate-x-0" : "translate-x-full"
                )}
              />
            </div>
          )}

          {/* Title */}
          <h2
            className={clsx(
              mode === "reset" ? "mb-10" : "mb-4",
              "text-xl font-medium tracking-[-0.8px] leading-[100%] text-center"
            )}
          >
            {mode === "forgot" && "Forgot Password"}
            {mode === "verify" && "Enter your 2FA code"}
            {mode === "reset" && "Create New Password"}
          </h2>
          {(mode === "forgot" || mode === "verify") && (
            <p className="text-xs font-light text-text-tertiary mb-10 text-center max-w-[308px]">
              {mode === "forgot" &&
                "Please enter your email address, we’ll send your verification details there."}
              {mode === "verify" &&
                `Please enter the 2FA code sent to ${email}`}
            </p>
          )}

          {/* ───── form ───── */}
          <form
            onSubmit={handleSubmit}
            className={clsx(
              mode === "forgot" || mode === "verify" || mode === "reset"
                ? "space-y-10"
                : "space-y-6",
              " w-full"
            )}
          >
            {/* ───── Forgot / Verify / Reset flows ───── */}
            {mode === "forgot" && (
              <LabelledInput
                label="Enter your email address"
                type="email"
                placeholder="Enter Email Address"
                value={email}
                onChange={(e) => onChangeEmail(e.target.value)}
                onFocus={() => markFocus("email")}
                onBlur={() => {
                  markBlur("email");
                  clearFocus("email");
                }}
                error={focused === "email" ? null : uiErrors.email}
              />
            )}

            {mode === "verify" && (
              <div className="flex justify-center space-x-3 mb-6">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputsRef.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={code[idx] || ""}
                    onChange={(e) => handleDigitInput(e.target.value, idx)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    className="w-10 h-10 rounded-full bg-[#171721] border border-transparent text-center focus:border-primary-500 focus:outline-none"
                  />
                ))}
              </div>
            )}

            {mode === "reset" && (
              <>
                <LabelledInput
                  label="New Password*"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => onChangePassword(e.target.value)}
                  endAdornment={
                    <button
                      type="button"
                      aria-label={
                        showNewPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowNewPassword((s) => !s)}
                      className="text-neutral-400 hover:text-white focus:outline-none"
                    >
                      {showNewPassword ? (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M1.667 10s3.5-6 8.333-6S18.333 10 18.333 10s-3.5 6-8.333 6S1.667 10 1.667 10Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <circle
                            cx="10"
                            cy="10"
                            r="3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        </svg>
                      ) : (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M1.667 10s3.5-6 8.333-6S18.333 10 18.333 10s-3.5 6-8.333 6S1.667 10 1.667 10Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <circle
                            cx="10"
                            cy="10"
                            r="3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M3 3L17 17"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </button>
                  }
                />

                <LabelledInput
                  label="Confirm New Password*"
                  type={showConfirmNewPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  endAdornment={
                    <button
                      type="button"
                      aria-label={
                        showConfirmNewPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      onClick={() => setShowConfirmNewPassword((s) => !s)}
                      className="text-neutral-400 hover:text-white focus:outline-none"
                    >
                      {showConfirmNewPassword ? (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M1.667 10s3.5-6 8.333-6S18.333 10 18.333 10s-3.5 6-8.333 6S1.667 10 1.667 10Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <circle
                            cx="10"
                            cy="10"
                            r="3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        </svg>
                      ) : (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M1.667 10s3.5-6 8.333-6S18.333 10 18.333 10s-3.5 6-8.333 6S1.667 10 1.667 10Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <circle
                            cx="10"
                            cy="10"
                            r="3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M3 3L17 17"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </button>
                  }
                />
              </>
            )}

            {(mode === "register" || mode === "login") && (
              <>
                <LabelledInput
                  label="Username*"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => onChangeUsername(e.target.value)}
                  onFocus={() => markFocus("username")}
                  onBlur={() => {
                    markBlur("username");
                    clearFocus("username");
                  }}
                  id="reg-username"
                  name="username"
                  autoComplete="username"
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
                    onChange={(e) => onChangeEmail(e.target.value)}
                    onFocus={() => markFocus("email")}
                    onBlur={() => {
                      markBlur("email");
                      clearFocus("email");
                    }}
                    id="reg-email"
                    name="email"
                    autoComplete="email"
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
                    onChange={(e) => onChangePassword(e.target.value)}
                    onInput={(e) =>
                      onChangePassword(
                        (e.currentTarget as HTMLInputElement).value
                      )
                    }
                    onFocus={() => markFocus("password")}
                    onBlur={() => {
                      markBlur("password");
                      clearFocus("password");
                    }}
                    id="reg-password"
                    name="password"
                    autoComplete={
                      mode === "register" ? "new-password" : "current-password"
                    }
                    error={
                      focused === "password"
                        ? null
                        : mode === "login"
                          ? // login: show tab-scoped api field error first, else tab-scoped global error
                            getApiFieldError("password") ||
                            (isAllEmpty(mode)
                              ? null
                              : getApiGlobalErrorForTab()) ||
                            uiErrors.password ||
                            null
                          : // register: required / strength / tab-scoped field API error
                            uiErrors.password ||
                            passwordStrengthError ||
                            getApiFieldError("password") ||
                            null
                    }
                    endAdornment={
                      <button
                        type="button"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onClick={() => setShowPassword((s) => !s)}
                        className="text-neutral-400 hover:text-white focus:outline-none"
                      >
                        {showPassword ? (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                          >
                            <path
                              d="M1.667 10s3.5-6 8.333-6S18.333 10 18.333 10s-3.5 6-8.333 6S1.667 10 1.667 10Z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <circle
                              cx="10"
                              cy="10"
                              r="3"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                          </svg>
                        ) : (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                          >
                            <path
                              d="M1.667 10s3.5-6 8.333-6S18.333 10 18.333 10s-3.5 6-8.333 6S1.667 10 1.667 10Z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <circle
                              cx="10"
                              cy="10"
                              r="3"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <path
                              d="M3 3L17 17"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        )}
                      </button>
                    }
                  />

                  {mode === "login" && (
                    <button
                      type="button"
                      className="flex mt-3 ml-auto text-white leading-[90%] hover:text-primary-500 hover:underline transition-colors cursor-pointer"
                      onClick={() => setMode("forgot")}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                {mode === "register" ? (
                  <>
                    {/* terms */}
                    <Field className="flex items-center gap-3 leading-[90%]">
                      <Checkbox
                        checked={agreeTerms}
                        onChange={setAgreeTerms}
                        className="group h-4 w-4 flex-shrink-0 rounded border border-white/20
                bg-[#171721] data-checked:bg-purple-600
                data-checked:border-purple-600"
                      >
                        {/* checkmark */}
                        <svg
                          viewBox="0 0 14 14"
                          className="stroke-white opacity-0 group-data-checked:opacity-100"
                          fill="none"
                        >
                          <path
                            d="M3 8L6 11L11 3.5"
                            strokeWidth={1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </Checkbox>

                      <Label className="cursor-pointer">
                        I agree to
                        the&nbsp;Terms&nbsp;&amp;&nbsp;Conditions&nbsp;and&nbsp;Privacy&nbsp;Policy
                      </Label>
                    </Field>

                    <details className="border-y border-[#171721] py-4 my-6 mb-10">
                      <summary className="cursor-pointer list-none flex items-center gap-2 justify-between">
                        <span className="text-sm font-normal leading-[90%]">
                          Referral Code (Optional)
                        </span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M15.8333 7.5L9.99996 13.3333L4.16663 7.5"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </summary>
                      {/* referral */}
                      <LabelledInput
                        className="mt-2"
                        noLabel
                        placeholder="Referral code (optional)"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value)}
                        maxLength={32}
                      />
                    </details>
                  </>
                ) : (
                  <Field className="flex items-center gap-2 text-sm mb-10">
                    <Checkbox
                      checked={rememberMe}
                      onChange={setRememberMe}
                      className="group h-4 w-4 flex-shrink-0 rounded border border-white/20
                bg-[#171721] data-checked:bg-purple-600
                data-checked:border-purple-600"
                    >
                      <svg
                        viewBox="0 0 14 14"
                        className="stroke-white opacity-0 group-data-checked:opacity-100"
                        fill="none"
                      >
                        <path
                          d="M3 8L6 11L11 3.5"
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Checkbox>

                    <Label className="cursor-pointer">Remember me</Label>
                  </Field>
                )}
              </>
            )}

            {/* Global API error (only for the active tab; never cross-tab) */}
            {isAuthTab(mode) &&
              mode !== "login" &&
              getApiGlobalErrorForTab() && (
                <p className="text-sm text-error-500">
                  {getApiGlobalErrorForTab()}
                </p>
              )}

            <Button
              type="submit"
              variant="brand"
              size="lg"
              loading={loading}
              disabled={!canSubmit || loading}
              className="w-full "
            >
              {
                {
                  register: "Register now",
                  login: "Log in",
                  forgot: "Reset Password",
                  verify: "Verify Code",
                  reset: "Reset Password",
                }[mode]
              }
            </Button>

            {/* Resend link under verify */}
            {mode === "verify" && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="text-xs underline font-light text-white hover:text-neutral-200 disabled:opacity-50 cursor-pointer transition-colors disabled:cursor-not-allowed"
                >
                  Resend code
                </button>
                {resendMessage && (
                  <p className="mt-2 text-xs text-neutral-400">
                    {resendMessage}
                  </p>
                )}
              </div>
            )}

            {(mode === "register" || mode === "login") && (
              <>
                <p className="text-center text-sm font-normal leading-[90%] text-neutral-500">
                  Or continue with
                </p>
                <div className="flex justify-between gap-4">
                  <Button
                    type="button"
                    size="lg"
                    variant="default"
                    className="w-full border border-transparent hover:border-primary-500"
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="15"
                        height="14"
                        viewBox="0 0 15 14"
                        fill="none"
                      >
                        <path
                          d="M7.58412 6.47499V8.06943H11.3952C11.2786 8.96388 10.9806 9.61867 10.5265 10.0785C9.96898 10.6361 9.10078 11.2452 7.58412 11.2452C5.23766 11.2452 3.40356 9.35277 3.40356 7.00631C3.40356 4.65985 5.23766 2.76742 7.58412 2.76742C8.84801 2.76742 9.77502 3.26666 10.4556 3.90832L11.577 2.78686C10.6306 1.86666 9.35988 1.16666 7.58412 1.16666C4.36946 1.16666 1.66669 3.78534 1.66669 6.99999C1.66669 10.2146 4.36946 12.8333 7.58412 12.8333C9.32099 12.8333 10.6306 12.2631 11.6543 11.2C12.7043 10.15 13.0349 8.66589 13.0349 7.47298C13.0349 7.10353 13.0091 6.75985 12.9508 6.47499H7.58412Z"
                          fill="white"
                        />
                      </svg>
                    }
                  >
                    Google
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      </DialogPanel>
    </Dialog>
  );
}
