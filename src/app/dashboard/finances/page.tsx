import { redirect } from "next/navigation";

export default function FinancesIndexPage() {
  redirect("/dashboard/finances/revenue");
}
