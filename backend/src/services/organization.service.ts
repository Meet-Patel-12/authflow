import crypto from "crypto";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import {
  findOrgById,
  findMembership,
  findMembershipById,
  findUserMembershipsWithOrg,
  findOrgMembershipsWithUsers,
  countOwners,
  findPendingInvitationByHash,
  deletePendingInvitation,
  createInvitation,
  findUserById,
  getOrgStats,
  saveOrg,
  cascadeDeleteOrg,
  createSession,
  createOrg,
  createMembership,
  updateMembershipById,
} from "../repositories/organization.repository";
import { findUserByEmail } from "../repositories/user.repository";
import { UserRole } from "../types/auth.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const issueTokensAndSession = async (data: {
  userId: string;
  email: string;
  role: UserRole;
  organizationId: string;
  ipAddress: string;
  userAgent: string;
}) => {
  const payload = {
    userId: data.userId,
    email: data.email,
    role: data.role,
    organizationId: data.organizationId,
  };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await createSession({
    userId: data.userId,
    organizationId: data.organizationId,
    refreshToken,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return { accessToken, refreshToken };
};

// ─── My Organizations ─────────────────────────────────────────────────────────

export const getUserOrganizations = async (userId: string) => {
  const memberships = await findUserMembershipsWithOrg(userId);

  return memberships
    .filter((m) => (m.organizationId as any)?.isActive === true)
    .map((m) => {
      const org = m.organizationId as any;
      return {
        id: org._id,
        name: org.name,
        slug: org.slug,
        role: m.role,
        plan: org.billing?.plan ?? "free",
        memberCount: 0,
      };
    });
};

// ─── Create Organization ──────────────────────────────────────────────────────

export const createOrganization = async (
  userId: string,
  name: string,
  slug?: string,
) => {
  const org = await createOrg({
    name,
    slug: slug || undefined,
    ownerId: userId,
  });
  await createMembership({
    userId,
    organizationId: org._id.toString(),
    role: "owner",
  });
  return org;
};

// ─── Switch Organization ──────────────────────────────────────────────────────

export type SwitchOrgResult =
  | {
      success: true;
      accessToken: string;
      refreshToken: string;
      org: { id: string; name: string; slug: string };
    }
  | { success: false; status: 400 | 403; message: string };

export const switchOrganization = async (
  userId: string,
  email: string,
  organizationId: string,
  ipAddress: string,
  userAgent: string,
): Promise<SwitchOrgResult> => {
  if (!organizationId) {
    return {
      success: false,
      status: 400,
      message: "organizationId is required",
    };
  }

  const membership = await findMembership(userId, organizationId);
  if (!membership) {
    return {
      success: false,
      status: 403,
      message: "You are not a member of this organization",
    };
  }

  const org = await findOrgById(organizationId);
  if (!org?.isActive) {
    return {
      success: false,
      status: 403,
      message: "Organization inactive or not found",
    };
  }

  const { accessToken, refreshToken } = await issueTokensAndSession({
    userId,
    email,
    role: membership.role,
    organizationId,
    ipAddress,
    userAgent,
  });

  return {
    success: true,
    accessToken,
    refreshToken,
    org: { id: org._id.toString(), name: org.name, slug: org.slug },
  };
};

// ─── Accept Invite ────────────────────────────────────────────────────────────

export type AcceptInviteResult =
  | {
      success: true;
      accessToken: string;
      refreshToken: string;
      organizationId: string;
    }
  | { success: false; status: 400 | 403 | 404; message: string };

export const acceptInvitation = async (
  userId: string,
  token: string,
  ipAddress: string,
  userAgent: string,
): Promise<AcceptInviteResult> => {
  const invitation = await findPendingInvitationByHash(hashToken(token));
  if (!invitation) {
    return {
      success: false,
      status: 404,
      message: "Invitation not found or has expired",
    };
  }

  const user = await findUserById(userId);
  if (!user || user.email !== invitation.email) {
    return {
      success: false,
      status: 403,
      message: "This invitation was sent to a different email address",
    };
  }

  const existing = await findMembership(
    userId,
    invitation.organizationId.toString(),
  );
  if (existing) {
    return {
      success: false,
      status: 400,
      message: "You are already a member of this organization",
    };
  }

  await createMembership({
    userId,
    organizationId: invitation.organizationId.toString(),
    role: invitation.role,
  });
  invitation.isAccepted = true;
  await invitation.save();

  const { accessToken, refreshToken } = await issueTokensAndSession({
    userId,
    email: user.email,
    role: invitation.role,
    organizationId: invitation.organizationId.toString(),
    ipAddress,
    userAgent,
  });

  return {
    success: true,
    accessToken,
    refreshToken,
    organizationId: invitation.organizationId.toString(),
  };
};

// ─── Get Organization ─────────────────────────────────────────────────────────

export const getOrganization = async (orgId: string) => {
  const org = await findOrgById(orgId);
  if (!org) return null;
  const stats = await getOrgStats(orgId);
  return { org, stats };
};

// ─── Get Organization Details ─────────────────────────────────────────────────

export const getOrganizationDetails = async (orgId: string) => {
  const org = await findOrgById(orgId);
  if (!org) return null;

  const memberships = await findOrgMembershipsWithUsers(orgId);
  const members = memberships.map((m) => {
    const u = m.userId as any;
    return {
      id: m._id,
      userId: u._id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      role: m.role,
      joinedAt: m.joinedAt,
    };
  });

  return { org, members };
};

// ─── Update Organization ──────────────────────────────────────────────────────

export const updateOrganization = async (
  userId: string,
  orgId: string,
  changes: { name?: string; settings?: Record<string, unknown> },
) => {
  const membership = await findMembership(userId, orgId);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return {
      success: false as const,
      status: 403 as const,
      message: "Only owner or admin can update organization",
    };
  }

  const org = await findOrgById(orgId);
  if (!org) {
    return {
      success: false as const,
      status: 404 as const,
      message: "Organization not found",
    };
  }

  if (changes.name) org.name = changes.name;
  if (changes.settings)
    org.settings = { ...org.settings, ...changes.settings } as any;
  await saveOrg(org as any);

  return { success: true as const, org };
};

// ─── Invite Member ────────────────────────────────────────────────────────────

export const inviteMember = async (
  userId: string,
  orgId: string,
  email: string,
  role: string,
) => {
  const membership = await findMembership(userId, orgId);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return {
      success: false as const,
      status: 403 as const,
      message: "Only owner or admin can invite members",
    };
  }

  const invitedUser = await findUserByEmail(email);
  if (invitedUser) {
    const existing = await findMembership(invitedUser._id.toString(), orgId);
    if (existing) {
      return {
        success: false as const,
        status: 400 as const,
        message: "This user is already a member",
      };
    }
  }

  await deletePendingInvitation(email, orgId);

  const plainToken = crypto.randomBytes(32).toString("hex");
  await createInvitation({
    email,
    organizationId: orgId,
    role: role || "member",
    tokenHash: hashToken(plainToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return { success: true as const, plainToken };
};

// ─── Update Member Role ───────────────────────────────────────────────────────

export const updateMemberRole = async (
  userId: string,
  orgId: string,
  memberId: string,
  role: string,
) => {
  const membership = await findMembership(userId, orgId);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return {
      success: false as const,
      status: 403 as const,
      message: "Not authorized",
    };
  }

  const target = await findMembershipById(memberId);
  if (!target) {
    return {
      success: false as const,
      status: 404 as const,
      message: "Member not found",
    };
  }

  if (target.role === "owner" && role !== "owner") {
    const ownerCount = await countOwners(orgId);
    if (ownerCount <= 1) {
      return {
        success: false as const,
        status: 400 as const,
        message: "Cannot demote the last owner of this organization",
      };
    }
  }

  await updateMembershipById(memberId, { role });
  return { success: true as const };
};

// ─── Remove Member ────────────────────────────────────────────────────────────

export const removeMember = async (
  userId: string,
  orgId: string,
  memberId: string,
) => {
  const membership = await findMembership(userId, orgId);
  if (!membership || membership.role !== "owner") {
    return {
      success: false as const,
      status: 403 as const,
      message: "Only owner can remove members",
    };
  }

  const target = await findMembershipById(memberId);
  if (!target) {
    return {
      success: false as const,
      status: 404 as const,
      message: "Membership not found",
    };
  }

  if (target.role === "owner") {
    return {
      success: false as const,
      status: 403 as const,
      message: "Cannot remove owner",
    };
  }

  await target.deleteOne();
  return { success: true as const };
};

// ─── Delete Organization ──────────────────────────────────────────────────────

export const deleteOrganization = async (userId: string, orgId: string) => {
  const membership = await findMembership(userId, orgId);
  if (!membership || membership.role !== "owner") {
    return {
      success: false as const,
      status: 403 as const,
      message: "Only owner can delete organization",
    };
  }

  const org = await findOrgById(orgId);
  if (!org) {
    return {
      success: false as const,
      status: 404 as const,
      message: "Organization not found",
    };
  }

  await cascadeDeleteOrg(orgId);
  return { success: true as const };
};
