const fs = require('fs');
const files = [
  './Frontend/pages/admin/courses.html',
  './Frontend/pages/admin/departments.html',
  './Frontend/pages/admin/reg-codes.html',
  './Frontend/pages/admin/users.html',
  './Frontend/pages/doctor/courses.html',
  './Frontend/pages/doctor/dashboard.html',
  './Frontend/pages/doctor/students.html',
  './Frontend/pages/user/courses.js'
];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/class="stat-grid"\s*class="grid-4"/g, 'class="stat-grid grid-4"');
  content = content.replace(/class="stat-grid"\s*class="grid-3"/g, 'class="stat-grid grid-3"');
  content = content.replace(/class="stat-grid"\s*class="grid-2"/g, 'class="stat-grid grid-2"');
  content = content.replace(/class="grid-4"\s*style="display:\s*grid;/g, 'class="grid-4" style="');
  content = content.replace(/class="grid-3"\s*style="display:\s*grid;/g, 'class="grid-3" style="');
  content = content.replace(/class="grid-2"\s*style="display:\s*grid;/g, 'class="grid-2" style="');
  fs.writeFileSync(file, content, 'utf8');
});
console.log('Fixed classes');
