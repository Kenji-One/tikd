/**
 * @deprecated
 * Legacy member-invites model removed.
 *
 * Team/Event invites are now stored directly on membership documents:
 * - TeamMember.inviteTokenHash
 * - EventTeam.inviteTokenHash
 *
 * This file intentionally exports nothing useful so old imports are surfaced
 * and removed instead of reintroducing the legacy architecture.
 */

export {};
