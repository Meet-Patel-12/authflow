import { Request, Response } from "express";
import { getIpAddress, getUserAgent } from "../utils/request.util";
import { sendInvitationEmail } from "../services/email.service";
import {
  findUserById,
  findOrgById,
} from "../repositories/organization.repository";
import {
  getUserOrganizations,
  createOrganization,
  switchOrganization,
  acceptInvitation,
  getOrganization,
  getOrganizationDetails,
  updateOrganization,
  inviteMember,
  updateMemberRole,
  removeMember,
  deleteOrganization,
} from "../services/organization.service";

// ─── My Organizations ─────────────────────────────────────────────────────────

export const getMyOrganizations = async (req: Request, res: Response) => {
  try {
    const data = await getUserOrganizations(req.user!.userId);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Create ───────────────────────────────────────────────────────────────────

export const createOrganizationHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const { name, slug } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Organization name is required" });
    }

    const org = await createOrganization(req.user!.userId, name, slug);
    res.status(201).json({
      success: true,
      message: "Organization created successfully",
      data: { id: org._id, name: org.name, slug: org.slug },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Switch ───────────────────────────────────────────────────────────────────

export const switchOrganizationHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId, email } = req.user!;
    const result = await switchOrganization(
      userId,
      email,
      req.body.organizationId,
      getIpAddress(req),
      getUserAgent(req),
    );

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    res.status(200).json({
      success: true,
      message: "Organization switched successfully",
      data: {
        organization: result.org,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error switching organization",
      error: error.message,
    });
  }
};

// ─── Accept Invite ────────────────────────────────────────────────────────────

export const acceptInviteHandler = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Token is required" });
    }

    const result = await acceptInvitation(
      req.user!.userId,
      token,
      getIpAddress(req),
      getUserAgent(req),
    );

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    res.status(200).json({
      success: true,
      message: "You have joined the organization successfully",
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        organizationId: result.organizationId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Org ──────────────────────────────────────────────────────────────────

export const getOrganizationHandler = async (req: Request, res: Response) => {
  try {
    const result = await getOrganization(req.orgId!);
    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    const { org, stats } = result;
    res.status(200).json({
      success: true,
      data: {
        id: org._id,
        name: org.name,
        slug: org.slug,
        billing: org.billing,
        limits: org.limits,
        stats,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Details ──────────────────────────────────────────────────────────────

export const getOrganizationDetailsHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await getOrganizationDetails(req.orgId!);
    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    res.status(200).json({
      success: true,
      data: { organization: result.org, members: result.members },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateOrganizationHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await updateOrganization(
      req.user!.userId,
      req.orgId!,
      req.body,
    );

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    res.status(200).json({
      success: true,
      message: "Organization updated successfully",
      data: result.org,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Invite Member ────────────────────────────────────────────────────────────

export const inviteMemberHandler = async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const result = await inviteMember(
      req.user!.userId,
      req.orgId!,
      email,
      role,
    );

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    const [inviter, org] = await Promise.all([
      findUserById(req.user!.userId),
      findOrgById(req.orgId!),
    ]);

    sendInvitationEmail(
      email,
      result.plainToken,
      org?.name ?? "the organization",
      inviter?.name ?? "A team member",
    ).catch((err) => console.error("Failed to send invite email:", err));

    res
      .status(200)
      .json({ success: true, message: "Invitation sent successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Update Member Role ───────────────────────────────────────────────────────

export const updateMemberRoleHandler = async (req: Request, res: Response) => {
  try {
    const result = await updateMemberRole(
      req.user!.userId,
      req.orgId!,
      req.params.memberId as string,
      req.body.role,
    );

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    res
      .status(200)
      .json({ success: true, message: "Role updated successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Remove Member ────────────────────────────────────────────────────────────

export const removeMemberHandler = async (req: Request, res: Response) => {
  try {
    const result = await removeMember(
      req.user!.userId,
      req.orgId!,
      req.params.memberId as string,
    );

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    res
      .status(200)
      .json({ success: true, message: "Member removed successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Delete Organization ──────────────────────────────────────────────────────

export const deleteOrganizationHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await deleteOrganization(req.user!.userId, req.orgId!);

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    res
      .status(200)
      .json({ success: true, message: "Organization deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
