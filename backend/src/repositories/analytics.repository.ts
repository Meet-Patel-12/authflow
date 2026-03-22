import mongoose from "mongoose";
import { User } from "../models/user.model";
import { AuditLog } from "../models/audit.model";
import { Session } from "../models/session.model";
import { Membership } from "../models/membership.model";
import { SDKUser } from "../models/sdkUser.model";
import { SDKSession } from "../models/sdkSession.model";
import { Application } from "../models/application.model";

const DAY_FORMAT = { format: "%Y-%m-%d", date: "$createdAt" } as const;

const deviceClassifier = {
  $cond: [
    { $regexMatch: { input: "$userAgent", regex: /Mobile/i } },
    "Mobile",
    {
      $cond: [
        { $regexMatch: { input: "$userAgent", regex: /Tablet/i } },
        "Tablet",
        "Desktop",
      ],
    },
  ],
};

// ─── Membership ───────────────────────────────────────────────────────────────

export const getOrgUserIds = async (
  organizationId: string,
): Promise<mongoose.Types.ObjectId[]> => {
  const memberships = await Membership.find({ organizationId })
    .select("userId")
    .lean();
  return memberships.map((m) => m.userId);
};

// ─── Platform Users ───────────────────────────────────────────────────────────

export const countPlatformUsers = async (
  userIds: mongoose.Types.ObjectId[],
  filter: Record<string, unknown> = {},
) => {
  return User.countDocuments({ _id: { $in: userIds }, ...filter });
};

export const getPlatformUserGrowth = async (
  userIds: mongoose.Types.ObjectId[],
  startDate: Date,
  endDate: Date,
) => {
  return User.aggregate([
    {
      $match: {
        _id: { $in: userIds },
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    { $group: { _id: { $dateToString: DAY_FORMAT }, newUsers: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
};

// ─── SDK Users ────────────────────────────────────────────────────────────────

export const countSDKUsers = async (
  orgObjectId: mongoose.Types.ObjectId,
  filter: Record<string, unknown> = {},
) => {
  return SDKUser.countDocuments({ organizationId: orgObjectId, ...filter });
};

export const getSDKUserGrowth = async (
  orgObjectId: mongoose.Types.ObjectId,
  startDate: Date,
  endDate: Date,
) => {
  return SDKUser.aggregate([
    {
      $match: {
        organizationId: orgObjectId,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    { $group: { _id: { $dateToString: DAY_FORMAT }, newUsers: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
};

// ─── Applications ─────────────────────────────────────────────────────────────

export const countActiveApplications = async (organizationId: string) => {
  return Application.countDocuments({ organizationId, isActive: true });
};

export const findActiveApplications = async (organizationId: string) => {
  return Application.find({ organizationId, isActive: true })
    .select("name type clientId")
    .lean();
};

// ─── Audit / Logins ───────────────────────────────────────────────────────────

export const countAuditAction = async (
  orgObjectId: mongoose.Types.ObjectId,
  action: string,
  startDate: Date,
  endDate: Date,
) => {
  return AuditLog.countDocuments({
    organizationId: orgObjectId,
    action,
    createdAt: { $gte: startDate, $lte: endDate },
  });
};

export const getLoginActivity = async (
  orgObjectId: mongoose.Types.ObjectId,
  action: string,
  startDate: Date,
  endDate: Date,
) => {
  return AuditLog.aggregate([
    {
      $match: {
        organizationId: orgObjectId,
        action,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: DAY_FORMAT },
        logins: { $sum: 1 },
        uniqueUsers: { $addToSet: "$userId" },
      },
    },
    {
      $project: {
        _id: 0,
        date: "$_id",
        logins: 1,
        uniqueUsers: { $size: "$uniqueUsers" },
      },
    },
    { $sort: { date: 1 } },
  ]);
};

export const getSDKLoginActivity = async (
  orgObjectId: mongoose.Types.ObjectId,
  startDate: Date,
  endDate: Date,
) => {
  return AuditLog.aggregate([
    {
      $match: {
        organizationId: orgObjectId,
        action: "sdk_user_login",
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    { $group: { _id: { $dateToString: DAY_FORMAT }, logins: { $sum: 1 } } },
    { $project: { _id: 0, date: "$_id", logins: 1 } },
    { $sort: { date: 1 } },
  ]);
};

// ─── Device Stats ─────────────────────────────────────────────────────────────

export const getPlatformDeviceStats = async (
  orgObjectId: mongoose.Types.ObjectId,
) => {
  return Session.aggregate([
    { $match: { organizationId: orgObjectId, isActive: true } },
    { $group: { _id: deviceClassifier, count: { $sum: 1 } } },
  ]);
};

export const getSDKDeviceStats = async (
  orgObjectId: mongoose.Types.ObjectId,
) => {
  return SDKSession.aggregate([
    { $match: { organizationId: orgObjectId, isActive: true } },
    { $group: { _id: deviceClassifier, count: { $sum: 1 } } },
  ]);
};
