// ─── Doctor Dashboard JS ──────────────────────────────────────────────────────
const auth = PortalUtils.guard("doctor");
if (auth) init();

function init() {
  PortalUtils.setupTopbar(auth.payload);

  const p    = auth.payload;
  const name = p.firstName ? `${p.firstName} ${p.lastName}`.trim() : (p.name || "دكتور");
  const nameEl = document.getElementById("welcomeName");
  if (nameEl) nameEl.textContent = `د. ${name}`;

  loadDashboardStats();
  loadTodaySchedule();
  loadTopStudents();
}

// ─── Stats Cards ──────────────────────────────────────────────────────────────
async function loadDashboardStats() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/stats`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) return;
    const d = await res.json();

    setText("statStudents",  d.totalStudents ?? "—");
    setText("wbStudents",    d.totalStudents ?? "—");
    setText("statCourses",   d.courses       ?? "—");
    setText("wbCourses",     d.courses       ?? "—");
    setText("todayLectures", d.todayLectures ?? "—");
    setText("pendingGrades", d.pendingGrades ?? "—");
    setText("statPending",   d.pendingGrades ?? "—");

    if (d.avgGrade !== undefined) {
      const pct = `${Math.round(d.avgGrade)}%`;
      setText("statAvg",    pct);
      setText("wbAvgGrade", pct);
    }
  } catch (err) { console.error("Stats error:", err); }
}

// ─── Today's schedule ─────────────────────────────────────────────────────────
async function loadTodaySchedule() {
  const list = document.getElementById("todayList");
  if (!list) return;
  list.innerHTML = skeletonRows(3);

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/schedule/today`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) { list.innerHTML = emptyState("لا توجد محاضرات اليوم"); return; }

    const data     = await res.json();
    const lectures = data.lectures || [];
    if (!lectures.length) { list.innerHTML = emptyState("لا توجد محاضرات اليوم"); return; }

    list.innerHTML = lectures.map(lec => {
      const statusClass = { current:"badge-green", upcoming:"badge-blue", later:"badge-gray" }[lec.status] || "badge-gray";
      const statusLabel = { current:"جارٍ الآن",  upcoming:"قادم",       later:"لاحقاً"    }[lec.status] || "لاحقاً";
      const [hour, min] = (lec.time || "08:00").split(":");
      const h = parseInt(hour);
      return `
        <div class="today-item">
          <div class="ti-time">
            <span class="ti-hour">${h > 12 ? h - 12 : h}:${min || "00"}</span>
            <span class="ti-period">${h < 12 ? "ص" : "م"}</span>
          </div>
          <div class="ti-info">
            <div class="ti-name">${lec.courseName} — ${lec.courseCode}</div>
            <div class="ti-meta">
              <span>🏛️ ${lec.location}</span>
              <span>👥 <strong>${lec.students}</strong> طالب</span>
              <span>🔵 ${lec.group}</span>
            </div>
          </div>
          <span class="badge ${statusClass}">${statusLabel}</span>
        </div>`;
    }).join("");
  } catch (err) { console.error("Schedule error:", err); list.innerHTML = emptyState("تعذّر التحميل"); }
}

// ─── Top Students ─────────────────────────────────────────────────────────────
async function loadTopStudents() {
  const el = document.getElementById("topStudents");
  if (!el) return;
  el.innerHTML = skeletonRows(3);

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/students/top?limit=3`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) { el.innerHTML = emptyState("لا توجد بيانات"); return; }

    const data     = await res.json();
    const students = data.students || [];
    if (!students.length) { el.innerHTML = emptyState("لا يوجد طلاب"); return; }

    const rankClasses  = ["gold", "silver", "bronze"];
    const gradeColors  = ["badge-orange", "badge-blue", "badge-purple"];
    el.innerHTML = students.slice(0, 3).map((s, i) => `
      <div class="ts-item">
        <div class="ts-rank ${rankClasses[i]}">${i + 1}</div>
        <div class="avatar">${(s.name || "").slice(0, 2)}</div>
        <div class="ts-info">
          <strong>${s.name}</strong>
          <span>GPA ${(s.gpa || 0).toFixed(2)}</span>
        </div>
        <span class="badge ${gradeColors[i]}">${s.grade || "A"}</span>
      </div>`).join("");
  } catch (err) { console.error("Top students error:", err); }
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function skeletonRows(n) {
  return Array(n).fill(`<div style="height:56px;border-radius:10px;background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);background-size:200% 100%;animation:skeletonShimmer 1.5s infinite;margin-bottom:10px;"></div>`).join("");
}

function emptyState(msg) {
  return `<div class="empty-state"><p>${msg}</p></div>`;
}
