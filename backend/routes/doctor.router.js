import express from "express";
import doctorController from "../controllers/doctor.controller.js";
import authMiddleware   from "../middlewares/auth.middleware.js";

const router = express.Router();

const auth = [
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(["doctor"]),
];

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get("/stats",          ...auth, doctorController.getDoctorStats);
router.get("/schedule/today", ...auth, doctorController.getTodaySchedule);
router.get("/schedule",       ...auth, doctorController.getDoctorSchedule);
router.get("/announcements",  ...auth, doctorController.getAnnouncements);

// ─── Courses ─────────────────────────────────────────────────────────────────
router.get("/courses", ...auth, doctorController.getDoctorCourses);

// ─── Grades ──────────────────────────────────────────────────────────────────
router.get("/grades",             ...auth, doctorController.getDoctorGrades);
router.patch("/grades/:studentId",...auth, doctorController.updateGrade);

// ─── Students ────────────────────────────────────────────────────────────────
router.get("/students",      ...auth, doctorController.getDoctorStudents);
router.get("/students/top",  ...auth, doctorController.getTopStudents);
router.patch("/profile",      ...auth, doctorController.updateProfile);

export default router;
