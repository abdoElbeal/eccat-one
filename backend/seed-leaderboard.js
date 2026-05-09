import mongoose from "mongoose";
import User from "./models/User.js";
import Student from "./models/Student.js";
import Department from "./models/Department.js";
import Subject from "./models/Subject.js";
import Grade from "./models/Grade.js";

const NAMES = [
  "أحمد علي", "سارة خالد", "محمد عمر", "فاطمة حسن", "محمود إبراهيم",
  "يوسف طارق", "نورة عبدلله", "زينب محمد", "كريم سامي", "ليلى مصطفى",
  "عمر هشام", "مريم سعيد", "علي رضا", "هند سمير", "طارق فتحي",
  "نادية حسين", "ياسر كمال", "هالة مجدي", "رامي عادل", "دينا مراد",
  "وليد ماجد", "شروق أشرف", "حسن توفيق", "منى صبحي", "إسلام أمين"
];

async function seedLeaderboard() {
  try {
    await mongoose.connect("mongodb://localhost:27017/eccat-one");
    console.log("Connected to DB...");

    const departments = await Department.find({});
    let deptId = departments.length ? departments[0]._id : null;

    let studentsAdded = 0;

    for (let i = 0; i < 20; i++) {
      const nameParts = NAMES[i % NAMES.length].split(" ");
      const gpa = (2.5 + Math.random() * 1.5); // Random GPA between 2.5 and 4.0
      
      const newStudent = new Student({
        firstName: nameParts[0],
        lastName: nameParts[1],
        nationalId: Math.floor(Math.random() * 10000000000000).toString().padStart(14, '0'),
        email: `student${Date.now()}${i}@eccat.edu.eg`,
        password: "hashedPassword123", // Doesn't matter
        role: "student",
        department: deptId,
        yearLevel: 3,
        gpa: gpa,
        completedHours: Math.floor(60 + Math.random() * 60) // 60 to 120
      });

      await newStudent.save();
      studentsAdded++;
    }

    console.log(`Successfully seeded ${studentsAdded} mock students for the leaderboard.`);
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seedLeaderboard();
