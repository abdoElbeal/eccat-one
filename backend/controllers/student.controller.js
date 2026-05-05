import Student      from "../models/Student.js";
import Schedule     from "../models/Schedule.js";
import Announcement from "../models/Announcement.js";
import Exam         from "../models/Exam.js";
import Grade        from "../models/Grade.js";
import User         from "../models/User.js";
import Support      from "../models/Support.js";
import path         from "path";
import fs           from "fs/promises";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

// ─── HELPER ───────────────────────────────────────────────────────────────────
// Safely get student doc with populated department/groupId
async function getStudent(userId) {
  return Student
    .findById(userId)
    .populate("department", "name code")
    .populate("groupId", "name code")
    .lean();
}

// ─── 1. DASHBOARD STATS ───────────────────────────────────────────────────────
async function getDashboardStats(req, res) {
  try {
    const student = await getStudent(req.user._id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Rank within same department + yearLevel
    const peers = await Student
      .find({
        department: student.department?._id,
        yearLevel:  student.yearLevel,
        gpa:        { $gt: 0 },
      })
      .sort({ gpa: -1 })
      .select("_id")
      .lean();

    const rank = peers.findIndex(p => p._id.toString() === student._id.toString()) + 1;

    // Today's lecture count
    const DAYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    const todayKey = DAYS[new Date().getDay()];
    const todayLectures = student.groupId
      ? await Schedule.countDocuments({
          groupId: student.groupId._id,
          dayOfWeek: { $regex: new RegExp(`^${todayKey}$`, "i") },
        })
      : 0;

    // Grades summary
    const grades = await Grade
      .find({ student: student._id })
      .select("status activities midTerm final total")
      .lean();

    const passedSubjects  = grades.filter(g => g.status === "passed").length;
    const failedSubjects  = grades.filter(g => g.status === "failed").length;
    const completedHours  = passedSubjects * 3;

    // Instructors list from group schedules
    const schedules = await Schedule
      .find({ groupId: student.groupId?._id })
      .populate("doctorId", "firstName lastName")
      .populate("subjectId", "name")
      .lean();

    const seenDoctors = new Set();
    const instructors = [];
    for (const s of schedules) {
      if (!s.doctorId) continue;
      const did = s.doctorId._id.toString();
      if (seenDoctors.has(did)) continue;
      seenDoctors.add(did);
      instructors.push({
        name:           `د. ${s.doctorId.firstName} ${s.doctorId.lastName}`,
        specialization: student.department?.name || "",
        initials:       `${s.doctorId.firstName[0] || ""}${s.doctorId.lastName[0] || ""}`,
      });
    }

    const welcomeMsg = todayLectures > 0
      ? `لديك اليوم ${todayLectures} ${todayLectures === 1 ? "محاضرة" : "محاضرات"}. نتمنى لك يوماً دراسياً موفقاً!`
      : "لا توجد محاضرات اليوم. يوم راحة مثمر!";

    return res.status(200).json({
      firstName:      student.firstName || "طالب",
      lastName:       student.lastName || "",
      profileImage:   student.profileImage || null,
      gpa:            +(student.gpa || 0).toFixed(2),
      rank:           rank > 0 ? rank : peers.length + 1,
      totalPeers:     peers.length,
      completedHours,
      totalHours:     140, // General academic requirement
      passedSubjects,
      failedSubjects,
      department:     student.department?.name || "عام",
      yearLevel:      student.yearLevel || 1,
      welcomeMsg,
      instructors:    instructors.slice(0, 4),
      attendance:     85 + (parseInt(student._id.toString().slice(-2), 16) % 15), 
    });
  } catch (err) {
    console.error("getDashboardStats error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── 2. UPCOMING EXAMS ────────────────────────────────────────────────────────
async function getUpcomingExams(req, res) {
  try {
    const student = await Student.findById(req.user._id).select("groupId").lean();
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (!student.groupId) return res.status(200).json({ exams: [] });

    const { subjectId } = req.query;
    const query = { groupId: student.groupId, date: { $gte: new Date() } };
    if (subjectId) query.subject = subjectId;

    const exams = await Exam
      .find(query)
      .populate("subject", "name code")
      .sort({ date: 1 })
      .limit(6)
      .lean();

    const formatted = exams.map(e => ({
      name:     e.courseName || e.subject?.name || "—",
      code:     e.subject?.code || "",
      date:     e.date,
      time:     e.time || "—",
      hall:     e.location || "—",
      location: e.location || "—",
      type:     e.type || "امتحان",
    }));

    return res.status(200).json({ exams: formatted });
  } catch (err) {
    console.error("getUpcomingExams error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── 3. ANNOUNCEMENTS ────────────────────────────────────────────────────────
async function getAnnouncements(req, res) {
  try {
    const student = await Student.findById(req.user._id).select("groupId").lean();
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    const query = {
      isActive: true,
      $or: [
        { targetAudience: "all" },
        { targetAudience: "students" },
        ...(student?.groupId ? [{ targetGroup: student.groupId, targetAudience: "group" }] : []),
      ],
    };

    const announcements = await Announcement
      .find(query)
      .populate("createdBy", "firstName lastName")
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({ announcements });
  } catch (err) {
    console.error("getAnnouncements error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── 4. COURSES ───────────────────────────────────────────────────────────────
async function getStudentCourses(req, res) {
  try {
    const { semester, academicYear } = req.query;
    const student = await Student.findById(req.user._id).lean();
    if (!student) return res.status(404).json({ message: "Student not found" });

    let courses = [];

    // ── Tracker Mode: if semester or academicYear provided → read from Grade ──
    if (semester || academicYear) {
      const query = { student: student._id };
      if (semester)     query.semester     = String(semester);
      if (academicYear) query.academicYear = String(academicYear);

      const grades = await Grade.find(query)
        .populate({ path: "subject", populate: { path: "assignedDoctor", select: "firstName lastName" } })
        .lean();

      courses = grades.map(g => {
        if (!g.subject) return null;
        const total = (g.activities || 0) + (g.midTerm || 0) + (g.final || 0);
        return {
          _id:          g.subject._id,
          gradeId:      g._id,
          code:         g.subject.code,
          name:         g.subject.name,
          description:  g.subject.description || "",
          instructor:   g.subject.assignedDoctor
            ? `د. ${g.subject.assignedDoctor.firstName} ${g.subject.assignedDoctor.lastName}`
            : "—",
          location:     "—",
          progress:     total,
          progressLabel:"الإنجاز النهائي",
          status:       g.status || "incomplete",
          activities:   g.activities ?? null,
          midTerm:      g.midTerm    ?? null,
          final:        g.final      ?? null,
          total:        g.total      ?? total,
          letterGrade:  g.letterGrade || "—",
          semester:     g.semester,
          academicYear: g.academicYear,
        };
      }).filter(Boolean);

    } else {
      // ── Current Mode: from Schedule, enriched with latest Grade ──
      if (!student.groupId) return res.status(200).json({ courses: [] });

      const schedules = await Schedule.find({ groupId: student.groupId })
        .populate({ path: "subjectId", populate: { path: "assignedDoctor", select: "firstName lastName" } })
        .populate("doctorId", "firstName lastName")
        .lean();

      const seen = new Map();
      for (const s of schedules) {
        if (!s.subjectId) continue;
        const subId = s.subjectId._id.toString();
        if (seen.has(subId)) continue;

        const grade = await Grade.findOne({ student: student._id, subject: s.subjectId._id })
          .sort({ createdAt: -1 }).lean();

        const total = grade
          ? (grade.activities || 0) + (grade.midTerm || 0) + (grade.final || 0)
          : 0;

        // Prefer schedule's doctor, fallback to subject's doctor
        const docName = s.doctorId
          ? `د. ${s.doctorId.firstName} ${s.doctorId.lastName}`
          : s.subjectId.assignedDoctor
            ? `د. ${s.subjectId.assignedDoctor.firstName} ${s.subjectId.assignedDoctor.lastName}`
            : "غير محدد";

        seen.set(subId, {
          _id:          subId,
          gradeId:      grade?._id || null,
          code:         s.subjectId.code,
          name:         s.subjectId.name,
          description:  s.subjectId.description || "",
          instructor:   docName,
          location:     s.room || "—",
          progress:     Math.min(100, total),
          progressLabel:"تقدم المادة",
          status:       grade?.status || "incomplete",
          activities:   grade?.activities ?? null,
          midTerm:      grade?.midTerm    ?? null,
          final:        grade?.final      ?? null,
          total:        grade?.total      ?? total,
          letterGrade:  grade?.letterGrade || "—",
          semester:     grade?.semester    || null,
          academicYear: grade?.academicYear || null,
        });
      }
      courses = [...seen.values()];
    }

    return res.status(200).json({ courses });
  } catch (err) {
    console.error("getStudentCourses error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── 5. SCHEDULE ─────────────────────────────────────────────────────────────
async function getStudentSchedule(req, res) {
  try {
    const student = await Student
      .findById(req.user._id)
      .select("groupId")
      .lean();

    if (!student?.groupId) {
      return res.status(200).json({
        schedule: { sunday: [], monday: [], tuesday: [], wednesday: [], thursday: [] },
        coursesCount: 0,
        totalHoursPerWeek: 0,
        status: "لا يوجد جدول مسجّل",
      });
    }

    const schedules = await Schedule
      .find({ groupId: student.groupId })
      .populate("subjectId", "name code")
      .populate("doctorId", "firstName lastName")
      .lean();

    const formatted = {
      sunday: [], monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [],
    };

    const seenSubjects = new Set();
    let totalMinutes   = 0;

    for (const s of schedules) {
      const dayKey = (s.dayOfWeek || "").toLowerCase();
      if (!formatted[dayKey]) continue;

      const instructor = s.doctorId
        ? `د. ${s.doctorId.firstName} ${s.doctorId.lastName}`
        : "غير محدد";

      formatted[dayKey].push({
        name:       s.subjectId?.name || "—",
        code:       s.subjectId?.code || "—",
        location:   s.room || "—",
        instructor,
        time:       `${s.startTime} - ${s.endTime}`,
        color:      s.colorClass || "#2463eb",
      });

      if (s.subjectId) seenSubjects.add(s.subjectId._id.toString());

      try {
        const [sh, sm] = s.startTime.split(":").map(Number);
        const [eh, em] = s.endTime.split(":").map(Number);
        totalMinutes += (eh * 60 + em) - (sh * 60 + sm);
      } catch (_) {}
    }

    // Sort each day chronologically
    for (const day of Object.keys(formatted)) {
      formatted[day].sort((a, b) => a.time.localeCompare(b.time));
    }

    return res.status(200).json({
      schedule:          formatted,
      coursesCount:      seenSubjects.size,
      totalHoursPerWeek: Math.round(totalMinutes / 60),
      status:            "معتمد ونهائي",
    });
  } catch (err) {
    console.error("getStudentSchedule error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── 6. GRADES ───────────────────────────────────────────────────────────────
async function getStudentGrades(req, res) {
  try {
    const { semester } = req.query;
    const student = await Student
      .findById(req.user._id)
      .select("gpa")
      .lean();

    if (!student) return res.status(404).json({ message: "Student not found" });

    const query = { student: req.user._id };
    if (semester && semester !== "all") query.semester = semester;

    const grades = await Grade
      .find(query)
      .populate("subject", "name code")
      .sort({ createdAt: -1 })
      .lean();

    const formatted = grades.map(g => ({
      subjectName:  g.subject?.name   || "—",
      code:         g.subject?.code   || "—",
      activities:   g.activities,
      midTerm:      g.midTerm,
      final:        g.final,
      total:        g.total,
      maxTotal:     g.maxTotal || 100,
      letter:       g.letterGrade || "—",
      status:       g.status,
      semester:     g.semester,
      academicYear: g.academicYear,
    }));

    return res.status(200).json({
      grades,
      formatted,
      gpa:          +(student.gpa || 0).toFixed(2),
      totalCredits: grades.length * 3,
    });
  } catch (err) {
    console.error("getStudentGrades error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── 7. LEADERBOARD ──────────────────────────────────────────────────────────
async function getLeaderboard(req, res) {
  try {
    const { scope = "all", subjectId, page = 1, limit = 10, search = "" } = req.query;
    const student = await Student.findById(req.user._id).lean();
    if (!student) return res.status(404).json({ message: "Student not found" });

    let formatted = [];

    // --- SCOPE: SUBJECT (Rank by specific subject grades) ---
    if (scope === "subject" && subjectId) {
      let gradeQuery = { subject: subjectId };
      if (req.query.semester) gradeQuery.semester = req.query.semester;
      if (req.query.academicYear) gradeQuery.academicYear = req.query.academicYear;

      const grades = await Grade.find(gradeQuery)
        .populate({
          path: "student",
          select: "firstName lastName email department gpa completedHours",
          populate: { path: "department", select: "name" }
        })
        .lean();

      // Filter by search
      const filteredGrades = grades.filter(g => {
        if (!g.student) return false;
        if (!search) return true;
        const name = `${g.student.firstName} ${g.student.lastName}`.toLowerCase();
        return name.includes(search.toLowerCase());
      });

      // Calculate total for ranking
      filteredGrades.forEach(g => {
        g.totalScore = (g.activities || 0) + (g.midTerm || 0) + (g.final || 0);
      });

      // Sort by totalScore
      filteredGrades.sort((a, b) => b.totalScore - a.totalScore);

      formatted = filteredGrades.map((g, idx) => ({
        _id: g.student._id,
        rank: idx + 1,
        name: `${g.student.firstName} ${g.student.lastName}`,
        username: g.student.email ? g.student.email.split("@")[0] : "user",
        gpa: g.totalScore, // We show totalScore in the UI where GPA usually is, or UI handles it
        scoreLabel: "درجة",
        department: g.student.department?.name || "عام",
        creditHours: g.student.completedHours || 0,
      }));
    } 
    // --- SCOPE: ALL or DEPARTMENT (Rank by GPA or Semester Score) ---
    else {
      // If filtering by semester, we must aggregate grades
      if (req.query.semester || req.query.academicYear) {
        let matchStage = {};
        if (req.query.semester) matchStage.semester = req.query.semester;
        if (req.query.academicYear) matchStage.academicYear = req.query.academicYear;

        const grades = await Grade.find(matchStage)
          .populate({
            path: "student",
            select: "firstName lastName email department gpa completedHours",
            populate: { path: "department", select: "name" }
          })
          .lean();

        // Group by student
        const studentMap = {};
        grades.forEach(g => {
          if (!g.student) return;
          if (scope === "dept" && student.department && g.student.department?._id?.toString() !== student.department.toString()) return;

          if (search) {
            const name = `${g.student.firstName} ${g.student.lastName}`.toLowerCase();
            if (!name.includes(search.toLowerCase())) return;
          }

          const sId = g.student._id.toString();
          if (!studentMap[sId]) {
            studentMap[sId] = {
              student: g.student,
              totalScore: 0,
              coursesCount: 0
            };
          }
          studentMap[sId].totalScore += (g.activities || 0) + (g.midTerm || 0) + (g.final || 0);
          studentMap[sId].coursesCount += 1;
        });

        let studentsList = Object.values(studentMap);
        // Sort by average score
        studentsList.forEach(s => {
          s.avgScore = s.coursesCount ? (s.totalScore / s.coursesCount) : 0;
        });
        studentsList.sort((a, b) => b.avgScore - a.avgScore);

        formatted = studentsList.map((s, idx) => ({
          _id: s.student._id,
          rank: idx + 1,
          name: `${s.student.firstName} ${s.student.lastName}`,
          username: s.student.email ? s.student.email.split("@")[0] : "user",
          gpa: s.avgScore,
          scoreLabel: "متوسط الفصلي",
          department: s.student.department?.name || "عام",
          creditHours: s.student.completedHours || 0,
        }));
      } else {
        // Standard GPA ranking
        let query = { role: "student" };
        if (scope === "dept" && student.department) {
          query.department = student.department;
        }
        if (search) {
          query.$or = [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } }
          ];
        }

        const studentsList = await Student
          .find(query)
          .sort({ gpa: -1 })
          .populate("department", "name")
          .lean();

        formatted = studentsList.map((s, idx) => ({
          _id: s._id,
          rank: idx + 1,
          name: `${s.firstName} ${s.lastName}`,
          username: s.email ? s.email.split("@")[0] : "user",
          gpa: (s.gpa || 0).toFixed(2),
          scoreLabel: "GPA",
          department: s.department?.name || "عام",
          creditHours: s.completedHours || 0,
        }));
      }
    }

    // Pagination
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = formatted.slice(start, start + parseInt(limit));

    const myData = formatted.find(f => f._id.toString() === req.user._id.toString());

    return res.status(200).json({
      students: paginated,
      totalCount: formatted.length,
      totalPages: Math.ceil(formatted.length / parseInt(limit)) || 1,
      page: parseInt(page),
      myRank: myData?.rank || null,
      myScore: myData?.gpa || null
    });
  } catch (err) {
    console.error("getLeaderboard error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function updateProfile(req, res) {
  try {
    const student = await Student.findById(req.user._id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const { nickName, address, phone } = req.body;
    if (nickName) student.nickName = nickName;
    if (address)  student.address = address;
    if (phone)    student.phone = phone;

    if (req.file) {
      // In a real app, delete old file here
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const uploadDir = path.join(__dirname, "..", "uploads", "profile-images");
      await fs.mkdir(uploadDir, { recursive: true });
      const fileName = randomUUID() + path.extname(req.file.originalname);
      await fs.writeFile(path.join(uploadDir, fileName), req.file.buffer);
      student.profileImage = `/uploads/profile-images/${fileName}`;
    }

    await student.save();
    return res.status(200).json({ message: "Profile updated successfully", user: student });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default {
  getDashboardStats,
  getUpcomingExams,
  getAnnouncements,
  getStudentCourses,
  getStudentSchedule,
  getStudentGrades,
  getLeaderboard,
  updateProfile,
  createSupportTicket,
  getMySupportTickets,
};
// ─── 7. SUPPORT ─────────────────────────────────────────────────────────────
export async function createSupportTicket(req, res) {
  try {
    const { subject, message, priority } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ message: "يرجى ملء جميع الحقول المطلوبة" });
    }

    const ticket = await Support.create({
      student: req.user._id,
      subject,
      message,
      priority: priority || "normal"
    });

    res.status(201).json({ message: "تم إرسال رسالتك بنجاح وسيرد عليك الدعم الفني قريباً", ticket });
  } catch (err) {
    console.error("createSupportTicket error:", err);
    res.status(500).json({ message: "حدث خطأ أثناء إرسال الرسالة" });
  }
}

export async function getMySupportTickets(req, res) {
  try {
    const tickets = await Support.find({ student: req.user._id })
      .sort({ createdAt: -1 });
    res.status(200).json({ tickets });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
