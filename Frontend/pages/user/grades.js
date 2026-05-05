// ─── Student Grades (Transcript) JS ──────────────────────────────────────────
const auth = PortalUtils.guard("student");
if (auth) init();

async function init() {
  PortalUtils.setupTopbar(auth.payload);
  loadTranscript();
}

async function loadTranscript() {
  const container = document.getElementById("academicTranscript");
  if (!container) return;

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/student/grades`, {
      headers: PortalUtils.getAuthHeaders()
    });
    const data = await res.json();
    const grades = data.grades || [];

    if (!grades.length) {
      renderEmptyTranscript();
      return;
    }

    const grouped = groupGrades(grades);
    renderStats(grades);
    renderTranscript(grouped);

  } catch (err) {
    console.error("Grades load error:", err);
    container.innerHTML = `<div class="empty-state"><p>تعذر تحميل كشف الدرجات</p></div>`;
  }
}

// ─── Logic ───────────────────────────────────────────────────────────────────

function groupGrades(grades) {
  const years = {};
  grades.forEach(g => {
    const y = g.academicYear || "غير محدد";
    const s = g.semester || "1";
    if (!years[y]) years[y] = {};
    if (!years[y][s]) years[y][s] = [];
    years[y][s].push(g);
  });
  return years;
}

function renderStats(grades) {
  const passed = grades.filter(g => g.status === "passed").length;
  const failed = grades.filter(g => g.status === "failed").length;
  const totalCredits = grades.length * 3; // Assuming 3 credits per subject

  // Calculate GPA (Simplified 4.0 Scale)
  let totalPoints = 0;
  grades.forEach(g => {
    const score = g.total || 0;
    if (score >= 90) totalPoints += 4.0;
    else if (score >= 80) totalPoints += 3.0;
    else if (score >= 70) totalPoints += 2.0;
    else if (score >= 60) totalPoints += 1.0;
    else totalPoints += 0;
  });
  const gpa = grades.length ? (totalPoints / grades.length).toFixed(2) : "0.00";

  document.getElementById("currentGPA").textContent = gpa;
  document.getElementById("totalCredits").textContent = totalCredits;
  document.getElementById("passedCourses").textContent = passed;
  document.getElementById("failedCourses").textContent = failed;

  const statusEl = document.getElementById("gpaStatus");
  if (gpa >= 3.5) { statusEl.textContent = "ممتاز"; statusEl.style.color = "#4ade80"; }
  else if (gpa >= 3.0) { statusEl.textContent = "جيد جداً"; statusEl.style.color = "#60a5fa"; }
  else if (gpa >= 2.0) { statusEl.textContent = "جيد"; statusEl.style.color = "#fbbf24"; }
  else { statusEl.textContent = "يحتاج تحسين"; statusEl.style.color = "#f87171"; }
}

function getLetterGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function renderTranscript(grouped) {
  const container = document.getElementById("academicTranscript");
  container.innerHTML = "";

  // Sort years descending
  const sortedYears = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  sortedYears.forEach(year => {
    const yearGroup = document.createElement("div");
    yearGroup.className = "academic-year-group";
    
    let semesterHtml = "";
    const semesters = grouped[year];
    // Sort semesters ascending
    const sortedSems = Object.keys(semesters).sort();

    sortedSems.forEach(sem => {
      const semGrades = semesters[sem];
      semesterHtml += `
        <div class="semester-block">
          <div class="semester-title">الفصل الدراسي ${sem === "1" ? "الأول" : "الثاني"}</div>
          ${semGrades.map(g => {
            const score = g.total || 0;
            const lg = getLetterGrade(score);
            const color = score >= 60 ? "#2463eb" : "#ef4444";
            
            return `
              <div class="grade-row">
                <div class="subject-info">
                  <h4>${g.subject?.name || "مادة غير معروفة"}</h4>
                  <p>${g.subject?.code || "—"} · 3 ساعات معتمدة</p>
                </div>
                <div class="grade-val">${score} / 100</div>
                <div class="grade-bar-wrap">
                  <div class="grade-bar">
                    <div class="grade-fill" style="width: ${score}%; background: ${color};"></div>
                  </div>
                </div>
                <div style="text-align: center;">
                  <span class="badge ${score >= 60 ? 'badge-green' : 'badge-red'}">
                    ${score >= 60 ? 'ناجح' : 'راسب'}
                  </span>
                </div>
                <div>
                  <div class="letter-grade lg-${lg}">${lg}</div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    });

    yearGroup.innerHTML = `
      <div class="year-header">
        <div class="year-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          العام الجامعي ${year}
        </div>
        <div class="text-muted" style="font-size:1.2rem;">${Object.keys(semesters).length} فصل دراسي</div>
      </div>
      <div class="year-content">
        ${semesterHtml}
      </div>
    `;
    container.appendChild(yearGroup);
  });
}

function renderEmptyTranscript() {
  document.getElementById("academicTranscript").innerHTML = `
    <div class="empty-state" style="padding: 80px 20px;">
      <svg viewBox="0 0 24 24" style="width:60px; height:60px; stroke:#cbd5e1; margin-bottom:15px;"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
      <p style="font-size:1.6rem; color:#64748b;">لا توجد درجات مسجلة حالياً</p>
      <small style="color:#94a3b8;">سيتم عرض درجاتك هنا فور رصدها من قبل الإدارة</small>
    </div>
  `;
}
