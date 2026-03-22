import { Router } from "express";
import { body } from "express-validator";
import multer from "multer";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import {
  authRateLimiter,
  strictAuthRateLimiter,
} from "../middlewares/rateLimit.middleware";
import {
  register,
  login,
  logout,
  refresh,
  getCurrentUser,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  getSessionsHandler,
  revokeSessionHandler,
  updateProfile,
  changePassword,
  deleteAccount,
  deactivateAccount,
  downloadMyData,
  getConnectedAppsHandler,
  removeAvatar,
  uploadAvatar,
} from "../controllers/auth.controller";

const router = Router();

// ─── Validation ───────────────────────────────────────────────────────────────

const passwordRules = () =>
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    );

const registerValidation = [
  body("email").isEmail().withMessage("Please enter a valid email"),
  passwordRules(),
  body("name").notEmpty().withMessage("Name is required").trim(),
  body("organizationName")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 2 })
    .withMessage("Organization name must be at least 2 characters"),
];

const loginValidation = [
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

const resetPasswordValidation = [
  body("token").notEmpty().withMessage("Reset token is required"),
  passwordRules(),
];

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, WebP and GIF images are allowed"));
    }
  },
});

// ─── Public Routes ────────────────────────────────────────────────────────────

router.post(
  "/register",
  authRateLimiter,
  registerValidation,
  validate,
  register,
);
router.post("/login", authRateLimiter, loginValidation, validate, login);
router.post("/refresh-token", authRateLimiter, refresh);
router.post(
  "/verify-email",
  strictAuthRateLimiter,
  [body("token").notEmpty().withMessage("Verification token is required")],
  validate,
  verifyEmail,
);
router.post(
  "/request-password-reset",
  strictAuthRateLimiter,
  [body("email").isEmail().withMessage("Please enter a valid email")],
  validate,
  requestPasswordReset,
);
router.post(
  "/reset-password",
  strictAuthRateLimiter,
  resetPasswordValidation,
  validate,
  resetPassword,
);

// ─── Protected Routes ─────────────────────────────────────────────────────────

router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getCurrentUser);
router.get("/sessions", authenticate, getSessionsHandler);
router.delete("/sessions/:sessionId", authenticate, revokeSessionHandler);
router.patch("/profile", authenticate, updateProfile);
router.post("/change-password", authenticate, changePassword);
router.delete("/account", authenticate, deleteAccount);
router.post("/deactivate", authenticate, deactivateAccount);
router.get("/data-export", authenticate, downloadMyData);
router.get("/connected-apps", authenticate, getConnectedAppsHandler);
router.patch(
  "/profile/avatar",
  authenticate,
  avatarUpload.single("avatar"),
  uploadAvatar,
);
router.delete("/profile/avatar", authenticate, removeAvatar);

export default router;
