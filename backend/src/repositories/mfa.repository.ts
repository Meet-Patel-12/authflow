import { MFADevice, IMFADevice } from "../models/mfa.model";
import { User } from "../models/user.model";

// ─── MFA Device ───────────────────────────────────────────────────────────────

export const findUnverifiedDevice = async (
  userId: string,
  organizationId: string,
) => {
  return MFADevice.findOne({
    userId,
    organizationId,
    type: "totp",
    isVerified: false,
  }).select("+secret +backupCodes");
};

export const findVerifiedInactiveDevice = async (
  userId: string,
  organizationId: string,
) => {
  return MFADevice.findOne({
    userId,
    organizationId,
    type: "totp",
    isVerified: true,
    isActive: false,
  });
};

export const findActiveDevice = async (
  userId: string,
  organizationId: string,
) => {
  return MFADevice.findOne({
    userId,
    organizationId,
    type: "totp",
    isVerified: true,
    isActive: true,
  }).select("+secret +backupCodes");
};

export const deleteUnverifiedDevices = async (
  userId: string,
  organizationId: string,
) => {
  return MFADevice.deleteMany({ userId, organizationId, isVerified: false });
};

export const deactivateAllDevices = async (
  userId: string,
  organizationId: string,
) => {
  return MFADevice.updateMany({ userId, organizationId }, { isActive: false });
};

export const createDevice = async (data: {
  userId: string;
  organizationId: string;
  type: "totp";
  secret: string;
  backupCodes: string[];
}): Promise<IMFADevice> => {
  return MFADevice.create({ ...data, isVerified: false, isActive: false });
};

export const saveDevice = async (device: IMFADevice): Promise<IMFADevice> => {
  return device.save();
};

// ─── User ─────────────────────────────────────────────────────────────────────

export const setUserMFA = async (userId: string, enabled: boolean) => {
  return User.findByIdAndUpdate(userId, { mfaEnabled: enabled });
};

export const findUserById = async (userId: string) => {
  return User.findById(userId);
};
