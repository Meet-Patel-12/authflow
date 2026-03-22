import { IApplication } from "../models/application.model";
import { generateAppCredentials } from "../utils/crypto.util";
import {
  findOrgApplications,
  findOrgApplicationById,
  findOrgApplicationByName,
  countOrgApplications,
  createApplication,
  saveApplication,
  deactivateApplication,
} from "../repositories/application.repository";

const APP_LIMIT = 10;

// ─── Format ───────────────────────────────────────────────────────────────────

export const formatApplication = (
  app: IApplication,
  includeSecret?: string,
) => {
  return {
    id: app._id,
    name: app.name,
    description: app.description,
    logo: app.logo,
    type: app.type,
    clientId: app.clientId,
    ...(includeSecret && { clientSecret: includeSecret }),
    allowedCallbacks: app.allowedCallbacks,
    allowedLogoutUrls: app.allowedLogoutUrls,
    allowedOrigins: app.allowedOrigins,
    allowedWebOrigins: app.allowedWebOrigins,
    tokenExpiry: app.tokenExpiry,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  };
};

// ─── List ─────────────────────────────────────────────────────────────────────

export const listApplications = async (organizationId: string) => {
  const apps = await findOrgApplications(organizationId);
  return apps.map((app) => formatApplication(app));
};

// ─── Get ──────────────────────────────────────────────────────────────────────

export const getApplication = async (id: string, organizationId: string) => {
  const app = await findOrgApplicationById(id, organizationId);
  if (!app) return null;
  return formatApplication(app);
};

// ─── Create ───────────────────────────────────────────────────────────────────

export type CreateApplicationResult =
  | { success: true; data: ReturnType<typeof formatApplication> }
  | { success: false; status: 403 | 409; message: string };

export const createNewApplication = async (
  organizationId: string,
  name: string,
  type: string,
  description?: string,
  logo?: string,
): Promise<CreateApplicationResult> => {
  const count = await countOrgApplications(organizationId);
  if (count >= APP_LIMIT) {
    return {
      success: false,
      status: 403,
      message: `Application limit reached. Maximum ${APP_LIMIT} applications per organization.`,
    };
  }

  const existing = await findOrgApplicationByName(name, organizationId);
  if (existing) {
    return {
      success: false,
      status: 409,
      message: "An application with this name already exists",
    };
  }

  const { clientId, rawSecret, hashedSecret } = generateAppCredentials();

  const app = await createApplication({
    organizationId,
    name,
    type,
    description,
    logo,
    clientId,
    clientSecret: hashedSecret,
  });

  return { success: true, data: formatApplication(app, rawSecret) };
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateApplication = async (
  id: string,
  organizationId: string,
  changes: {
    name?: string;
    description?: string;
    logo?: string;
    allowedCallbacks?: string[];
    allowedLogoutUrls?: string[];
    allowedOrigins?: string[];
    allowedWebOrigins?: string[];
    tokenExpiry?: {
      accessTokenTTL?: number;
      refreshTokenTTL?: number;
    };
  },
) => {
  const app = await findOrgApplicationById(id, organizationId);
  if (!app) return null;

  if (changes.name) app.name = changes.name;
  if (changes.description !== undefined) app.description = changes.description;
  if (changes.logo !== undefined) app.logo = changes.logo;
  if (changes.allowedCallbacks) app.allowedCallbacks = changes.allowedCallbacks;
  if (changes.allowedLogoutUrls)
    app.allowedLogoutUrls = changes.allowedLogoutUrls;
  if (changes.allowedOrigins) app.allowedOrigins = changes.allowedOrigins;
  if (changes.allowedWebOrigins)
    app.allowedWebOrigins = changes.allowedWebOrigins;
  if (changes.tokenExpiry?.accessTokenTTL)
    app.tokenExpiry.accessTokenTTL = changes.tokenExpiry.accessTokenTTL;
  if (changes.tokenExpiry?.refreshTokenTTL)
    app.tokenExpiry.refreshTokenTTL = changes.tokenExpiry.refreshTokenTTL;

  await saveApplication(app);
  return formatApplication(app);
};

// ─── Rotate Secret ────────────────────────────────────────────────────────────

export const rotateApplicationSecret = async (
  id: string,
  organizationId: string,
): Promise<{ clientId: string; rawSecret: string } | null> => {
  const app = await findOrgApplicationById(id, organizationId);
  if (!app) return null;

  const { rawSecret, hashedSecret } = generateAppCredentials();
  app.clientSecret = hashedSecret;
  await saveApplication(app);

  return { clientId: app.clientId, rawSecret };
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteApplication = async (
  id: string,
  organizationId: string,
): Promise<IApplication | null> => {
  const app = await findOrgApplicationById(id, organizationId);
  if (!app) return null;
  return deactivateApplication(app);
};
