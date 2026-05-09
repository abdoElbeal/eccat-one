import express  from "express";
import multer   from "multer";
import doctorController from "../controllers/doctor.controller.js";
import authMiddleware   from "../middlewares/auth.middleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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
router.get("/courses",                 ...auth, doctorController.getDoctorCourses);
router.get("/courses/:subjectId",      ...auth, doctorController.getCourseDetail);

// ─── Exams (Quiz / Midterm / Final Scheduling) ────────────────────────────────
router.get("/exams/:subjectId",        ...auth, doctorController.getExamsForSubject);
router.post("/exams",                  ...auth, doctorController.createExam);
router.patch("/exams/:examId",         ...auth, doctorController.updateExam);
router.delete("/exams/:examId",        ...auth, doctorController.deleteExam);

// ─── Assignments ─────────────────────────────────────────────────────────────
router.post("/assignments",                                   ...auth, doctorController.createAssignment);
router.patch("/assignments/:assignmentId",                    ...auth, doctorController.updateAssignment);
router.delete("/assignments/:assignmentId",                   ...auth, doctorController.deleteAssignment);
router.get("/assignments/:assignmentId/submissions",          ...auth, doctorController.getAssignmentSubmissions);
router.patch("/assignments/:assignmentId/grade/:studentId",   ...auth, doctorController.gradeSubmission);

// ─── Grades ──────────────────────────────────────────────────────────────────
router.get("/grades",              ...auth, doctorController.getDoctorGrades);
router.patch("/grades/:studentId", ...auth, doctorController.updateGrade);

// ─── Students ────────────────────────────────────────────────────────────────
router.get("/students",      ...auth, doctorController.getDoctorStudents);
router.get("/students/top",  ...auth, doctorController.getTopStudents);
router.patch("/profile",     ...auth, upload.single("profileImage"), doctorController.updateProfile);

// ─── Attendance ──────────────────────────────────────────────────────────────
router.post("/attendance",                                    ...auth, doctorController.startAttendanceSession);
router.get("/attendance/history",                             ...auth, doctorController.getAttendanceHistory);
router.get("/attendance/:sessionId",                          ...auth, doctorController.getAttendanceSession);
router.post("/attendance/:sessionId/refresh",                 ...auth, doctorController.refreshQrToken);
router.patch("/attendance/:sessionId/toggle/:studentId",      ...auth, doctorController.toggleManualAttendance);
router.post("/attendance/:sessionId/close",                   ...auth, doctorController.closeAttendanceSession);

export default router;
