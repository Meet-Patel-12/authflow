import { Request, Response } from "express";
import { getIpAddress, getUserAgent } from "../utils/request.util";
import { createAuditEntry } from "../repositories/audit.repository";
import {
  getAppUsers,
  countAppUsers,
  findAppUser,
  addUserToApp,
  removeUserFromApp,
  updateAppUserRole,
  searchAppUsers,
  countSearchAppUsers,
} from "../repositories/applicationMember.repository";
import {
  findMembershipWithRole,
  getOrgUserIds,
  findOrgUsers,
  countOrgUsers,
} from "../repositories/admin.repository";
import { findOrgApplicationById } from "../repositories/application.repository";

// ─── Get App Users ────────────────────────────────────────────────────────────

export const getAppUsersHandler = async (req: Request, res: Response) => {
  try {
    const appId = req.params.appId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Verify app belongs to org
    const app = await findOrgApplicationById(appId, req.user!.organizationId);
    if (!app) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    const users = await getAppUsers(appId, skip, limit);
    const total = await countAppUsers(appId);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: total,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching app users",
      error: error.message,
    });
  }
};

// ─── Search App Users ─────────────────────────────────────────────────────────

export const searchAppUsersHandler = async (req: Request, res: Response) => {
  try {
    const appId = req.params.appId as string;
    const q = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Verify app belongs to org
    const app = await findOrgApplicationById(appId, req.user!.organizationId);
    if (!app) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    const query = q
      ? {
          $or: [
            { "userId.name": { $regex: q, $options: "i" } },
            { "userId.email": { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const users = await searchAppUsers(appId, query, skip, limit);
    const total = await countSearchAppUsers(appId, query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: total,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error searching app users",
      error: error.message,
    });
  }
};

// ─── Add User to App ──────────────────────────────────────────────────────────

export const addUserToAppHandler = async (req: Request, res: Response) => {
  try {
    const appId = req.params.appId as string;
    const { userId, role } = req.body;

    // Check if user is admin or owner
    const membership = await findMembershipWithRole(
      req.user!.userId,
      req.user!.organizationId,
    );
    if (!membership || !["admin", "owner"].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admin/owner can manage app users",
      });
    }

    // Verify app belongs to org
    const app = await findOrgApplicationById(appId, req.user!.organizationId);
    if (!app) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    // Check if user exists in org
    const orgUserIds = await getOrgUserIds(req.user!.organizationId);
    if (!orgUserIds.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "User is not a member of this organization",
      });
    }

    // Check if user already in app
    const existing = await findAppUser(appId, userId);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "User is already in this application",
      });
    }

    // Add user to app
    const appMember = await addUserToApp(appId, userId, role || "viewer");

    // Audit log
    await createAuditEntry({
      organizationId: req.user!.organizationId,
      userId: req.user!.userId,
      action: "app_user_added",
      resource: "application",
      resourceId: appId,
      changes: { userId, role: role || "viewer" },
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    res.status(201).json({
      success: true,
      message: "User added to application",
      data: { appMember },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error adding user to app",
      error: error.message,
    });
  }
};

// ─── Remove User from App ─────────────────────────────────────────────────────

export const removeUserFromAppHandler = async (req: Request, res: Response) => {
  try {
    const appId = req.params.appId as string;
    const userId = req.params.userId as string;

    // Check if user is admin or owner
    const membership = await findMembershipWithRole(
      req.user!.userId,
      req.user!.organizationId,
    );
    if (!membership || !["admin", "owner"].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admin/owner can manage app users",
      });
    }

    // Verify app belongs to org
    const app = await findOrgApplicationById(appId, req.user!.organizationId);
    if (!app) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    // Remove user
    const deleted = await removeUserFromApp(appId, userId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "User not found in this application",
      });
    }

    // Audit log
    await createAuditEntry({
      organizationId: req.user!.organizationId,
      userId: req.user!.userId,
      action: "app_user_removed",
      resource: "application",
      resourceId: appId,
      changes: { removedUserId: userId },
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    res.status(200).json({
      success: true,
      message: "User removed from application",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error removing user from app",
      error: error.message,
    });
  }
};

// ─── Update User Role in App ──────────────────────────────────────────────────

export const updateAppUserRoleHandler = async (req: Request, res: Response) => {
  try {
    const appId = req.params.appId as string;
    const userId = req.params.userId as string;
    const { role } = req.body;

    // Check if user is admin or owner
    const membership = await findMembershipWithRole(
      req.user!.userId,
      req.user!.organizationId,
    );
    if (!membership || !["admin", "owner"].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admin/owner can manage app users",
      });
    }

    // Verify app belongs to org
    const app = await findOrgApplicationById(appId, req.user!.organizationId);
    if (!app) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    // Update role
    const updated = await updateAppUserRole(appId, userId, role);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "User not found in this application",
      });
    }

    // Audit log
    await createAuditEntry({
      organizationId: req.user!.organizationId,
      userId: req.user!.userId,
      action: "app_user_role_updated",
      resource: "application",
      resourceId: appId,
      changes: { userId, newRole: role },
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    res.status(200).json({
      success: true,
      message: "User role updated",
      data: { appMember: updated },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error updating user role",
      error: error.message,
    });
  }
};

// ─── Get Available Users (Org members not yet in app) ─────────────────────────

export const getAvailableUsersHandler = async (req: Request, res: Response) => {
  try {
    const appId = req.params.appId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Verify app belongs to org
    const app = await findOrgApplicationById(appId, req.user!.organizationId);
    if (!app) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    // Get all org user IDs
    const orgUserIds = await getOrgUserIds(req.user!.organizationId);

    // Get already added user IDs
    const addedMembers = await getAppUsers(appId, 0, 1000);
    const addedUserIds = addedMembers.map((m: any) => m.userId._id?.toString());

    // Get available users (in org but not in app)
    const availableUserIds = orgUserIds.filter(
      (id) => !addedUserIds.includes(id.toString()),
    );

    // If no available users
    if (availableUserIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          users: [],
          pagination: {
            current: page,
            total: 0,
            count: 0,
          },
        },
      });
    }

    // Get available users with pagination
    const users = await findOrgUsers(
      availableUserIds,
      {},
      { name: 1 },
      skip,
      limit,
    );
    const total = availableUserIds.length;

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: total,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching available users",
      error: error.message,
    });
  }
};
