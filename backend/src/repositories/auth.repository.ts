import mongoose from "mongoose";
import { User } from "../models/user.model";
import { Organization } from "../models/organization.model";
import { Membership } from "../models/membership.model";
import { Invitation } from "../models/invitation.model";
import { Session } from "../models/session.model";
import { AuditLog } from "../models/audit.model";
import { ApiKey } from "../models/apiKey.model";
import { Webhook } from "../models/webhook.model";
import { Application } from "../models/application.model";
import { MFADevice } from "../models/mfa.model";
import { NotificationPreference } from "../models/notification.model";

// ─── User ─────────────────────────────────────────────────────────────────────

export const findUserById = async (id: string, withPassword = false) => {
  const q = User.findById(id);
  return withPassword ? q.select("+password") : q;
};

export const findUserByEmail = async (email: string, withPassword = false) => {
  const q = User.findOne({ email });
  return withPassword ? q.select("+password") : q;
};

export const findUserByVerificationToken = async (hashedToken: string) => {
  return User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });
};

export const findUserByResetToken = async (hashedToken: string) => {
  return User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
};

// ─── Organization ─────────────────────────────────────────────────────────────

export const findOrgById = async (id: mongoose.Types.ObjectId | string) => {
  return Organization.findById(id);
};

export const findOrgBySlug = async (slug: string) => {
  return Organization.findOne({ slug });
};

export const generateUniqueSlug = async (name: string): Promise<string> => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  let slug = base;
  let counter = 1;
  while (await findOrgBySlug(slug)) {
    slug = `${base}-${counter++}`;
  }
  return slug;
};

// ─── Membership ───────────────────────────────────────────────────────────────

export const findMembership = async (
  userId: string,
  organizationId: string,
) => {
  return Membership.findOne({ userId, organizationId });
};

export const findAnyMembership = async (userId: string) => {
  return Membership.findOne({ userId });
};

export const findOwnedMemberships = async (userId: string) => {
  return Membership.find({ userId, role: "owner" });
};

export const findUserMemberships = async (userId: string) => {
  return Membership.find({ userId })
    .select("organizationId role createdAt")
    .lean();
};

// ─── Invitation ───────────────────────────────────────────────────────────────

export const findPendingInvitation = async (email: string) => {
  return Invitation.findOne({
    email,
    isAccepted: false,
    expiresAt: { $gt: new Date() },
  });
};

// ─── Session ──────────────────────────────────────────────────────────────────

export const findActiveSession = async (refreshToken: string) => {
  return Session.findOne({ refreshToken, isActive: true });
};

export const findUserActiveSessions = async (userId: string) => {
  return Session.find({ userId, isActive: true }).sort({ lastActivity: -1 });
};

export const findSessionById = async (sessionId: string, userId: string) => {
  return Session.findOne({ _id: sessionId, userId });
};

export const revokeSessionsByUserId = async (userId: string) => {
  return Session.updateMany({ userId, isActive: true }, { isActive: false });
};

export const revokeSessionByToken = async (refreshToken: string) => {
  return Session.updateOne({ refreshToken }, { isActive: false });
};

export const createSession = async (data: {
  userId: string | mongoose.Types.ObjectId;
  organizationId: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
}) => {
  return Session.create(data);
};

// ─── Cascade Delete (account deletion) ───────────────────────────────────────

export const cascadeDeleteOrgs = async (
  orgIds: mongoose.Types.ObjectId[],
  dbSession: mongoose.ClientSession,
) => {
  await Promise.all([
    Membership.deleteMany(
      { organizationId: { $in: orgIds } },
      { session: dbSession },
    ),
    Invitation.deleteMany(
      { organizationId: { $in: orgIds } },
      { session: dbSession },
    ),
    Session.deleteMany(
      { organizationId: { $in: orgIds } },
      { session: dbSession },
    ),
    AuditLog.deleteMany(
      { organizationId: { $in: orgIds } },
      { session: dbSession },
    ),
    ApiKey.deleteMany(
      { organizationId: { $in: orgIds } },
      { session: dbSession },
    ),
    Webhook.deleteMany(
      { organizationId: { $in: orgIds } },
      { session: dbSession },
    ),
    Application.deleteMany(
      { organizationId: { $in: orgIds } },
      { session: dbSession },
    ),
    Organization.deleteMany({ _id: { $in: orgIds } }, { session: dbSession }),
  ]);
};

export const cascadeDeleteUser = async (
  userId: string,
  email: string,
  dbSession: mongoose.ClientSession,
) => {
  await Promise.all([
    Membership.deleteMany({ userId }, { session: dbSession }),
    Session.deleteMany({ userId }, { session: dbSession }),
    Invitation.deleteMany({ email }, { session: dbSession }),
    MFADevice.deleteMany({ userId }).catch(() => {}), // model may not exist
  ]);
  await User.deleteOne({ _id: userId }, { session: dbSession });
};

// ─── Data Export ──────────────────────────────────────────────────────────────

export const findRecentSessions = async (userId: string) => {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  return Session.find({ userId, createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .select("ipAddress userAgent createdAt lastActivity isActive")
    .lean();
};

export const findNotificationPreferences = async (userId: string) => {
  return NotificationPreference.findOne({ userId })
    .select(
      "accountActivity securityAlerts productUpdates marketingEmails updatedAt",
    )
    .lean();
};
