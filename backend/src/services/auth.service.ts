import crypto from "crypto";
import mongoose from "mongoose";
import { User } from "../models/user.model";
import { Organization } from "../models/organization.model";
import { Membership } from "../models/membership.model";
import { Session } from "../models/session.model";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyAccessToken,
} from "../utils/jwt";
import { RedisService } from "./redis.service";
import { findActiveOrganizationById } from "../repositories/organization.repository";
import { AuthUser, UserRole } from "../types/auth.types";
import {
  findUserById,
  findUserByEmail,
  findUserByVerificationToken,
  findUserByResetToken,
  findOrgById,
  generateUniqueSlug,
  findMembership,
  findAnyMembership,
  findOwnedMemberships,
  findUserMemberships,
  findPendingInvitation,
  findActiveSession,
  findUserActiveSessions,
  findSessionById,
  revokeSessionsByUserId,
  revokeSessionByToken,
  cascadeDeleteOrgs,
  cascadeDeleteUser,
  findRecentSessions,
  findNotificationPreferences,
} from "../repositories/auth.repository";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const generateVerificationToken = () => {
  const raw = crypto.randomBytes(32).toString("hex");
  const hashed = hashToken(raw);
  return { raw, hashed };
};

export type AuthResult =
  | { success: true; user: AuthUser }
  | { success: false; status: 401 | 403; message: string };

export const resolveAuthUser = async (token: string): Promise<AuthResult> => {
  // Verify JWT signature and expiry
  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return { success: false, status: 401, message: "Invalid or expired token" };
  }

  // Block SDK tokens from platform routes
  if (decoded.role === "sdk_user") {
    return {
      success: false,
      status: 403,
      message: "SDK tokens are not valid for platform routes",
    };
  }

  // Check token hasn't been revoked (e.g. after logout)
  const isBlacklisted = await RedisService.isTokenBlacklisted(token);
  if (isBlacklisted) {
    return { success: false, status: 401, message: "Token has been revoked" };
  }

  // Ensure user still exists and is active
  const user = await findUserById(decoded.userId);
  if (!user) {
    return {
      success: false,
      status: 401,
      message: "User not found or inactive",
    };
  }

  // Ensure user is still a member of the org from the token
  const membership = await findMembership(
    user._id.toString(),
    decoded.organizationId,
  );
  if (!membership) {
    return {
      success: false,
      status: 403,
      message: "User not part of this organization",
    };
  }

  // Ensure the organization is still active
  const org = await findActiveOrganizationById(
    membership.organizationId.toString(),
  );
  if (!org) {
    return { success: false, status: 403, message: "Organization inactive" };
  }

  // Role comes from membership (not JWT) so demotions take effect immediately
  return {
    success: true,
    user: {
      userId: user._id.toString(),
      email: user.email,
      role: membership.role,
      organizationId: membership.organizationId.toString(),
    },
  };
};

// ─── Register ─────────────────────────────────────────────────────────────────

export const registerUser = async (data: {
  email: string;
  password: string;
  name: string;
  organizationName?: string;
  ipAddress: string;
  userAgent: string;
}) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const existing = await findUserByEmail(data.email);
    if (existing) {
      await dbSession.abortTransaction();
      return {
        success: false as const,
        status: 400 as const,
        message: "User already exists",
      };
    }

    const [newUser] = await User.create(
      [{ email: data.email, password: data.password, name: data.name }],
      { session: dbSession },
    );

    const invitation = await findPendingInvitation(data.email);
    let orgId: mongoose.Types.ObjectId;
    let role: UserRole;

    if (invitation) {
      await Membership.create(
        [
          {
            userId: newUser._id,
            organizationId: invitation.organizationId,
            role: invitation.role,
          },
        ],
        { session: dbSession },
      );
      invitation.isAccepted = true;
      await invitation.save({ session: dbSession });
      orgId = invitation.organizationId as mongoose.Types.ObjectId;
      role = invitation.role;
    } else {
      const orgName = data.organizationName || `${data.name}'s Organization`;
      const slug = await generateUniqueSlug(orgName);

      const [org] = await Organization.create(
        [
          {
            name: orgName,
            slug,
            ownerId: newUser._id,
            billing: { plan: "free", status: "active" },
            limits: { maxUsers: 5, maxApiKeys: 2, maxApiCalls: 10000 },
            settings: {
              allowSignup: true,
              requireEmailVerification: true,
              requireMFA: false,
              allowedDomains: [],
            },
          },
        ],
        { session: dbSession },
      );

      await Membership.create(
        [{ userId: newUser._id, organizationId: org._id, role: "owner" }],
        { session: dbSession },
      );

      orgId = org._id as mongoose.Types.ObjectId;
      role = "owner";
    }

    const tokenPayload = {
      userId: newUser._id.toString(),
      email: newUser.email,
      role,
      organizationId: orgId.toString(),
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await Session.create(
      [
        {
          userId: newUser._id,
          organizationId: orgId,
          refreshToken,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ],
      { session: dbSession },
    );

    const { raw: verificationToken, hashed } = generateVerificationToken();
    newUser.emailVerificationToken = hashed;
    newUser.emailVerificationExpires = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    );
    await newUser.save({ session: dbSession });

    await dbSession.commitTransaction();

    return {
      success: true as const,
      accessToken,
      refreshToken,
      user: newUser,
      verificationToken,
      organizationId: orgId.toString(),
    };
  } catch (error) {
    await dbSession.abortTransaction();
    throw error;
  } finally {
    dbSession.endSession();
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginUser = async (data: {
  email: string;
  password: string;
  ipAddress: string;
  userAgent: string;
}) => {
  const user = await findUserByEmail(data.email, true);
  if (!user?.password) {
    return {
      success: false as const,
      status: 401 as const,
      message: "Invalid credentials",
    };
  }

  const isValid = await user.comparePassword(data.password);
  if (!isValid) {
    return {
      success: false as const,
      status: 401 as const,
      message: "Invalid credentials",
    };
  }

  if (!user.isActive) {
    user.isActive = true;
    await user.save();
  }

  const membership = await findAnyMembership(user._id.toString());
  if (!membership) {
    return {
      success: false as const,
      status: 403 as const,
      message: "User not associated with any organization",
    };
  }

  const org = await findOrgById(membership.organizationId);
  if (!org?.isActive) {
    return {
      success: false as const,
      status: 403 as const,
      message: "Organization inactive",
    };
  }

  if (user.mfaEnabled) {
    return {
      success: true as const,
      mfaRequired: true as const,
      userId: user._id.toString(),
      organizationId: org._id.toString(),
    };
  }

  const tokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: membership.role,
    organizationId: org._id.toString(),
  };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  await Session.create({
    userId: user._id,
    organizationId: org._id,
    refreshToken,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  user.lastLoginAt = new Date();
  user.lastLoginIp = data.ipAddress;
  await user.save();

  return {
    success: true as const,
    mfaRequired: false as const,
    accessToken,
    refreshToken,
    userId: user._id.toString(),
    organizationId: org._id.toString(),
  };
};

// ─── Email Verification ───────────────────────────────────────────────────────

export const verifyUserEmail = async (token: string) => {
  const user = await findUserByVerificationToken(hashToken(token));
  if (!user) {
    return {
      success: false as const,
      status: 400 as const,
      message: "Invalid or expired verification token",
    };
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined as any;
  user.emailVerificationExpires = undefined as any;
  await user.save();

  const membership = await findAnyMembership(user._id.toString());
  return {
    success: true as const,
    userId: user._id,
    organizationId: membership?.organizationId,
  };
};

// ─── Password Reset ───────────────────────────────────────────────────────────

export const requestPasswordResetToken = async (email: string) => {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetToken = hashToken(resetToken);
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  return { user, resetToken };
};

export const resetUserPassword = async (token: string, password: string) => {
  const user = await findUserByResetToken(hashToken(token));
  if (!user) {
    return {
      success: false as const,
      status: 400 as const,
      message: "Invalid or expired reset token",
    };
  }

  user.password = password;
  user.passwordResetToken = undefined as any;
  user.passwordResetExpires = undefined as any;
  await user.save();

  await Session.updateMany({ userId: user._id }, { $set: { isActive: false } });

  const membership = await findAnyMembership(user._id.toString());
  return {
    success: true as const,
    userId: user._id,
    organizationId: membership?.organizationId,
  };
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export const updateUserProfile = async (
  userId: string,
  organizationId: string,
  name: string,
) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { name: name.trim() },
    { new: true },
  );
  if (!user) return null;
  const membership = await findMembership(userId, organizationId);
  return { user, membership };
};

// ─── Change Password ──────────────────────────────────────────────────────────

export const changeUserPassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
  accessToken?: string,
) => {
  const user = await findUserById(userId, true);
  if (!user?.password) {
    return {
      success: false as const,
      status: 404 as const,
      message: "User not found",
    };
  }

  const isValid = await user.comparePassword(currentPassword);
  if (!isValid) {
    return {
      success: false as const,
      status: 401 as const,
      message: "Current password is incorrect",
    };
  }

  if (currentPassword === newPassword) {
    return {
      success: false as const,
      status: 400 as const,
      message: "New password must be different from current password",
    };
  }

  user.password = newPassword;
  await user.save();

  await revokeSessionsByUserId(userId);
  if (accessToken) await RedisService.blacklistToken(accessToken, 15 * 60);

  return { success: true as const };
};

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logoutUser = async (
  refreshToken: string,
  accessToken?: string,
) => {
  await revokeSessionByToken(refreshToken);
  if (accessToken) await RedisService.blacklistToken(accessToken, 15 * 60);
};

// ─── Refresh Token ────────────────────────────────────────────────────────────

export const refreshAccessToken = async (refreshToken: string) => {
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    return {
      success: false as const,
      status: 401 as const,
      message: "Invalid refresh token",
    };
  }

  const session = await findActiveSession(refreshToken);
  if (!session) {
    return {
      success: false as const,
      status: 401 as const,
      message: "Session invalidated",
    };
  }

  const membership = await findMembership(
    decoded.userId,
    decoded.organizationId,
  );
  if (!membership) {
    return {
      success: false as const,
      status: 403 as const,
      message: "User no longer part of organization",
    };
  }

  const accessToken = generateAccessToken({
    userId: decoded.userId,
    email: decoded.email,
    role: membership.role,
    organizationId: decoded.organizationId,
  });

  return { success: true as const, accessToken };
};

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const getUserSessions = async (
  userId: string,
  currentRefreshToken?: string,
) => {
  const sessions = await findUserActiveSessions(userId);
  const currentSessionId = currentRefreshToken
    ? (sessions
        .find((s) => s.refreshToken === currentRefreshToken)
        ?._id?.toString() ?? null)
    : null;

  return {
    currentSessionId,
    sessions: sessions.map((s) => ({
      id: s._id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      lastActivity: s.lastActivity,
      createdAt: s.createdAt,
    })),
  };
};

export const revokeUserSession = async (sessionId: string, userId: string) => {
  const session = await findSessionById(sessionId, userId);
  if (!session) return false;
  session.isActive = false;
  await session.save();
  return true;
};

// ─── Delete Account ───────────────────────────────────────────────────────────

export const deleteUserAccount = async (
  userId: string,
  password: string,
  accessToken?: string,
) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const user = await findUserById(userId, true);
    if (!user) {
      await dbSession.abortTransaction();
      return {
        success: false as const,
        status: 404 as const,
        message: "User not found",
      };
    }

    if (user.password) {
      const isValid = await user.comparePassword(password);
      if (!isValid) {
        await dbSession.abortTransaction();
        return {
          success: false as const,
          status: 401 as const,
          message: "Incorrect password",
        };
      }
    }

    const ownedMemberships = await findOwnedMemberships(userId);
    const ownedOrgIds = ownedMemberships.map((m) => m.organizationId);

    if (ownedOrgIds.length > 0) {
      await cascadeDeleteOrgs(ownedOrgIds, dbSession);
    }

    await cascadeDeleteUser(userId, user.email, dbSession);
    await dbSession.commitTransaction();

    if (accessToken) await RedisService.blacklistToken(accessToken, 15 * 60);

    return { success: true as const };
  } catch (error) {
    await dbSession.abortTransaction();
    throw error;
  } finally {
    dbSession.endSession();
  }
};

// ─── Deactivate Account ───────────────────────────────────────────────────────

export const deactivateUserAccount = async (
  userId: string,
  accessToken?: string,
) => {
  const user = await findUserById(userId);
  if (!user)
    return {
      success: false as const,
      status: 404 as const,
      message: "User not found",
    };
  if (!user.isActive)
    return {
      success: false as const,
      status: 400 as const,
      message: "Account is already deactivated",
    };

  user.isActive = false;
  await user.save();

  await revokeSessionsByUserId(userId);
  if (accessToken) await RedisService.blacklistToken(accessToken, 15 * 60);

  return { success: true as const };
};

// ─── Data Export ──────────────────────────────────────────────────────────────

export const buildDataExport = async (
  userId: string,
  organizationId: string,
) => {
  const user = await findUserById(userId);
  if (!user) return null;

  const [sessions, memberships, notifPrefs] = await Promise.all([
    findRecentSessions(userId),
    findUserMemberships(userId),
    findNotificationPreferences(userId),
  ]);

  const orgIds = memberships.map((m) => m.organizationId);
  const orgs = await Organization.find({ _id: { $in: orgIds } })
    .select("name slug createdAt")
    .lean();
  const orgMap = Object.fromEntries(orgs.map((o) => [o._id.toString(), o]));

  return {
    exportedAt: new Date().toISOString(),
    exportedBy: user.email,
    sessions: sessions.map((s) => ({
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastActivity: s.lastActivity,
      isActive: s.isActive,
    })),
    organizations: memberships.map((m) => {
      const org = orgMap[m.organizationId.toString()];
      return {
        role: m.role,
        joinedAt: (m as any).joinedAt,
        organization: org
          ? { name: org.name, slug: org.slug, createdAt: org.createdAt }
          : null,
      };
    }),
    notificationPreferences: notifPrefs
      ? {
          accountActivity: notifPrefs.accountActivity,
          securityAlerts: notifPrefs.securityAlerts,
          productUpdates: notifPrefs.productUpdates,
          marketingEmails: notifPrefs.marketingEmails,
          lastUpdated: (notifPrefs as any).updatedAt,
        }
      : {
          accountActivity: true,
          securityAlerts: true,
          productUpdates: true,
          marketingEmails: false,
          lastUpdated: null,
        },
  };
};

// ─── Connected Apps ───────────────────────────────────────────────────────────

export const getConnectedApps = async (userId: string) => {
  const user = await User.findById(userId).select("oauth email name").lean();
  if (!user) return null;

  return [
    {
      provider: "google",
      name: "Google",
      description: "Sign in with your Google account",
      connected: !!user.oauth?.google?.id,
      connectedEmail: user.oauth?.google?.email ?? null,
      avatar: user.oauth?.google?.picture ?? null,
    },
    {
      provider: "github",
      name: "GitHub",
      description: "Sign in with your GitHub account",
      connected: !!user.oauth?.github?.id,
      connectedUsername: user.oauth?.github?.username ?? null,
      avatar: user.oauth?.github?.avatar ?? null,
    },
  ];
};
