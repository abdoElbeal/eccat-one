/**
 * Unified Admin Sidebar Patcher
 * Replaces the <aside class="sidebar">...</aside> in every admin HTML page
 * with a consistent, complete sidebar containing ALL nav links.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_DIR = path.join(__dirname, "../../Frontend/pages/admin");

// The single source of truth for the sidebar
// `ACTIVE` placeholder will be replaced with the correct page's active class
const buildSidebar = (activePage) => `  <aside class="sidebar">
    <a href="dashboard.html" class="sidebar-brand">
      <div class="sidebar-brand-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M12 3 2 8l10 5 10-5-10-5ZM2 15l10 5 10-5M2 10l10 5 10-5"/></svg></div>
      <div class="sidebar-brand-text"><strong>EccatOne</strong><span>الإدارة</span></div>
    </a>
    <nav class="sidebar-nav">
      <a href="dashboard.html"    class="nav-item${activePage==="dashboard"?" active":""}"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>لوحة التحكم</a>
      <a href="users.html"        class="nav-item${activePage==="users"?" active":""}"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>المستخدمين</a>
      <a href="departments.html"  class="nav-item${activePage==="departments"?" active":""}"><svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>الأقسام</a>
      <a href="courses.html"      class="nav-item${activePage==="courses"?" active":""}"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>المواد الدراسية</a>
      <a href="groups.html"       class="nav-item${activePage==="groups"?" active":""}"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>المجموعات</a>
      <a href="schedules.html"    class="nav-item${activePage==="schedules"?" active":""}"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>الجداول</a>
      <a href="grades.html"       class="nav-item${activePage==="grades"?" active":""}"><svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>الدرجات</a>
      <a href="reg-codes.html"    class="nav-item${activePage==="reg-codes"?" active":""}"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>أكواد التسجيل</a>
      <a href="announcements.html" class="nav-item${activePage==="announcements"?" active":""}"><svg viewBox="0 0 24 24"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>الإعلانات</a>
    </nav>
    <div class="sidebar-footer">
      <button class="nav-item logout" id="logoutBtn"><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>تسجيل الخروج</button>
    </div>
  </aside>`;

// Map filename → active key
const PAGE_MAP = {
  "dashboard.html":     "dashboard",
  "users.html":         "users",
  "departments.html":   "departments",
  "courses.html":       "courses",
  "groups.html":        "groups",
  "schedules.html":     "schedules",
  "grades.html":        "grades",
  "reg-codes.html":     "reg-codes",
  "announcements.html": "announcements",
};

let updated = 0;
for (const [filename, activeKey] of Object.entries(PAGE_MAP)) {
  const filePath = path.join(ADMIN_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipped (not found): ${filename}`);
    continue;
  }

  let html = fs.readFileSync(filePath, "utf-8");

  // Match <aside class="sidebar">...</aside> (multiline)
  const asideRegex = /<aside class="sidebar">[\s\S]*?<\/aside>/;
  if (!asideRegex.test(html)) {
    console.log(`⚠️  No <aside class="sidebar"> found in: ${filename}`);
    continue;
  }

  html = html.replace(asideRegex, buildSidebar(activeKey));
  fs.writeFileSync(filePath, html, "utf-8");
  console.log(`✅ Updated sidebar in: ${filename}`);
  updated++;
}

console.log(`\n🎉 Done! Updated ${updated} admin pages.`);
