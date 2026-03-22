import { Request, Response } from "express";
import { getIpAddress, getUserAgent } from "../utils/request.util";
import { createAuditEntry } from "../repositories/audit.repository";
import { findMembership } from "../repositories/admin.repository";
import {
  getOrgStats,
  listOrgUsers,
  getOrgUser,
  updateOrgUser,
  updateOrgUserRole,
  suspendOrgUser,
  activateOrgUser,
  deleteOrgUser,
  getAuditLogs,
  getHealthStatus,
  assertOrgMember,
  assertNotLastOwner,
} from "../services/admin.service";

// ─── Stats ────────────────────────────────────────────────────────────────────

export const getStats = async (req: Request, res: Response) => {
  try {
    const data = await getOrgStats(req.user!.organizationId);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching stats",
        error: error.message,
      });
  }
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const listUsers = async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "10",
      search,
      role,
      mfaEnabled,
      isEmailVerified,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const data = await listOrgUsers(req.user!.organizationId, {
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      role: role as string,
      mfaEnabled: mfaEnabled as string,
      isEmailVerified: isEmailVerified as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as string,
    });

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching users",
        error: error.message,
      });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.user!;
    const id = req.params.id as string;

    const isMember = await assertOrgMember(id, organizationId);
    if (!isMember) {
      return res
        .status(404)
        .json({
          success: false,
          message: "User not found in your organization",
        });
    }

    const data = await getOrgUser(id, organizationId);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching user",
        error: error.message,
      });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { organizationId, userId: adminId } = req.user!;
    const id = req.params.id as string;
    const { name, role, isEmailVerified } = req.body;

    const isMember = await assertOrgMember(id, organizationId);
    if (!isMember) {
      return res
        .status(404)
        .json({
          success: false,
          message: "User not found in your organization",
        });
    }

    const user = await updateOrgUser(id, organizationId, {
      name,
      role,
      isEmailVerified,
    });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await createAuditEntry({
      userId: adminId,
      organizationId,
      action: "user_update",
      resource: "user",
      resourceId: user._id.toString(),
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      metadata: { changes: req.body },
    });

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
      },
    });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error updating user",
        error: error.message,
      });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { organizationId, userId: adminId } = req.user!;
    const id = req.params.id as string;
    const { role } = req.body;

    if (!role || !["member", "admin", "owner"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const isMember = await assertOrgMember(id, organizationId);
    if (!isMember) {
      return res
        .status(404)
        .json({
          success: false,
          message: "User not found in your organization",
        });
    }

    if (role !== "owner") {
      const canChange = await assertNotLastOwner(id, organizationId);
      if (!canChange) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Cannot demote the last owner of this organization",
          });
      }
    }

    const membership = await updateOrgUserRole(id, organizationId, role);

    await createAuditEntry({
      userId: adminId,
      organizationId,
      action: "user_role_update",
      resource: "user",
      resourceId: id,
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      metadata: { newRole: role },
    });

    res
      .status(200)
      .json({
        success: true,
        message: "User role updated successfully",
        data: { role: membership?.role },
      });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error updating role",
        error: error.message,
      });
  }
};

export const suspendUser = async (req: Request, res: Response) => {
  try {
    const { organizationId, userId: adminId } = req.user!;
    const id = req.params.id as string;

    const isMember = await assertOrgMember(id, organizationId);
    if (!isMember) {
      return res
        .status(404)
        .json({
          success: false,
          message: "User not found in your organization",
        });
    }

    const membership = await findMembership(id, organizationId);
    if (membership?.role === "owner") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Cannot suspend the organization owner",
        });
    }

    const user = await suspendOrgUser(id, organizationId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    await createAuditEntry({
      userId: adminId,
      organizationId,
      action: "user_suspended",
      resource: "user",
      resourceId: id,
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    res
      .status(200)
      .json({ success: true, message: "User suspended successfully" });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error suspending user",
        error: error.message,
      });
  }
};

export const activateUser = async (req: Request, res: Response) => {
  try {
    const { organizationId, userId: adminId } = req.user!;
    const id = req.params.id as string;

    const isMember = await assertOrgMember(id, organizationId);
    if (!isMember) {
      return res
        .status(404)
        .json({
          success: false,
          message: "User not found in your organization",
        });
    }

    const user = await activateOrgUser(id, organizationId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    await createAuditEntry({
      userId: adminId,
      organizationId,
      action: "user_activated",
      resource: "user",
      resourceId: id,
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    res
      .status(200)
      .json({ success: true, message: "User activated successfully" });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error activating user",
        error: error.message,
      });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { organizationId, userId: adminId } = req.user!;
    const id = req.params.id as string;

    const isMember = await assertOrgMember(id, organizationId);
    if (!isMember) {
      return res
        .status(404)
        .json({
          success: false,
          message: "User not found in your organization",
        });
    }

    const canDelete = await assertNotLastOwner(id, organizationId);
    if (!canDelete) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Cannot delete the last owner of this organization",
        });
    }

    const user = await deleteOrgUser(id, organizationId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    await createAuditEntry({
      userId: adminId,
      organizationId,
      action: "user_deleted",
      resource: "user",
      resourceId: id,
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error deleting user",
        error: error.message,
      });
  }
};

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const getAuditLogEntries = async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "100",
      userId,
      action,
      startDate,
      endDate,
    } = req.query;

    const data = await getAuditLogs(req.user!.organizationId, {
      page: Number(page),
      limit: Number(limit),
      userId: userId as string,
      action: action as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching audit logs",
        error: error.message,
      });
  }
};

// ─── Health ───────────────────────────────────────────────────────────────────

export const getHealth = async (req: Request, res: Response) => {
  try {
    const data = await getHealthStatus();
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "System unhealthy",
        error: error.message,
      });
  }
};
