import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      image?: string;
    };
    remember?: boolean; // 🔑 add
  }

  interface User {
    role: string;
    image?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    image?: string;
    remember?: boolean; // 🔑 add
  }
}
