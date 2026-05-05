// ─── Doctor Grades JS ────────────────────────────────────────────────────────
const auth = PortalUtils.guard("doctor");
if (auth) init();

let currentCourse = "";
let currentGroup  = "all";

function init() {
  // Logout handled by PortalUtils
  PortalUtils.setupTopbar(auth.payload);

  // Pre-select course from query param
  const params = new URLSearchParams(window.location.search);
  currentCourse = params.get("course") || "";

  const courseSelect = document.getElementById("courseSelect");
  if (courseSelect) {
    courseSelect.addEventListener("change", e => {
      currentCourse = e.target.value;
      loadGrades();
    });
  }

  const groupFilter = document.getElementById("groupFilter");
  if (groupFilter) {
    groupFilter.addEventListener("change", e => {
      currentGroup = e.target.value;
      loadGrades();
    });
  }

  document.getElementById("saveAllBtn")?.addEventListener("click", saveAll);
  document.getElementById("exportGradesBtn")?.addEventListener("click", exportGrades);
  document.getElementById("searchInput")?.addEventListener("input", debounce(filterRows, 300));

  loadSubjectList();
}

// ─── Load Subject List for select ────────────────────────────────────────────
async function loadSubjectList() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/grades?subject=__placeholder__`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    const data     = await res.json();
    const subjects = data.subjects || [];

    const select = document.getElementById("courseSelect");
    if (select && subjects.length) {
      select.innerHTML = subjects.map(s =>
        `<option value="${s.code}" ${s.code === currentCourse ? "selected" : ""}>${s.name} (${s.code})</option>`
      ).join("");

      if (!currentCourse) currentCourse = subjects[0].code;
    }

    loadGrades();
  } catch (err) {
    console.error("Subject list error:", err);
    loadGrades();
  }
}

// ─── Load Grades ─────────────────────────────────────────────────────────────
async function loadGrades() {
  if (!currentCourse) return;

  const labelEl = document.getElementById("courseLabel");
  if (labelEl) labelEl.textContent = `— ${currentCourse}`;

  const tbody = document.getElementById("gradesTable");
  if (tbody) tbody.innerHTML = skeletonRows(5);

  try {
    const url = `${window.CONFIG.API_BASE_URL}/api/doctor/grades?subject=${currentCourse}&group=${currentGroup}`;
    const res  = await fetch(url, { headers: PortalUtils.getAuthHeaders() });
    if (!res.ok) { if (tbody) tbody.innerHTML = emptyRow("تعذّر تحميل الدرجات"); return; }

    const data   = await res.json();
    const grades = data.grades || [];

    // Populate group filter
    const groupFilter = document.getElementById("groupFilter");
    if (groupFilter && data.groups) {
      const cur = groupFilter.value;
      groupFilter.innerHTML = `<option value="all">كل المجموعات</option>` +
        data.groups.map(g => `<option value="${g._id}" ${g._id.toString() === cur ? "selected" : ""}>${g.name}</option>`).join("");
    }

    if (!grades.length) { if (tbody) tbody.innerHTML = emptyRow("لا يوجد طلاب في هذه المادة"); return; }

    renderGrades(grades);
    updateDistribution(grades);

    const unset = grades.filter(g => g.total === null || g.total === undefined).length;
    setText("pendingCount", `${unset} درجة لم تُرصد`);

  } catch (err) {
    console.error("Grades load error:", err);
    if (tbody) tbody.innerHTML = emptyRow("حدث خطأ أثناء التحميل");
  }
}

// ─── Render Grades Table ──────────────────────────────────────────────────────
function renderGrades(grades) {
  const tbody = document.getElementById("gradesTable");
  if (!tbody) return;

  tbody.innerHTML = grades.map((g, i) => {
    const hw     = g.homeworkScore ?? "";
    const mid    = g.midtermScore  ?? "";
    const fin    = g.finalScore    ?? "";
    const total  = g.total ?? "—";
    const letter = getLetter(g.total);
    const lStyle = getLetterStyle(letter);
    const initials = (g.studentName || "").slice(0, 2);

    return `
      <tr data-student-id="${g.studentId}" data-grade-id="${g.gradeId || ""}">
        <td>${i + 1}</td>
        <td>
          <div class="user-row">
            <div class="avatar">${initials}</div>
            <div class="user-row-info">
              <strong>${g.studentName}</strong>
              <span>${g.studentNo || ""} • ${g.group || ""}</span>
            </div>
          </div>
        </td>
        <td><input type="number" class="grade-input" data-field="homework" value="${hw}" placeholder="—" min="0" max="20" /></td>
        <td><input type="number" class="grade-input" data-field="midterm"  value="${mid}" placeholder="—" min="0" max="30" /></td>
        <td><input type="number" class="grade-input" data-field="final"    value="${fin}" placeholder="—" min="0" max="50" /></td>
        <td><span class="total-display ${total === "—" ? "unset" : ""}">${total}</span></td>
        <td><span class="grade-letter" style="${lStyle}">${letter}</span></td>
        <td>
          <button class="grade-save-btn" data-id="${g.studentId}" title="حفظ">
            <svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          </button>
        </td>
      </tr>`;
  }).join("");

  attachLiveCalc();
}

// ─── Live Calculation ─────────────────────────────────────────────────────────
function attachLiveCalc() {
  document.querySelectorAll("#gradesTable tr[data-student-id]").forEach(row => {
    row.querySelectorAll(".grade-input").forEach(input => {
      input.addEventListener("input", () => recalcRow(row));
    });
    row.querySelector(".grade-save-btn")?.addEventListener("click", () => saveRow(row));
  });
}

function recalcRow(row) {
  const hw  = parseFloat(row.querySelector("[data-field='homework']")?.value)  || 0;
  const mid = parseFloat(row.querySelector("[data-field='midterm']")?.value)   || 0;
  const fin = parseFloat(row.querySelector("[data-field='final']")?.value)     || 0;
  const total = hw + mid + fin;

  const totalEl  = row.querySelector(".total-display");
  const letterEl = row.querySelector(".grade-letter");
  if (totalEl)  { totalEl.textContent  = total; totalEl.classList.remove("unset"); }
  if (letterEl) {
    const letter = getLetter(total);
    letterEl.textContent = letter;
    letterEl.style.cssText = getLetterStyle(letter);
  }
  row.querySelectorAll(".grade-input").forEach(i => i.classList.add("changed"));
}

// ─── Save single row ──────────────────────────────────────────────────────────
async function saveRow(row) {
  const studentId = row.dataset.studentId;
  const hw  = parseFloat(row.querySelector("[data-field='homework']")?.value) || null;
  const mid = parseFloat(row.querySelector("[data-field='midterm']")?.value)  || null;
  const fin = parseFloat(row.querySelector("[data-field='final']")?.value)    || null;
  const btn = row.querySelector(".grade-save-btn");

  if (btn) btn.disabled = true;
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/grades/${studentId}`, {
      method:  "PATCH",
      headers: PortalUtils.getAuthHeaders(),
      body:    JSON.stringify({ course: currentCourse, homeworkScore: hw, midtermScore: mid, finalScore: fin }),
    });
    if (res.ok) {
      if (btn) { btn.classList.add("saved"); setTimeout(() => btn?.classList.remove("saved"), 2000); }
      row.querySelectorAll(".grade-input").forEach(i => i.classList.remove("changed"));
    } else {
      const d = await res.json();
      alert(d.message || "فشل الحفظ");
    }
  } catch (err) { alert("خطأ في الاتصال بالخادم"); }
  finally { if (btn) btn.disabled = false; }
}

// ─── Save All ─────────────────────────────────────────────────────────────────
async function saveAll() {
  const btn  = document.getElementById("saveAllBtn");
  if (btn) { btn.textContent = "جارٍ الحفظ..."; btn.disabled = true; }
  const rows = document.querySelectorAll("#gradesTable tr[data-student-id]");
  for (const row of rows) await saveRow(row);
  if (btn) { btn.textContent = "✅ تم الحفظ"; setTimeout(() => { btn.textContent = "حفظ الكل"; btn.disabled = false; }, 2000); }
}

// ─── Distribution Update ─────────────────────────────────────────────────────
function updateDistribution(grades) {
  const counts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  grades.forEach(g => {
    const l = getLetter(g.total);
    if (l.startsWith("A")) counts.A++;
    else if (l.startsWith("B")) counts.B++;
    else if (l.startsWith("C")) counts.C++;
    else if (l.startsWith("D")) counts.D++;
    else if (l === "F") counts.F++;
  });
  setText("gradeA", counts.A);
  setText("gradeB", counts.B);
  setText("gradeC", counts.C);
  setText("gradeD", counts.D);
  setText("gradeF", counts.F);
}

// ─── Filter ──────────────────────────────────────────────────────────────────
function filterRows(e) {
  const q = (e.target?.value || "").toLowerCase();
  document.querySelectorAll("#gradesTable tr[data-student-id]").forEach(row => {
    const name = row.querySelector("strong")?.textContent.toLowerCase() || "";
    row.style.display = name.includes(q) ? "" : "none";
  });
}

// ─── Export CSV ──────────────────────────────────────────────────────────────
function exportGrades() {
  const rows    = document.querySelectorAll("#gradesTable tr[data-student-id]");
  const headers = ["الطالب","الرقم","المجموعة","أعمال/20","نصفي/30","نهائي/50","المجموع","التقدير"];
  const data    = [...rows].map(row => [
    row.querySelector("strong")?.textContent || "",
    row.querySelector(".user-row-info span")?.textContent || "",
    "",
    row.querySelector("[data-field='homework']")?.value  || "",
    row.querySelector("[data-field='midterm']")?.value   || "",
    row.querySelector("[data-field='final']")?.value     || "",
    row.querySelector(".total-display")?.textContent     || "",
    row.querySelector(".grade-letter")?.textContent      || "",
  ]);
  const csv  = [headers, ...data].map(r => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = `grades_${currentCourse}_${Date.now()}.csv`;
  a.click();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getLetter(total) {
  if (total === null || total === undefined) return "—";
  if (total >= 97) return "A+";  if (total >= 93) return "A";
  if (total >= 90) return "A-";  if (total >= 87) return "B+";
  if (total >= 83) return "B";   if (total >= 80) return "B-";
  if (total >= 77) return "C+";  if (total >= 73) return "C";
  if (total >= 70) return "C-";  if (total >= 67) return "D+";
  if (total >= 60) return "D";
  return "F";
}

function getLetterStyle(letter) {
  if (letter.startsWith("A")) return "background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:8px;font-weight:700;";
  if (letter.startsWith("B")) return "background:#dbeafe;color:#2463eb;padding:2px 8px;border-radius:8px;font-weight:700;";
  if (letter.startsWith("C")) return "background:#ede9fe;color:#7c3aed;padding:2px 8px;border-radius:8px;font-weight:700;";
  if (letter.startsWith("D")) return "background:#fff7ed;color:#ea580c;padding:2px 8px;border-radius:8px;font-weight:700;";
  return "background:#fef2f2;color:#ef4444;padding:2px 8px;border-radius:8px;font-weight:700;";
}

function setText(id, val) {
  const el = document.getElementById(id); if (el) el.textContent = val;
}

function skeletonRows(n) {
  return `<tr><td colspan="8">${
    Array(n).fill(`<div style="height:40px;border-radius:8px;background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);background-size:200% 100%;animation:skeletonShimmer 1.5s infinite;margin-bottom:8px;"></div>`).join("")
  }</td></tr>`;
}

function emptyRow(msg) {
  return `<tr><td colspan="8"><div class="empty-state"><p>${msg}</p></div></td></tr>`;
}

function debounce(fn, d) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), d); }; }
