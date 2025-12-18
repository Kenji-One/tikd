// src/app/account/page.tsx
import { redirect } from "next/navigation";

export default function AccountRootPage() {
  redirect("/account/settings");
}
