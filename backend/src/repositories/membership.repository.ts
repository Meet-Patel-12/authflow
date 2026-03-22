import { Membership } from "../models/membership.model";
import { Organization } from "../models/organization.model";
import { Session } from "../models/session.model";

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

export const createOrg = async (data: {
  name: string;
  slug?: string;
  ownerId: string;
}) => {
  return Organization.create(data);
};

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
