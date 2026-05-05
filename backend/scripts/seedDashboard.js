import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Doctor from '../models/Doctor.js';
import Admin from '../models/Admin.js';
import Activity from '../models/Activity.js';
import Department from '../models/Department.js';
import Subject from '../models/Subject.js';
import Group from '../models/Group.js';
import Schedule from '../models/Schedule.js';
import Exam from '../models/Exam.js';
import Grade from '../models/Grade.js';

const MONGO_URI = 'mongodb://localhost:27017/eccat-one';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clear
  await Promise.all([
    User.deleteMany({}), Activity.deleteMany({}), Department.deleteMany({}),
    Subject.deleteMany({}), Group.deleteMany({}), Schedule.deleteMany({}),
    Exam.deleteMany({}), Grade.deleteMany({})
  ]);

  const pass = await bcrypt.hash('Welcome@123', 10);

  // ── Departments
  const cs = await Department.create({ name: 'علوم الحاسب', code: 'CS' });
  const is = await Department.create({ name: 'نظم المعلومات', code: 'IS' });

  // ── Group
  const grp = await Group.create({ name: 'Group A - CS', code: 'CS-G-A', yearLevel: 2, department: cs._id, capacity: 50 });

  // ── Admin & Doctor
  const admin = await Admin.create({ firstName: 'أدمن', lastName: 'الكلية', email: 'admin@college.edu', password: pass, nationalId: '10000000000001', role: 'admin', isVerified: true });
  const doctor = await Doctor.create({ firstName: 'منير', lastName: 'علي', email: 'dr.monir@college.edu', password: pass, nationalId: '20000000000001', role: 'doctor', department: cs._id, isVerified: true });

  // ── Student
  const ahmed = await Student.create({
    firstName: 'أحمد', lastName: 'محمد', email: 'ahmed@student.edu', password: pass,
    nationalId: '30000000000001', role: 'student', department: cs._id,
    groupId: grp._id, yearLevel: 2, isVerified: true, gpa: 3.4
  });

  // ── Subjects (current + historical)
  // Current semester subjects (2025/2026 - S2)
  const curSub1 = await Subject.create({ name: 'هندسة البرمجيات', code: 'CS201', department: cs._id, yearLevel: 2, semester: 2, academicYear: '2025/2026', assignedDoctor: doctor._id });
  const curSub2 = await Subject.create({ name: 'قواعد البيانات', code: 'CS202', department: cs._id, yearLevel: 2, semester: 2, academicYear: '2025/2026', assignedDoctor: doctor._id });
  const curSub3 = await Subject.create({ name: 'شبكات الحاسوب', code: 'CS203', department: cs._id, yearLevel: 2, semester: 2, academicYear: '2025/2026', assignedDoctor: doctor._id });

  // Historical subjects
  const hist1 = await Subject.create({ name: 'مقدمة في البرمجة', code: 'CS101', department: cs._id, yearLevel: 1, semester: 1, academicYear: '2022/2023' });
  const hist2 = await Subject.create({ name: 'رياضيات مستخدمات', code: 'CS102', department: cs._id, yearLevel: 1, semester: 1, academicYear: '2022/2023' });
  const hist3 = await Subject.create({ name: 'برمجة كائنية', code: 'CS103', department: cs._id, yearLevel: 1, semester: 2, academicYear: '2022/2023' });
  const hist4 = await Subject.create({ name: 'هياكل البيانات', code: 'CS200', department: cs._id, yearLevel: 2, semester: 1, academicYear: '2023/2024' });
  const hist5 = await Subject.create({ name: 'أنظمة التشغيل', code: 'CS204', department: cs._id, yearLevel: 2, semester: 1, academicYear: '2023/2024' });
  const hist6 = await Subject.create({ name: 'ذكاء اصطناعي', code: 'CS300', department: cs._id, yearLevel: 3, semester: 1, academicYear: '2024/2025' });
  const hist7 = await Subject.create({ name: 'معالجة اللغات', code: 'CS301', department: cs._id, yearLevel: 3, semester: 1, academicYear: '2024/2025' });
  const hist8 = await Subject.create({ name: 'أمن المعلومات', code: 'CS302', department: cs._id, yearLevel: 3, semester: 2, academicYear: '2024/2025' });

  // ── Schedule (current semester)
  await Schedule.create([
    { subjectId: curSub1._id, doctorId: doctor._id, groupId: grp._id, dayOfWeek: 'Monday',    startTime: '09:00', endTime: '11:00', room: 'Lab 1' },
    { subjectId: curSub2._id, doctorId: doctor._id, groupId: grp._id, dayOfWeek: 'Wednesday', startTime: '11:00', endTime: '13:00', room: 'Hall B' },
    { subjectId: curSub3._id, doctorId: doctor._id, groupId: grp._id, dayOfWeek: 'Thursday',  startTime: '09:00', endTime: '11:00', room: 'Hall A' },
  ]);

  // ── Exams (upcoming)
  await Exam.create([
    { courseName: 'هندسة البرمجيات', subject: curSub1._id, groupId: grp._id, type: 'ميدتيرم',   date: new Date(Date.now() + 7  * 86400000), time: '10:00 AM', location: 'المدرج الكبير' },
    { courseName: 'قواعد البيانات',  subject: curSub2._id, groupId: grp._id, type: 'كويز',       date: new Date(Date.now() + 3  * 86400000), time: '09:00 AM', location: 'معمل 1' },
    { courseName: 'شبكات الحاسوب',   subject: curSub3._id, groupId: grp._id, type: 'اختبار نهائي', date: new Date(Date.now() + 21 * 86400000), time: '12:00 PM', location: 'قاعة 302' },
  ]);

  // ── Grades (historical per year)
  await Grade.create([
    // 2022/2023 - Semester 1
    { student: ahmed._id, subject: hist1._id, activities: 18, midTerm: 27, final: 45, status: 'passed', semester: '1', academicYear: '2022/2023' },
    { student: ahmed._id, subject: hist2._id, activities: 15, midTerm: 22, final: 38, status: 'passed', semester: '1', academicYear: '2022/2023' },
    // 2022/2023 - Semester 2
    { student: ahmed._id, subject: hist3._id, activities: 20, midTerm: 28, final: 46, status: 'passed', semester: '2', academicYear: '2022/2023' },
    // 2023/2024 - Semester 1
    { student: ahmed._id, subject: hist4._id, activities: 17, midTerm: 25, final: 42, status: 'passed', semester: '1', academicYear: '2023/2024' },
    { student: ahmed._id, subject: hist5._id, activities: 12, midTerm: 18, final: 28, status: 'failed', semester: '1', academicYear: '2023/2024' },
    // 2024/2025 - Semester 1
    { student: ahmed._id, subject: hist6._id, activities: 19, midTerm: 26, final: 44, status: 'passed', semester: '1', academicYear: '2024/2025' },
    { student: ahmed._id, subject: hist7._id, activities: 14, midTerm: 20, final: 35, status: 'passed', semester: '1', academicYear: '2024/2025' },
    // 2024/2025 - Semester 2
    { student: ahmed._id, subject: hist8._id, activities: 16, midTerm: 24, final: 40, status: 'passed', semester: '2', academicYear: '2024/2025' },
    // 2025/2026 - Semester 2 (current — in progress)
    { student: ahmed._id, subject: curSub1._id, activities: 15, midTerm: 0, final: 0, status: 'incomplete', semester: '2', academicYear: '2025/2026' },
    { student: ahmed._id, subject: curSub2._id, activities: 10, midTerm: 0, final: 0, status: 'incomplete', semester: '2', academicYear: '2025/2026' },
    { student: ahmed._id, subject: curSub3._id, activities: 12, midTerm: 0, final: 0, status: 'incomplete', semester: '2', academicYear: '2025/2026' },
  ]);

  // ── Activities
  const now = new Date();
  await Activity.create([
    { user: admin._id,  action: 'توليد أكواد تسجيل', details: 'تم توليد 50 كود للدفعة 2024', type: 'blue',   createdAt: new Date(now - 45*60000) },
    { user: doctor._id, action: 'تحديث الجدول',       details: 'تعديل موعد محاضرة هندسة البرمجيات', type: 'purple', createdAt: new Date(now - 2*3600000) },
    { user: ahmed._id,  action: 'تسجيل دخول جديد',   details: 'تسجيل دخول أحمد محمد من جهاز جديد', type: 'green',  createdAt: new Date(now - 5*3600000) },
  ]);

  console.log('\n🎉 Seeding complete!');
  console.log('─────────────────────────────────────');
  console.log('👤 Student:  ahmed@student.edu / Welcome@123');
  console.log('🔑 Admin:    admin@college.edu / Welcome@123');
  console.log('📚 Subjects: 3 current + 8 historical across 2022-2025');
  console.log('📊 Grades:   11 grade records for ahmed across 4 years');
  console.log('─────────────────────────────────────\n');
  process.exit(0);
}

seed().catch(err => { console.error('❌ Seed error:', err); process.exit(1); });
