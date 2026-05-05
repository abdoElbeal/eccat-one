// ─── Student Courses JS ─────────────────────────────────────────────────────
const auth = PortalUtils.guard("student");
if (auth) init();

// State
let allCourses = [];
let activeYear = "";
let activeSemester = "";

function init() {
  PortalUtils.setupTopbar(auth.payload);
  bindFilters();
  loadCourses(); // Load current semester by default
}

// ─── Filter Binding ──────────────────────────────────────────────────────────
function bindFilters() {
  document.getElementById("yearFilter")?.addEventListener("change", (e) => {
    activeYear = e.target.value;
    loadCourses(activeSemester, activeYear);
  });

  document.getElementById("semesterFilter")?.addEventListener("change", (e) => {
    activeSemester = e.target.value;
    loadCourses(activeSemester, activeYear);
  });

  document.getElementById("resetFilters")?.addEventListener("click", () => {
    activeYear = "";
    activeSemester = "";
    document.getElementById("yearFilter").value = "";
    document.getElementById("semesterFilter").value = "";
    loadCourses();
  });
}

// ─── Load Courses ─────────────────────────────────────────────────────────────
async function loadCourses(semester = "", academicYear = "") {
  const grid = document.getElementById("coursesGrid");
  const summary = document.getElementById("coursesSummary");
  if (!grid) return;

  // Show skeletons
  grid.innerHTML = Array(4).fill(`<div class="skeleton-card"></div>`).join("");
  if (summary) summary.style.display = "none";

  // Update subtitle
  const subtitle = document.getElementById("headerSubtitle");
  if (subtitle) {
    if (semester || academicYear) {
      const semLabel = semester === "1" ? "الفصل الأول" : semester === "2" ? "الفصل الثاني" : "";
      subtitle.textContent = `سجلك الأكاديمي ${semLabel ? semLabel + " · " : ""}${academicYear || ""}`.trim();
    } else {
      subtitle.textContent = "الفصل الدراسي الحالي";
    }
  }

  try {
    let url = `${window.CONFIG.API_BASE_URL}/api/student/courses`;
    const params = [];
    if (semester)     params.push(`semester=${encodeURIComponent(semester)}`);
    if (academicYear) params.push(`academicYear=${encodeURIComponent(academicYear)}`);
    if (params.length) url += `?${params.join("&")}`;

    const res = await fetch(url, { headers: PortalUtils.getAuthHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    allCourses = data.courses || [];

    renderCourses(allCourses, !!(semester || academicYear));
    renderSummary(allCourses);

  } catch (err) {
    console.error("Courses load error:", err);
    grid.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>تعذر تحميل المقررات</p>
        <small>تأكد من اتصالك بالإنترنت وحاول مجدداً</small>
      </div>`;
  }
}

// ─── Render Courses ──────────────────────────────────────────────────────────
const PALETTES = [
  { accent: "#2463eb", bg: "#eff6ff", text: "#2463eb", badge: "badge-blue",   fill: "" },
  { accent: "#7c3aed", bg: "#f5f3ff", text: "#7c3aed", badge: "badge-purple", fill: "purple" },
  { accent: "#ea580c", bg: "#fff7ed", text: "#ea580c", badge: "badge-orange", fill: "orange" },
  { accent: "#16a34a", bg: "#f0fdf4", text: "#16a34a", badge: "badge-green",  fill: "green" },
  { accent: "#0891b2", bg: "#ecfeff", text: "#0891b2", badge: "badge-blue",   fill: "" },
];

function renderCourses(courses, isHistory) {
  const grid = document.getElementById("coursesGrid");

  if (!courses.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
        <p>${isHistory ? "لا توجد مقررات مسجّلة لهذه الفترة" : "لا توجد مقررات للفصل الحالي"}</p>
        <small>${isHistory ? "جرّب تغيير السنة أو الفصل" : "تواصل مع الإدارة لتسجيلك في مجموعة"}</small>
      </div>`;
    return;
  }

  grid.innerHTML = courses.map((c, i) => {
    const p = PALETTES[i % PALETTES.length];
    const progress = c.progress || 0;
    const statusText = c.status === "passed" ? "ناجح" : c.status === "failed" ? "راسب" : "جارٍ";
    const statusBadge = c.status === "passed" ? "badge-green" : c.status === "failed" ? "badge-red" : "badge-gray";
    const progressLabel = isHistory ? "الإنجاز النهائي" : "تقدم المادة";

    return `
      <div class="course-card" style="--cc-accent:${p.accent}" onclick="openCourseModal(${i})">
        <div class="cc-left-accent" style="background:${p.accent}; right:auto; left:0; border-radius:0 18px 18px 0;"></div>
        <div class="cc-header">
          <div class="cc-avatar" style="background:${p.bg}; color:${p.text};">${(c.name || "م").slice(0,1)}</div>
          <div class="cc-badges">
            <span class="badge ${p.badge}">${c.code || "—"}</span>
            <span class="badge ${statusBadge}">${statusText}</span>
          </div>
        </div>
        <h3 class="cc-name">${c.name}</h3>
        <p class="cc-instructor">${c.instructor && c.instructor !== "—" ? c.instructor : "—"}</p>
        <div class="cc-meta">
          <span>📍 ${c.location && c.location !== "—" ? c.location : "غير محدد"}</span>
          <span>🕒 3 ساعات معتمدة</span>
        </div>
        <div class="cc-progress-row">
          <span class="cc-progress-label">${progressLabel}</span>
          <span class="cc-pct" style="color:${p.accent}">${progress}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${p.fill}" style="width:${progress}%; ${!p.fill ? `background:${p.accent}` : ''}"></div>
        </div>
      </div>`;
  }).join("");
}

// ─── Summary Bar ─────────────────────────────────────────────────────────────
function renderSummary(courses) {
  const bar = document.getElementById("coursesSummary");
  if (!bar || !courses.length) return;

  const passed    = courses.filter(c => c.status === "passed").length;
  const failed    = courses.filter(c => c.status === "failed").length;
  const inprogess = courses.filter(c => c.status === "incomplete" || c.status === "inprogress").length;
  const avgProgress = courses.length
    ? Math.round(courses.reduce((s, c) => s + (c.progress || 0), 0) / courses.length)
    : 0;

  document.getElementById("sumTotal").textContent      = courses.length;
  document.getElementById("sumPassed").textContent     = passed;
  document.getElementById("sumFailed").textContent     = failed;
  document.getElementById("sumInProgress").textContent = inprogess;
  document.getElementById("sumAvg").textContent        = `${avgProgress}%`;

  bar.style.display = "flex";
}

function openCourseModal(idx) {
  const course = allCourses[idx];
  if (!course) return;

  document.getElementById("mCourseName").textContent = course.name;
  document.getElementById("mCourseCode").textContent = course.code || "";

  const hasGrade = course.activities !== null || course.midTerm !== null || course.final !== null;
  const total    = course.total ?? ((course.activities||0) + (course.midTerm||0) + (course.final||0));
  const letter   = course.letterGrade && course.letterGrade !== "—" ? course.letterGrade : getLetterGrade(total);
  const lgClass  = { A:"lg-A", B:"lg-B", C:"lg-C", D:"lg-D", F:"lg-F" }[letter] || "lg-F";

  const statusText  = course.status === "passed" ? "ناجح" : course.status === "failed" ? "راسب" : "جارٍ";
  const statusColor = course.status === "passed" ? "#22c55e" : course.status === "failed" ? "#ef4444" : "#f59e0b";

  document.getElementById("mCourseBody").innerHTML = `
    <!-- Info Row -->
    <div class="grid-2" style="  gap:12px; margin-bottom:20px;">
      <div class="score-box">
        <div class="score-box-label">المحاضر</div>
        <div style="font-size:1.3rem; font-weight:700; color:#0f172a; margin-top:4px;">
          ${course.instructor && course.instructor !== "—" ? course.instructor : "غير محدد"}
        </div>
      </div>
      <div class="score-box">
        <div class="score-box-label">الحالة</div>
        <div style="margin-top:6px;">
          <span style="display:inline-flex; align-items:center; gap:6px; background:${statusColor}18; color:${statusColor}; padding:4px 14px; border-radius:20px; font-weight:700; font-size:1.3rem;">
            ${course.status === "passed" ? "✓" : course.status === "failed" ? "✗" : "◷"} ${statusText}
          </span>
        </div>
      </div>
    </div>

    ${hasGrade ? `
    <!-- Grade Breakdown -->
    <div style="background:#f8fafc; border-radius:14px; padding:18px; margin-bottom:20px; border:1px solid #e2e8f0;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <h4 style="font-size:1.4rem; font-weight:700; color:#1e293b;">📊 تفاصيل الدرجات</h4>
        <div style="width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.5rem; font-weight:800; background:${letter === 'A' ? '#dcfce7' : letter === 'B' ? '#dbeafe' : letter === 'C' ? '#fef9c3' : '#fee2e2'}; color:${letter === 'A' ? '#15803d' : letter === 'B' ? '#1d4ed8' : letter === 'C' ? '#a16207' : '#b91c1c'};">${letter}</div>
      </div>

      <!-- 3 Score Bars -->
      ${[
        { label: "أعمال الفصل", val: course.activities, max: 20, color: "#7c3aed" },
        { label: "الميدتيرم",   val: course.midTerm,    max: 30, color: "#2463eb" },
        { label: "النهائي",     val: course.final,      max: 50, color: "#0891b2" },
      ].map(s => {
        const pct = s.val !== null ? Math.round((s.val / s.max) * 100) : null;
        return `
          <div style="margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
              <span style="font-size:1.25rem; color:#64748b; font-weight:600;">${s.label}</span>
              <span style="font-size:1.25rem; font-weight:700; color:#1e293b;">
                ${s.val !== null ? `${s.val} / ${s.max}` : "لم يُرصد"}
              </span>
            </div>
            <div style="height:7px; background:#e2e8f0; border-radius:10px; overflow:hidden;">
              <div style="height:100%; width:${pct ?? 0}%; background:${s.color}; border-radius:10px; transition:width 0.8s ease;"></div>
            </div>
          </div>`;
      }).join("")}

      <!-- Total -->
      <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border-radius:10px; padding:12px 16px; margin-top:6px; border:1px solid #e2e8f0;">
        <span style="font-size:1.3rem; font-weight:700; color:#475569;">المجموع الكلي</span>
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="height:8px; width:120px; background:#e2e8f0; border-radius:10px; overflow:hidden;">
            <div style="height:100%; width:${total}%; background:${total >= 60 ? '#22c55e' : '#ef4444'}; border-radius:10px;"></div>
          </div>
          <span style="font-size:1.8rem; font-weight:800; color:${total >= 60 ? '#22c55e' : '#ef4444'};">${total}</span>
          <span style="color:#94a3b8; font-size:1.2rem;">/ 100</span>
        </div>
      </div>
    </div>` : `
    <!-- No Grade Yet -->
    <div style="background:#f8fafc; border-radius:14px; padding:24px; margin-bottom:20px; border:2px dashed #e2e8f0; text-align:center;">
      <svg viewBox="0 0 24 24" style="width:32px;height:32px;stroke:#cbd5e1;margin-bottom:8px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <p style="color:#94a3b8; font-size:1.3rem;">لم يتم رصد الدرجات لهذه المادة بعد</p>
    </div>`}

    <!-- Exams -->
    <div>
      <h4 style="font-size:1.4rem; font-weight:700; color:#1e293b; margin-bottom:12px;">📅 الاختبارات القادمة</h4>
      <div id="courseExamsList">
        <div class="skeleton-card" style="height:50px; border-radius:10px;"></div>
      </div>
    </div>
  `;

  document.getElementById("courseModal").style.display = "flex";
  fetchCourseExams(course._id);
}

function getLetterGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

async function fetchCourseExams(subjectId) {
  const list = document.getElementById("courseExamsList");
  if (!list) return;
  try {
    const res = await fetch(
      `${window.CONFIG.API_BASE_URL}/api/student/exams/upcoming?subjectId=${subjectId}`,
      { headers: PortalUtils.getAuthHeaders() }
    );
    const d = await res.json();
    const exams = d.exams || [];

    if (!exams.length) {
      list.innerHTML = `<p style="font-size:1.3rem; color:#94a3b8; text-align:center; padding:16px; background:#f8fafc; border-radius:10px;">لا توجد اختبارات مجدولة حالياً</p>`;
      return;
    }

    list.innerHTML = exams.map(e => `
      <div class="exam-item">
        <div class="exam-item-info">
          <h4>${e.type}</h4>
          <p>${new Date(e.date).toLocaleDateString("ar-EG", { weekday:"long", year:"numeric", month:"long", day:"numeric" })} · ${e.time}</p>
        </div>
        <span class="badge badge-blue">🏛 ${e.location}</span>
      </div>`).join("");
  } catch {
    list.innerHTML = `<p style="color:#ef4444; font-size:1.2rem;">خطأ في تحميل الاختبارات</p>`;
  }
}

function closeCourseModal() {
  document.getElementById("courseModal").style.display = "none";
}

function handleModalOverlayClick(e) {
  if (e.target === document.getElementById("courseModal")) closeCourseModal();
}



