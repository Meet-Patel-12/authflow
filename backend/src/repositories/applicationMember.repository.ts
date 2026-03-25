import mongoose from "mongoose";
import { ApplicationMember } from "../models/applicationMember.model";

// ─── Application Members ──────────────────────────────────────────────────────

export const getAppUsers = async (
  applicationId: string,
  skip: number = 0,
  limit: number = 20,
) => {
  return ApplicationMember.find({ applicationId })
    .populate("userId", "name email avatar isActive")
    .sort({ assignedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

export const countAppUsers = async (applicationId: string): Promise<number> => {
  return ApplicationMember.countDocuments({ applicationId });
};

export const findAppUser = async (applicationId: string, userId: string) => {
  return ApplicationMember.findOne({ applicationId, userId });
};

export const addUserToApp = async (
  applicationId: string,
  userId: string,
  role: string = "viewer",
) => {
  return ApplicationMember.create({
    applicationId,
    userId,
    role,
  });
};

export const removeUserFromApp = async (
  applicationId: string,
  userId: string,
) => {
  return ApplicationMember.findOneAndDelete({ applicationId, userId });
};

export const updateAppUserRole = async (
  applicationId: string,
  userId: string,
  role: string,
) => {
  return ApplicationMember.findOneAndUpdate(
    { applicationId, userId },
    { role },
    { new: true },
  );
};

export const searchAppUsers = async (
  applicationId: string,
  query: Record<string, unknown>,
  skip: number = 0,
  limit: number = 20,
) => {
  return ApplicationMember.find({ applicationId, ...query })
    .populate("userId", "name email avatar isActive")
    .skip(skip)
    .limit(limit)
    .lean();
};

export const countSearchAppUsers = async (
  applicationId: string,
  query: Record<string, unknown>,
): Promise<number> => {
  return ApplicationMember.countDocuments({ applicationId, ...query });
};
