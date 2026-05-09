const mongoose = require('mongoose');

async function seed() {
  try {
    await mongoose.connect('mongodb://localhost:27017/eccat-one');
    const db = mongoose.connection.db;
    
    const doctorId = '69f8fa334af318e4dc824e55';
    const groupId = '69f8fa334af318e4dc824e53';
    const subjectIds = [
      new mongoose.Types.ObjectId('69f8fa334af318e4dc824e57'), // CS201
      new mongoose.Types.ObjectId('69f8fa334af318e4dc824e58'), // CS202
      new mongoose.Types.ObjectId('69f8fa334af318e4dc824e59')  // CS203
    ];

    console.log('Seeding data for Doctor:', doctorId);

    // 1. Assign all students to this group and enroll them in these subjects
    const result = await db.collection('users').updateMany(
      { role: 'student' },
      { 
        $set: { 
          groupId: new mongoose.Types.ObjectId(groupId),
          enrolledSubjects: subjectIds
        } 
      }
    );
    console.log(`Updated ${result.modifiedCount} students with group and subjects.`);

    // 2. Create some sample grades if they don't exist
    const students = await db.collection('users').find({ role: 'student' }).toArray();
    let gradeCount = 0;

    for (const student of students) {
      for (const subjectId of subjectIds) {
        // Check if grade already exists
        const exists = await db.collection('grades').findOne({ 
          student: student._id, 
          subject: subjectId 
        });

        if (!exists) {
          await db.collection('grades').insertOne({
            student: student._id,
            subject: subjectId,
            activities: Math.floor(Math.random() * 20),
            midTerm: Math.floor(Math.random() * 30),
            final: Math.floor(Math.random() * 50),
            total: 0, // Will be calculated by pre-save usually, but we'll set it here for simplicity
            status: 'passed',
            semester: 'fall2024',
            academicYear: '2025/2026',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          gradeCount++;
        }
      }
    }
    console.log(`Created ${gradeCount} sample grades.`);

    // Update totals for grades
    await db.collection('grades').find({ total: 0 }).forEach(async (g) => {
        const total = (g.activities || 0) + (g.midTerm || 0) + (g.final || 0);
        await db.collection('grades').updateOne({ _id: g._id }, { $set: { total: total } });
    });

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

seed();
