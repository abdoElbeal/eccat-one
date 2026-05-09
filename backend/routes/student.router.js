import express from "express";
import multer  from "multer";
import studentController, { getMyBills, getMyAssignments, submitAssignment } from "../controllers/student.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const auth = [
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(["student"]),
];

// ─── ROUTES ───────────────────────────────────────────────────────────────────
router.get("/stats",           ...auth, studentController.getDashboardStats);
router.get("/exams/upcoming",  ...auth, studentController.getUpcomingExams);
router.get("/announcements",   ...auth, studentController.getAnnouncements);
router.get("/courses",         ...auth, studentController.getStudentCourses);
router.get("/schedule",        ...auth, studentController.getStudentSchedule);
router.get("/grades",          ...auth, studentController.getStudentGrades);
router.get("/leaderboard",     ...auth, studentController.getLeaderboard);
router.patch("/profile",       ...auth, upload.single("profileImage"), studentController.updateProfile);

// ─── SUPPORT ──────────────────────────────────────────────────────────────────
router.post("/support", ...auth, studentController.createSupportTicket);
router.get("/support",  ...auth, studentController.getMySupportTickets);

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────
router.post("/attendance/scan", ...auth, studentController.scanQrCode);

// ─── FINANCIALS ───────────────────────────────────────────────────────────────
router.get("/billing/my-bills", ...auth, getMyBills);

// ─── ASSIGNMENTS ─────────────────────────────────────────────────────────────
router.get("/assignments",                    ...auth, getMyAssignments);
router.post("/assignments/:assignmentId/submit", ...auth, upload.single("file"), submitAssignment);

export default router;
