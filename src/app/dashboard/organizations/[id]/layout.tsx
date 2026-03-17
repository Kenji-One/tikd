import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth";
import "@/lib/mongoose";
import Organization from "@/models/Organization";
import Event from "@/models/Event";
import {
  canManageOrganizationProfile,
  hasAnyOrgEventPermission,
  requireOrgMembership,
} from "@/lib/orgAccess";

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

type OrgDashboardAccess = {
  isOwner: boolean;
  canManageProfile: boolean;
  canAccessEvents: boolean;
  canViewMembers: boolean;
  canAccessTrackingLinks: boolean;
  role: {
    key: string;
    name: string;
    color?: string;
    iconKey?: string | null;
    iconUrl?: string | null;
    isSystem: boolean;
    roleId?: string | null;
  } | null;
  permissions: Record<string, boolean>;
};

type OrgDashboardData = {
  organization: OrgApiResponse;
  stats: {
    upcomingEvents: number;
    pastEvents: number;
    totalEvents: number;
  };
  access: OrgDashboardAccess;
};

async function getOrgDashboardData(
  orgId: string,
  userId: string,
  email?: string | null,
): Promise<OrgDashboardData | null> {
  if (!mongoose.Types.ObjectId.isValid(orgId)) return null;

  const membership = await requireOrgMembership({
    organizationId: orgId,
    userId,
    email,
  });

  if (!membership.ok) return null;

  const orgDoc = await Organization.findById(orgId).lean().exec();
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

  const access = membership.access;
  const permissions = access.permissions;

  return {
    organization,
    stats: {
      upcomingEvents,
      pastEvents,
      totalEvents: events.length,
    },
    access: {
      isOwner: access.isOwner,
      canManageProfile: canManageOrganizationProfile(access),
      canAccessEvents: hasAnyOrgEventPermission(access),
      canViewMembers: access.isOwner || !!permissions["members.view"],
      canAccessTrackingLinks:
        access.isOwner || !!permissions["links.createTrackingLinks"],
      role: access.effectiveRole,
      permissions,
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

  const data = await getOrgDashboardData(
    id,
    session.user.id,
    session.user.email ?? undefined,
  );

  if (!data) notFound();

  return (
    <OrgDashboardShell
      organization={data.organization}
      stats={data.stats}
      access={data.access}
    >
      {children}
    </OrgDashboardShell>
  );
}
