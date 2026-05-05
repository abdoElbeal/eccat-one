const fs = require('fs/promises');
const path = require('path');

const adminPagesDir = path.join(__dirname, '../Frontend/pages/admin');

const newNavLinks = `
      <a href="dashboard.html"    class="nav-item"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>لوحة التحكم</a>
      <a href="users.html"        class="nav-item"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>المستخدمين</a>
      <a href="departments.html"  class="nav-item"><svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>الأقسام</a>
      <a href="courses.html"      class="nav-item"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>المواد الدراسية</a>
      <a href="support.html"      class="nav-item"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>رسائل الدعم</a>
      <a href="groups.html"       class="nav-item"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>المجموعات</a>
      <a href="schedules.html"    class="nav-item"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>الجداول</a>
      <a href="grades.html"       class="nav-item"><svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>الدرجات</a>
      <a href="reg-codes.html"    class="nav-item"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>أكواد التسجيل</a>
      <a href="announcements.html" class="nav-item"><svg viewBox="0 0 24 24"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>الإعلانات</a>
`;

async function fixSidebar() {
  const files = await fs.readdir(adminPagesDir);
  for (const file of files) {
    if (file.endsWith('.html') && file !== 'admin-login.html') {
      let content = await fs.readFile(path.join(adminPagesDir, file), 'utf8');
      
      // Update nav links
      content = content.replace(/<nav class="sidebar-nav">[\s\S]*?<\/nav>/, "<nav class=\"sidebar-nav\">\n" + newNavLinks + "    </nav>");
      
      // Active link
      const pageName = file.replace('.html', '');
      content = content.replace(
        new RegExp('href="' + pageName + '.html"\\s+class="nav-item"'),
        'href="' + pageName + '.html"    class="nav-item active"'
      );
      if (pageName === 'dashboard') {
        content = content.replace(
          /href="dashboard\.html"\s+class="nav-item"/g,
          'href="dashboard.html"    class="nav-item active"'
        );
      }

      await fs.writeFile(path.join(adminPagesDir, file), content, 'utf8');
      console.log('Fixed', file);
    }
  }
}

fixSidebar();
