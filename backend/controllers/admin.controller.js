import RegistrationCode from "../models/RegistrationCode.js";
import Subject from "../models/Subject.js";
import Department from "../models/Department.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Doctor from "../models/Doctor.js";
import TA from "../models/TA.js";
import Admin from "../models/Admin.js";
import Group from "../models/Group.js";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import Schedule from "../models/Schedule.js";
import Activity from "../models/Activity.js";
import Support from "../models/Support.js";
import Exam from "../models/Exam.js";
import Grade from "../models/Grade.js";
import Announcement from "../models/Announcement.js";
import bcrypt from "bcryptjs";
import multerMiddlewarePromise from "../middlewares/multar.middleware.js";

// ─── Image Save Helper ────────────────────────────────────────────────────────
async function _saveFile(file, subfolder = "profile-images") {
  if (!file) return undefined;
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const uploadDir = path.join(__dirname, "..", "uploads", subfolder);
  await fs.mkdir(uploadDir, { recursive: true });
  const ext = path.extname(file.originalname || ".jpg") || ".jpg";
  const fileName = randomUUID() + ext;
  await fs.writeFile(path.join(uploadDir, fileName), file.buffer);
  return `/uploads/${subfolder}/${fileName}`;
}

async function _logActivity(userId, action, details, type = "blue") {
  try {
    await Activity.create({ user: userId, action, details, type });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

// ─── REGISTRATION CODES ───────────────────────────────────────────────────────
async function generateRegistrationCode(req, res) {
  try {
    const {
      firstName,
      lastName,
      nationalId,
      age,
      address,
      highSchoolName,
      role,
      department,
      yearLevel,
    } = req.body;
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const registerationCode = new RegistrationCode({
      firstName,
      lastName,
      nationalId,
      age,
      address,
      highSchoolName,
      role,
      department,
      yearLevel: yearLevel ? Number(yearLevel) : 1,
      expiresAt,
    });

    await registerationCode.save();

    await _logActivity(
      req.user._id,
      "توليد كود تسجيل",
      `تم توليد كود لـ ${firstName} ${lastName} (${role})`,
      "blue",
    );

    res.status(201).json({
      message: "Registration Code Created Successfully",
      registerationCode,
    });
  } catch (error) {
    console.log(`Error While Creating a registrationCode ${error.message}`);
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function getCodes(req, res) {
  try {
    const page = parseInt(req.params.page) || 1;
    const skip = (page - 1) * 10;
    const codes = await RegistrationCode.find({})
      .select("-__v")
      .populate("department", "name code")
      .skip(skip)
      .limit(10);

    const total = await RegistrationCode.countDocuments({});

    res
      .status(200)
      .json({ message: "Codes fetched successfully", codes, total });
  } catch (error) {
    console.log(`Error While Getting Codes ${error.message}`);
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function createTA(req, res) {
  try {
    await multerMiddlewarePromise(req, res);
    const profileImage = await _saveFile(req.file, "profile-images");

    const {
      email,
      password,
      department,
      nationalId,
      firstName,
      lastName,
      age,
      address,
      degree,
    } = req.body;

    if (!firstName || !lastName || !email || !nationalId) {
      return res
        .status(400)
        .json({ message: "الاسم، البريد الإلكتروني والرقم الوطني مطلوبة" });
    }

    const isEmailUsed = await User.findOne({ email });
    if (isEmailUsed)
      return res
        .status(400)
        .json({ message: "البريد الإلكتروني مُستخدم مسبقاً" });

    const hashedPassword = await bcrypt.hash(password || "Welcome@123", 10);
    const ta = new TA({
      email,
      password: hashedPassword,
      department: department || null,
      nationalId,
      firstName,
      lastName,
      age: age ? Number(age) : undefined,
      address: address || "",
      degree: degree || "Bachelor's",
      isVerified: true,
      ...(profileImage && { profileImage }),
    });
    await ta.save();
    res.status(201).json({ message: "تم إنشاء المعيد بنجاح", user: ta });
  } catch (error) {
    console.log(`Error While Creating a TA: ${error.message}`);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
}

async function getStats(req, res) {
  try {
    const total = await RegistrationCode.countDocuments({});
    const used = await RegistrationCode.countDocuments({ isUsed: true });
    const unused = total - used;
    const usageRate = total > 0 ? Math.round((used / total) * 100) : 0;

    res.status(200).json({ total, used, unused, usageRate });
  } catch (error) {
    console.log(`Error While Getting Stats ${error.message}`);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function deleteCode(req, res) {
  try {
    const id = req.params.id;

    const isCodeExsit = await RegistrationCode.find({ _id: id });
    if (!isCodeExsit.length) {
      return res.status(404).json({ message: "Code not found" });
    }
    await RegistrationCode.deleteOne({ _id: id });
    res.status(200).json({ message: "Code deleted successfully" });
  } catch (error) {
    console.log(`Error While Deleting Code ${error.message}`);
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function deleteAllUsedCodes(req, res) {
  try {
    const result = await RegistrationCode.deleteMany({ isUsed: true });
    res.status(200).json({
      message: `تم حذف ${result.deletedCount} من الأكواد المستخدمة بنجاح`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.log(`Error While Deleting Used Codes: ${error.message}`);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// ─── SUBJECTS ─────────────────────────────────────────────────────────────────
async function createSubject(req, res) {
  try {
    await multerMiddlewarePromise(req, res);
    const thumbnail = await _saveFile(req.file, "subjects");

    const {
      name,
      code,
      description,
      department,
      assignedDoctor,
      semester,
      yearLevel,
      academicYear,
    } = req.body;

    const subject = new Subject({
      name,
      code,
      description,
      department,
      assignedDoctor: assignedDoctor || null,
      semester,
      yearLevel: yearLevel ? Number(yearLevel) : 1,
      academicYear,
      thumbnail: thumbnail || "",
    });
    await subject.save();

    await _logActivity(
      req.user._id,
      "إضافة مادة",
      `تم إضافة مادة ${name} (${code})`,
      "blue",
    );

    res.status(201).json({ message: "تم إنشاء المادة بنجاح", subject });
  } catch (error) {
    console.log(`Error While Creating a Subject: ${error.message}`);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
}

async function getAllSubject(req, res) {
  try {
    const { department, yearLevel, semester, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (department) query.department = department;
    if (yearLevel) query.yearLevel = yearLevel;
    if (semester) query.semester = semester;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const subjects = await Subject.find(query)
      .select("-__v")
      .populate("assignedDoctor", "firstName lastName email")
      .populate("assignedTA", "firstName lastName email")
      .populate("department", "name code")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l);

    const total = await Subject.countDocuments(query);
    res
      .status(200)
      .json({ message: "Subjects fetched successfully", subjects, total });
  } catch (error) {
    console.log(`Error While Getting Subjects: ${error.message}`);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function updateSubject(req, res) {
  try {
    await multerMiddlewarePromise(req, res);
    const id = req.params.id;
    const updates = { ...req.body };

    if (req.file) {
      updates.thumbnail = await _saveFile(req.file, "subjects");
    }

    const subject = await Subject.findOneAndUpdate({ _id: id }, updates, {
      new: true,
    });
    if (!subject) return res.status(404).json({ message: "المادة غير موجودة" });
    res.status(200).json({ message: "تم تحديث المادة بنجاح", subject });
  } catch (error) {
    console.log(`Error While Updating Subject: ${error.message}`);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
}

async function deleteSubject(req, res) {
  try {
    const id = req.params.id;
    const subject = await Subject.find({ _id: id });
    if (!subject.length)
      return res.status(404).json({ message: "Subject not found" });
    await Subject.deleteOne({ _id: id });
    res.status(200).json({ message: "Subject deleted successfully" });
  } catch (error) {
    console.log(`Error While Deleting Subject ${error.message}`);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function assignDoctorToSubject(req, res) {
  try {
    const id = req.params.id;
    const { doctorId, taId } = req.body;

    const update = {};
    if (doctorId !== undefined) update.assignedDoctor = doctorId || null;
    if (taId !== undefined) update.assignedTA = taId || null;

    const subject = await Subject.findOneAndUpdate({ _id: id }, update, {
      new: true,
    })
      .populate("assignedDoctor", "firstName lastName email")
      .populate("assignedTA", "firstName lastName email");

    if (!subject) return res.status(404).json({ message: "Subject not found" });
    res.status(200).json({ message: "Assign successful", subject });
  } catch (error) {
    console.log(`Error While Assigning: ${error.message}`);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// ─── DEPARTMENTS ──────────────────────────────────────────────────────────────
async function createDepartment(req, res) {
  try {
    const { name, code, description, headOfDepartment, location, status } =
      req.body;
    const department = new Department({
      name,
      code,
      description,
      headOfDepartment,
      location,
      status,
    });
    await department.save();
    res
      .status(201)
      .json({ message: "Department created successfully", department });
  } catch (error) {
    console.log(`Error While Creating a Department ${error.message}`);
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function getAllDepartment(req, res) {
  try {
    const departments = await Department.find({})
      .select("-__v")
      .populate("headOfDepartment", "firstName lastName email");
    res
      .status(200)
      .json({ message: "Departments fetched successfully", departments });
  } catch (error) {
    console.log(`Error While Getting Departments ${error.message}`);
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function updateDepartment(req, res) {
  try {
    const id = req.params.id;
    const updates = req.body;
    const department = await Department.findOneAndUpdate({ _id: id }, updates, {
      new: true,
    });
    if (!department)
      return res.status(404).json({ message: "Department not found" });
    res
      .status(200)
      .json({ message: "Department updated successfully", department });
  } catch (error) {
    console.log(`Error While Updating Department ${error.message}`);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function deleteDepartment(req, res) {
  try {
    const id = req.params.id;
    const dept = await Department.find({ _id: id });
    if (!dept.length)
      return res.status(404).json({ message: "Department not found" });
    await Department.deleteOne({ _id: id });
    res.status(200).json({ message: "Department deleted successfully" });
  } catch (error) {
    console.log(`Error While Deleting Department ${error.message}`);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function updateDepartmentHead(req, res) {
  try {
    const id = req.params.id;
    const { doctorId } = req.body;
    const department = await Department.findOneAndUpdate(
      { _id: id },
      { headOfDepartment: doctorId || null },
      { new: true },
    ).populate("headOfDepartment", "firstName lastName email");
    if (!department)
      return res.status(404).json({ message: "Department not found" });
    res.status(200).json({
      message: "Head of department updated successfully",
      department,
    });
  } catch (error) {
    console.log(`Error While Updating Department Head ${error.message}`);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// ─── USERS ────────────────────────────────────────────────────────────────────
async function getAllUsers(req, res) {
  try {
    const {
      role,
      department,
      yearLevel,
      groupId,
      search,
      page = 1,
      limit = 10,
    } = req.query;
    const query = {};
    if (role) query.role = role;
    if (department) query.department = department;
    if (yearLevel) query.yearLevel = yearLevel;
    if (groupId) query.groupId = groupId;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { nationalId: { $regex: search, $options: "i" } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(query)
      .select("-password -__v")
      .populate("department", "name code")
      .populate("groupId", "name code")
      .skip(skip)
      .limit(parseInt(limit));
    const total = await User.countDocuments(query);
    res
      .status(200)
      .json({ message: "Users fetched successfully", users, total });
  } catch (error) {
    console.log(`Error While Getting Users ${error.message}`);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function createStudent(req, res) {
  try {
    // Handle optional multipart/form-data upload
    await multerMiddlewarePromise(req, res);
    const profileImage = await _saveFile(req.file, "profile-images");

    const {
      email,
      password,
      department,
      nationalId,
      firstName,
      lastName,
      age,
      yearLevel,
      address,
      highSchoolName,
    } = req.body;

    if (!firstName || !lastName || !email || !nationalId) {
      return res
        .status(400)
        .json({ message: "الاسم، البريد الإلكتروني والرقم الوطني مطلوبة" });
    }

    const isEmailUsed = await User.findOne({ email });
    if (isEmailUsed)
      return res
        .status(400)
        .json({ message: "البريد الإلكتروني مُستخدم مسبقاً" });

    const isNationalIdUsed = await User.findOne({ nationalId });
    if (isNationalIdUsed)
      return res.status(400).json({ message: "الرقم الوطني مُستخدم مسبقاً" });

    const hashedPassword = await bcrypt.hash(password || "Welcome@123", 10);
    const student = new Student({
      email,
      password: hashedPassword,
      department: department || null,
      nationalId,
      firstName,
      lastName,
      age: age ? Number(age) : undefined,
      yearLevel: yearLevel ? Number(yearLevel) : 1,
      address: address || "",
      highSchoolName: highSchoolName || "",
      isVerified: true,
      ...(profileImage && { profileImage }),
    });
    await student.save();

    await _logActivity(
      req.user._id,
      "إضافة طالب",
      `تم إضافة الطالب ${firstName} ${lastName} يدوياً`,
      "green",
    );

    res.status(201).json({ message: "تم إنشاء الطالب بنجاح", user: student });
  } catch (error) {
    console.log(`Error While Creating a Student: ${error.message}`);
    console.log(error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
}

async function createDoctor(req, res) {
  try {
    // Handle optional multipart/form-data upload
    await multerMiddlewarePromise(req, res);
    const profileImage = await _saveFile(req.file, "profile-images");

    const {
      email,
      password,
      department,
      nationalId,
      firstName,
      lastName,
      age,
      address,
      highSchoolName,
    } = req.body;

    if (!firstName || !lastName || !email || !nationalId) {
      return res
        .status(400)
        .json({ message: "الاسم، البريد الإلكتروني والرقم الوطني مطلوبة" });
    }

    const isEmailUsed = await User.findOne({ email });
    if (isEmailUsed)
      return res
        .status(400)
        .json({ message: "البريد الإلكتروني مُستخدم مسبقاً" });

    const isNationalIdUsed = await User.findOne({ nationalId });
    if (isNationalIdUsed)
      return res.status(400).json({ message: "الرقم الوطني مُستخدم مسبقاً" });

    const hashedPassword = await bcrypt.hash(password || "Welcome@123", 10);
    const doctor = new Doctor({
      email,
      password: hashedPassword,
      department: department || null,
      nationalId,
      firstName,
      lastName,
      age: age ? Number(age) : undefined,
      address: address || "",
      highSchoolName: highSchoolName || "",
      isVerified: true,
      ...(profileImage && { profileImage }),
    });
    await doctor.save();

    await _logActivity(
      req.user._id,
      "إضافة دكتور",
      `تم إضافة الدكتور ${firstName} ${lastName} يدوياً`,
      "purple",
    );

    res.status(201).json({ message: "تم إنشاء الدكتور بنجاح", user: doctor });
  } catch (error) {
    console.log(`Error While Creating a Doctor: ${error.message}`);
    console.log(error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
}

async function updateUser(req, res) {
  try {
    await multerMiddlewarePromise(req, res);
    const id = req.params.id;
    const updates = { ...req.body };

    // Handle profile image update
    if (req.file) {
      updates.profileImage = await _saveFile(req.file, "profile-images");
    }

    // Hash password if provided
    if (updates.password) {
      if (updates.password.trim() === "") {
        delete updates.password; // Don't clear password if empty string sent
      } else {
        updates.password = await bcrypt.hash(updates.password, 10);
      }
    } else {
      delete updates.password;
    }

    // Sanitise department: empty string → null (field is now an ObjectId ref)
    if (updates.department === "" || updates.department === undefined) {
      updates.department = null;
    }

    const user = await User.findOneAndUpdate({ _id: id }, updates, {
      new: true,
    }).populate("department", "name code");
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    res.status(200).json({ message: "تم تحديث بيانات المستخدم بنجاح", user });
  } catch (error) {
    console.log(`Error While Updating User: ${error.message}`);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
}

async function deleteUser(req, res) {
  try {
    const id = req.params.id;
    const user = await User.find({ _id: id });
    if (!user.length)
      return res.status(404).json({ message: "User not found" });
    await User.deleteOne({ _id: id });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.log(`Error While Deleting User ${error.message}`);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// ─── GLOBAL STATS ─────────────────────────────────────────────────────────────
async function getGlobalStats(req, res) {
  try {
    const studentsCount = await User.countDocuments({ role: "student" });
    const doctorsCount = await User.countDocuments({ role: "doctor" });
    const tasCount = await User.countDocuments({ role: "ta" });
    const totalUsers = await User.countDocuments({});
    const totalVerified = await User.countDocuments({ isVerified: true });

    const subjectsCount = await Subject.countDocuments({});
    const departmentsCount = await Department.countDocuments({});
    const codesTotal = await RegistrationCode.countDocuments({});
    const codesUsed = await RegistrationCode.countDocuments({ isUsed: true });

    res.status(200).json({
      studentsCount,
      doctorsCount,
      tasCount,
      totalUsers,
      totalVerified,
      subjectsCount,
      departmentsCount,
      codesTotal,
      codesUsed,
    });
  } catch (error) {
    console.log(`Error While Getting Global Stats ${error.message}`);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function createAdmin(req, res) {
  try {
    // Handle optional multipart/form-data upload
    await multerMiddlewarePromise(req, res);
    const profileImage = await _saveFile(req.file, "profile-images");

    const { email, password, nationalId, firstName, lastName } = req.body;

    if (!firstName || !lastName || !email || !nationalId) {
      return res
        .status(400)
        .json({ message: "الاسم، البريد الإلكتروني والرقم الوطني مطلوبة" });
    }

    const isEmailUsed = await User.findOne({ email });
    if (isEmailUsed)
      return res
        .status(400)
        .json({ message: "البريد الإلكتروني مُستخدم مسبقاً" });

    const isNationalIdUsed = await User.findOne({ nationalId });
    if (isNationalIdUsed)
      return res.status(400).json({ message: "الرقم الوطني مُستخدم مسبقاً" });

    const hashedPassword = await bcrypt.hash(password || "Admin@123", 10);
    const admin = new Admin({
      email,
      password: hashedPassword,
      nationalId,
      firstName,
      lastName,
      isVerified: true,
      ...(profileImage && { profileImage }),
    });
    await admin.save();
    res.status(201).json({ message: "تم إنشاء المشرف بنجاح", user: admin });
  } catch (error) {
    console.log(`Error While Creating an Admin: ${error.message}`);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
}

// ─── GROUPS ──────────────────────────────────────────────────────────────────
async function createGroup(req, res) {
  try {
    const { name, code, yearLevel, department, capacity } = req.body;
    const group = new Group({ name, code, yearLevel, department, capacity });
    await group.save();

    await _logActivity(
      req.user._id,
      "إنشاء مجموعة",
      `تم إنشاء مجموعة ${name} (${code})`,
      "purple",
    );

    res.status(201).json({ message: "تم إنشاء المجموعة بنجاح", group });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getAllGroups(req, res) {
  try {
    const { yearLevel, department } = req.query;
    const query = {};
    if (yearLevel) query.yearLevel = Number(yearLevel);
    if (department) query.department = department;

    const groups = await Group.find(query)
      .populate("department", "name code")
      .populate("students", "firstName lastName");
    res.status(200).json({ groups });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getGroupById(req, res) {
  try {
    const group = await Group.findById(req.params.id)
      .populate("department", "name code")
      .populate("students", "firstName lastName email nationalId groupId");
    if (!group) return res.status(404).json({ message: "المجموعة غير موجودة" });
    res.status(200).json({ group });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}


async function updateGroup(req, res) {
  try {
    const group = await Group.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.status(200).json({ message: "تم تحديث المجموعة", group });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function deleteGroup(req, res) {
  try {
    await Group.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "تم حذف المجموعة" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// ─── SCHEDULES ────────────────────────────────────────────────────────────────
async function setSchedule(req, res) {
  try {
    let {
      subjectId,
      doctorId,
      groupId,
      dayOfWeek,
      startTime,
      endTime,
      room,
      colorClass,
    } = req.body;

    // Convert empty doctorId string to null to avoid ObjectId casting error
    if (doctorId === "") doctorId = null;

    if (!groupId || !subjectId || !dayOfWeek || !startTime || !endTime) {
      return res
        .status(400)
        .json({ message: "جميع الحقول المطلوبة يجب ملؤها" });
    }

    // Advanced conflict check: (NewStart < OldEnd) AND (NewEnd > OldStart)
    const conflict = await Schedule.findOne({
      groupId,
      dayOfWeek,
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });

    if (conflict) {
      return res
        .status(400)
        .json({ message: "يوجد تعارض في الجدول لهذه المجموعة في هذا الوقت" });
    }

    const schedule = new Schedule({
      subjectId,
      doctorId,
      groupId,
      dayOfWeek,
      startTime,
      endTime,
      room,
      colorClass: colorClass || "",
    });
    await schedule.save();

    await _logActivity(
      req.user._id,
      "تعديل الجدول",
      `إضافة حصة للمجموعة ${groupId}`,
      "blue",
    );

    res.status(201).json({ message: "تمت إضافة الحصة للجدول بنجاح", schedule });
  } catch (error) {
    console.error("SetSchedule Error:", error);
    res.status(500).json({ message: error.message });
  }
}

async function getGroupSchedule(req, res) {
  try {
    const { groupId } = req.params;
    const schedules = await Schedule.find({ groupId })
      .populate("subjectId")
      .populate("doctorId");
    res.status(200).json({ schedules });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function deleteScheduleSlot(req, res) {
  try {
    await Schedule.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "تم حذف الحصة من الجدول" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// ─── USER DETAILS & GROUP ASSIGNMENT ──────────────────────────────────────────
async function getUserDetails(req, res) {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -__v")
      .populate("department", "name code")
      .populate("groupId");
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function addStudentToGroup(req, res) {
  try {
    const { studentId, groupId } = req.body;
    const student = await User.findById(studentId);
    const group = await Group.findById(groupId);

    if (!student || student.role !== "student")
      return res.status(400).json({ message: "طالب غير صالح" });
    if (!group) return res.status(404).json({ message: "المجموعة غير موجودة" });

    // Check Year Match
    if (student.yearLevel !== group.yearLevel) {
      return res.status(400).json({
        message: `لا يمكن إضافة طالب من السنة ${student.yearLevel} لمجموعة من السنة ${group.yearLevel}`,
      });
    }

    // Check Capacity (only enforce if capacity > 0)
    if (group.capacity > 0 && group.students.length >= group.capacity) {
      return res
        .status(400)
        .json({ message: "تم الوصول للحد الأقصى لسعة هذه المجموعة" });
    }


    // Check if already in group
    if (group.students.includes(studentId)) {
      return res
        .status(400)
        .json({ message: "الطالب موجود بالفعل في هذه المجموعة" });
    }

    // Update Student and Group
    group.students.push(studentId);
    await group.save();

    student.groupId = groupId;
    await student.save();

    res.status(200).json({ message: "تمت إضافة الطالب للمجموعة بنجاح" });

    await _logActivity(
      req.user._id,
      "تعيين طالب",
      `إضافة طالب للمجموعة ${groupId}`,
      "green",
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function removeStudentFromGroup(req, res) {
  try {
    const { studentId, groupId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "المجموعة غير موجودة" });

    group.students = group.students.filter((id) => id.toString() !== studentId);
    await group.save();

    await User.findByIdAndUpdate(studentId, { groupId: null });

    res.status(200).json({ message: "تمت إزالة الطالب من المجموعة" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// ─── EXAMS ────────────────────────────────────────────────────────────────────
async function createExam(req, res) {
  try {
    const { courseName, subject, date, time, location, type, groupId } =
      req.body;
    const exam = new Exam({
      courseName,
      subject,
      date,
      time,
      location,
      type,
      groupId,
    });
    await exam.save();
    res.status(201).json({ message: "تم إنشاء الامتحان بنجاح", exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getExams(req, res) {
  try {
    const { groupId } = req.query;
    const query = groupId ? { groupId } : {};
    const exams = await Exam.find(query)
      .populate("subject")
      .populate("groupId")
      .sort({ date: 1 });
    res.status(200).json({ exams });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function deleteExam(req, res) {
  try {
    await Exam.findByIdAndDelete(req.params.id);
    await _logActivity(req.user._id, "حذف امتحان", `تم حذف الامتحان #${req.params.id}`, "red");
    res.status(200).json({ message: "تم حذف الامتحان" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function updateExam(req, res) {
  try {
    const { courseName, subject, date, time, location, type, groupId } = req.body;
    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      { courseName, subject, date, time, location, type, groupId },
      { new: true, runValidators: true }
    ).populate("subject", "name").populate("groupId", "name");
    if (!exam) return res.status(404).json({ message: "الامتحان غير موجود" });
    await _logActivity(req.user._id, "تعديل امتحان", `تعديل بيانات امتحان ${exam.courseName}`, "blue");
    res.status(200).json({ message: "تم تحديث الامتحان بنجاح", exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// ─── GRADES ───────────────────────────────────────────────────────────────────
async function setGrade(req, res) {
  try {
    const { student, subject, midTerm, final, activities, maxTotal, semester, academicYear } = req.body;

    let grade = await Grade.findOne({ student, subject });
    if (grade) {
      if (midTerm    !== undefined) grade.midTerm    = midTerm;
      if (final      !== undefined) grade.final      = final;
      if (activities !== undefined) grade.activities = activities;
      if (maxTotal   !== undefined) grade.maxTotal   = maxTotal;
      if (semester)    grade.semester     = semester;
      if (academicYear) grade.academicYear = academicYear;
    } else {
      grade = new Grade({ student, subject, midTerm, final, activities, maxTotal, semester, academicYear });
    }

    await grade.save();
    const subjectDoc = await Subject.findById(subject).select("name");
    await _logActivity(req.user._id, "تسجيل درجة", `تسجيل درجة لمادة ${subjectDoc?.name || subject}`, "green");
    res.status(200).json({ message: "تم تسجيل الدرجة بنجاح", grade });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function updateGrade(req, res) {
  try {
    const grade = await Grade.findById(req.params.id);
    if (!grade) return res.status(404).json({ message: "الدرجة غير موجودة" });
    const { midTerm, final, activities, semester, academicYear } = req.body;
    if (midTerm    !== undefined) grade.midTerm    = midTerm;
    if (final      !== undefined) grade.final      = final;
    if (activities !== undefined) grade.activities = activities;
    if (semester)    grade.semester     = semester;
    if (academicYear) grade.academicYear = academicYear;
    await grade.save();
    res.status(200).json({ message: "تم تحديث الدرجة بنجاح", grade });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function deleteGrade(req, res) {
  try {
    await Grade.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "تم حذف الدرجة" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getStudentsBySubject(req, res) {
  try {
    const { subjectId } = req.params;
    const subject = await Subject.findById(subjectId).lean();
    if (!subject) return res.status(404).json({ message: "المادة غير موجودة" });

    // Get all students that have a grade for this subject
    const grades = await Grade.find({ subject: subjectId })
      .populate("student", "firstName lastName email nationalId groupId")
      .lean();

    const rows = grades.map(g => ({
      gradeId:      g._id,
      studentId:    g.student?._id,
      studentName:  g.student ? `${g.student.firstName} ${g.student.lastName}` : "—",
      studentEmail: g.student?.email || "—",
      nationalId:   g.student?.nationalId || "—",
      activities:   g.activities,
      midTerm:      g.midTerm,
      final:        g.final,
      total:        g.total,
      letterGrade:  g.letterGrade,
      status:       g.status,
      semester:     g.semester,
      academicYear: g.academicYear,
    }));

    res.status(200).json({ subject, grades: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getStudentGrades(req, res) {
  try {
    const grades = await Grade.find({ student: req.params.studentId }).populate(
      "subject",
    );
    res.status(200).json({ grades });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getGradesBySubject(req, res) {
  try {
    const { subjectId, groupId, departmentId } = req.query;
    if (!subjectId)
      return res.status(400).json({ message: "Subject ID is required" });

    const filter = { role: "student" };
    if (groupId && groupId !== "all") filter.groupId = groupId;
    if (departmentId) filter.department = departmentId;

    const students = await User.find(filter)
      .select("firstName lastName nationalId email groupId department")
      .populate("groupId", "name")
      .lean();

    const grades = await Promise.all(
      students.map(async (st) => {
        const g = await Grade.findOne({
          student: st._id,
          subject: subjectId,
        }).lean();
        return {
          studentId: st._id,
          studentName: `${st.firstName} ${st.lastName}`,
          studentNo: st.nationalId,
          group: st.groupId?.name || "—",
          homeworkScore: g?.activities ?? null,
          midtermScore: g?.midTerm ?? null,
          finalScore: g?.final ?? null,
          total: g?.total ?? null,
          gradeId: g?._id || null,
        };
      }),
    );

    res.status(200).json({ grades });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────────
async function createAnnouncement(req, res) {
  try {
    const {
      title,
      content,
      type,
      priority,
      targetAudience,
      targetGroup,
      targetDepartment,
      isPinned,
      source,
    } = req.body;

    const announcement = new Announcement({
      title,
      content,
      type,
      priority,
      targetAudience,
      targetGroup: targetGroup || undefined,
      targetDepartment: targetDepartment || undefined,
      isPinned: isPinned || false,
      source,
      createdBy: req.user._id,
    });
    await announcement.save();
    
    // Optional: Log activity
    await _logActivity(req.user._id, "إعلان جديد", `نشر إعلان: ${title}`, "blue");

    res.status(201).json({ message: "تم نشر الإعلان بنجاح", announcement });
  } catch (error) {
    console.error("createAnnouncement Error:", error);
    res.status(500).json({ message: error.message });
  }
}

async function getAnnouncements(req, res) {
  try {
    const filter = {};
    // If admin, they see all. Students/Doctors would see filtered ones.
    if (req.user.role !== "admin") {
      filter.isActive = true;
      filter.$or = [
        { targetAudience: "all" },
        { targetAudience: req.user.role === "student" ? "students" : req.user.role },
        { targetAudience: "staff" } // if the user is doctor or ta, they might match staff
      ];
      // Additional checks for specific group/department can be added here if needed
    }

    const announcements = await Announcement.find(filter)
      .populate("targetGroup", "name code")
      .populate("targetDepartment", "name")
      .populate("createdBy", "firstName lastName")
      .sort({ isPinned: -1, createdAt: -1 });

    res.status(200).json({ announcements });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function deleteAnnouncement(req, res) {
  try {
    const ann = await Announcement.findByIdAndDelete(req.params.id);
    if (ann) {
       await _logActivity(req.user._id, "حذف إعلان", `حذف إعلان: ${ann.title}`, "red");
    }
    res.status(200).json({ message: "تم حذف الإعلان" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function updateAnnouncement(req, res) {
  try {
    const ann = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ message: "تم تحديث الإعلان", announcement: ann });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function updateProfile(req, res) {
  try {
    const admin = await User.findById(req.user._id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const { nickName, address, phone } = req.body;
    if (nickName) admin.nickName = nickName;
    if (address) admin.address = address;
    if (phone) admin.phone = phone;

    if (req.file) {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const uploadDir = path.join(__dirname, "..", "uploads", "profile-images");
      await fs.mkdir(uploadDir, { recursive: true });
      const fileName = randomUUID() + path.extname(req.file.originalname);
      await fs.writeFile(path.join(uploadDir, fileName), req.file.buffer);
      admin.profileImage = `/uploads/profile-images/${fileName}`;
    }

    await admin.save();
    return res
      .status(200)
      .json({ message: "Profile updated successfully", user: admin });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default {
  generateRegistrationCode,
  getCodes,
  deleteCode,
  deleteAllUsedCodes,
  getStats,
  createSubject,
  getAllSubject,
  updateSubject,
  deleteSubject,
  assignDoctorToSubject,
  createDepartment,
  getAllDepartment,
  updateDepartment,
  deleteDepartment,
  updateDepartmentHead,
  getAllUsers,
  createStudent,
  createDoctor,
  createTA,
  createAdmin,
  updateUser,
  deleteUser,
  getGlobalStats,
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  setSchedule,
  getGroupSchedule,
  deleteScheduleSlot,
  getUserDetails,
  addStudentToGroup,
  removeStudentFromGroup,
  createExam,
  getExams,
  updateExam,
  deleteExam,
  setGrade,
  updateGrade,
  deleteGrade,
  getStudentGrades,
  getGradesBySubject,
  getStudentsBySubject,
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  getSupportTickets,
  respondToSupportTicket,
  updateProfile,
  getRecentActivities: async (req, res) => {
    try {
      const activities = await Activity.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("user", "firstName lastName");
      res.status(200).json({ activities });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};
// ─── 16. SUPPORT TICKETS ───────────────────────────────────────────────────
export async function getSupportTickets(req, res) {
  try {
    const tickets = await Support.find()
      .populate("student", "firstName lastName profileImage department yearLevel")
      .sort({ createdAt: -1 });
    res.status(200).json({ tickets });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function respondToSupportTicket(req, res) {
  try {
    const { ticketId } = req.params;
    const { response, status } = req.body;
    
    const ticket = await Support.findByIdAndUpdate(
      ticketId,
      { 
        adminResponse: response, 
        status: status || "closed",
        respondedBy: req.user._id 
      },
      { new: true }
    );

    if (!ticket) return res.status(404).json({ message: "الطلب غير موجود" });

    res.status(200).json({ message: "تم الرد على الطلب بنجاح", ticket });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
