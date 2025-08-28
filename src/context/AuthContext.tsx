// src/context/AuthContext.tsx
"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { signIn } from "next-auth/react";

type FieldErrors = Partial<{
  username: string;
  email: string;
  password: string;
  agreeTerms: string;
}>;

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid username or password.",
  default: "Something went wrong. Please try again.",
};

interface AuthContextShape {
  loading: boolean;
  error: string | null;
  fieldErrors: FieldErrors;
  clearErrors: () => void;
  login: (
    username: string,
    password: string,
    remember?: boolean
  ) => Promise<boolean>;
  register: (
    username: string,
    email: string,
    password: string,
    agreeTerms: boolean,
    referralCode?: string
  ) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextShape>({
  loading: false,
  error: null,
  fieldErrors: {},
  clearErrors: () => {},
  login: async () => false,
  register: async () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const clearErrors = () => {
    setError(null);
    setFieldErrors({});
  };

  const login = async (
    username: string,
    password: string,
    remember = true
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const res = await signIn("credentials", {
      redirect: false,
      username: username.trim().toLowerCase(),
      password,
      remember: remember ? "true" : "false",
    });

    let ok = true;
    if (!res) {
      setError(AUTH_ERROR_MESSAGES.default);
      setFieldErrors({ password: AUTH_ERROR_MESSAGES.default });
      ok = false;
    } else if (res.error) {
      const msg = AUTH_ERROR_MESSAGES[res.error] ?? AUTH_ERROR_MESSAGES.default;
      setError(msg);
      setFieldErrors({ password: msg }); // show under password for login
      ok = false;
    }

    setLoading(false);
    return ok;
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    agreeTerms: boolean,
    referralCode = ""
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          agreeTerms,
          referralCode,
        }),
      });

      type RegisterResponse = { error?: string; errors?: FieldErrors };
      const j: RegisterResponse = await r
        .json()
        .catch(() => ({}) as RegisterResponse);

      if (!r.ok) {
        if (j?.errors && typeof j.errors === "object") {
          setFieldErrors(j.errors);
        } else {
          setError(j?.error || "Registration failed.");
        }
        setLoading(false);
        return false;
      }

      // Auto-login with USERNAME (credentials provider expects username)
      const ok = await login(username, password, true);
      setLoading(false);
      return ok;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{ loading, error, fieldErrors, clearErrors, login, register }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
