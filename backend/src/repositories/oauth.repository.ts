import { Session } from "../models/session.model";
import { Membership } from "../models/membership.model";
import { Organization } from "../models/organization.model";

// ─── Membership ───────────────────────────────────────────────────────────────

export const findOldestMembership = async (userId: string) => {
  return Membership.findOne({ userId }).sort({ createdAt: 1 });
};

// ─── Organization + Membership (first OAuth login) ───────────────────────────

export const findOrgBySlug = async (slug: string) => {
  return Organization.findOne({ slug });
};

export const createOrgWithOwner = async (data: {
  name: string;
  slug: string;
  ownerId: string;
  userId: string;
}) => {
  const org = await Organization.create({
    name: data.name,
    slug: data.slug,
    ownerId: data.ownerId,
  });

  const membership = await Membership.create({
    userId: data.userId,
    organizationId: org._id,
    role: "owner",
  });

  return { org, membership };
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

// ─── Session ──────────────────────────────────────────────────────────────────

export const createSession = async (data: {
  userId: string;
  organizationId: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
}) => {
  return Session.create({
    ...data,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
};
