/* ------------------------------------------------------------------ */
/*  src/app/dashboard/page.tsx                                        */
/* ------------------------------------------------------------------ */

import DashboardClient from "./DashboardClient";

export default function DashboardPage() {
  return (
    <div className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      <section className="pb-8 md:pb-20">
        <DashboardClient />
      </section>
    </div>
  );
}
