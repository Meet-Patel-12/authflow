import crypto from "crypto";

export const hashApiKey = (rawKey: string): string => {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
};

export const generateApiKey = (organizationId: string): string => {
  const random = crypto.randomBytes(32).toString("hex");
  const orgPrefix = organizationId.toString().substring(0, 8);
  return `org_${orgPrefix}_${random}`;
};

export const generateAppCredentials = (): {
  clientId: string;
  rawSecret: string;
  hashedSecret: string;
} => {
  const clientId = `af_${crypto.randomBytes(16).toString("hex")}`;
  const rawSecret = `afs_${crypto.randomBytes(32).toString("hex")}`;
  const hashedSecret = crypto
    .createHash("sha256")
    .update(rawSecret)
    .digest("hex");
  return { clientId, rawSecret, hashedSecret };
};

export const verifyAppSecret = (
  rawSecret: string,
  hashedSecret: string,
): boolean => {
  const hash = crypto.createHash("sha256").update(rawSecret).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashedSecret));
};
