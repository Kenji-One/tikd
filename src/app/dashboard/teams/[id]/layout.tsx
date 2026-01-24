// src/app/dashboard/teams/[id]/layout.tsx
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth";
import "@/lib/mongoose";
import Team from "@/models/Team";

import TeamDashboardShell from "./TeamDashboardShell";

export const dynamic = "force-dynamic";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

type TeamApiResponse = {
  _id: string;
  ownerId: string;
  name: string;
  description?: string;
  banner?: string;
  logo?: string;
  website?: string;
  location?: string;
  accentColor?: string;
  totalMembers?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

type TeamDashboardData = {
  team: TeamApiResponse;
  stats: {
    totalMembers: number;
    activeMembers: number;
    pendingInvites: number;
  };
};

async function getTeamDashboardData(
  teamId: string,
  userId: string,
): Promise<TeamDashboardData | null> {
  if (!mongoose.Types.ObjectId.isValid(teamId)) return null;

  const teamDoc = await Team.findOne({
    _id: teamId,
    ownerId: userId,
  })
    .lean()
    .exec();

  if (!teamDoc) return null;

  const team = JSON.parse(JSON.stringify(teamDoc)) as TeamApiResponse;

  const totalMembers =
    typeof team.totalMembers === "number" && team.totalMembers > 0
      ? team.totalMembers
      : 0;

  // For now: we don’t have a TeamMembers model wired here yet,
  // so we mirror the org-style “3 chips” with safe placeholders.
  const activeMembers = totalMembers;
  const pendingInvites = 0;

  return {
    team,
    stats: {
      totalMembers,
      activeMembers,
      pendingInvites,
    },
  };
}

export default async function TeamDashboardLayout({
  children,
  params,
}: LayoutProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth?callback=/dashboard");
  }

  const { id } = await params;
  const data = await getTeamDashboardData(id, session.user.id);

  if (!data) notFound();

  return (
    <TeamDashboardShell team={data.team} stats={data.stats}>
      {children}
    </TeamDashboardShell>
  );
}
