const fs = require('fs/promises');
const path = require('path');

const userPagesDir = path.join(__dirname, '../Frontend/pages/user');

const newNavLinks = `
          <a href="dashboard.html" class="nav-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>لوحة القيادة</a>
          <a href="courses.html" class="nav-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>كورساتي</a>
          <a href="schedule.html" class="nav-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>الجدول الزمني</a>
          <a href="grades.html" class="nav-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>الدرجات</a>
          <a href="announcements.html" class="nav-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>الإعلانات</a>
          <a href="leaderboard.html" class="nav-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>لوحة المتصدرين</a>
          <a href="messages.html" class="nav-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>الرسائل</a>
          <a href="support.html" class="nav-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>الدعم الفني</a>
`;

const newFooter = `
          <button class="support-btn" id="supportBtn">الدعم الفني</button>
          <a href="../shared/profile.html" class="nav-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>الإعدادات</a>
          <button class="nav-item logout" id="logoutBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>تسجيل الخروج</button>
`;

async function fixSidebar() {
  const files = await fs.readdir(userPagesDir);
  for (const file of files) {
    if (file.endsWith('.html')) {
      let content = await fs.readFile(path.join(userPagesDir, file), 'utf8');
      
      // Update nav links
      content = content.replace(/<nav class="sidebar-nav">[\s\S]*?<\/nav>/, "<nav class=\"sidebar-nav\">\n" + newNavLinks + "        </nav>");
      
      // Update footer
      content = content.replace(/<div class="sidebar-footer">[\s\S]*?<\/div>\s*<\/aside>/, "<div class=\"sidebar-footer\">\n" + newFooter + "        </div>\n      </aside>");

      // Active link
      const pageName = file.replace('.html', '');
      content = content.replace(
        new RegExp('href="' + pageName + '.html" class="nav-item"'),
        'href="' + pageName + '.html" class="nav-item active"'
      );
      if (pageName === 'dashboard') {
        content = content.replace(
          /href="dashboard\.html" class="nav-item"/g,
          'href="dashboard.html" class="nav-item active"'
        );
      }

      await fs.writeFile(path.join(userPagesDir, file), content, 'utf8');
      console.log('Fixed', file);
    }
  }
}

fixSidebar();
