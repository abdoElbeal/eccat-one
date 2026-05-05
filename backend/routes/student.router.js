import express from "express";
import studentController from "../controllers/student.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

// Role based middleware to ensure only students access these routes
// The authMiddleware already checks the token, we use a custom inline check for student role
const auth = [
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(["student"]),
];

// ─── ROUTES ───────────────────────────────────────────────────────────────────
router.get("/stats", ...auth, studentController.getDashboardStats);
router.get("/exams/upcoming", ...auth, studentController.getUpcomingExams);
router.get("/announcements", ...auth, studentController.getAnnouncements);
router.get("/courses", ...auth, studentController.getStudentCourses);
router.get("/schedule", ...auth, studentController.getStudentSchedule);
router.get("/grades", ...auth, studentController.getStudentGrades);
router.get("/leaderboard", ...auth, studentController.getLeaderboard);
router.patch("/profile", ...auth, studentController.updateProfile);

// ─── SUPPORT ──────────────────────────────────────────────────────────────────
router.post("/support", ...auth, studentController.createSupportTicket);
router.get("/support", ...auth, studentController.getMySupportTickets);

export default router;
