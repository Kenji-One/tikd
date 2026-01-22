// src/app/dashboard/organizations/[id]/layout.tsx
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth";
import "@/lib/mongoose";
import Organization from "@/models/Organization";
import Event from "@/models/Event";

import OrgDashboardShell from "./OrgDashboardShell";

export const dynamic = "force-dynamic";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
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
  banner?: string;
  logo?: string;
  website?: string;
  location?: string;
  accentColor?: string;
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

async function getOrgDashboardData(
  orgId: string,
  userId: string,
): Promise<OrgDashboardData | null> {
  if (!mongoose.Types.ObjectId.isValid(orgId)) return null;

  const orgDoc = await Organization.findOne({
    _id: orgId,
    ownerId: userId,
  })
    .lean()
    .exec();

  if (!orgDoc) return null;

  const eventDocs = await Event.find({ organizationId: orgId })
    .sort({ date: 1 })
    .lean()
    .exec();

  const organization = JSON.parse(JSON.stringify(orgDoc)) as OrgApiResponse;
  const events = JSON.parse(JSON.stringify(eventDocs)) as OrgEvent[];
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

  return {
    organization,
    stats: {
      upcomingEvents,
      pastEvents,
      totalEvents: events.length,
    },
  };
}

export default async function OrganizationDashboardLayout({
  children,
  params,
}: LayoutProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth?callback=/dashboard");
  }

  const { id } = await params;
  const data = await getOrgDashboardData(id, session.user.id);

  if (!data) notFound();

  return (
    <OrgDashboardShell organization={data.organization} stats={data.stats}>
      {children}
    </OrgDashboardShell>
  );
}
