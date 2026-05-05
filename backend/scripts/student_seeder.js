import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Department from "../models/Department.js";
import Subject from "../models/Subject.js";
import Group from "../models/Group.js";
import Schedule from "../models/Schedule.js";
import Announcement from "../models/Announcement.js";
import Exam from "../models/Exam.js";
import Grade from "../models/Grade.js";
import Password from "../utils/auth/Password.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/eccat-one";

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB...");

    // 1. Create or Find Department
    let dept = await Department.findOne({ name: "هندسة البرمجيات" });
    if (!dept) {
      dept = await Department.create({ name: "هندسة البرمجيات", code: "SE" });
    }

    // 2. Create Subjects
    const subjectData = [
      { name: "برمجة الويب المتطورة", code: "CS401", creditHours: 3, department: dept._id },
      { name: "الذكاء الاصطناعي", code: "CS402", creditHours: 3, department: dept._id },
      { name: "هندسة البرمجيات", code: "CS403", creditHours: 3, department: dept._id },
      { name: "قواعد البيانات", code: "CS404", creditHours: 3, department: dept._id },
      { name: "تشفير البيانات", code: "CS405", creditHours: 3, department: dept._id },
    ];

    const subjects = [];
    for (const s of subjectData) {
      let sub = await Subject.findOne({ code: s.code });
      if (!sub) sub = await Subject.create(s);
      subjects.push(sub);
    }

    // 3. Create Group
    let group = await Group.findOne({ name: "المجموعة الأولى - سنة رابعة" });
    if (!group) {
      group = await Group.create({
        name: "المجموعة الأولى - سنة رابعة",
        code: "G1-Y4",
        department: dept._id,
        yearLevel: 4,
        capacity: 50,
      });
    }

    // 4. Create Test Student
    const studentEmail = "student@test.com";
    let student = await Student.findOne({ email: studentEmail });
    if (!student) {
      const hashedPassword = await Password.hashPassword("password123");
      student = await Student.create({
        firstName: "أحمد",
        lastName: "محمد",
        email: studentEmail,
        password: hashedPassword,
        role: "student",
        nationalId: "12345678901234",
        isVerified: true,
        department: dept._id,
        yearLevel: 4,
        groupId: group._id,
        gpa: 3.85,
        enrolledSubjects: subjects.map(s => s._id),
      });
      console.log("Test Student created: student@test.com / password123");
    }

    // 5. Create Schedule for the Group
    await Schedule.deleteMany({ groupId: group._id });
    const scheduleData = [
      { dayOfWeek: "Sunday", startTime: "08:00", endTime: "10:00", subjectId: subjects[0]._id, room: "قاعة 402", groupId: group._id, colorClass: "color-7c3aed" },
      { dayOfWeek: "Sunday", startTime: "10:00", endTime: "12:00", subjectId: subjects[1]._id, room: "قاعة 201", groupId: group._id, colorClass: "color-2463eb" },
      { dayOfWeek: "Monday", startTime: "10:00", endTime: "12:00", subjectId: subjects[2]._id, room: "مختبر 1", groupId: group._id, colorClass: "color-ea580c" },
      { dayOfWeek: "Tuesday", startTime: "08:00", endTime: "10:00", subjectId: subjects[3]._id, room: "مختبر 2", groupId: group._id, colorClass: "color-16a34a" },
      { dayOfWeek: "Wednesday", startTime: "01:00", endTime: "03:00", subjectId: subjects[4]._id, room: "قاعة المؤتمرات", groupId: group._id, colorClass: "color-0891b2" },
    ];
    await Schedule.insertMany(scheduleData);

    // 6. Create Grades
    await Grade.deleteMany({ student: student._id });
    const gradesData = subjects.map((s, i) => ({
      student: student._id,
      subject: s._id,
      midTerm: 15 + i,
      final: 50 + i * 2,
      activities: 18,
      maxTotal: 100,
    }));
    for (const g of gradesData) {
      const grade = new Grade(g);
      await grade.save(); // triggers pre-save hook for total/letter
    }

    // 7. Create Upcoming Exams
    await Exam.deleteMany({ groupId: group._id });
    await Exam.create([
      { courseName: subjects[0].name, subject: subjects[0]._id, date: new Date(Date.now() + 86400000 * 3), time: "09:00 ص", location: "قاعة 101", type: "نصفي", groupId: group._id },
      { courseName: subjects[1].name, subject: subjects[1]._id, date: new Date(Date.now() + 86400000 * 7), time: "11:30 ص", location: "مختبر الذكاء", type: "عملي", groupId: group._id },
    ]);

    // 8. Create Announcements
    await Announcement.deleteMany({});
    await Announcement.create([
      { title: "بدء تسجيل المواد للفصل القادم", content: "يرجى العلم أن التسجيل يبدأ يوم الأحد القادم.", source: "شؤون الطلاب", targetAudience: "all" },
      { title: "تعديل في دورات الصيف", content: "تم إضافة دورة جديدة في تقنيات الحوسبة السحابية.", source: "إدارة الكلية", targetAudience: "students" },
    ]);

    console.log("Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
