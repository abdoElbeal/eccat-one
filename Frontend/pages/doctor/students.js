// ─── Doctor Students JS — Full Dynamic System ────────────────────────────────
const auth = PortalUtils.guard("doctor");

let currentPage = 1;
let allStudents  = [];
let totalPages   = 1;
let totalCount   = 0;
const PAGE_LIMIT = 20;

if (auth) init();

function init() {
  window.addEventListener("error", (e) => {
    console.error("Global JS Error:", e.error);
    PortalUtils.showToast("خطأ في تشغيل الصفحة: " + e.message, "error");
  });

  PortalUtils.setupTopbar(auth.payload);

  document.getElementById("searchInput")?.addEventListener("input",  debounce(() => { currentPage = 1; loadStudents(); }, 350));
  document.getElementById("groupFilter")?.addEventListener("change", () => { currentPage = 1; loadStudents(); });
  document.getElementById("statusFilter")?.addEventListener("change",() => { currentPage = 1; loadStudents(); });
  document.getElementById("exportBtn")?.addEventListener("click",    exportCSV);

  loadStudents();
}

// ─── API ──────────────────────────────────────────────────────────────────────
async function loadStudents() {
  const search = document.getElementById("searchInput")?.value.trim()   || "";
  const group  = document.getElementById("groupFilter")?.value          || "all";
  const status = document.getElementById("statusFilter")?.value         || "";

  const params = new URLSearchParams({ page: currentPage, limit: PAGE_LIMIT });
  if (search) params.set("search", search);
  if (group  !== "all") params.set("group", group);

  const tbody = document.getElementById("studentsTable");
  if (tbody) tbody.innerHTML = skeletonRows(5);

  try {
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/students?${params}`, { headers: PortalUtils.getAuthHeaders() });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("Students API error:", res.status, errData);
      tbody.innerHTML = emptyRow(`تعذّر تحميل الطلاب (${res.status}: ${errData.message || 'خطأ في الخادم'})`);
      return;
    }

    const data = await res.json();
    totalCount  = data.total || 0;
    totalPages  = data.totalPages || 1;

    let students = data.students || [];

    // Client-side status filter
    if (status === "excellent") students = students.filter(s => (s.gpa||0) >= 3.7);
    else if (status === "risk") students = students.filter(s => (s.gpa||0) < 2.0);
    else if (status === "good") students = students.filter(s => (s.gpa||0) >= 2.0 && (s.gpa||0) < 3.7);

    allStudents = students;

    // Stats
    const allForStats = data.students || [];
    setText("sc1", totalCount);
    setText("sc2", allForStats.filter(s => (s.gpa||0) >= 3.7).length);
    setText("sc3", allForStats.filter(s => (s.gpa||0) < 2.0).length);
    const avgGpa = allForStats.length ? (allForStats.reduce((s,x) => s+(x.gpa||0), 0) / allForStats.length).toFixed(2) : "—";
    setText("sc4", avgGpa);
    setText("studentsCount", `${students.length} من ${totalCount} طالب`);

    // Populate group filter once
    const gFilter = document.getElementById("groupFilter");
    if (gFilter && data.groups?.length && gFilter.options.length <= 1) {
      data.groups.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g._id; opt.textContent = g.name;
        gFilter.appendChild(opt);
      });
    }

    renderStudents(students);
    renderPagination();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = emptyRow("حدث خطأ في الاتصال بالخادم");
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  ["#eff6ff","#2463eb"],["#f5f3ff","#7c3aed"],["#f0fdf4","#16a34a"],
  ["#fff7ed","#ea580c"],["#fef3c7","#d97706"],["#fce7f3","#be185d"]
];

function renderStudents(students) {
  const tbody = document.getElementById("studentsTable");
  if (!tbody) return;

  if (!students.length) { tbody.innerHTML = emptyRow("لا توجد نتائج مطابقة"); return; }

  tbody.innerHTML = students.map((s, i) => {
    const gpa      = s.gpa || 0;
    const initials = ((s.name || s.firstName || "؟").slice(0,2));
    const [abg, afg] = AVATAR_COLORS[i % AVATAR_COLORS.length];

    let statusCls = "good", statusLabel = "منتظم";
    if (gpa >= 3.7)      { statusCls = "excellent"; statusLabel = "متفوق ⭐"; }
    else if (gpa < 2.0)  { statusCls = "risk";      statusLabel = "في خطر ⚠️"; }

    let gpaCls = "good";
    if (gpa >= 3.7) gpaCls = "excellent";
    else if (gpa < 2.0) gpaCls = "risk";

    const passRate = s.totalCourses > 0 ? Math.round((s.passedCourses||0) / s.totalCourses * 100) : 0;

    return `
      <tr style="cursor:pointer;" onclick="openStudentModal('${s._id}','${esc(s.name||"")}','${esc(s.email||"")}','${esc(s.nationalId||s.studentNo||"")}','${esc(s.group||"")}',${gpa},${s.passedCourses||0},${s.totalCourses||0})">
        <td><strong>${(currentPage-1)*PAGE_LIMIT + i + 1}</strong></td>
        <td>
          <div class="user-row">
            <div class="avatar" style="background:${abg};color:${afg};">${initials}</div>
            <div class="user-row-info"><strong>${s.name}</strong><span>${s.email||"—"}</span></div>
          </div>
        </td>
        <td>${s.nationalId||s.studentNo||"—"}</td>
        <td><span class="badge badge-blue">${s.group||"—"}</span></td>
        <td><span class="grade-pill ${gpaCls}">${gpa.toFixed(2)} / 4.00</span></td>
        <td>
          <div class="attend-bar"><div class="attend-fill" style="width:${passRate}%;background:${gpa>=3.0?'#16a34a':gpa>=2.0?'#2463eb':'#ef4444'};"></div></div>
          <span style="font-size:1.1rem;">${s.passedCourses||0}/${s.totalCourses||0} مادة</span>
        </td>
        <td><span class="status-chip ${statusCls}">${statusLabel}</span></td>
        <td onclick="event.stopPropagation()">
          <div class="action-btns">
            <button class="action-btn edit" title="رصد الدرجات" onclick="location.href='grades.html?studentId=${s._id}'">
              <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="action-btn view" title="الملف الشخصي" onclick="openStudentModal('${s._id}','${esc(s.name||"")}','${esc(s.email||"")}','${esc(s.nationalId||s.studentNo||"")}','${esc(s.group||"")}',${gpa},${s.passedCourses||0},${s.totalCourses||0})">
              <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="action-btn" style="background:#f0fdf4;color:#16a34a;" title="مراسلة" onclick="location.href='messages.html?to=${s._id}'">
              <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

// ─── Student Profile Modal ────────────────────────────────────────────────────
function openStudentModal(id, name, email, nationalId, group, gpa, passed, total) {
  document.getElementById("modalAvatar").textContent = name.slice(0,2);
  document.getElementById("modalStudentName").textContent = name;
  document.getElementById("modalStudentMeta").textContent = `${nationalId} · ${email}`;
  document.getElementById("modalGradesLink").href = `grades.html?studentId=${id}`;
  document.getElementById("modalMsgLink").href    = `messages.html?to=${id}`;

  const gpaColor = gpa >= 3.7 ? "#16a34a" : gpa >= 2.0 ? "#2463eb" : "#ef4444";
  const gpaLabel = gpa >= 3.7 ? "متفوق" : gpa >= 2.0 ? "منتظم" : "في خطر";
  const passRate = total > 0 ? Math.round((passed/total)*100) : 0;

  document.getElementById("modalBody").innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">
      <div class="score-box" style="text-align:center;">
        <div style="font-size:3rem;font-weight:900;color:${gpaColor};">${gpa.toFixed(2)}</div>
        <div style="color:#64748b;font-size:1.2rem;">المعدل التراكمي (GPA)</div>
        <div style="margin-top:8px;"><span style="background:${gpaColor}18;color:${gpaColor};padding:3px 12px;border-radius:20px;font-weight:700;font-size:1.15rem;">${gpaLabel}</span></div>
      </div>
      <div class="score-box" style="text-align:center;">
        <div style="font-size:3rem;font-weight:900;color:#7c3aed;">${passed}/${total}</div>
        <div style="color:#64748b;font-size:1.2rem;">المواد المنجزة</div>
        <div style="margin-top:8px;background:#e2e8f0;border-radius:10px;height:8px;overflow:hidden;">
          <div style="height:100%;width:${passRate}%;background:#7c3aed;border-radius:10px;transition:width 0.8s;"></div>
        </div>
      </div>
    </div>
    <div style="background:#f8fafc;border-radius:12px;padding:16px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
        <span style="color:#64748b;font-size:1.25rem;">المجموعة الدراسية</span>
        <strong style="font-size:1.25rem;">${group||"—"}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:#64748b;font-size:1.25rem;">نسبة الإنجاز</span>
        <strong style="font-size:1.25rem;color:#7c3aed;">${passRate}%</strong>
      </div>
    </div>
    <div style="margin-top:16px;background:#f0fdf4;border-radius:12px;padding:14px;border-right:4px solid #16a34a;">
      <p style="font-size:1.25rem;color:#166534;">💡 لرصد درجات هذا الطالب اضغط على "رصد الدرجات" أدناه</p>
    </div>`;

  document.getElementById("studentModal").style.display = "flex";
}

function closeStudentModal() {
  document.getElementById("studentModal").style.display = "none";
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function renderPagination() {
  const wrap = document.getElementById("paginationWrap");
  if (!wrap) return;
  if (totalPages <= 1) { wrap.style.display = "none"; return; }
  wrap.style.display = "flex";

  let html = `<button class="page-btn" onclick="goPage(${currentPage-1})" ${currentPage<=1?"disabled":""}>‹</button>`;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2) {
      html += `<button class="page-btn ${p===currentPage?"active":""}" onclick="goPage(${p})">${p}</button>`;
    } else if (Math.abs(p - currentPage) === 3) {
      html += `<span class="page-btn" style="cursor:default;">…</span>`;
    }
  }
  html += `<button class="page-btn" onclick="goPage(${currentPage+1})" ${currentPage>=totalPages?"disabled":""}>›</button>`;
  wrap.innerHTML = html;
}

function goPage(p) {
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  loadStudents();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ─── Export ───────────────────────────────────────────────────────────────────
function exportCSV() {
  const headers = ["#","الطالب","الرقم الجامعي","البريد الإلكتروني","المجموعة","GPA","مواد ناجحة","مواد الفصل","الحالة"];
  const rows = allStudents.map((s, i) => {
    const gpa = s.gpa || 0;
    const status = gpa >= 3.7 ? "متفوق" : gpa < 2.0 ? "في خطر" : "منتظم";
    return [i+1, s.name, s.nationalId||s.studentNo||"", s.email||"", s.group||"", gpa.toFixed(2), s.passedCourses||0, s.totalCourses||0, status];
  });
  const csv  = [headers,...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `students_${Date.now()}.csv`; a.click();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setText(id, v) { const el=document.getElementById(id); if(el) el.textContent=v; }
function esc(s) { return String(s).replace(/'/g,"&#39;").replace(/"/g,"&quot;"); }
function debounce(fn,d) { let t; return (...a) => { clearTimeout(t); t=setTimeout(()=>fn(...a),d); }; }
function skeletonRows(n) {
  return `<tr><td colspan="8">${Array(n).fill(`<div style="height:44px;margin-bottom:8px;background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);background-size:200%;animation:skeletonShimmer 1.5s infinite;border-radius:8px;"></div>`).join("")}</td></tr>`;
}
function emptyRow(msg) {
  return `<tr><td colspan="8"><div class="empty-state" style="padding:40px;"><p>${msg}</p></div></td></tr>`;
}
