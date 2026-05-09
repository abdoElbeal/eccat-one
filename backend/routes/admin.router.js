import express from "express";
import adminController from "../controllers/admin.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();
const auth = [
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(["admin"]),
];

// ─── REGISTRATION CODES ───────────────────────────────────────────────────────
router.post("/codes", ...auth, adminController.generateRegistrationCode);
router.get("/codes/stats", ...auth, adminController.getStats);
router.get("/codes/:page", ...auth, adminController.getCodes);
router.delete("/codes/used/all", ...auth, adminController.deleteAllUsedCodes);
router.delete("/codes/:id", ...auth, adminController.deleteCode);

// ─── SUBJECTS (Courses) ───────────────────────────────────────────────────────
router.post("/subjects", ...auth, adminController.createSubject);
router.get("/subjects", ...auth, adminController.getAllSubject);
router.patch("/subjects/:id", ...auth, adminController.updateSubject);
router.delete("/subjects/:id", ...auth, adminController.deleteSubject);
router.patch("/subjects/:id/assign", ...auth, adminController.assignDoctorToSubject);

// ─── DEPARTMENTS ──────────────────────────────────────────────────────────────
router.post("/departments", ...auth, adminController.createDepartment);
router.get("/departments", ...auth, adminController.getAllDepartment);
router.patch("/departments/:id", ...auth, adminController.updateDepartment);
router.delete("/departments/:id", ...auth, adminController.deleteDepartment);
router.patch("/departments/:id/head", ...auth, adminController.updateDepartmentHead);

// ─── USERS ────────────────────────────────────────────────────────────────────
router.get("/users", ...auth, adminController.getAllUsers);
router.post("/users/student", ...auth, adminController.createStudent);
router.post("/users/doctor", ...auth, adminController.createDoctor);
router.post("/users/ta", ...auth, adminController.createTA);
router.post("/users/admin", ...auth, adminController.createAdmin);
router.get("/users/:id", ...auth, adminController.getUserDetails);
router.patch("/users/:id", ...auth, adminController.updateUser);
router.delete("/users/:id", ...auth, adminController.deleteUser);

// ─── GROUPS (Extra) ──────────────────────────────────────────────────────────
router.post("/groups/add-student", ...auth, adminController.addStudentToGroup);
router.post("/groups/remove-student", ...auth, adminController.removeStudentFromGroup);

// ─── GROUPS ──────────────────────────────────────────────────────────────────
router.post("/groups", ...auth, adminController.createGroup);
router.get("/groups", ...auth, adminController.getAllGroups);
router.get("/groups/:id", ...auth, adminController.getGroupById);
router.patch("/groups/:id", ...auth, adminController.updateGroup);
router.delete("/groups/:id", ...auth, adminController.deleteGroup);



// ─── SCHEDULES ───────────────────────────────────────────────────────────────
router.post("/schedules", ...auth, adminController.setSchedule);
router.get("/schedules/group/:groupId", ...auth, adminController.getGroupSchedule);
router.delete("/schedules/:id", ...auth, adminController.deleteScheduleSlot);

// ─── GLOBAL STATS ─────────────────────────────────────────────────────────────
router.get("/stats", ...auth, adminController.getGlobalStats);
router.get("/activities", ...auth, adminController.getRecentActivities);

// ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────────
router.post("/announcements", ...auth, adminController.createAnnouncement);
router.get("/announcements", ...auth, adminController.getAnnouncements);
router.patch("/announcements/:id", ...auth, adminController.updateAnnouncement);
router.delete("/announcements/:id", ...auth, adminController.deleteAnnouncement);

// ─── EXAMS ────────────────────────────────────────────────────────────────────
router.post("/exams", ...auth, adminController.createExam);
router.get("/exams", ...auth, adminController.getExams);
router.patch("/exams/:id", ...auth, adminController.updateExam);
router.delete("/exams/:id", ...auth, adminController.deleteExam);

// ─── GRADES (Admin can set grades for any student) ───────────────────────────
router.post("/grades", ...auth, adminController.setGrade);
router.get("/grades/by-subject", ...auth, adminController.getGradesBySubject);
router.patch("/grades/:id", ...auth, adminController.updateGrade);
router.delete("/grades/:id", ...auth, adminController.deleteGrade);
router.get("/grades/student/:studentId", ...auth, adminController.getStudentGrades);

// ─── SUBJECTS — Students enrolled ─────────────────────────────────────────────
router.get("/subjects/:id/students", ...auth, adminController.getStudentsBySubject);
router.patch("/profile", ...auth, adminController.updateProfile);

// ─── SUPPORT ──────────────────────────────────────────────────────────────────
router.get("/support", ...auth, adminController.getSupportTickets);
router.put("/support/:ticketId", ...auth, adminController.respondToSupportTicket);

// ─── BILLING / FINANCIALS ────────────────────────────────────────────────────
router.post("/billing/generate", ...auth, adminController.generateBills);
router.get("/billing", ...auth, adminController.getAllBills);
router.post("/billing/:id/pay", ...auth, adminController.recordPayment);

export default router;
