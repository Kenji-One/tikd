// src/lib/api/members.ts
export type MembersOverviewScope =
  | { type: "global" }
  | { type: "team"; teamId: string }
  | { type: "organization"; orgId: string }
  | { type: "event"; eventId: string };

export type MemberScopeRecord = {
  sourceType: "team" | "organization" | "event";
  sourceId: string;
  sourceName: string;
  membershipId: string;
  role: string;
  roleLabel: string;
  status: "invited" | "active" | "revoked" | "expired";
  temporaryAccess: boolean;
  expiresAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MembersOverviewMember = {
  id: string;
  userId: string | null;
  email: string;
  name: string;
  avatarUrl: string | null;
  avatarText: string;
  role: string;
  roleLabel: string;
  primaryStatus: "invited" | "active" | "revoked" | "expired";
  activeScopeCount: number;
  invitedScopeCount: number;
  expiredScopeCount: number;
  revokedScopeCount: number;
  latestActivityAt: string | null;
  createdAt: string | null;
  scopes: MemberScopeRecord[];
};

export type MembersOverviewResponse = {
  ok: true;
  scope: {
    type: "global" | "team" | "organization" | "event";
    teamId: string | null;
    orgId: string | null;
    eventId: string | null;
  };
  performanceAttribution: {
    available: boolean;
    reason?: string;
  };
  summary: {
    totalMembers: number;
    activeMembers: number;
    invitedMembers: number;
    expiredMembers: number;
    revokedMembers: number;
    newMembers30d: number;
    resignedMembers: number;
  };
  members: MembersOverviewMember[];
};

function buildMembersOverviewUrl(scope: MembersOverviewScope): string {
  const params = new URLSearchParams();

  params.set("scope", scope.type);

  if (scope.type === "team") {
    params.set("teamId", scope.teamId);
  }

  if (scope.type === "organization") {
    params.set("orgId", scope.orgId);
  }

  if (scope.type === "event") {
    params.set("eventId", scope.eventId);
  }

  return `/api/members/overview?${params.toString()}`;
}

export async function fetchMembersOverview(
  scope: MembersOverviewScope,
): Promise<MembersOverviewResponse> {
  const res = await fetch(buildMembersOverviewUrl(scope), {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    let message = "Failed to fetch members overview.";
    try {
      const data = (await res.json()) as { error?: string };
      if (typeof data?.error === "string" && data.error.trim()) {
        message = data.error;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await res.json()) as MembersOverviewResponse;
}
