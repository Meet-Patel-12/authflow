import { Request, Response } from "express";
import { Invitation } from "../models/invitation.model";
import { hashToken } from "../services/auth.service";

export const lookupInvitation = async (req: Request, res: Response) => {
  try {
    const invitation = await Invitation.findOne({
      tokenHash: hashToken(req.params.token as string),
      isAccepted: false,
      expiresAt: { $gt: new Date() },
    }).populate("organizationId", "name slug");

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found or has expired",
      });
    }

    const org = invitation.organizationId as any;

    res.status(200).json({
      success: true,
      data: {
        email: invitation.email,
        role: invitation.role,
        organization: { id: org._id, name: org.name, slug: org.slug },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
