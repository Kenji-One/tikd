// src/app/dashboard/organizations/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth";
import "@/lib/mongoose"; // ensure DB connection once
import Organization from "@/models/Organization";
import Event from "@/models/Event";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

type OrgPageProps = {
  params: { id: string };
};

type OrgEvent = {
  _id: string;
  date?: string;
  status?: string;
  [key: string]: unknown;
};

type OrgApiResponse = {
  _id: string;
  ownerId: string;
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  location?: string;
  createdAt?: string;
  events?: OrgEvent[];
  [key: string]: unknown;
};

type OrgDashboardData = {
  organization: OrgApiResponse;
  stats: {
    upcomingEvents: number;
    pastEvents: number;
    totalEvents: number;
  };
};

function normalizeWebsite(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/**
 * Load org + its events directly from Mongo,
 * scoped to the current user as owner.
 */
async function getOrgDashboardData(
  orgId: string,
  userId: string
): Promise<OrgDashboardData | null> {
  if (!mongoose.Types.ObjectId.isValid(orgId)) {
    return null;
  }

  // Only allow access if the user owns the org
  const orgDoc = await Organization.findOne({
    _id: orgId,
    ownerId: userId,
  })
    .lean()
    .exec();

  if (!orgDoc) {
    return null;
  }

  // Fetch all events for this org (any status)
  // Use orgId string directly to avoid _id typing issues
  const eventDocs = await Event.find({ organizationId: orgId })
    .sort({ date: 1 })
    .lean()
    .exec();

  // Cast to any before serialize to escape the Mongoose FlattenMaps types
  const organization = serialize(orgDoc as any) as OrgApiResponse;
  const events = eventDocs.map(
    (e) => serialize(e as any) as OrgEvent
  );
  organization.events = events;

  const now = new Date();

  const upcomingEvents = events.filter((e) => {
    if (!e.date) return false;
    const d = new Date(e.date);
    if (Number.isNaN(d.getTime())) return false;
    return d > now;
  }).length;

  const pastEvents = events.filter((e) => {
    if (!e.date) return false;
    const d = new Date(e.date);
    if (Number.isNaN(d.getTime())) return false;
    return d <= now;
  }).length;

  const totalEvents = events.length;

  return {
    organization,
    stats: {
      upcomingEvents,
      pastEvents,
      totalEvents,
    },
  };
}

export default async function OrgHomePage({ params }: OrgPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth?callback=/dashboard");
  }

  const { id } = params;

  const data = await getOrgDashboardData(id, session.user.id);

  if (!data) {
    notFound();
  }

  const { organization, stats } = data;
  const websiteUrl = normalizeWebsite(organization.website);

  return (
    <div className="space-y-6 pb-12 pt-4">
      {/* Top section: org overview */}
      <section className="rounded-card bg-neutral-948/80 p-5 sm:p-6 lg:p-7 shadow-xl shadow-black/40 border border-white/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            {/* Logo / initials */}
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-950 text-primary-999 font-semibold text-lg">
              {organization.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={organization.logo}
                  alt={organization.name}
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                <span>
                  {organization.name
                    .split(" ")
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")
                    .toUpperCase()}
                </span>
              )}
            </div>

            <div>
              <h1 className="text-xl font-semibold text-neutral-0 sm:text-2xl">
                {organization.name}
              </h1>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-text-tertiary">
                Organization dashboard
              </p>

              {organization.description && (
                <p className="mt-3 max-w-xl text-sm text-neutral-200">
                  {organization.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-300">
                {organization.location && (
                  <span className="rounded-full bg-neutral-900/60 px-3 py-1">
                    {organization.location}
                  </span>
                )}
                {organization.createdAt && (
                  <span className="rounded-full bg-neutral-900/60 px-3 py-1">
                    Created {formatDate(organization.createdAt)}
                  </span>
                )}
                {websiteUrl && (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-full bg-neutral-900/60 px-3 py-1 text-xs font-medium text-primary-999 hover:bg-neutral-800"
                  >
                    Visit website
                    <span className="ml-1 text-[11px]">↗</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Call-to-actions */}
          <div className="flex flex-row gap-2 sm:flex-col sm:items-end">
            <a
              href="events"
              className="inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-neutral-0 shadow-lg shadow-primary-900/40 hover:bg-primary-500"
            >
              Create event
              <span className="ml-2 text-lg leading-none">+</span>
            </a>
            <a
              href="edit"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-neutral-950/40 px-4 py-2 text-xs font-medium text-neutral-100 hover:border-primary-600 hover:text-primary-100"
            >
              Edit organization
            </a>
          </div>
        </div>
      </section>

      {/* Stats row */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-card border border-white/5 bg-neutral-948/80 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-tertiary">
            Upcoming events
          </p>
          <p className="mt-3 text-3xl font-semibold text-neutral-0">
            {stats.upcomingEvents}
          </p>
          <p className="mt-1 text-xs text-neutral-300">
            Events scheduled from today onward.
          </p>
        </div>

        <div className="rounded-card border border-white/5 bg-neutral-948/80 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-tertiary">
            Past events
          </p>
          <p className="mt-3 text-3xl font-semibold text-neutral-0">
            {stats.pastEvents}
          </p>
          <p className="mt-1 text-xs text-neutral-300">
            Events that have already taken place.
          </p>
        </div>

        <div className="rounded-card border border-white/5 bg-neutral-948/80 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-tertiary">
            Total events
          </p>
          <p className="mt-3 text-3xl font-semibold text-neutral-0">
            {stats.totalEvents}
          </p>
          <p className="mt-1 text-xs text-neutral-300">
            All events returned from the database.
          </p>
        </div>
      </section>

      {/* Quick links */}
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <a
          href="events"
          className="rounded-card border border-white/5 bg-neutral-948/80 p-4 transition hover:border-primary-600 hover:bg-neutral-900/80"
        >
          <p className="text-sm font-semibold text-neutral-0">Manage events</p>
          <p className="mt-2 text-xs text-neutral-300">
            View, edit, and publish all events under this organization.
          </p>
        </a>

        <a
          href="team"
          className="rounded-card border border-white/5 bg-neutral-948/80 p-4 transition hover:border-primary-600 hover:bg-neutral-900/80"
        >
          <p className="text-sm font-semibold text-neutral-0">Team & roles</p>
          <p className="mt-2 text-xs text-neutral-300">
            Invite collaborators, assign promoter / scanner roles, and manage
            access.
          </p>
        </a>
      </section>
    </div>
  );
}
