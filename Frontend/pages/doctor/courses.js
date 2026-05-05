// ─── Doctor Courses JS ────────────────────────────────────────────────────────
const auth = PortalUtils.guard("doctor");
if (auth) init();

function init() {
  // Logout handled by PortalUtils
  PortalUtils.setupTopbar(auth.payload);

  const searchEl = document.getElementById("searchInput");
  if (searchEl) searchEl.addEventListener("input", e => filterCards(e.target.value));

  loadCourses();
}

// ─── Load Courses from API ────────────────────────────────────────────────────
async function loadCourses() {
  const grid = document.getElementById("coursesGrid");
  if (!grid) return;
  grid.innerHTML = skeletonCards(3);

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/courses`, {
      headers: PortalUtils.getAuthHeaders(),
    });

    if (!res.ok) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:60px;"><p>تعذّر تحميل المواد</p></div>`;
      return;
    }

    const data    = await res.json();
    const courses = data.courses || [];

    if (!courses.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:60px;">
        <p>لا توجد مواد مسندة لك في هذا الفصل</p></div>`;
      return;
    }

    // Summary counters
    const totalStudents = courses.reduce((s, c) => s + (c.studentCount || 0), 0);
    setText("totalCoursesCount",  courses.length);
    setText("totalStudentsCount", totalStudents);

    renderCourses(courses);
  } catch (err) {
    console.error("Courses error:", err);
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:60px;"><p>حدث خطأ أثناء التحميل</p></div>`;
  }
}

// ─── Render cards ─────────────────────────────────────────────────────────────
const ACCENTS   = ["#2463eb","#7c3aed","#16a34a","#ea580c","#0891b2","#d97706"];
const BADGE_CLS = ["badge-blue","badge-purple","badge-green","badge-orange","badge-blue","badge-orange"];
const FILL_CLS  = ["","purple","green","orange","","orange"];
const ICON_BG   = ["blue","purple","green","orange","blue","orange"];

function renderCourses(courses) {
  const grid = document.getElementById("coursesGrid");
  grid.innerHTML = courses.map((c, i) => {
    const accent    = ACCENTS[i % ACCENTS.length];
    const fillCls   = FILL_CLS[i % FILL_CLS.length];
    const bgCls     = ICON_BG[i % ICON_BG.length];
    const badgeCls  = BADGE_CLS[i % BADGE_CLS.length];
    const progress  = c.semesterProgress || 0;
    const passRate  = c.passRate || 0;

    return `
      <div class="course-card" data-name="${(c.name||"").toLowerCase()}" data-code="${(c.code||"").toLowerCase()}">
        <div class="cc-top">
          <div class="cc-icon ${bgCls}">
            <svg viewBox="0 0 24 24" fill="${accent}" width="22" height="22">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <span class="cc-code badge ${badgeCls}">${c.code}</span>
        </div>
        <h3 class="cc-name">${c.name}</h3>
        <p class="cc-desc">${c.description || ""}</p>
        <div class="cc-stats">
          <div class="ccs"><span class="ccs-value">${c.studentCount || 0}</span><span class="ccs-label">طالب</span></div>
          <div class="ccs"><span class="ccs-value">${c.creditHours || 3}</span><span class="ccs-label">ساعات</span></div>
          <div class="ccs"><span class="ccs-value">${passRate}%</span><span class="ccs-label">نجاح</span></div>
        </div>
        <div class="cc-progress-row">
          <span>إنجاز الفصل</span>
          <span style="color:${accent};font-weight:700;">${progress}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${fillCls}" style="width:${progress}%;"></div>
        </div>
        <div class="cc-actions">
          <a href="grades.html?course=${c.code}" class="btn btn-sm btn-primary">رصد الدرجات</a>
          <a href="students.html?course=${c.code}" class="btn btn-sm btn-ghost">الطلاب</a>
        </div>
        <div class="cc-accent" style="background:${accent};"></div>
      </div>`;
  }).join("");
}

// ─── Filter ───────────────────────────────────────────────────────────────────
function filterCards(q) {
  const ql = q.toLowerCase();
  document.querySelectorAll(".course-card").forEach(card => {
    const match = (card.dataset.name || "").includes(ql) || (card.dataset.code || "").includes(ql);
    card.style.display = match ? "" : "none";
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function skeletonCards(n) {
  return Array(n).fill(`
    <div class="course-card" style="animation:skeletonShimmer 1.5s infinite;">
      <div style="height:160px;background:#e2e8f0;border-radius:10px;"></div>
    </div>`).join("");
}
