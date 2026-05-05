// ─── Doctor Students JS ──────────────────────────────────────────────────────
const auth = PortalUtils.guard("doctor");
if (auth) init();

let currentPage = 1;
let allStudents = [];
let totalPages  = 1;

function init() {
  // Logout handled by PortalUtils
  PortalUtils.setupTopbar(auth.payload);

  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.addEventListener("input", debounce(() => { currentPage = 1; loadStudents(); }, 300));
  
  const groupFilter = document.getElementById("groupFilter");
  if (groupFilter) groupFilter.addEventListener("change", () => { currentPage = 1; loadStudents(); });

  const statusFilter = document.getElementById("statusFilter");
  if (statusFilter) statusFilter.addEventListener("change", () => { currentPage = 1; loadStudents(); });
  
  document.getElementById("exportBtn")?.addEventListener("click", exportCSV);

  loadStudents();
}

// ─── Load Students from API ──────────────────────────────────────────────────
async function loadStudents() {
  const group  = document.getElementById("groupFilter")?.value  || "all";
  const search = document.getElementById("searchInput")?.value || "";
  const params = new URLSearchParams({ 
    page:   currentPage, 
    limit:  20, 
    group:  group,
    search: search
  });

  const tbody = document.getElementById("studentsTable");
  if (tbody) tbody.innerHTML = skeletonRows(5);

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/students?${params}`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) { if (tbody) tbody.innerHTML = emptyRow("تعذّر تحميل قائمة الطلاب"); return; }
    
    const data  = await res.json();
    allStudents = data.students || [];
    totalPages  = data.totalPages || 1;

    // Update counters
    setText("sc1", data.total || 0);
    setText("sc2", allStudents.filter(s => s.gpa >= 3.7).length); // Excellent
    setText("sc3", allStudents.filter(s => s.passedCourses < s.totalCourses).length); // Pending
    setText("sc4", allStudents.filter(s => s.gpa < 2.0).length); // At Risk

    // Update group filter if data provided
    const gFilter = document.getElementById("groupFilter");
    if (gFilter && data.groups && gFilter.options.length <= 1) {
       data.groups.forEach(g => {
         const opt = document.createElement("option");
         opt.value = g._id;
         opt.textContent = g.name;
         gFilter.appendChild(opt);
       });
    }

    setText("studentsCount", `${data.total || 0} طالب`);
    renderStudents(allStudents);
    renderPagination(totalPages);

  } catch (err) { 
    console.error("Students error:", err); 
    if (tbody) tbody.innerHTML = emptyRow("حدث خطأ في الاتصال");
  }
}

function renderStudents(students) {
  const tbody = document.getElementById("studentsTable");
  if (!tbody) return;
  
  if (!students.length) {
    tbody.innerHTML = emptyRow("لا توجد نتائج تطابق بحثك");
    return;
  }

  tbody.innerHTML = students.map((s, i) => {
    const initials = (s.name || "").slice(0, 2);
    const gpa      = s.gpa || 0;
    
    let statusCls = "good", statusLabel = "منتظم";
    if (gpa >= 3.7) { statusCls = "excellent"; statusLabel = "متفوق"; }
    else if (gpa < 2.0) { statusCls = "risk"; statusLabel = "في خطر"; }
    
    let gpaCls = "good";
    if (gpa >= 3.7) gpaCls = "excellent";
    else if (gpa < 2.0) gpaCls = "risk";

    const completionPct = s.totalCourses > 0 ? Math.round((s.passedCourses / s.totalCourses) * 100) : 0;

    return `
      <tr>
        <td><strong>${(currentPage - 1) * 20 + i + 1}</strong></td>
        <td>
          <div class="user-row">
            <div class="avatar">${initials}</div>
            <div class="user-row-info">
              <strong>${s.name}</strong>
              <span>${s.email || ""}</span>
            </div>
          </div>
        </td>
        <td>${s.nationalId || s.studentNo || "-"}</td>
        <td><span class="badge badge-blue">${s.group || "-"}</span></td>
        <td><span class="grade-pill ${gpaCls}">${gpa.toFixed(2)} / 4.00</span></td>
        <td>
          <div class="attend-bar"><div class="attend-fill" style="width:${completionPct}%;"></div></div>
          <span style="font-size:1.15rem;">إنجاز ${s.passedCourses}/${s.totalCourses}</span>
        </td>
        <td><span class="status-chip ${statusCls}">${statusLabel}</span></td>
        <td>
          <div class="action-btns">
            <button class="action-btn edit" onclick="location.href='grades.html?studentId=${s._id}'" title="رصد الدرجات">
              <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="action-btn view" title="الملف الشخصي"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
            <button class="action-btn" style="background:#f0fdf4;color:#16a34a;" onclick="location.href='messages.html?to=${s._id}'" title="مراسلة"><svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

function renderPagination(total) {
  const wrap = document.querySelector(".pagination-wrap");
  if (!wrap) return;
  // Simplified pagination for now
  wrap.style.display = total > 1 ? "flex" : "none";
}

function exportCSV() {
  const headers = ["الطالب", "الرقم الجامعي", "المجموعة", "GPA", "الكورسات المنجزة"];
  const rows = allStudents.map(s => [s.name, s.nationalId, s.group, s.gpa, `${s.passedCourses}/${s.totalCourses}`]);
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "students_list.csv"; a.click();
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function skeletonRows(n) { return `<tr><td colspan="8">${Array(n).fill('<div style="height:40px;margin-bottom:10px;background:#f1f5f9;border-radius:8px;animation:skeletonShimmer 1.5s infinite;"></div>').join('')}</td></tr>`; }
function emptyRow(msg) { return `<tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8;font-size:1.3rem;">${msg}</td></tr>`; }
function debounce(fn, delay) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), delay); }; }
