// ─── Admin Grades JS ─────────────────────────────────────────────────────────
// State first to avoid Temporal Dead Zone errors
let gradesData = [];
let currentSubjectId = null;

const auth = PortalUtils.guard("admin");
if (auth) init();

function init() {
  PortalUtils.setupTopbar(auth.payload);
  loadDepartments();
  
  document.getElementById("deptSelect").addEventListener("change", (e) => {
    loadSubjects(e.target.value);
    loadGroups(e.target.value);
  });
  
  document.getElementById("loadGradesBtn").addEventListener("click", loadGrades);
  document.getElementById("saveAllBtn").addEventListener("click", saveAll);
  document.getElementById("exportBtn").addEventListener("click", exportGrades);
}


// ─── Load Data for Filters ──────────────────────────────────────────────────
async function loadDepartments() {
  const sel = document.getElementById("deptSelect");
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/departments`, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    const depts = data.departments || [];
    sel.innerHTML = `<option value="">اختر القسم...</option>` + 
      depts.map(d => `<option value="${d._id}">${d.name}</option>`).join("");
  } catch (err) { console.error(err); }
}

async function loadSubjects(deptId) {
  const sel = document.getElementById("subjectSelect");
  if (!deptId) { sel.disabled = true; sel.innerHTML = `<option value="">اختر القسم أولاً</option>`; return; }
  
  sel.disabled = false;
  sel.innerHTML = `<option value="">جارٍ التحميل...</option>`;
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/subjects?department=${deptId}`, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    const subs = data.subjects || [];
    sel.innerHTML = `<option value="">اختر المادة...</option>` + 
      subs.map(s => `<option value="${s._id}">${s.name} (${s.code})</option>`).join("");
  } catch (err) { console.error(err); }
}

async function loadGroups(deptId) {
  const sel = document.getElementById("groupSelect");
  if (!deptId) { sel.disabled = true; sel.innerHTML = `<option value="all">كل المجموعات</option>`; return; }
  
  sel.disabled = false;
  sel.innerHTML = `<option value="all">كل المجموعات</option>`;
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/groups?department=${deptId}`, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    const groups = data.groups || [];
    sel.innerHTML = `<option value="all">كل المجموعات</option>` + 
      groups.map(g => `<option value="${g._id}">${g.name} (${g.code})</option>`).join("");
  } catch (err) { console.error(err); }
}

// ─── Load Grades ─────────────────────────────────────────────────────────────
async function loadGrades() {
  const subjectId = document.getElementById("subjectSelect").value;
  const groupId   = document.getElementById("groupSelect").value;
  const deptId    = document.getElementById("deptSelect").value;

  if (!subjectId) { PortalUtils.showToast("يرجى اختيار المادة", "error"); return; }

  const tbody = document.getElementById("gradesTable");
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8;">جارٍ تحميل الطلاب...</td></tr>`;

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/grades/by-subject?subjectId=${subjectId}&groupId=${groupId}&departmentId=${deptId}`, {
      headers: PortalUtils.getAuthHeaders()
    });
    const data = await res.json();
    const grades = data.grades || [];

    if (!grades.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8;">لا يوجد طلاب مطابقين لهذه الفلاتر</td></tr>`;
      return;
    }

    tbody.innerHTML = grades.map((g, i) => {
      const initials = g.studentName.slice(0, 2);
      const hw  = g.homeworkScore ?? "";
      const mid = g.midtermScore  ?? "";
      const fin = g.finalScore    ?? "";
      const total = g.total ?? "—";
      const letter = getLetter(g.total);
      
      return `
        <tr data-student-id="${g.studentId}">
          <td>${i + 1}</td>
          <td>
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:34px;height:34px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:700;">${initials}</div>
              <div>
                <div style="font-weight:600;">${g.studentName}</div>
                <div style="font-size:1.1rem;color:#94a3b8;">${g.studentNo || ""} • ${g.group}</div>
              </div>
            </div>
          </td>
          <td><input type="number" class="grade-input" data-field="homework" value="${hw}" min="0" max="20" placeholder="—" /></td>
          <td><input type="number" class="grade-input" data-field="midterm" value="${mid}" min="0" max="30" placeholder="—" /></td>
          <td><input type="number" class="grade-input" data-field="final" value="${fin}" min="0" max="50" placeholder="—" /></td>
          <td><span class="total-display ${total === "—" ? "unset" : ""}">${total}</span></td>
          <td><span class="grade-letter ${letter === "—" ? "unset" : ""}" style="${getLetterStyle(letter)}">${letter}</span></td>
          <td>
            <button class="grade-save-btn" onclick="saveRow(this.closest('tr'))">
              <svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            </button>
          </td>
        </tr>
      `;
    }).join("");

    attachLiveCalc();
    document.getElementById("saveAllBtn").disabled = false;
    document.getElementById("exportBtn").disabled = false;

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#ef4444;">حدث خطأ أثناء تحميل البيانات</td></tr>`;
  }
}

function attachLiveCalc() {
  document.querySelectorAll("#gradesTable tr").forEach(row => {
    row.querySelectorAll(".grade-input").forEach(input => {
      input.addEventListener("input", () => {
        input.classList.add("changed");
        const hw  = parseFloat(row.querySelector("[data-field='homework']").value) || 0;
        const mid = parseFloat(row.querySelector("[data-field='midterm']").value) || 0;
        const fin = parseFloat(row.querySelector("[data-field='final']").value) || 0;
        const total = hw + mid + fin;
        
        const totalEl = row.querySelector(".total-display");
        totalEl.textContent = total;
        totalEl.classList.remove("unset");
        
        const letterEl = row.querySelector(".grade-letter");
        const letter = getLetter(total);
        letterEl.textContent = letter;
        letterEl.classList.remove("unset");
        letterEl.style.cssText = getLetterStyle(letter);
      });
    });
  });
}

async function saveRow(row) {
  const studentId = row.dataset.studentId;
  const subjectId = document.getElementById("subjectSelect").value;
  const hw  = parseFloat(row.querySelector("[data-field='homework']").value) || 0;
  const mid = parseFloat(row.querySelector("[data-field='midterm']").value) || 0;
  const fin = parseFloat(row.querySelector("[data-field='final']").value) || 0;
  
  const btn = row.querySelector(".grade-save-btn");
  btn.disabled = true;

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/grades`, {
      method: "POST",
      headers: PortalUtils.getAuthHeaders(),
      body: JSON.stringify({
        student: studentId,
        subject: subjectId,
        activities: hw,
        midTerm: mid,
        final: fin
      })
    });
    
    if (res.ok) {
      btn.classList.add("saved");
      row.querySelectorAll(".grade-input").forEach(i => i.classList.remove("changed"));
      setTimeout(() => btn.classList.remove("saved"), 2000);
    } else {
      PortalUtils.showToast("فشل حفظ الدرجة", "error");
    }
  } catch (err) {
    PortalUtils.showToast("خطأ في الاتصال بالخادم", "error");
  } finally {
    btn.disabled = false;
  }
}

async function saveAll() {
  const btn = document.getElementById("saveAllBtn");
  btn.textContent = "جارٍ الحفظ...";
  btn.disabled = true;
  
  const rows = document.querySelectorAll("#gradesTable tr[data-student-id]");
  for (const row of rows) {
    await saveRow(row);
  }
  
  btn.textContent = "تم حفظ الكل ✅";
  setTimeout(() => {
    btn.textContent = "حفظ الكل";
    btn.disabled = false;
  }, 2000);
}

function exportGrades() {
  const rows = document.querySelectorAll("#gradesTable tr[data-student-id]");
  const headers = ["الطالب", "رقم الجلوس", "المجموعة", "أعمال السنة", "المنتصف", "النهائي", "المجموع", "التقدير"];
  const data = [...rows].map(row => [
    row.querySelector("strong").textContent,
    row.querySelector("div[style*='94a3b8']").textContent.split(" • ")[0],
    row.querySelector("div[style*='94a3b8']").textContent.split(" • ")[1],
    row.querySelector("[data-field='homework']").value,
    row.querySelector("[data-field='midterm']").value,
    row.querySelector("[data-field='final']").value,
    row.querySelector(".total-display").textContent,
    row.querySelector(".grade-letter").textContent
  ]);
  
  const csv = [headers, ...data].map(r => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `grades_export_${Date.now()}.csv`;
  a.click();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getLetter(total) {
  if (total === null || total === undefined || isNaN(total)) return "—";
  if (total >= 90) return "A";
  if (total >= 80) return "B";
  if (total >= 70) return "C";
  if (total >= 60) return "D";
  return "F";
}

function getLetterStyle(letter) {
  if (letter === "A") return "background:#dcfce7;color:#16a34a;";
  if (letter === "B") return "background:#dbeafe;color:#2463eb;";
  if (letter === "C") return "background:#fef3c7;color:#d97706;";
  if (letter === "D") return "background:#fff7ed;color:#ea580c;";
  if (letter === "F") return "background:#fef2f2;color:#ef4444;";
  return "";
}
