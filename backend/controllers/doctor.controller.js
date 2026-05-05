import User       from "../models/User.js";
import Student    from "../models/Student.js";
import Schedule   from "../models/Schedule.js";
import Grade      from "../models/Grade.js";
import Subject    from "../models/Subject.js";
import Group      from "../models/Group.js";
import Announcement from "../models/Announcement.js";
import path       from "path";
import fs         from "fs/promises";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

// ─── Helper: get doctor with department ──────────────────────────────────────
async function getDoctor(userId) {
  return User.findById(userId).populate("department", "name code").lean();
}

// ─── 1. DASHBOARD STATS ──────────────────────────────────────────────────────
async function getDoctorStats(req, res) {
  try {
    const doctor = await getDoctor(req.user._id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    // Subjects taught by this doctor (via schedule)
    const schedules = await Schedule
      .find({ doctorId: doctor._id })
      .populate("subjectId", "name code")
      .populate("groupId", "name")
      .lean();

    // Unique subjects
    const subjectMap = new Map();
    schedules.forEach(s => {
      if (s.subjectId) subjectMap.set(s.subjectId._id.toString(), s.subjectId);
    });
    const subjects = [...subjectMap.values()];

    // Unique groups
    const groupMap = new Map();
    schedules.forEach(s => {
      if (s.groupId) groupMap.set(s.groupId._id.toString(), s.groupId);
    });

    // Students in those groups
    const groupIds = [...groupMap.keys()];
    const students = groupIds.length
      ? await Student.find({ groupId: { $in: groupIds } }).select("_id").lean()
      : [];

    // Grade stats across all grades for subjects this doctor teaches
    const subjectIds = subjects.map(s => s._id);
    const allGrades  = subjectIds.length
      ? await Grade.find({ subject: { $in: subjectIds } }).select("total status activities midTerm final").lean()
      : [];

    const avgGrade    = allGrades.length
      ? Math.round(allGrades.reduce((a, g) => a + (g.total || 0), 0) / allGrades.length)
      : 0;
    const pendingGrades = allGrades.filter(g => g.status === "incomplete").length;

    // Today's lectures
    const DAYS    = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    const todayKey = DAYS[new Date().getDay()];
    const todayLectures = await Schedule.countDocuments({
      doctorId:  doctor._id,
      dayOfWeek: { $regex: new RegExp(`^${todayKey}$`, "i") },
    });

    return res.status(200).json({
      totalStudents: students.length,
      courses:       subjects.length,
      avgGrade,
      pendingGrades,
      todayLectures,
      department:   doctor.department?.name || "",
      name:         `${doctor.firstName} ${doctor.lastName}`,
    });
  } catch (err) {
    console.error("getDoctorStats error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── 2. TODAY'S SCHEDULE ────────────────────────────────────────────────────
async function getTodaySchedule(req, res) {
  try {
    const DAYS    = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    const todayKey = DAYS[new Date().getDay()];

    const schedules = await Schedule
      .find({
        doctorId:  req.user._id,
        dayOfWeek: { $regex: new RegExp(`^${todayKey}$`, "i") },
      })
      .populate("subjectId", "name code")
      .populate("groupId",   "name")
      .sort({ startTime: 1 })
      .lean();

    const now    = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const lectures = await Promise.all(schedules.map(async s => {
      const [sh, sm] = s.startTime.split(":").map(Number);
      const [eh, em] = s.endTime.split(":").map(Number);
      const startMin = sh * 60 + sm;
      const endMin   = eh * 60 + em;

      let status = "later";
      if (nowMin >= startMin && nowMin <= endMin) status = "current";
      else if (nowMin < startMin) status = "upcoming";

      // Count students in this group
      const studentCount = s.groupId
        ? await Student.countDocuments({ groupId: s.groupId._id })
        : 0;

      return {
        courseName: s.subjectId?.name || "—",
        courseCode: s.subjectId?.code || "—",
        location:   s.room || "—",
        time:       s.startTime,
        endTime:    s.endTime,
        group:      s.groupId?.name || "—",
        students:   studentCount,
        status,
      };
    }));

    return res.status(200).json({ lectures });
  } catch (err) {
    console.error("getTodaySchedule error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── 3. MY COURSES ──────────────────────────────────────────────────────────
async function getDoctorCourses(req, res) {
  try {
    const schedules = await Schedule
      .find({ doctorId: req.user._id })
      .populate("subjectId", "name code description")
      .populate("groupId",   "name _id")
      .lean();

    // Aggregate by subject
    const subjectMap = new Map();
    for (const s of schedules) {
      if (!s.subjectId) continue;
      const sid = s.subjectId._id.toString();

      if (!subjectMap.has(sid)) {
        subjectMap.set(sid, {
          _id:         sid,
          code:        s.subjectId.code,
          name:        s.subjectId.name,
          description: s.subjectId.description || "",
          groupIds:    [],
          creditHours: 3,
        });
      }
      if (s.groupId) subjectMap.get(sid).groupIds.push(s.groupId._id);
    }

    const courses = await Promise.all([...subjectMap.values()].map(async c => {
      // Students across all groups for this course
      const uniqueGroups = [...new Set(c.groupIds.map(id => id.toString()))];
      const studentCount = uniqueGroups.length
        ? await Student.countDocuments({ groupId: { $in: uniqueGroups } })
        : 0;

      // Pass rate
      const subGrades  = await Grade.find({ subject: c._id }).select("status total").lean();
      const passed     = subGrades.filter(g => g.status === "passed").length;
      const passRate   = subGrades.length ? Math.round((passed / subGrades.length) * 100) : 0;

      // "Semester progress" = % of students who have ALL grades entered
      const complete       = subGrades.filter(g => g.total > 0).length;
      const semesterProgress = subGrades.length ? Math.round((complete / subGrades.length) * 100) : 0;

      return {
        ...c,
        groupIds:       undefined,
        studentCount,
        passRate,
        semesterProgress,
      };
    }));

    return res.status(200).json({ courses });
  } catch (err) {
    console.error("getDoctorCourses error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── 4. GRADES FOR A SUBJECT ────────────────────────────────────────────────
async function getDoctorGrades(req, res) {
  try {
    const { subject: subjectCode, group: groupId } = req.query;

    // Resolve subject by code
    const subject = subjectCode
      ? await Subject.findOne({ code: { $regex: new RegExp(`^${subjectCode}$`, "i") } }).lean()
      : null;

    if (!subject) {
      return res.status(200).json({ grades: [], subjects: [] });
    }

    // Get students in matching groups for this subject
    const schedules = await Schedule
      .find({ doctorId: req.user._id, subjectId: subject._id })
      .populate("groupId", "name")
      .lean();

    const groupIds = [...new Set(schedules.map(s => s.groupId?._id.toString()).filter(Boolean))];

    const filter = { groupId: { $in: groupIds } };
    if (groupId && groupId !== "all") filter.groupId = groupId;

    const students = await Student
      .find(filter)
      .select("firstName lastName email nationalId groupId")
      .populate("groupId", "name")
      .lean();

    const grades = await Promise.all(students.map(async st => {
      const grade = await Grade
        .findOne({ student: st._id, subject: subject._id })
        .lean();

      return {
        studentId:   st._id,
        studentName: `${st.firstName} ${st.lastName}`,
        studentNo:   st.nationalId,
        group:       st.groupId?.name || "—",
        homeworkScore: grade?.activities ?? null,
        midtermScore:  grade?.midTerm   ?? null,
        finalScore:    grade?.final     ?? null,
        total:         grade?.total     ?? null,
        status:        grade?.status    || "incomplete",
        gradeId:       grade?._id       || null,
      };
    }));

    // Subject list for dropdown
    const mySchedules = await Schedule
      .find({ doctorId: req.user._id })
      .populate("subjectId", "name code")
      .lean();
    const subjectSet = new Map();
    mySchedules.forEach(s => {
      if (s.subjectId) subjectSet.set(s.subjectId.code, { code: s.subjectId.code, name: s.subjectId.name });
    });

    return res.status(200).json({
      grades,
      subjects:  [...subjectSet.values()],
      groups:    schedules.map(s => s.groupId).filter(Boolean),
    });
  } catch (err) {
    console.error("getDoctorGrades error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── 5. SAVE / UPDATE GRADE ─────────────────────────────────────────────────
async function updateGrade(req, res) {
  try {
    const { studentId }                                  = req.params;
    const { course, homeworkScore, midtermScore, finalScore } = req.body;

    const subject = course
      ? await Subject.findOne({ code: { $regex: new RegExp(`^${course}$`, "i") } }).lean()
      : null;

    if (!subject) return res.status(400).json({ message: "Subject not found" });

    let grade = await Grade.findOne({ student: studentId, subject: subject._id });
    if (!grade) {
      grade = new Grade({
        student:  studentId,
        subject:  subject._id,
        semester: "fall2024",
        academicYear: "2025/2026",
      });
    }

    if (homeworkScore !== null && homeworkScore !== undefined) grade.activities = Math.min(20, Math.max(0, homeworkScore));
    if (midtermScore  !== null && midtermScore  !== undefined) grade.midTerm    = Math.min(30, Math.max(0, midtermScore));
    if (finalScore    !== null && finalScore    !== undefined) grade.final      = Math.min(50, Math.max(0, finalScore));

    await grade.save(); // triggers pre-save hook: computes total, letter, status

    // Update student GPA (average of all passed subjects)
    const allGrades = await Grade.find({ student: studentId, status: "passed" }).lean();
    if (allGrades.length) {
      const gpaSum = allGrades.reduce((a, g) => a + (g.total / 100) * 4, 0);
      await Student.findByIdAndUpdate(studentId, { gpa: +(gpaSum / allGrades.length).toFixed(2) });
    }

    return res.status(200).json({ message: "Grade saved", grade });
  } catch (err) {
    console.error("updateGrade error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── 6. MY STUDENTS ─────────────────────────────────────────────────────────
async function getDoctorStudents(req, res) {
  try {
    const { course, group, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find groups for this doctor
    const schedules = await Schedule
      .find({ doctorId: req.user._id })
      .populate("subjectId", "name code")
      .populate("groupId",   "name _id")
      .lean();

    let groupIds = [...new Set(schedules.map(s => s.groupId?._id.toString()).filter(Boolean))];

    if (group && group !== "all") {
      groupIds = [group];
    }

    if (!groupIds.length) return res.status(200).json({ students: [], total: 0, groups: [] });

    const filter = { groupId: { $in: groupIds } };
    if (search?.trim()) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName:  { $regex: search, $options: "i" } },
        { email:     { $regex: search, $options: "i" } },
      ];
    }

    const total    = await Student.countDocuments(filter);
    const students = await Student
      .find(filter)
      .select("firstName lastName email nationalId gpa groupId yearLevel department")
      .populate("groupId",    "name")
      .populate("department", "name")
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get grade summary per student for courses taught by this doctor
    const subjectIds = [...new Set(schedules.map(s => s.subjectId?._id.toString()).filter(Boolean))];

    const enriched = await Promise.all(students.map(async st => {
      const grades = subjectIds.length
        ? await Grade.find({ student: st._id, subject: { $in: subjectIds } }).select("total status subject").lean()
        : [];

      return {
        _id:          st._id,
        name:         `${st.firstName} ${st.lastName}`,
        email:        st.email,
        nationalId:   st.nationalId,
        gpa:          +(st.gpa || 0).toFixed(2),
        group:        st.groupId?.name || "—",
        department:   st.department?.name || "—",
        yearLevel:    st.yearLevel,
        passedCourses: grades.filter(g => g.status === "passed").length,
        totalCourses:  grades.length,
      };
    }));

    // Group list for filter dropdown
    const groupList = schedules
      .filter(s => s.groupId)
      .map(s => ({ _id: s.groupId._id, name: s.groupId.name }))
      .filter((v, i, a) => a.findIndex(x => x._id.toString() === v._id.toString()) === i);

    return res.status(200).json({
      students:   enriched,
      total,
      totalPages: Math.ceil(total / parseInt(limit)) || 1,
      groups:     groupList,
    });
  } catch (err) {
    console.error("getDoctorStudents error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── 7. TOP STUDENTS ────────────────────────────────────────────────────────
async function getTopStudents(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const schedules = await Schedule
      .find({ doctorId: req.user._id })
      .populate("groupId", "_id")
      .lean();

    const groupIds = [...new Set(schedules.map(s => s.groupId?._id.toString()).filter(Boolean))];
    if (!groupIds.length) return res.status(200).json({ students: [] });

    const students = await Student
      .find({ groupId: { $in: groupIds }, gpa: { $gt: 0 } })
      .sort({ gpa: -1 })
      .limit(limit)
      .select("firstName lastName gpa groupId")
      .populate("groupId", "name")
      .lean();

    return res.status(200).json({
      students: students.map(s => ({
        name:  `${s.firstName} ${s.lastName}`,
        gpa:   s.gpa,
        group: s.groupId?.name || "",
        grade: s.gpa >= 3.7 ? "A" : s.gpa >= 3.0 ? "B" : s.gpa >= 2.0 ? "C" : "D",
      })),
    });
  } catch (err) {
    console.error("getTopStudents error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── 8. FULL WEEK SCHEDULE ──────────────────────────────────────────────────
async function getDoctorSchedule(req, res) {
  try {
    const schedules = await Schedule
      .find({ doctorId: req.user._id })
      .populate("subjectId", "name code")
      .populate("groupId",   "name")
      .lean();

    const formatted = {
      sunday: [], monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [],
    };

    for (const s of schedules) {
      const dayKey = s.dayOfWeek.toLowerCase();
      if (!formatted[dayKey]) continue;
      formatted[dayKey].push({
        name:       s.subjectId?.name || "—",
        code:       s.subjectId?.code || "—",
        location:   s.room || "—",
        group:      s.groupId?.name || "—",
        time:       `${s.startTime} - ${s.endTime}`,
        color:      s.colorClass || "#2463eb",
      });
    }

    for (const day of Object.keys(formatted)) {
      formatted[day].sort((a, b) => a.time.localeCompare(b.time));
    }

    return res.status(200).json({ schedule: formatted });
  } catch (err) {
    console.error("getDoctorSchedule error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function updateProfile(req, res) {
  try {
    const doctor = await User.findById(req.user._id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const { nickName, address, phone } = req.body;
    if (nickName) doctor.nickName = nickName;
    if (address)  doctor.address = address;
    if (phone)    doctor.phone = phone;

    if (req.file) {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const uploadDir = path.join(__dirname, "..", "uploads", "profile-images");
      await fs.mkdir(uploadDir, { recursive: true });
      const fileName = randomUUID() + path.extname(req.file.originalname);
      await fs.writeFile(path.join(uploadDir, fileName), req.file.buffer);
      doctor.profileImage = `/uploads/profile-images/${fileName}`;
    }

    await doctor.save();
    return res.status(200).json({ message: "Profile updated successfully", user: doctor });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────
async function getAnnouncements(req, res) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    const query = {
      isActive: true,
      $or: [
        { targetAudience: "all" },
        { targetAudience: "doctors" },
        { targetAudience: "staff" },
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

export default {
  getDoctorStats,
  getTodaySchedule,
  getDoctorCourses,
  getDoctorGrades,
  updateGrade,
  getDoctorStudents,
  getTopStudents,
  getDoctorSchedule,
  updateProfile,
  getAnnouncements,
};
