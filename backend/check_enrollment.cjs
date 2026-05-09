const mongoose = require('mongoose');

async function check() {
  try {
    await mongoose.connect('mongodb://localhost:27017/eccat-one');
    const db = mongoose.connection.db;
    
    const students = await db.collection('users').find({ role: 'student' }).project({ firstName: 1, enrolledSubjects: 1, groupId: 1 }).limit(10).toArray();
    console.log('Sample Students Enrollment:', JSON.stringify(students, null, 2));

    const subjects = await db.collection('subjects').find({}).project({ name: 1, code: 1 }).toArray();
    console.log('All Subjects:', JSON.stringify(subjects, null, 2));

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
