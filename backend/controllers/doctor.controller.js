import mongoose   from "mongoose";
import User       from "../models/User.js";
import Student    from "../models/Student.js";
import Schedule   from "../models/Schedule.js";
import Grade      from "../models/Grade.js";
import Subject    from "../models/Subject.js";
import Group      from "../models/Group.js";
import Announcement from "../models/Announcement.js";
import Attendance from "../models/Attendance.js";
import Assignment from "../models/Assignment.js";
import Exam       from "../models/Exam.js";
import path       from "path";
import fs         from "fs/promises";
import crypto, { randomUUID } from "crypto";
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

    // Subject list for dropdown
    const mySchedules = await Schedule
      .find({ doctorId: req.user._id })
      .populate("subjectId", "name code _id")
      .populate("groupId", "name _id")
      .lean();

    const subjectSet = new Map();
    const groupSet   = new Map();

    mySchedules.forEach(s => {
      if (s.subjectId) subjectSet.set(s.subjectId._id.toString(), { _id: s.subjectId._id, code: s.subjectId.code, name: s.subjectId.name });
      if (s.groupId)   groupSet.set(s.groupId._id.toString(),     { _id: s.groupId._id,   name: s.groupId.name });
    });

    const subjectsList = [...subjectSet.values()];
    const groupsList   = [...groupSet.values()];

    // Resolve subject by code
    const subject = subjectCode && subjectCode !== "__placeholder__"
      ? await Subject.findOne({ code: { $regex: new RegExp(`^${escapeRegex(subjectCode)}$`, "i") } }).lean()
      : null;

    if (!subject) {
      return res.status(200).json({ grades: [], subjects: subjectsList, groups: groupsList });
    }

    // Get students linked to this subject via groupId OR enrolledSubjects
    const schedules = await Schedule
      .find({ doctorId: req.user._id, subjectId: subject._id })
      .populate("groupId", "name _id")
      .lean();

    const groupIds = [...new Set(schedules.map(s => s.groupId?._id?.toString()).filter(Boolean))];

    // Build smart student query
    let studentQuery;
    if (groupId && groupId !== "all") {
      studentQuery = { groupId: new mongoose.Types.ObjectId(groupId) };
    } else {
      const orConditions = [];
      if (groupIds.length) orConditions.push({ groupId: { $in: groupIds.map(id => new mongoose.Types.ObjectId(id)) } });
      orConditions.push({ enrolledSubjects: subject._id });
      studentQuery = { $or: orConditions };
    }

    const students = await Student
      .find(studentQuery)
      .select("firstName lastName email nationalId groupId")
      .populate("groupId", "name")
      .sort({ firstName: 1 })
      .lean();

    const grades = await Promise.all(students.map(async st => {
      const grade = await Grade
        .findOne({ student: st._id, subject: subject._id })
        .lean();

      return {
        studentId:     st._id,
        studentName:   `${st.firstName} ${st.lastName}`,
        studentNo:     st.nationalId,
        group:         st.groupId?.name || "—",
        homeworkScore: grade?.activities ?? null,
        midtermScore:  grade?.midTerm   ?? null,
        finalScore:    grade?.final     ?? null,
        total:         grade?.total     ?? null,
        status:        grade?.status    || "incomplete",
        gradeId:       grade?._id       || null,
      };
    }));

    return res.status(200).json({
      grades,
      subjects: subjectsList,
      groups:   schedules.map(s => s.groupId).filter(Boolean),
    });
  } catch (err) {
    console.error("getDoctorGrades error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }


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
    const { group, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find all schedules for this doctor → get their groupIds + subjectIds
    const schedules = await Schedule
      .find({ doctorId: req.user._id })
      .populate("subjectId", "name code _id")
      .populate("groupId",   "name _id")
      .lean();

    const groupIds   = [...new Set(schedules.map(s => s.groupId?._id?.toString()).filter(Boolean))];
    const subjectIds = [...new Set(schedules.map(s => s.subjectId?._id?.toString()).filter(Boolean))];

    // Group list for the dropdown
    const groupList = schedules
      .filter(s => s.groupId)
      .map(s => ({ _id: s.groupId._id, name: s.groupId.name }))
      .filter((v, i, a) => a.findIndex(x => x._id.toString() === v._id.toString()) === i);

    // Build a query that matches students by:
    //  - groupId in doctor's groups (primary)
    //  - OR enrolledSubjects overlap with doctor's subjects (fallback)
    //  - OR ALL students if doctor has no groups at all
    let studentQuery = {};

    if (group && group !== "all") {
      // Specific group selected
      studentQuery.groupId = new mongoose.Types.ObjectId(group);
    } else if (groupIds.length > 0 || subjectIds.length > 0) {
      const orConditions = [];
      if (groupIds.length)   orConditions.push({ groupId: { $in: groupIds.map(id => new mongoose.Types.ObjectId(id)) } });
      if (subjectIds.length) orConditions.push({ enrolledSubjects: { $in: subjectIds.map(id => new mongoose.Types.ObjectId(id)) } });
      studentQuery = { $or: orConditions };
    }
    // else: no filter → will return empty (doctor has no subjects yet)

    // Add search filter
    if (search?.trim()) {
      const searchRegex = { $regex: search.trim(), $options: "i" };
      const searchOr = [
        { firstName:  searchRegex },
        { lastName:   searchRegex },
        { email:      searchRegex },
        { nationalId: searchRegex },
      ];
      if (studentQuery.$or) {
        // Combine: (groupId OR subjects) AND (search conditions)
        studentQuery = { $and: [{ $or: studentQuery.$or }, { $or: searchOr }] };
      } else if (Object.keys(studentQuery).length > 0) {
        studentQuery.$or = searchOr;
      } else {
        studentQuery = { $or: searchOr };
      }
    }

    const total    = await Student.countDocuments(studentQuery);
    const students = await Student
      .find(studentQuery)
      .select("firstName lastName email nationalId gpa groupId yearLevel department enrolledSubjects")
      .populate("groupId",    "name")
      .populate("department", "name")
      .sort({ gpa: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const enriched = await Promise.all(students.map(async st => {
      const grades = subjectIds.length
        ? await Grade.find({ student: st._id, subject: { $in: subjectIds } }).select("total status").lean()
        : [];

      return {
        _id:           st._id,
        name:          `${st.firstName} ${st.lastName}`,
        email:         st.email,
        nationalId:    st.nationalId,
        gpa:           +(st.gpa || 0).toFixed(2),
        group:         st.groupId?.name || "—",
        department:    st.department?.name || "—",
        yearLevel:     st.yearLevel || "—",
        passedCourses: grades.filter(g => g.status === "passed").length,
        totalCourses:  grades.length,
      };
    }));

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

// ─── 10. ATTENDANCE SYSTEM ───────────────────────────────────────────────────
async function startAttendanceSession(req, res) {
  try {
    const { subject, group } = req.body;
    if (!subject || !group) return res.status(400).json({ message: "Subject and Group are required" });

    // Close any active session for this doctor
    await Attendance.updateMany({ doctor: req.user._id, isActive: true }, { isActive: false });

    // Get all students in this group
    const students = await Student.find({ groupId: group }).select("_id").lean();
    
    const token = crypto.randomBytes(16).toString("hex");
    const session = new Attendance({
      doctor: req.user._id,
      subject,
      group,
      isActive: true,
      currentQrToken: token,
      tokenExpiresAt: new Date(Date.now() + 30000), // 30 seconds
      records: students.map(s => ({
        student: s._id,
        status: "absent",
      }))
    });

    await session.save();
    return res.status(201).json({ message: "Session started", session });
  } catch (err) {
    console.error("startAttendanceSession error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function refreshQrToken(req, res) {
  try {
    const { sessionId } = req.params;
    const session = await Attendance.findOne({ _id: sessionId, doctor: req.user._id, isActive: true });
    if (!session) return res.status(404).json({ message: "Active session not found" });

    const token = crypto.randomBytes(16).toString("hex");
    session.currentQrToken = token;
    session.tokenExpiresAt = new Date(Date.now() + 30000); // 30 seconds
    await session.save();

    return res.status(200).json({ token, expiresAt: session.tokenExpiresAt });
  } catch (err) {
    console.error("refreshQrToken error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function getAttendanceSession(req, res) {
  try {
    const { sessionId } = req.params;
    const session = await Attendance.findOne({ _id: sessionId, doctor: req.user._id })
      .populate("records.student", "firstName lastName nationalId email")
      .lean();
    
    if (!session) return res.status(404).json({ message: "Session not found" });

    return res.status(200).json({ session });
  } catch (err) {
    console.error("getAttendanceSession error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function toggleManualAttendance(req, res) {
  try {
    const { sessionId, studentId } = req.params;
    const session = await Attendance.findOne({ _id: sessionId, doctor: req.user._id });
    if (!session) return res.status(404).json({ message: "Session not found" });

    const record = session.records.find(r => r.student.toString() === studentId);
    if (!record) return res.status(404).json({ message: "Student not found in this session" });

    record.status = record.status === "present" ? "absent" : "present";
    record.method = "manual";
    record.markedAt = new Date();
    await session.save();

    return res.status(200).json({ message: "Attendance toggled", status: record.status });
  } catch (err) {
    console.error("toggleManualAttendance error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function closeAttendanceSession(req, res) {
  try {
    const { sessionId } = req.params;
    const session = await Attendance.findOne({ _id: sessionId, doctor: req.user._id });
    if (!session) return res.status(404).json({ message: "Session not found" });

    session.isActive = false;
    session.currentQrToken = null;
    await session.save();

    return res.status(200).json({ message: "Session closed" });
  } catch (err) {
    console.error("closeAttendanceSession error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function getAttendanceHistory(req, res) {
  try {
    const { subject, group } = req.query;
    const query = { doctor: req.user._id, isActive: false };
    
    // Resolve subject if provided as code
    if (subject) {
      const subDoc = await Subject.findOne({ code: { $regex: new RegExp(`^${subject}$`, "i") } }).lean();
      if (subDoc) query.subject = subDoc._id;
    }
    if (group && group !== "all") query.group = group;

    const sessions = await Attendance.find(query)
      .populate("subject", "name code")
      .populate("group", "name")
      .sort({ date: -1 })
      .lean();

    const formatted = sessions.map(s => {
      const total = s.records.length;
      const present = s.records.filter(r => r.status === "present").length;
      return {
        _id: s._id,
        subject: s.subject,
        group: s.group,
        date: s.date,
        total,
        present,
        absent: total - present,
        rate: total ? Math.round((present / total) * 100) : 0
      };
    });

    return res.status(200).json({ sessions: formatted });
  } catch (err) {
    console.error("getAttendanceHistory error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── COURSE DETAIL (single subject full info) ────────────────────────────────
async function getCourseDetail(req, res) {
  try {
    const { subjectId } = req.params;
    const subject = await Subject.findById(subjectId).lean();
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    // Verify doctor teaches this
    const schedules = await Schedule.find({ doctorId: req.user._id, subjectId }).populate("groupId", "name _id").lean();
    if (!schedules.length) return res.status(403).json({ message: "Not your subject" });

    const groupIds = [...new Set(schedules.map(s => s.groupId?._id.toString()).filter(Boolean))];
    const groups   = schedules.filter(s => s.groupId).map(s => ({ _id: s.groupId._id, name: s.groupId.name }));
    const uniqueGroups = groups.filter((v, i, a) => a.findIndex(x => x._id.toString() === v._id.toString()) === i);

    const studentCount = groupIds.length ? await Student.countDocuments({ groupId: { $in: groupIds } }) : 0;
    const exams        = await Exam.find({ subject: subjectId, doctor: req.user._id, isVisible: true }).sort({ date: 1 }).lean();
    const assignments  = await Assignment.find({ subject: subjectId, doctor: req.user._id, isVisible: true }).sort({ dueDate: 1 }).lean();

    // Submission stats per assignment
    const assignmentsWithStats = assignments.map(a => ({
      ...a,
      submittedCount: a.submissions?.length || 0,
      gradedCount:    a.submissions?.filter(s => s.status === "graded").length || 0,
    }));

    return res.status(200).json({ subject, groups: uniqueGroups, studentCount, exams, assignments: assignmentsWithStats });
  } catch (err) {
    console.error("getCourseDetail error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── EXAMS (Quiz / Midterm / Final Scheduling) ───────────────────────────────
async function createExam(req, res) {
  try {
    const { subjectId, title, type, date, time, duration, location, totalMarks, notes, groups } = req.body;
    if (!subjectId || !title || !date || !time) return res.status(400).json({ message: "Missing required fields" });

    // Verify ownership
    const owns = await Schedule.findOne({ doctorId: req.user._id, subjectId });
    if (!owns) return res.status(403).json({ message: "Not your subject" });

    const exam = new Exam({ title, subject: subjectId, doctor: req.user._id, type, date, time, duration, location, totalMarks, notes, groups });
    await exam.save();
    return res.status(201).json({ exam });
  } catch (err) {
    console.error("createExam error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function updateExam(req, res) {
  try {
    const exam = await Exam.findOne({ _id: req.params.examId, doctor: req.user._id });
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    Object.assign(exam, req.body);
    await exam.save();
    return res.status(200).json({ exam });
  } catch (err) {
    console.error("updateExam error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function deleteExam(req, res) {
  try {
    const exam = await Exam.findOneAndDelete({ _id: req.params.examId, doctor: req.user._id });
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    return res.status(200).json({ message: "Deleted" });
  } catch (err) {
    console.error("deleteExam error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function getExamsForSubject(req, res) {
  try {
    const { subjectId } = req.params;
    const exams = await Exam.find({ subject: subjectId, doctor: req.user._id })
      .sort({ date: 1 }).lean();
    return res.status(200).json({ exams });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── ASSIGNMENTS ─────────────────────────────────────────────────────────────
async function createAssignment(req, res) {
  try {
    const { subjectId, title, description, assignmentType, dueDate, maxGrade, groups } = req.body;
    if (!subjectId || !title || !dueDate) return res.status(400).json({ message: "Missing required fields" });

    const owns = await Schedule.findOne({ doctorId: req.user._id, subjectId });
    if (!owns) return res.status(403).json({ message: "Not your subject" });

    const assignment = new Assignment({ title, description, subject: subjectId, doctor: req.user._id, assignmentType, dueDate, maxGrade, groups });
    await assignment.save();
    return res.status(201).json({ assignment });
  } catch (err) {
    console.error("createAssignment error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function updateAssignment(req, res) {
  try {
    const asgn = await Assignment.findOne({ _id: req.params.assignmentId, doctor: req.user._id });
    if (!asgn) return res.status(404).json({ message: "Assignment not found" });
    const { title, description, assignmentType, dueDate, maxGrade, isVisible } = req.body;
    if (title !== undefined) asgn.title = title;
    if (description !== undefined) asgn.description = description;
    if (assignmentType !== undefined) asgn.assignmentType = assignmentType;
    if (dueDate !== undefined) asgn.dueDate = dueDate;
    if (maxGrade !== undefined) asgn.maxGrade = maxGrade;
    if (isVisible !== undefined) asgn.isVisible = isVisible;
    await asgn.save();
    return res.status(200).json({ assignment: asgn });
  } catch (err) {
    console.error("updateAssignment error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function deleteAssignment(req, res) {
  try {
    const asgn = await Assignment.findOneAndDelete({ _id: req.params.assignmentId, doctor: req.user._id });
    if (!asgn) return res.status(404).json({ message: "Not found" });
    // Also delete uploaded files
    const __filename = fileURLToPath(import.meta.url);
    const __dirname  = path.dirname(__filename);
    for (const sub of asgn.submissions) {
      if (sub.fileUrl) {
        const filePath = path.join(__dirname, "..", sub.fileUrl);
        fs.unlink(filePath).catch(() => {});
      }
    }
    return res.status(200).json({ message: "Deleted" });
  } catch (err) {
    console.error("deleteAssignment error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function getAssignmentSubmissions(req, res) {
  try {
    const asgn = await Assignment.findOne({ _id: req.params.assignmentId, doctor: req.user._id })
      .populate("submissions.student", "firstName lastName nationalId email")
      .lean();
    if (!asgn) return res.status(404).json({ message: "Assignment not found" });
    return res.status(200).json({ assignment: asgn });
  } catch (err) {
    console.error("getAssignmentSubmissions error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function gradeSubmission(req, res) {
  try {
    const { assignmentId, studentId } = req.params;
    const { grade, feedback } = req.body;
    const asgn = await Assignment.findOne({ _id: assignmentId, doctor: req.user._id });
    if (!asgn) return res.status(404).json({ message: "Assignment not found" });
    const sub = asgn.submissions.find(s => s.student.toString() === studentId);
    if (!sub) return res.status(404).json({ message: "Submission not found" });
    sub.grade    = grade;
    sub.feedback = feedback || "";
    sub.status   = "graded";
    await asgn.save();
    return res.status(200).json({ message: "Graded", submission: sub });
  } catch (err) {
    console.error("gradeSubmission error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default {
  getDoctorStats,
  getTodaySchedule,
  getDoctorCourses,
  getCourseDetail,
  getDoctorGrades,
  updateGrade,
  getDoctorStudents,
  getTopStudents,
  getDoctorSchedule,
  updateProfile,
  getAnnouncements,
  startAttendanceSession,
  refreshQrToken,
  getAttendanceSession,
  toggleManualAttendance,
  closeAttendanceSession,
  getAttendanceHistory,
  // Exams
  createExam,
  updateExam,
  deleteExam,
  getExamsForSubject,
  // Assignments
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentSubmissions,
  gradeSubmission,
};
