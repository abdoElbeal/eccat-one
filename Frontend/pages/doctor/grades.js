// ─── Doctor Grades JS — Best-in-Class Grade Management ───────────────────────
const auth = PortalUtils.guard("doctor");

let currentCourse = "";
let currentGroup  = "all";
let currentSubjectId = "";
let gradesCache   = [];   // raw grades from API
let changedRows   = new Set();

if (auth) init();

function init() {
  window.addEventListener("error", (e) => {
    console.error("Global JS Error:", e.error);
    PortalUtils.showToast("خطأ في تشغيل الصفحة: " + e.message, "error");
  });

  PortalUtils.setupTopbar(auth.payload);

  // Pre-select course from query param
  const params = new URLSearchParams(window.location.search);
  currentCourse = params.get("course") || "";

  document.getElementById("courseSelect")?.addEventListener("change", e => {
    currentCourse    = e.target.value;
    currentSubjectId = e.target.selectedOptions[0]?.dataset.id || "";
    currentGroup     = "all";
    if(document.getElementById("groupFilter")) document.getElementById("groupFilter").value = "all";
    loadGrades();
  });

  document.getElementById("groupFilter")?.addEventListener("change", e => {
    currentGroup = e.target.value;
    loadGrades();
  });

  document.getElementById("saveAllBtn")?.addEventListener("click",    saveAll);
  document.getElementById("exportGradesBtn")?.addEventListener("click", exportGrades);
  document.getElementById("searchInput")?.addEventListener("input",   debounce(filterRows, 300));

  // Keyboard shortcut: Ctrl+S = save all
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); saveAll(); }
  });

  loadSubjectList();
}

// ─── 1. Load subjects for the select ─────────────────────────────────────────
async function loadSubjectList() {
  try {
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/grades`, { headers: PortalUtils.getAuthHeaders() });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Subject list error:", res.status, err);
        PortalUtils.showToast("تعذّر تحميل قائمة المواد", "error");
        return;
    }
    const data = await res.json();
    const subjects = data.subjects || [];

    const select = document.getElementById("courseSelect");
    if (select && subjects.length) {
      select.innerHTML = subjects.map(s =>
        `<option value="${s.code}" data-id="${s._id}" ${s.code===currentCourse?"selected":""}>${s.name} — ${s.code}</option>`
      ).join("");
      if (!currentCourse) { currentCourse = subjects[0].code; currentSubjectId = subjects[0]._id; }
      else { currentSubjectId = subjects.find(s=>s.code===currentCourse)?._id || ""; }
    } else if (select) {
      select.innerHTML = `<option value="">— لا توجد مواد —</option>`;
    }
    loadGrades();
  } catch (err) {
    console.error("Subject list error:", err);
    loadGrades();
  }
}

// ─── 2. Load grades for selected course ──────────────────────────────────────
async function loadGrades() {
  if (!currentCourse) return;

  hideBanner();
  document.getElementById("courseLabel").textContent = `— ${currentCourse}`;
  document.getElementById("pendingCount").style.display = "none";

  const tbody = document.getElementById("gradesTable");
  tbody.innerHTML = skeletonRows(5);

  try {
    const url  = `${window.CONFIG.API_BASE_URL}/api/doctor/grades?subject=${encodeURIComponent(currentCourse)}&group=${currentGroup}`;
    const res  = await fetch(url, { headers: PortalUtils.getAuthHeaders() });
    if (!res.ok) { 
        const err = await res.json().catch(() => ({}));
        console.error("Grades load error:", res.status, err);
        tbody.innerHTML = emptyRow(`تعذّر تحميل الدرجات (${res.status}: ${err.message || 'خطأ في الخادم'})`);
        return; 
    }

    const data = await res.json();
    gradesCache = data.grades || [];

    // Populate group filter
    const gFilter = document.getElementById("groupFilter");
    if (gFilter && data.groups?.length) {
      const cur = gFilter.value;
      gFilter.innerHTML = `<option value="all">كل المجموعات</option>` +
        data.groups.map(g => `<option value="${g._id}" ${g._id.toString()===cur?"selected":""}>${g.name}</option>`).join("");
    }

    if (!gradesCache.length) { tbody.innerHTML = emptyRow("لا يوجد طلاب مسجلون في هذه المادة"); return; }

    renderGrades(gradesCache);
    updateDistribution(gradesCache);

    const unset = gradesCache.filter(g => g.total === null || g.total === undefined).length;
    const setEl = document.getElementById("pendingCount");
    const savedEl = document.getElementById("savedCount");
    if (setEl) {
      setEl.textContent = `${unset} لم تُرصد بعد`;
      setEl.style.display = unset > 0 ? "inline-flex" : "none";
    }
    if (savedEl) {
      savedEl.textContent = `${gradesCache.length - unset} مرصودة`;
      savedEl.style.display = gradesCache.length - unset > 0 ? "inline-flex" : "none";
    }

    changedRows.clear();
  } catch (err) {
    console.error("Grades load error:", err);
    tbody.innerHTML = emptyRow("حدث خطأ أثناء التحميل");
  }
}

// ─── 3. Render Grades Table ───────────────────────────────────────────────────
const AVATAR_COLORS = [
  ["#eff6ff","#2463eb"],["#f5f3ff","#7c3aed"],["#f0fdf4","#16a34a"],
  ["#fff7ed","#ea580c"],["#fef3c7","#d97706"],["#fce7f3","#be185d"]
];

function renderGrades(grades) {
  const tbody = document.getElementById("gradesTable");
  if (!tbody) return;

  tbody.innerHTML = grades.map((g, i) => {
    const hw      = g.homeworkScore ?? "";
    const mid     = g.midtermScore  ?? "";
    const fin     = g.finalScore    ?? "";
    const total   = g.total;
    const letter  = getLetter(total);
    const lStyle  = getLetterStyle(letter);
    const initials= (g.studentName||"؟").slice(0,2);
    const [abg, afg] = AVATAR_COLORS[i % AVATAR_COLORS.length];
    const hasGrade = total !== null && total !== undefined;

    return `
      <tr data-student-id="${g.studentId}" data-grade-id="${g.gradeId||""}" class="${hasGrade?"":"row-unset"}">
        <td><strong>${i+1}</strong></td>
        <td>
          <div class="user-row">
            <div class="avatar" style="background:${abg};color:${afg};">${initials}</div>
            <div class="user-row-info">
              <strong>${g.studentName}</strong>
              <span style="direction:ltr;">${g.studentNo||""} ${g.group ? `· ${g.group}` : ""}</span>
            </div>
          </div>
        </td>
        <td>
          <input type="number" class="grade-input" data-field="homework" value="${hw}" placeholder="—" min="0" max="20"
            oninput="onGradeInput(this)" onblur="clampInput(this,20)" />
          <div class="grade-bar-mini"><div style="height:100%;width:${hw?Math.round(hw/20*100):0}%;background:#7c3aed;border-radius:2px;transition:width 0.3s;"></div></div>
        </td>
        <td>
          <input type="number" class="grade-input" data-field="midterm" value="${mid}" placeholder="—" min="0" max="30"
            oninput="onGradeInput(this)" onblur="clampInput(this,30)" />
          <div class="grade-bar-mini"><div style="height:100%;width:${mid?Math.round(mid/30*100):0}%;background:#2463eb;border-radius:2px;transition:width 0.3s;"></div></div>
        </td>
        <td>
          <input type="number" class="grade-input" data-field="final" value="${fin}" placeholder="—" min="0" max="50"
            oninput="onGradeInput(this)" onblur="clampInput(this,50)" />
          <div class="grade-bar-mini"><div style="height:100%;width:${fin?Math.round(fin/50*100):0}%;background:#0891b2;border-radius:2px;transition:width 0.3s;"></div></div>
        </td>
        <td><span class="total-display ${!hasGrade?"unset":""}">${hasGrade?total:"—"}</span></td>
        <td><span class="grade-letter" style="${lStyle}">${letter}</span></td>
        <td>
          <button class="grade-save-btn" data-id="${g.studentId}" title="حفظ هذا الطالب" onclick="saveRow(this.closest('tr'))">
            <svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          </button>
        </td>
      </tr>`;
  }).join("");
}

// ─── 4. Live Calc on input ────────────────────────────────────────────────────
function onGradeInput(input) {
  const row = input.closest("tr");
  recalcRow(row);
  changedRows.add(row.dataset.studentId);
  row.classList.add("row-changed");

  // Update mini bar
  const max = +input.max;
  const val = +input.value || 0;
  const bar = input.nextElementSibling?.querySelector("div");
  if (bar) bar.style.width = `${Math.min(100, Math.round(val/max*100))}%`;
}

function clampInput(input, max) {
  const v = +input.value;
  if (v > max) input.value = max;
  if (v < 0)   input.value = 0;
  onGradeInput(input);
}

function recalcRow(row) {
  const hw  = parseFloat(row.querySelector("[data-field='homework']")?.value)  || 0;
  const mid = parseFloat(row.querySelector("[data-field='midterm']")?.value)   || 0;
  const fin = parseFloat(row.querySelector("[data-field='final']")?.value)     || 0;
  const total = hw + mid + fin;

  const totalEl  = row.querySelector(".total-display");
  const letterEl = row.querySelector(".grade-letter");
  if (totalEl)  { totalEl.textContent = total; totalEl.classList.remove("unset"); }
  if (letterEl) {
    const l = getLetter(total);
    letterEl.textContent = l;
    letterEl.style.cssText = getLetterStyle(l);
  }
}

// ─── 5. Save single row ───────────────────────────────────────────────────────
async function saveRow(row) {
  const studentId = row.dataset.studentId;
  const hw  = parseFloat(row.querySelector("[data-field='homework']")?.value)  || null;
  const mid = parseFloat(row.querySelector("[data-field='midterm']")?.value)   || null;
  const fin = parseFloat(row.querySelector("[data-field='final']")?.value)     || null;
  const btn = row.querySelector(".grade-save-btn");

  if (btn) { btn.disabled = true; btn.classList.add("saving"); }
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/grades/${studentId}`, {
      method:  "PATCH",
      headers: PortalUtils.getAuthHeaders(),
      body:    JSON.stringify({ course: currentCourse, homeworkScore: hw, midtermScore: mid, finalScore: fin }),
    });
    if (res.ok) {
      if (btn) { btn.classList.remove("saving"); btn.classList.add("saved"); setTimeout(() => btn?.classList.remove("saved"), 2500); }
      row.classList.remove("row-changed", "row-unset");
      changedRows.delete(studentId);
    } else {
      const d = await res.json();
      showBanner(`❌ ${d.message || "فشل الحفظ"}`, "error");
    }
  } catch { showBanner("❌ خطأ في الاتصال بالخادم", "error"); }
  finally { if (btn) { btn.disabled = false; btn.classList.remove("saving"); } }
}

// ─── 6. Save All ──────────────────────────────────────────────────────────────
async function saveAll() {
  const btn  = document.getElementById("saveAllBtn");
  if (btn) { btn.disabled = true; btn.innerHTML = `<span style="animation:spin 1s linear infinite;display:inline-block;">⟳</span> جارٍ الحفظ...`; }

  const rows = [...document.querySelectorAll("#gradesTable tr[data-student-id]")];
  let saved = 0, failed = 0;

  for (const row of rows) {
    try {
      await saveRow(row);
      saved++;
    } catch { failed++; }
    await new Promise(r => setTimeout(r, 50)); // small delay to avoid rate limiting
  }

  if (btn) {
    btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>حفظ الكل`;
    btn.disabled = false;
  }

  showBanner(failed === 0 ? `✅ تم حفظ ${saved} طالب بنجاح` : `⚠️ تم حفظ ${saved}، فشل ${failed}`, failed===0?"success":"warning");
  updateDistribution(gradesCache);
}

// ─── 7. Distribution Update ───────────────────────────────────────────────────
function updateDistribution(grades) {
  const graded = grades.filter(g => g.total !== null && g.total !== undefined);
  const counts = { A:0, B:0, C:0, D:0, F:0 };

  graded.forEach(g => {
    const l = getLetter(g.total);
    if (l.startsWith("A")) counts.A++;
    else if (l.startsWith("B")) counts.B++;
    else if (l.startsWith("C")) counts.C++;
    else if (l.startsWith("D")) counts.D++;
    else counts.F++;
  });

  const total = graded.length || 1;
  const avg   = graded.length ? Math.round(graded.reduce((s,g)=>s+(g.total||0),0)/graded.length) : 0;

  setText("gradeA", counts.A); document.getElementById("barA").style.width = `${Math.round(counts.A/total*100)}%`;
  setText("gradeB", counts.B); document.getElementById("barB").style.width = `${Math.round(counts.B/total*100)}%`;
  setText("gradeC", counts.C); document.getElementById("barC").style.width = `${Math.round(counts.C/total*100)}%`;
  setText("gradeD", counts.D); document.getElementById("barD").style.width = `${Math.round(counts.D/total*100)}%`;
  setText("gradeF", counts.F); document.getElementById("barF").style.width = `${Math.round(counts.F/total*100)}%`;
  setText("avgScore", avg); document.getElementById("barAvg").style.width = `${avg}%`;
}

// ─── 8. Filter ────────────────────────────────────────────────────────────────
function filterRows(e) {
  const q = (e.target?.value || "").toLowerCase().trim();
  document.querySelectorAll("#gradesTable tr[data-student-id]").forEach(row => {
    const name = row.querySelector("strong")?.textContent.toLowerCase() || "";
    const num  = row.querySelector(".user-row-info span")?.textContent.toLowerCase() || "";
    row.style.display = (!q || name.includes(q) || num.includes(q)) ? "" : "none";
  });
}

// ─── 9. Export CSV ────────────────────────────────────────────────────────────
function exportGrades() {
  const rows    = document.querySelectorAll("#gradesTable tr[data-student-id]");
  const headers = ["#","الطالب","الرقم الجامعي","أعمال الفصل/20","الميدتيرم/30","النهائي/50","المجموع/100","التقدير"];
  const data    = [...rows].map((row, i) => [
    i+1,
    row.querySelector("strong")?.textContent||"",
    row.querySelector(".user-row-info span")?.textContent?.split("·")[0]?.trim()||"",
    row.querySelector("[data-field='homework']")?.value||"",
    row.querySelector("[data-field='midterm']")?.value||"",
    row.querySelector("[data-field='final']")?.value||"",
    row.querySelector(".total-display")?.textContent||"",
    row.querySelector(".grade-letter")?.textContent||"",
  ]);
  const csv  = [headers,...data].map(r => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = `grades_${currentCourse}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
}

// ─── Banner ───────────────────────────────────────────────────────────────────
function showBanner(msg, type="success") {
  const el = document.getElementById("saveBanner");
  if (!el) return;
  const colors = { success:["#f0fdf4","#16a34a"], error:["#fef2f2","#b91c1c"], warning:["#fffbeb","#d97706"] };
  const [bg, fg] = colors[type]||colors.success;
  el.style.cssText = `display:block;background:${bg};color:${fg};border:1.5px solid ${fg}30;padding:12px 20px;border-radius:10px;margin-bottom:14px;font-size:1.3rem;font-weight:600;`;
  el.textContent = msg;
  setTimeout(() => { el.style.display = "none"; }, 4000);
}
function hideBanner() {
  const el = document.getElementById("saveBanner");
  if (el) el.style.display = "none";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLetter(total) {
  if (total === null || total === undefined) return "—";
  if (total >= 97) return "A+"; if (total >= 93) return "A";
  if (total >= 90) return "A-"; if (total >= 87) return "B+";
  if (total >= 83) return "B";  if (total >= 80) return "B-";
  if (total >= 77) return "C+"; if (total >= 73) return "C";
  if (total >= 70) return "C-"; if (total >= 67) return "D+";
  if (total >= 60) return "D";
  return "F";
}

function getLetterStyle(letter) {
  if (letter==="—") return "background:#f1f5f9;color:#94a3b8;padding:3px 10px;border-radius:8px;font-weight:700;";
  if (letter.startsWith("A")) return "background:#dcfce7;color:#16a34a;padding:3px 10px;border-radius:8px;font-weight:800;";
  if (letter.startsWith("B")) return "background:#dbeafe;color:#2463eb;padding:3px 10px;border-radius:8px;font-weight:800;";
  if (letter.startsWith("C")) return "background:#ede9fe;color:#7c3aed;padding:3px 10px;border-radius:8px;font-weight:800;";
  if (letter.startsWith("D")) return "background:#fff7ed;color:#ea580c;padding:3px 10px;border-radius:8px;font-weight:800;";
  return "background:#fef2f2;color:#ef4444;padding:3px 10px;border-radius:8px;font-weight:800;";
}

function setText(id, v) { const el=document.getElementById(id); if(el) el.textContent=v; }
function debounce(fn,d) { let t; return (...a) => { clearTimeout(t); t=setTimeout(()=>fn(...a),d); }; }

function skeletonRows(n) {
  return `<tr><td colspan="8">${
    Array(n).fill(`<div style="height:44px;margin-bottom:8px;background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);background-size:200%;animation:skeletonShimmer 1.5s infinite;border-radius:8px;"></div>`).join("")
  }</td></tr>`;
}
function emptyRow(msg) {
  return `<tr><td colspan="8"><div class="empty-state" style="padding:50px;"><p>${msg}</p></div></td></tr>`;
}
