const mongoose = require('mongoose');

async function check() {
  try {
    await mongoose.connect('mongodb://localhost:27017/eccat-one');
    const db = mongoose.connection.db;
    
    const doctorId = '69f8fa334af318e4dc824e55';
    const schedules = await db.collection('schedules').find({doctorId: new mongoose.Types.ObjectId(doctorId)}).toArray();
    const subjectIds = schedules.map(s => s.subjectId);
    
    console.log('Doctor Subject IDs:', subjectIds.map(id => id.toString()));
    
    const studentsWithSubjects = await db.collection('users').find({
      role: 'student', 
      enrolledSubjects: { $in: subjectIds }
    }).project({firstName: 1, enrolledSubjects: 1}).toArray();
    
    console.log('Students matching doctor subjects:', studentsWithSubjects.length);
    
    const studentsInGroups = await db.collection('users').find({
        role: 'student',
        groupId: { $in: schedules.map(s => s.groupId).filter(Boolean) }
    }).count();
    console.log('Students in doctor groups:', studentsInGroups);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
