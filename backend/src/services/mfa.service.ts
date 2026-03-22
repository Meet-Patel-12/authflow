import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";
import {
  findUnverifiedDevice,
  findVerifiedInactiveDevice,
  findActiveDevice,
  deleteUnverifiedDevices,
  deactivateAllDevices,
  createDevice,
  saveDevice,
  setUserMFA,
  findUserById,
} from "../repositories/mfa.repository";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hashBackupCode = (code: string): string => {
  return crypto.createHash("sha256").update(code).digest("hex");
};

const generateBackupCodes = (count = 10): string[] => {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase(),
  );
};

// ─── Setup ────────────────────────────────────────────────────────────────────

export const generateTOTPSecret = async (
  userId: string,
  organizationId: string,
): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> => {
  const user = await findUserById(userId);
  if (!user) throw new Error("User not found");

  await deleteUnverifiedDevices(userId, organizationId);

  const secret = speakeasy.generateSecret({
    name: `AuthFlow (${user.email})`,
    issuer: "AuthFlow",
  });
  const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
  const backupCodes = generateBackupCodes();

  await createDevice({
    userId,
    organizationId,
    type: "totp",
    secret: secret.base32,
    backupCodes: backupCodes.map(hashBackupCode),
  });

  return { secret: secret.base32, qrCode, backupCodes };
};

// ─── Verify Setup ─────────────────────────────────────────────────────────────

export const verifyTOTPSetup = async (
  userId: string,
  organizationId: string,
  token: string,
): Promise<boolean> => {
  const device = await findUnverifiedDevice(userId, organizationId);
  if (!device?.secret) throw new Error("MFA setup not found");

  const isValid = speakeasy.totp.verify({
    secret: device.secret,
    encoding: "base32",
    token,
    window: 2,
  });
  if (!isValid) return false;

  device.isVerified = true;
  await saveDevice(device);
  return true;
};

// ─── Activate ─────────────────────────────────────────────────────────────────

export const activateMFA = async (
  userId: string,
  organizationId: string,
): Promise<void> => {
  const device = await findVerifiedInactiveDevice(userId, organizationId);
  if (!device) throw new Error("MFA verification required");

  device.isActive = true;
  await saveDevice(device);
  await setUserMFA(userId, true);
};

// ─── Verify TOTP ──────────────────────────────────────────────────────────────

export const verifyTOTP = async (
  userId: string,
  organizationId: string,
  token: string,
): Promise<boolean> => {
  const device = await findActiveDevice(userId, organizationId);
  if (!device?.secret) throw new Error("MFA not enabled");

  const isValid = speakeasy.totp.verify({
    secret: device.secret,
    encoding: "base32",
    token,
    window: 2,
  });

  if (isValid) {
    device.lastUsedAt = new Date();
    await saveDevice(device);
  }

  return isValid;
};

// ─── Verify Backup Code ───────────────────────────────────────────────────────

export const verifyBackupCode = async (
  userId: string,
  organizationId: string,
  code: string,
): Promise<boolean> => {
  const device = await findActiveDevice(userId, organizationId);
  if (!device?.backupCodes) throw new Error("MFA not enabled");

  const hashed = hashBackupCode(code);
  const index = device.backupCodes.indexOf(hashed);
  if (index === -1) return false;

  device.backupCodes.splice(index, 1);
  device.lastUsedAt = new Date();
  await saveDevice(device);
  return true;
};

// ─── Disable ──────────────────────────────────────────────────────────────────

export const disableMFA = async (
  userId: string,
  organizationId: string,
): Promise<void> => {
  await deactivateAllDevices(userId, organizationId);
  await setUserMFA(userId, false);
};

// ─── Regenerate Backup Codes ──────────────────────────────────────────────────

export const regenerateBackupCodes = async (
  userId: string,
  organizationId: string,
): Promise<string[]> => {
  const device = await findActiveDevice(userId, organizationId);
  if (!device) throw new Error("MFA not enabled");

  const newCodes = generateBackupCodes();
  device.backupCodes = newCodes.map(hashBackupCode);
  await saveDevice(device);
  return newCodes;
};
