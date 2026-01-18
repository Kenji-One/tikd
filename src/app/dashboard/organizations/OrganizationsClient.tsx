/* ------------------------------------------------------------------ */
/*  src/app/dashboard/organizations/OrganizationsClient.tsx           */
/* ------------------------------------------------------------------ */
"use client";

import { useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import ConnectionProfileCard, {
  type ConnectionProfileKind,
} from "@/components/connections/ConnectionProfileCard";

/* ------------------------------ Types ------------------------------ */
type Org = {
  _id: string;
  name: string;

  logo?: string;
  banner?: string;
  description?: string;

  totalMembers?: number;
  createdAt?: string;

  website?: string;
};

type CardRow = {
  id: string;
  kind: ConnectionProfileKind;
  href: string;
  title: string;
  description: string;
  bannerUrl?: string;
  iconUrl?: string;
  totalMembers?: number;
  joinDateLabel?: string;
};

/* ---------------------------- Helpers ------------------------------ */
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

function domainFromUrl(url?: string) {
  if (!url) return "";
  try {
    const clean = url.startsWith("http") ? url : `https://${url}`;
    const u = new URL(clean);
    return u.host.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, "");
  }
}

function formatMembers(n?: number) {
  if (!n || n <= 0) return "—";
  try {
    return new Intl.NumberFormat(undefined).format(n);
  } catch {
    return String(n);
  }
}

function joinLabel(iso?: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const m = d.toLocaleString(undefined, { month: "short" });
    return `Joined ${m} ${d.getFullYear()}`;
  } catch {
    return "—";
  }
}

/* ------------------------------ Page ------------------------------- */
export default function OrganizationsClient() {
  const router = useRouter();
  const { data: session } = useSession();

  const railRef = useRef<HTMLDivElement | null>(null);

  const { data: orgs, isLoading: orgsLoading } = useQuery<Org[]>({
    queryKey: ["orgs", "organizations-page"],
    queryFn: () => fetchJSON<Org[]>("/api/organizations"),
    enabled: !!session,
  });

  const orgRows: CardRow[] = useMemo(() => {
    const list = orgs ?? [];
    return list.map((org) => {
      const site = domainFromUrl(org.website);
      const description =
        org.description?.trim() || (site ? `${site}` : "Public profile");

      return {
        id: org._id,
        kind: "organization",
        href: `/dashboard/organizations/${org._id}`,
        title: org.name,
        description,
        bannerUrl: org.banner,
        iconUrl: org.logo,
        totalMembers: org.totalMembers,
        joinDateLabel: joinLabel(org.createdAt),
      };
    });
  }, [orgs]);

  const totalMembers = useMemo(() => {
    const sum = orgRows.reduce((acc, r) => acc + (r.totalMembers ?? 0), 0);
    return sum > 0 ? sum : undefined;
  }, [orgRows]);

  return (
    <div className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      {/* Header OUTSIDE the card (title/subtitle + members/button) */}
      <section className="pt-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold tracking-[0.18em] text-neutral-300">
              ORGANIZATIONS
            </div>
            <div className="mt-1 text-neutral-400">
              Track performance, manage drafts, and jump into event setup.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-200">
              <Users className="h-4 w-4 text-neutral-400" />
              <span className="font-semibold text-neutral-0">
                {formatMembers(totalMembers)}
              </span>
              <span className="text-neutral-400">Total members</span>
            </span>

            <Button
              onClick={() => router.push("/dashboard/organizations/new")}
              type="button"
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              animation
            >
              New organization
            </Button>
          </div>
        </div>
      </section>

      {/* Card ONLY wraps the rail area */}
      <section className="pb-16">
        <section
          className={clsx(
            "rounded-2xl border border-white/10",
            "bg-neutral-950/70 shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
          )}
        >
          <div
            className={clsx(
              "relative p-4 md:p-5",
              "bg-[radial-gradient(900px_320px_at_25%_0%,rgba(154,70,255,0.10),transparent_60%),radial-gradient(900px_320px_at_90%_110%,rgba(66,139,255,0.08),transparent_55%)]",
            )}
          >
            {/* Rail container (no arrows) */}
            <div className={clsx("relative  ")}>
              <div className="relative">
                <div
                  ref={railRef}
                  className={clsx(
                    "no-scrollbar overflow-x-auto overflow-y-hidden",
                    "scroll-smooth",
                  )}
                >
                  {/* IMPORTANT: transparent rail (no bg on items/grid wrapper) */}
                  <div className="flex w-max items-stretch gap-4 pr-4 bg-transparent">
                    {orgsLoading ? (
                      <>
                        {Array.from({ length: 6 }).map((_, i) => (
                          <Skeleton
                            key={`org-skel-${i}`}
                            className="h-[205px] w-[264px] shrink-0 rounded-[12px]"
                          />
                        ))}
                      </>
                    ) : orgRows.length ? (
                      orgRows.map((item) => (
                        <ConnectionProfileCard
                          key={item.id}
                          href={item.href}
                          kind={item.kind}
                          title={item.title}
                          description={item.description}
                          bannerUrl={item.bannerUrl}
                          iconUrl={item.iconUrl}
                          totalMembers={item.totalMembers}
                          joinDateLabel={item.joinDateLabel}
                        />
                      ))
                    ) : (
                      <div className="w-full min-w-[520px] rounded-2xl border border-dashed border-white/15 bg-transparent p-10 text-center">
                        <p className="text-sm font-medium text-neutral-0">
                          No organizations yet.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
