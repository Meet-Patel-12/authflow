import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { organizationScope } from "../middlewares/organization-scope.middleware";
import {
  getMyOrganizations,
  createOrganizationHandler,
  switchOrganizationHandler,
  acceptInviteHandler,
  getOrganizationHandler,
  getOrganizationDetailsHandler,
  updateOrganizationHandler,
  inviteMemberHandler,
  updateMemberRoleHandler,
  removeMemberHandler,
  deleteOrganizationHandler,
} from "../controllers/organization.controller";

const router = Router();

router.use(authenticate);

// ─── Routes that do NOT require org scope ─────────────────────────────────────

router.get("/my-organizations", getMyOrganizations);
router.post("/create", createOrganizationHandler);
router.post("/switch", switchOrganizationHandler);
router.post("/accept-invite", acceptInviteHandler);

// ─── Routes that require org scope (orgId on req) ─────────────────────────────

router.use(organizationScope);

router.get("/", getOrganizationHandler);
router.get("/details", getOrganizationDetailsHandler);
router.patch("/", updateOrganizationHandler);
router.post("/members", inviteMemberHandler);
router.patch("/members/:memberId", updateMemberRoleHandler);
router.delete("/members/:memberId", removeMemberHandler);
router.delete("/", deleteOrganizationHandler);

export default router;
