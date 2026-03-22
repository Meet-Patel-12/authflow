import { Organization } from "../models/organization.model";
import { Membership, IMembership } from "../models/membership.model";
import { Invitation } from "../models/invitation.model";
import { User } from "../models/user.model";
import { ApiKey } from "../models/apiKey.model";
import { Session } from "../models/session.model";
import { Application } from "../models/application.model";

export const findActiveOrganizationById = async (organizationId: string) => {
  const org = await Organization.findById(organizationId);
  if (!org || !org.isActive) return null;
  return org;
};

// ─── Organization ─────────────────────────────────────────────────────────────

export const findOrgById = async (orgId: string) => {
  return Organization.findById(orgId);
};

export const findOrgBySlug = async (slug: string) => {
  return Organization.findOne({ slug });
};

export const saveOrg = async (org: InstanceType<typeof Organization>) => {
  return org.save();
};

// ─── Membership ───────────────────────────────────────────────────────────────

export const findMembership = async (
  userId: string,
  organizationId: string,
) => {
  return Membership.findOne({ userId, organizationId });
};

export const findMembershipById = async (memberId: string) => {
  return Membership.findById(memberId);
};

export const findUserMembershipsWithOrg = async (userId: string) => {
  return Membership.find({ userId }).populate("organizationId");
};

export const findOrgMembershipsWithUsers = async (organizationId: string) => {
  return Membership.find({ organizationId }).populate(
    "userId",
    "name email avatar isActive",
  );
};

export const countOwners = async (organizationId: string): Promise<number> => {
  return Membership.countDocuments({ organizationId, role: "owner" });
};

export const countMembers = async (organizationId: string): Promise<number> => {
  return Membership.countDocuments({ organizationId });
};

// ─── Invitation ───────────────────────────────────────────────────────────────

export const findPendingInvitationByHash = async (tokenHash: string) => {
  return Invitation.findOne({
    tokenHash,
    isAccepted: false,
    expiresAt: { $gt: new Date() },
  });
};

export const deletePendingInvitation = async (
  email: string,
  organizationId: string,
) => {
  return Invitation.deleteOne({ email, organizationId });
};

export const createInvitation = async (data: {
  email: string;
  organizationId: string;
  role: string;
  tokenHash: string;
  expiresAt: Date;
}) => {
  return Invitation.create(data);
};

// ─── User ─────────────────────────────────────────────────────────────────────

export const findUserById = async (userId: string) => {
  return User.findById(userId);
};

// ─── Stats (parallel counts) ─────────────────────────────────────────────────

export const getOrgStats = async (orgId: string) => {
  const [members, apiKeys, activeSessions] = await Promise.all([
    Membership.countDocuments({ organizationId: orgId }),
    ApiKey.countDocuments({ organizationId: orgId, isActive: true }),
    Session.countDocuments({ organizationId: orgId, isActive: true }),
  ]);
  return { members, apiKeys, activeSessions };
};

// ─── Cascade Delete ───────────────────────────────────────────────────────────

export const cascadeDeleteOrg = async (orgId: string) => {
  await Promise.all([
    ApiKey.deleteMany({ organizationId: orgId }),
    Application.deleteMany({ organizationId: orgId }),
    Invitation.deleteMany({ organizationId: orgId }),
    Membership.deleteMany({ organizationId: orgId }),
  ]);
  await Organization.findByIdAndDelete(orgId);
  // Sessions deleted last — preserves auth context for this request
  await Session.deleteMany({ organizationId: orgId });
};

// ─── Sessions ───────────────────────────────────────────────────────────

export const createSession = async (data: {
  userId: string;
  organizationId: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
}) => {
  return Session.create(data);
};

export const createOrg = async (data: {
  name: string;
  slug?: string;
  ownerId: string;
}) => {
  return Organization.create(data);
};

export const createMembership = async (data: {
  userId: string;
  organizationId: string;
  role: string;
}) => {
  return Membership.create(data);
};

export const updateMembershipById = async (
  memberId: string,
  data: Record<string, unknown>,
) => {
  return Membership.findByIdAndUpdate(memberId, data);
};
