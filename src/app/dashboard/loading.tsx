/* ------------------------------------------------------------------ */
/*  src/app/dashboard/loading.tsx                                     */
/* ------------------------------------------------------------------ */
export default function LoadingDashboard() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 rounded-xl bg-white/5" />
      <div className="grid gap-6 md:grid-cols-5">
        <div className="md:col-span-3 h-[200px] rounded-2xl bg-white/5" />
        <div className="md:col-span-1 h-[200px] rounded-2xl bg-white/5" />
        <div className="md:col-span-1 h-[200px] rounded-2xl bg-white/5" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-6 md:grid-cols-2">
          <div className="h-[260px] rounded-2xl bg-white/5" />
          <div className="h-[260px] rounded-2xl bg-white/5" />
          <div className="h-[260px] rounded-2xl bg-white/5 md:col-span-2" />
          <div className="h-[320px] rounded-2xl bg-white/5 md:col-span-2" />
        </div>
        <div className="space-y-6">
          <div className="h-[320px] rounded-2xl bg-white/5" />
          <div className="h-[360px] rounded-2xl bg-white/5" />
        </div>
      </div>
    </div>
  );
}
