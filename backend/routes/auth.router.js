import express from "express";
import authController from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/users", authController.SignUp);
router.use(express.json());
router.post("/resend-verification-email", authController.resendEmail);
router.post("/verify-email", authController.verifyEmail);

import authMiddleware from "../middlewares/auth.middleware.js";

router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/change-password", authMiddleware.authenticateToken, authController.changePassword);
export default router;
