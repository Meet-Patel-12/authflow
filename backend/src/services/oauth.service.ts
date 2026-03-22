import crypto from "crypto";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import { RedisService } from "./redis.service";
import { sendMagicLinkEmail } from "./email.service";
import {
  findUserByEmail,
  createUser,
  saveUser,
} from "../repositories/user.repository";
import {
  findOldestMembership,
  createOrgWithOwner,
  generateUniqueSlug,
  createSession,
} from "../repositories/oauth.repository";
import { UserRole } from "../types/auth.types";

export const handleGoogleLogin = async (profile: any) => {
  const email = profile.emails?.[0]?.value;

  if (!email) throw new Error("No email found in Google profile");

  let user = await findUserByEmail(email);

  if (user && !user.isActive) {
    throw new Error("Account is deactivated");
  }

  if (user) {
    user.oauth = user.oauth || {};
    user.oauth.google = {
      id: profile.id,
      email,
      picture: profile.photos?.[0]?.value,
    };

    user.isEmailVerified = true;

    if (!user.avatar && profile.photos?.[0]?.value) {
      user.avatar = profile.photos[0].value;
    }

    await saveUser(user);
  } else {
    user = await createUser({
      email,
      name: profile.displayName || email.split("@")[0],
      avatar: profile.photos?.[0]?.value,
      isEmailVerified: true,
      oauth: {
        google: {
          id: profile.id,
          email,
          picture: profile.photos?.[0]?.value,
        },
      },
    });
  }

  return user;
};

export const handleGithubLogin = async (profile: any) => {
  const email =
    profile.emails?.[0]?.value || `${profile.username}@github-oauth.local`;

  if (!email) {
    throw new Error("Unable to retrieve email");
  }

  let user = await findUserByEmail(email);

  if (user && !user.isActive) {
    throw new Error("Account is deactivated");
  }

  if (user) {
    user.oauth = user.oauth || {};
    user.oauth.github = {
      id: profile.id,
      username: profile.username,
      avatar: profile.photos?.[0]?.value,
    };

    user.isEmailVerified = true;

    if (!user.avatar && profile.photos?.[0]?.value) {
      user.avatar = profile.photos[0].value;
    }

    await saveUser(user);
  } else {
    user = await createUser({
      email,
      name: profile.displayName || profile.username || email.split("@")[0],
      avatar: profile.photos?.[0]?.value,
      isEmailVerified: true,
      oauth: {
        github: {
          id: profile.id,
          username: profile.username,
          avatar: profile.photos?.[0]?.value,
        },
      },
    });
  }

  return user;
};

// ─── Shared: build token pair + session ──────────────────────────────────────

export const issueTokensAndSession = async (data: {
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
  });

  return { accessToken, refreshToken };
};

// ─── OAuth Callback ───────────────────────────────────────────────────────────

export type OAuthResult =
  | {
      success: true;
      accessToken: string;
      refreshToken: string;
      userId: string;
      organizationId: string;
    }
  | { success: false; error: string };

export const handleOAuthCallback = async (
  user: any,
  ipAddress: string,
  userAgent: string,
): Promise<OAuthResult> => {
  if (!user) return { success: false, error: "authentication_failed" };
  if (!user.isActive) return { success: false, error: "account_deactivated" };

  let membership = await findOldestMembership(user._id.toString());

  // First OAuth login — auto-create org
  if (!membership) {
    const orgName = `${user.name}'s Organization`;
    const slug = await generateUniqueSlug(user.name);
    const result = await createOrgWithOwner({
      name: orgName,
      slug,
      ownerId: user._id.toString(),
      userId: user._id.toString(),
    });
    membership = result.membership;
  }

  if (!membership) return { success: false, error: "no_organization" };

  user.lastLoginAt = new Date();
  user.lastLoginIp = ipAddress;
  await user.save();

  const { accessToken, refreshToken } = await issueTokensAndSession({
    userId: user._id.toString(),
    email: user.email,
    role: membership.role,
    organizationId: membership.organizationId.toString(),
    ipAddress,
    userAgent,
  });

  return {
    success: true,
    accessToken,
    refreshToken,
    userId: user._id.toString(),
    organizationId: membership.organizationId.toString(),
  };
};

// ─── Magic Link ───────────────────────────────────────────────────────────────

export const sendMagicLink = async (email: string): Promise<void> => {
  const user = await findUserByEmail(email);

  // Always resolve — never reveal whether user/email exists
  if (!user?.isActive) return;

  const token = crypto.randomBytes(32).toString("hex");
  await RedisService.setMagicLinkToken(token, email, 900);
  await sendMagicLinkEmail(email, token, user.name);
};

export type MagicLinkVerifyResult =
  | {
      success: true;
      accessToken: string;
      refreshToken: string;
      userId: string;
      email: string;
      name: string;
      role: string;
      organizationId: string;
    }
  | { success: false; status: 400 | 403; message: string };

export const verifyMagicLink = async (
  token: string,
  ipAddress: string,
  userAgent: string,
): Promise<MagicLinkVerifyResult> => {
  const email = await RedisService.getMagicLinkToken(token);
  if (!email) {
    return {
      success: false,
      status: 400,
      message: "Invalid or expired magic link",
    };
  }

  const user = await findUserByEmail(email);
  if (!user?.isActive) {
    return {
      success: false,
      status: 400,
      message: "Invalid or expired magic link",
    };
  }

  await RedisService.deleteMagicLinkToken(token);

  const membership = await findOldestMembership(user._id.toString());
  if (!membership) {
    return {
      success: false,
      status: 403,
      message: "User not associated with organization",
    };
  }

  user.lastLoginAt = new Date();
  user.lastLoginIp = ipAddress ?? "0.0.0.0";
  await user.save();

  const { accessToken, refreshToken } = await issueTokensAndSession({
    userId: user._id.toString(),
    email: user.email,
    role: membership.role,
    organizationId: membership.organizationId.toString(),
    ipAddress,
    userAgent,
  });

  return {
    success: true,
    accessToken,
    refreshToken,
    userId: user._id.toString(),
    email: user.email,
    name: user.name,
    role: membership.role,
    organizationId: membership.organizationId.toString(),
  };
};
