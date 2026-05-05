/**
 * Full production seed — creates everything needed for the student portal:
 * Departments → Doctors → TAs → Subjects → Groups → Students → Schedules → Grades → Exams → Announcements
 * 
 * Run: node seed.js
 */

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "./servcies/db/connectDB.js";

import User         from "./models/User.js";
import Student      from "./models/Student.js";
import Doctor       from "./models/Doctor.js";
import Admin        from "./models/Admin.js";
import TA           from "./models/TA.js";
import Department   from "./models/Department.js";
import Subject      from "./models/Subject.js";
import Group        from "./models/Group.js";
import Schedule     from "./models/Schedule.js";
import Grade        from "./models/Grade.js";
import Exam         from "./models/Exam.js";
import Announcement from "./models/Announcement.js";
import RegistrationCode from "./models/RegistrationCode.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rnd = (min, max) => Math.round(Math.random() * (max - min) + min);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

async function seed() {
  try {
    await connectDB();
    console.log("✅ Connected to database");

    // ── Wipe everything ────────────────────────────────────────────────────────
    console.log("🗑  Dropping database...");
    await mongoose.connection.dropDatabase();

    const hashedPwd = await bcrypt.hash("password123", 10);

    // ── 1. Admin ───────────────────────────────────────────────────────────────
    console.log("👤 Creating Admin...");
    await Admin.create({
      firstName: "System",
      lastName:  "Admin",
      email:     "admin@eccat.edu",
      password:  hashedPwd,
      nationalId: "00000000000000",
      isVerified: true,
    });

    // ── 2. Departments ─────────────────────────────────────────────────────────
    console.log("🏛  Creating Departments...");
    const [dComm, dMech, dElec] = await Department.insertMany([
      { name: "هندسة الاتصالات",    code: "COMM", description: "Communications and Electronics Engineering", status: "active", location: { building: "A", floor: "3" } },
      { name: "الميكاترونيكس",       code: "MECH", description: "Mechatronics and Robotics Engineering",     status: "active", location: { building: "B", floor: "1" } },
      { name: "الإلكترونيات",         code: "ELEC", description: "Electronics and Basic Sciences",            status: "active", location: { building: "A", floor: "2" } },
    ]);

    // ── 3. Doctors ─────────────────────────────────────────────────────────────
    console.log("👨‍🏫 Creating Doctors...");
    const doctorDefs = [
      { firstName: "زكريا",  lastName: "أحمد",     email: "zakaria@eccat.edu",  nationalId: "11111111111111", department: dComm._id, specialization: "معالجة الإشارات الرقمية" },
      { firstName: "نورية",  lastName: "علي",       email: "noria@eccat.edu",    nationalId: "22222222222222", department: dMech._id, specialization: "الروبوتيكس" },
      { firstName: "أحمد",   lastName: "الضبع",    email: "ahmed@eccat.edu",    nationalId: "33333333333333", department: dElec._id, specialization: "الأنظمة المدمجة" },
      { firstName: "سارة",   lastName: "حسن",      email: "sarah@eccat.edu",    nationalId: "44444444444444", department: dComm._id, specialization: "معالجة الإشارات" },
      { firstName: "خالد",   lastName: "محمود",    email: "khaled@eccat.edu",   nationalId: "55555555555555", department: dElec._id, specialization: "أنظمة التحكم" },
    ];
    const doctors = [];
    for (const d of doctorDefs) {
      doctors.push(await Doctor.create({ ...d, password: hashedPwd, role: "doctor", isVerified: true, age: 45, address: "القاهرة، مصر" }));
    }

    await Department.findByIdAndUpdate(dComm._id, { headOfDepartment: doctors[0]._id });
    await Department.findByIdAndUpdate(dMech._id, { headOfDepartment: doctors[1]._id });
    await Department.findByIdAndUpdate(dElec._id, { headOfDepartment: doctors[2]._id });

    // ── 4. TAs ────────────────────────────────────────────────────────────────
    console.log("👨‍💻 Creating TAs...");
    const taDefs = [
      { firstName: "مصطفى", lastName: "عزت",    email: "mostafa@eccat.edu", nationalId: "66666666666666", department: dComm._id, specialization: "الشبكات",     assignedDoctor: doctors[0]._id },
      { firstName: "هبة",   lastName: "منصور",  email: "heba@eccat.edu",    nationalId: "77777777777777", department: dMech._id, specialization: "الاستشعار",  assignedDoctor: doctors[1]._id },
      { firstName: "إبراهيم",lastName: "سعيد",   email: "ibrahim@eccat.edu", nationalId: "88888888888888", department: dElec._id, specialization: "الدوائر",   assignedDoctor: doctors[2]._id },
    ];
    const tas = [];
    for (const t of taDefs) {
      tas.push(await TA.create({ ...t, password: hashedPwd, role: "ta", isVerified: true, age: 28, address: "القاهرة، مصر", teachingSections: ["Section 1"] }));
    }

    // ── 5. Subjects ───────────────────────────────────────────────────────────
    console.log("📚 Creating Subjects...");
    const subjectDefs = [
      { name: "معالجة الإشارات الرقمية",   code: "COMM301", department: dComm._id, semester: 5, yearLevel: 3, assignedDoctor: doctors[3]._id, assignedTA: tas[0]._id, academicYear: "2025/2026" },
      { name: "الاتصالات اللاسلكية",         code: "COMM405", department: dComm._id, semester: 7, yearLevel: 4, assignedDoctor: doctors[0]._id,                        academicYear: "2025/2026" },
      { name: "أنظمة الروبوتيكس",             code: "MECH401", department: dMech._id, semester: 7, yearLevel: 4, assignedDoctor: doctors[1]._id, assignedTA: tas[1]._id, academicYear: "2025/2026" },
      { name: "الأنظمة المدمجة",              code: "ELEC202", department: dElec._id, semester: 4, yearLevel: 2, assignedDoctor: doctors[2]._id, assignedTA: tas[2]._id, academicYear: "2025/2026" },
      { name: "نظرية التحكم",                  code: "ELEC305", department: dElec._id, semester: 6, yearLevel: 3, assignedDoctor: doctors[4]._id,                        academicYear: "2025/2026" },
      { name: "الرياضيات الهندسية",            code: "MATH201", department: dComm._id, semester: 3, yearLevel: 2, assignedDoctor: doctors[0]._id,                        academicYear: "2025/2026" },
      { name: "أساسيات البرمجة",              code: "CS101",   department: dElec._id, semester: 1, yearLevel: 1, assignedDoctor: doctors[2]._id, assignedTA: tas[2]._id, academicYear: "2025/2026" },
    ];
    const savedSubjects = await Subject.insertMany(subjectDefs);
    const subByCode = {};
    savedSubjects.forEach(s => { subByCode[s.code] = s; });

    // ── 6. Groups ────────────────────────────────────────────────────────────
    console.log("👥 Creating Groups...");
    const [gC3, gC4, gM4, gE2, gE3, gE1] = await Group.insertMany([
      { name: "اتصالات - السنة الثالثة - أ",   code: "COMM-3-A", department: dComm._id, yearLevel: 3, capacity: 30, isActive: true },
      { name: "اتصالات - السنة الرابعة - أ",   code: "COMM-4-A", department: dComm._id, yearLevel: 4, capacity: 30, isActive: true },
      { name: "ميكاترونيكس - السنة الرابعة - أ", code: "MECH-4-A", department: dMech._id, yearLevel: 4, capacity: 30, isActive: true },
      { name: "إلكترونيات - السنة الثانية - أ", code: "ELEC-2-A", department: dElec._id, yearLevel: 2, capacity: 30, isActive: true },
      { name: "إلكترونيات - السنة الثالثة - أ", code: "ELEC-3-A", department: dElec._id, yearLevel: 3, capacity: 30, isActive: true },
      { name: "إلكترونيات - السنة الأولى - أ",  code: "ELEC-1-A", department: dElec._id, yearLevel: 1, capacity: 30, isActive: true },
    ]);

    // ── 7. Students ───────────────────────────────────────────────────────────
    console.log("🎓 Creating Students...");

    // Group → subjects it studies
    const groupSubjectMap = {
      [gC3._id]: [subByCode["COMM301"], subByCode["MATH201"]],
      [gC4._id]: [subByCode["COMM405"]],
      [gM4._id]: [subByCode["MECH401"]],
      [gE2._id]: [subByCode["ELEC202"]],
      [gE3._id]: [subByCode["ELEC305"]],
      [gE1._id]: [subByCode["CS101"]],
    };

    const studentDefs = [
      // COMM yr3 (group gC3)
      { firstName: "ريم",    lastName: "محمد",   nationalId: "10000000000001", email: "student1@eccat.edu", group: gC3, dept: dComm, yr: 3, gpa: 3.85 },
      { firstName: "علي",    lastName: "حسن",    nationalId: "10000000000002", email: "student2@eccat.edu", group: gC3, dept: dComm, yr: 3, gpa: 3.62 },
      { firstName: "منى",    lastName: "سامي",   nationalId: "10000000000003", email: "student3@eccat.edu", group: gC3, dept: dComm, yr: 3, gpa: 3.41 },
      // COMM yr4 (group gC4)
      { firstName: "زياد",   lastName: "عيسى",   nationalId: "10000000000004", email: "student4@eccat.edu", group: gC4, dept: dComm, yr: 4, gpa: 3.78 },
      { firstName: "فاطمة",  lastName: "علي",    nationalId: "10000000000005", email: "student5@eccat.edu", group: gC4, dept: dComm, yr: 4, gpa: 3.55 },
      // MECH yr4 (group gM4)
      { firstName: "عمر",    lastName: "خالد",   nationalId: "10000000000006", email: "student6@eccat.edu", group: gM4, dept: dMech, yr: 4, gpa: 3.92 },
      { firstName: "يوسف",   lastName: "طارق",   nationalId: "10000000000007", email: "student7@eccat.edu", group: gM4, dept: dMech, yr: 4, gpa: 3.70 },
      // ELEC yr2 (group gE2)
      { firstName: "سارة",   lastName: "مصطفى",  nationalId: "10000000000008", email: "student8@eccat.edu", group: gE2, dept: dElec, yr: 2, gpa: 3.45 },
      { firstName: "عمرو",   lastName: "سعيد",   nationalId: "10000000000009", email: "student9@eccat.edu", group: gE2, dept: dElec, yr: 2, gpa: 3.20 },
      // ELEC yr3 (group gE3)
      { firstName: "هدى",    lastName: "إبراهيم", nationalId: "10000000000010", email: "student10@eccat.edu", group: gE3, dept: dElec, yr: 3, gpa: 3.60 },
      { firstName: "كريم",   lastName: "عادل",   nationalId: "10000000000011", email: "student11@eccat.edu", group: gE3, dept: dElec, yr: 3, gpa: 3.33 },
      // ELEC yr1 (group gE1)
      { firstName: "ليلى",   lastName: "نبيل",   nationalId: "10000000000012", email: "student12@eccat.edu", group: gE1, dept: dElec, yr: 1, gpa: 3.15 },
    ];

    const savedStudents = [];
    for (const s of studentDefs) {
      const enrolledSubjects = (groupSubjectMap[s.group._id] || []).map(sub => sub._id);
      const student = await Student.create({
        firstName:       s.firstName,
        lastName:        s.lastName,
        email:           s.email,
        password:        hashedPwd,
        nationalId:      s.nationalId,
        role:            "student",
        isVerified:      true,
        department:      s.dept._id,
        yearLevel:       s.yr,
        groupId:         s.group._id,
        gpa:             s.gpa,
        enrolledSubjects,
        age:             18 + s.yr,
        address:         "مدينة نصر، القاهرة",
        highSchoolName:  "مدرسة المستقبل",
        academicYear:    "2025/2026",
        semester:        s.yr * 2 - 1,
      });
      savedStudents.push(student);
      // Add student to group.students
      await Group.findByIdAndUpdate(s.group._id, { $push: { students: student._id } });
    }

    // ── 8. Schedules ─────────────────────────────────────────────────────────
    console.log("📅 Creating Schedules...");
    const COLORS = ["#2463eb", "#7c3aed", "#ea580c", "#16a34a", "#0891b2", "#d97706"];
    const scheduleData = [
      // COMM-3-A  → COMM301 + MATH201
      { subjectId: subByCode["COMM301"]._id, doctorId: doctors[3]._id, groupId: gC3._id, dayOfWeek: "Sunday",    startTime: "09:00", endTime: "11:00", room: "قاعة A301", colorClass: COLORS[0] },
      { subjectId: subByCode["COMM301"]._id, doctorId: doctors[3]._id, groupId: gC3._id, dayOfWeek: "Tuesday",   startTime: "09:00", endTime: "11:00", room: "قاعة A301", colorClass: COLORS[0] },
      { subjectId: subByCode["MATH201"]._id, doctorId: doctors[0]._id, groupId: gC3._id, dayOfWeek: "Monday",    startTime: "11:00", endTime: "13:00", room: "قاعة A205", colorClass: COLORS[1] },
      { subjectId: subByCode["MATH201"]._id, doctorId: doctors[0]._id, groupId: gC3._id, dayOfWeek: "Wednesday", startTime: "11:00", endTime: "13:00", room: "قاعة A205", colorClass: COLORS[1] },
      // COMM-4-A  → COMM405
      { subjectId: subByCode["COMM405"]._id, doctorId: doctors[0]._id, groupId: gC4._id, dayOfWeek: "Sunday",    startTime: "10:00", endTime: "12:00", room: "قاعة A402", colorClass: COLORS[2] },
      { subjectId: subByCode["COMM405"]._id, doctorId: doctors[0]._id, groupId: gC4._id, dayOfWeek: "Tuesday",   startTime: "10:00", endTime: "12:00", room: "قاعة A402", colorClass: COLORS[2] },
      // MECH-4-A  → MECH401
      { subjectId: subByCode["MECH401"]._id, doctorId: doctors[1]._id, groupId: gM4._id, dayOfWeek: "Sunday",    startTime: "08:00", endTime: "10:00", room: "قاعة B101", colorClass: COLORS[3] },
      { subjectId: subByCode["MECH401"]._id, doctorId: doctors[1]._id, groupId: gM4._id, dayOfWeek: "Thursday",  startTime: "08:00", endTime: "10:00", room: "قاعة B101", colorClass: COLORS[3] },
      // ELEC-2-A  → ELEC202
      { subjectId: subByCode["ELEC202"]._id, doctorId: doctors[2]._id, groupId: gE2._id, dayOfWeek: "Monday",    startTime: "09:00", endTime: "11:00", room: "مختبر A110", colorClass: COLORS[4] },
      { subjectId: subByCode["ELEC202"]._id, doctorId: doctors[2]._id, groupId: gE2._id, dayOfWeek: "Wednesday", startTime: "09:00", endTime: "11:00", room: "مختبر A110", colorClass: COLORS[4] },
      // ELEC-3-A  → ELEC305
      { subjectId: subByCode["ELEC305"]._id, doctorId: doctors[4]._id, groupId: gE3._id, dayOfWeek: "Tuesday",   startTime: "11:00", endTime: "13:00", room: "قاعة A308", colorClass: COLORS[5] },
      { subjectId: subByCode["ELEC305"]._id, doctorId: doctors[4]._id, groupId: gE3._id, dayOfWeek: "Thursday",  startTime: "11:00", endTime: "13:00", room: "قاعة A308", colorClass: COLORS[5] },
      // ELEC-1-A  → CS101
      { subjectId: subByCode["CS101"]._id,   doctorId: doctors[2]._id, groupId: gE1._id, dayOfWeek: "Sunday",    startTime: "08:00", endTime: "10:00", room: "مختبر الحاسوب", colorClass: COLORS[0] },
      { subjectId: subByCode["CS101"]._id,   doctorId: doctors[2]._id, groupId: gE1._id, dayOfWeek: "Wednesday", startTime: "08:00", endTime: "10:00", room: "مختبر الحاسوب", colorClass: COLORS[0] },
    ];
    await Schedule.insertMany(scheduleData);

    // ── 9. Grades ─────────────────────────────────────────────────────────────
    console.log("📊 Creating Grades...");

    // Each student gets grades for every subject in their group
    for (const student of savedStudents) {
      const subjects = groupSubjectMap[student.groupId.toString()] || [];
      for (const subject of subjects) {
        if (!subject) continue;
        // Generate realistic score distribution around GPA
        const gpaPct = ((student.gpa - 2.0) / 2.0) * 100; // map 2-4 → 0-100
        const base = Math.max(55, Math.min(98, gpaPct + rnd(-8, 8)));

        const activities = Math.round(Math.min(20, (base / 100) * 20 + rnd(-2, 2)));
        const midTerm    = Math.round(Math.min(30, (base / 100) * 30 + rnd(-3, 3)));
        const final      = Math.round(Math.min(50, (base / 100) * 50 + rnd(-4, 4)));

        const g = new Grade({
          student:      student._id,
          subject:      subject._id,
          activities:   Math.max(0, activities),
          midTerm:      Math.max(0, midTerm),
          final:        Math.max(0, final),
          semester:     "fall2024",
          academicYear: "2025/2026",
        });
        await g.save(); // triggers pre-save hook
      }
    }

    // ── 10. Exams ─────────────────────────────────────────────────────────────
    console.log("📝 Creating Exams...");
    const now = new Date();
    const future = (days) => new Date(now.getTime() + days * 86400000);

    await Exam.insertMany([
      { courseName: "معالجة الإشارات الرقمية", subject: subByCode["COMM301"]._id, groupId: gC3._id, date: future(10), time: "09:00", location: "قاعة A301", type: "نصفي" },
      { courseName: "الرياضيات الهندسية",        subject: subByCode["MATH201"]._id, groupId: gC3._id, date: future(15), time: "11:00", location: "قاعة A205", type: "نهائي" },
      { courseName: "الاتصالات اللاسلكية",       subject: subByCode["COMM405"]._id, groupId: gC4._id, date: future(7),  time: "10:00", location: "قاعة A402", type: "اختبار" },
      { courseName: "أنظمة الروبوتيكس",          subject: subByCode["MECH401"]._id, groupId: gM4._id, date: future(12), time: "08:00", location: "قاعة B101", type: "نهائي" },
      { courseName: "الأنظمة المدمجة",           subject: subByCode["ELEC202"]._id, groupId: gE2._id, date: future(20), time: "09:00", location: "مختبر A110", type: "نصفي" },
      { courseName: "نظرية التحكم",               subject: subByCode["ELEC305"]._id, groupId: gE3._id, date: future(8),  time: "11:00", location: "قاعة A308", type: "اختبار" },
      { courseName: "أساسيات البرمجة",           subject: subByCode["CS101"]._id,   groupId: gE1._id, date: future(5),  time: "08:00", location: "مختبر الحاسوب", type: "اختبار" },
    ]);

    // ── 11. Announcements ─────────────────────────────────────────────────────
    console.log("📢 Creating Announcements...");
    await Announcement.insertMany([
      { title: "افتتاح باب التسجيل للفصل الدراسي القادم", content: "يُعلن مكتب شؤون الطلاب عن فتح باب التسجيل للمواد في الفصل الدراسي الثاني 2025/2026.", source: "شؤون الطلاب", targetAudience: "students" },
      { title: "ورشة عمل: أحدث تطبيقات الذكاء الاصطناعي", content: "يدعوكم قسم هندسة الاتصالات لحضور ورشة عمل متخصصة يوم الخميس القادم.", source: "قسم الاتصالات", targetAudience: "all" },
      { title: "تعديل موعد الاختبار النصفي لمادة التحكم", content: "تم تأجيل الاختبار النصفي لمادة نظرية التحكم إلى الأسبوع القادم.", source: "د. خالد محمود", targetAudience: "students", targetGroup: gE3._id },
      { title: "إعلان نتائج مسابقة المشاريع البحثية", content: "تم الإعلان عن نتائج مسابقة المشاريع البحثية السنوية. تهانينا للفائزين!", source: "عمادة البحث العلمي", targetAudience: "all" },
      { title: "صيانة شبكة الجامعة يوم الجمعة", content: "سيتم إيقاف خدمة الإنترنت بالحرم الجامعي يوم الجمعة من 8 ص حتى 12 ظ.", source: "تقنية المعلومات", targetAudience: "all" },
    ]);

    // ── 12. Registration Codes for future signups ─────────────────────────────
    console.log("🔑 Creating Registration Codes...");
    await RegistrationCode.insertMany([
      { firstName: "محمد",  lastName: "عمر",    age: 19, nationalId: "20000000000001", role: "student", department: dComm._id, yearLevel: 1, code: "eccat-11111111" },
      { firstName: "نور",   lastName: "أحمد",   age: 20, nationalId: "20000000000002", role: "student", department: dMech._id, yearLevel: 2, code: "eccat-22222222" },
      { firstName: "جمال",  lastName: "فاروق",  age: 40, nationalId: "30000000000001", role: "doctor",  department: dElec._id,               code: "eccat-33333333" },
    ]);

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log("\n✅ Database seeded successfully!");
    console.log("════════════════════════════════════════");
    console.log("👤 Admin     → admin@eccat.edu        / password123");
    console.log("🎓 Student1  → student1@eccat.edu     / password123  (COMM, yr3)");
    console.log("🎓 Student6  → student6@eccat.edu     / password123  (MECH, yr4)");
    console.log("🎓 Student8  → student8@eccat.edu     / password123  (ELEC, yr2)");
    console.log("🎓 Student10 → student10@eccat.edu    / password123  (ELEC, yr3)");
    console.log("👨‍🏫 Doctor    → zakaria@eccat.edu     / password123");
    console.log("════════════════════════════════════════\n");
    process.exit(0);

  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seed();
