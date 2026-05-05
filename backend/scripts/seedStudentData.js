import mongoose from "mongoose";
import dotenv from "dotenv";
import Department from "../models/Department.js";
import Group from "../models/Group.js";
import Subject from "../models/Subject.js";
import Schedule from "../models/Schedule.js";
import Student from "../models/Student.js";
import Grade from "../models/Grade.js";
import Doctor from "../models/Doctor.js";

dotenv.config();

const MONGO_URI = process.env.DB || "mongodb://localhost:27017/eccat-one";

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    // 1. Create a Department
    let dept = await Department.findOne({ name: "Computer Science" });
    if (!dept) {
      dept = await Department.create({
        name: "Computer Science",
        code: "CS",
        description: "قسم علوم الحاسب",
      });
      console.log("Created Department: CS");
    }

    // 2. Create a Doctor (Instructor)
    let doctor = await Doctor.findOne({ email: "dr.khaled@example.com" });
    if (!doctor) {
      doctor = await Doctor.create({
        firstName: "خالد",
        lastName: "العتيبي",
        email: "dr.khaled@example.com",
        password: "hashed_password_here",
        nationalId: "12345678901234",
        role: "doctor",
        department: dept._id,
      });
      console.log("Created Doctor: Dr. Khaled");
    }

    // 3. Create a Group
    let group = await Group.findOne({ name: "Group A - Year 1" });
    if (!group) {
      group = await Group.create({
        name: "Group A - Year 1",
        code: "G1-A",
        department: dept._id,
        yearLevel: 1,
      });
      console.log("Created Group: G1-A");
    }

    // 4. Create Subjects
    const subjectData = [
      { name: "General Physics", code: "PHYS101", description: "مبادئ الفيزياء العامة", department: dept._id },
      { name: "Calculus II", code: "MATH201", description: "حساب التفاضل والتكامل 2", department: dept._id },
      { name: "Data Structures", code: "CS302", description: "تراكيب البيانات", department: dept._id },
    ];

    const subjects = [];
    for (const sub of subjectData) {
      let s = await Subject.findOne({ code: sub.code });
      if (!s) {
        s = await Subject.create(sub);
        console.log(`Created Subject: ${sub.name}`);
      }
      subjects.push(s);
    }

    // 5. Create Schedule
    const scheduleData = [
      { day: "Sunday", start: "09:00", end: "11:00", room: "Hall 402", subject: subjects[0], color: "#ea580c" },
      { day: "Monday", start: "11:30", end: "13:30", room: "Math Building", subject: subjects[1], color: "#7c3aed" },
      { day: "Tuesday", start: "10:00", end: "12:00", room: "Lab 1", subject: subjects[2], color: "#2463eb" },
    ];

    for (const item of scheduleData) {
      const exists = await Schedule.findOne({
        groupId: group._id,
        dayOfWeek: item.day,
        startTime: item.start,
      });
      if (!exists) {
        await Schedule.create({
          groupId: group._id,
          subjectId: item.subject._id,
          doctorId: doctor._id,
          dayOfWeek: item.day,
          startTime: item.start,
          endTime: item.end,
          room: item.room,
          colorClass: item.color,
        });
        console.log(`Added schedule for ${item.subject.name} on ${item.day}`);
      }
    }

    // 6. Update existing students to this group/dept if they have none
    const updated = await Student.updateMany(
      { role: "student", $or: [{ groupId: { $exists: false } }, { groupId: null }] },
      { $set: { groupId: group._id, department: dept._id, yearLevel: 1, gpa: 3.85 } }
    );
    console.log(`Updated ${updated.modifiedCount} students with default group and stats.`);

    // 7. Add Grades for all students in this group
    const students = await Student.find({ groupId: group._id });
    for (const student of students) {
      for (const subject of subjects) {
        const gradeExists = await Grade.findOne({ student: student._id, subject: subject._id });
        if (!gradeExists) {
          await Grade.create({
            student: student._id,
            subject: subject._id,
            activities: 18,
            midTerm: 27,
            final: 45,
            total: 90,
            letterGrade: "A",
            status: "passed",
            semester: "Fall 2024",
            academicYear: "2024/2025",
          });
        }
      }
    }
    console.log(`Seeded grades for ${students.length} students.`);

    console.log("Seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
