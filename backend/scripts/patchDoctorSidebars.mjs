import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCTOR_DIR = path.join(__dirname, "../../Frontend/pages/doctor");

const buildSidebar = (activePage) => `  <aside class="sidebar">
    <a href="dashboard.html" class="sidebar-brand">
      <div class="sidebar-brand-icon"><svg viewBox="0 0 24 24"><path d="M12 3 2 8l10 5 10-5-10-5ZM2 15l10 5 10-5M2 10l10 5 10-5"/></svg></div>
      <div class="sidebar-brand-text"><strong>بوابة الدكتور</strong><span>جامعة التميز</span></div>
    </a>
    <nav class="sidebar-nav">
      <a href="dashboard.html"     class="nav-item${activePage==="dashboard"?" active":""}"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>لوحة القيادة</a>
      <a href="courses.html"       class="nav-item${activePage==="courses"?" active":""}"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>موادي</a>
      <a href="students.html"      class="nav-item${activePage==="students"?" active":""}"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>طلابي</a>
      <a href="grades.html"        class="nav-item${activePage==="grades"?" active":""}"><svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>الدرجات</a>
      <a href="attendance.html"    class="nav-item${activePage==="attendance"?" active":""}"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>الحضور الذكي</a>
      <a href="schedule.html"      class="nav-item${activePage==="schedule"?" active":""}"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>الجدول</a>
      <a href="announcements.html" class="nav-item${activePage==="announcements"?" active":""}"><svg viewBox="0 0 24 24"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>الإعلانات</a>
      <a href="messages.html"      class="nav-item${activePage==="messages"?" active":""}"><svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>الرسائل</a>
    </nav>
    <div class="sidebar-footer">
      <button class="support-btn">الدعم الفني</button>
      <a href="../shared/profile.html" class="nav-item"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>الإعدادات</a>
      <button class="nav-item logout" id="logoutBtn"><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>تسجيل الخروج</button>
    </div>
  </aside>`;

const PAGE_MAP = {
  "dashboard.html":     "dashboard",
  "courses.html":       "courses",
  "students.html":      "students",
  "grades.html":        "grades",
  "attendance.html":    "attendance",
  "schedule.html":      "schedule",
  "announcements.html": "announcements",
  "messages.html":      "messages",
};

let updated = 0;
for (const [filename, activeKey] of Object.entries(PAGE_MAP)) {
  const filePath = path.join(DOCTOR_DIR, filename);
  if (!fs.existsSync(filePath)) continue;

  let html = fs.readFileSync(filePath, "utf-8");
  const asideRegex = /<aside class="sidebar">[\s\S]*?<\/aside>/;
  if (!asideRegex.test(html)) continue;

  html = html.replace(asideRegex, buildSidebar(activeKey));
  fs.writeFileSync(filePath, html, "utf-8");
  updated++;
}
console.log(`Updated ${updated} doctor pages.`);
