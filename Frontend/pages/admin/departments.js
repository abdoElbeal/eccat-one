// Departments Management JS
let editingDeptId = null;
let _allDepts = [];   // cache for client-side search

const auth = PortalUtils.guard("admin");
if (auth) init();

function init() {
  // Logout handled by PortalUtils
  document.getElementById("addDeptForm").addEventListener("submit", saveDept);

  document.getElementById("addDeptBtnTop")?.addEventListener("click", () => {
    editingDeptId = null;
    document.getElementById("addDeptForm").reset();
    document.getElementById("saveDeptBtn").textContent = "حفظ وإضافة القسم";
    document.getElementById("deptFormTitle").textContent = "إضافة قسم جديد";
    document.getElementById("deptName").focus();
  });

  // Set-head modal backdrop
  document.getElementById("setHeadModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("setHeadModal")) closeSetHeadModal();
  });

  // In-page search
  document.getElementById("deptSearch")?.addEventListener("input", debounce((e) => {
    filterDeptTable(e.target.value.toLowerCase());
  }, 300));

  // Top-bar search mirrors to deptSearch
  document.getElementById("topSearch")?.addEventListener("input", debounce((e) => {
    const ds = document.getElementById("deptSearch");
    if (ds) ds.value = e.target.value;
    filterDeptTable(e.target.value.toLowerCase());
  }, 300));

  loadDepartments();
  loadStats();
  loadDoctorsForFormSelect();
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const DEPT_ICONS = [
  { bg: "#eff6ff", color: "#2463eb",  svg: `<path d="M16 18l2-2-2-2M8 18l-2-2 2-2M12 2L2 7l10 5 10-5-10-5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` },
  { bg: "#fdf2f8", color: "#a21caf",  svg: `<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` },
  { bg: "#f0fdf4", color: "#16a34a",  svg: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` },
  { bg: "#fff7ed", color: "#ea580c",  svg: `<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v4l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>` },
  { bg: "#f5f3ff", color: "#7c3aed",  svg: `<rect x="2" y="7" width="20" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="currentColor" stroke-width="2"/>` },
];

// ── Load Departments ──────────────────────────────────────────────────────────
async function loadDepartments() {
  document.getElementById("deptsTable").innerHTML =
    `<tr><td colspan="6" class="text-center text-muted" style="padding:30px;">جارٍ التحميل...</td></tr>`;
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/departments`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `خطأ ${res.status}`);
    }
    const data = await res.json();
    _allDepts = data.departments || [];
    renderDepts(_allDepts);
    const countEl = document.getElementById("deptCount");
    if (countEl) countEl.textContent = _allDepts.length;
  } catch (err) {
    console.error("Load depts error:", err);
    document.getElementById("deptsTable").innerHTML = `
      <tr><td colspan="6" style="padding:40px;text-align:center;">
        <div style="color:#ef4444;font-size:1.4rem;margin-bottom:10px;">⚠️ تعذّر تحميل الأقسام</div>
        <div style="color:#94a3b8;font-size:1.25rem;margin-bottom:16px;">${err.message}</div>
        <button onclick="loadDepartments()"
          style="padding:9px 22px;background:#2463eb;color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:1.3rem;font-family:inherit;font-weight:600;">
          🔄 إعادة المحاولة
        </button>
      </td></tr>`;
  }
}

// ── Client-side filter ────────────────────────────────────────────────────────
function filterDeptTable(q) {
  if (!q) { renderDepts(_allDepts); return; }
  const filtered = _allDepts.filter((d) =>
    d.name.toLowerCase().includes(q) ||
    d.code.toLowerCase().includes(q) ||
    (d.description || "").toLowerCase().includes(q)
  );
  renderDepts(filtered);
}

function renderDepts(depts) {
  const tbody = document.getElementById("deptsTable");
  if (!depts.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:30px;">لا توجد نتائج مطابقة</td></tr>`;
    return;
  }
  tbody.innerHTML = depts.map((d, i) => {
    const icon = DEPT_ICONS[i % DEPT_ICONS.length];
    const head = d.headOfDepartment;
    const headName = head
      ? `${head.firstName || ""} ${head.lastName || ""}`.trim() || head.email
      : "—";
    const studentsCount = d.students?.length || 0;
    const subjectsCount = d.subjects?.length || 0;
    const statusDot   = d.status === "inactive" ? "status-dot used" : "status-dot active";

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="background:${icon.bg};color:${icon.color};width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg viewBox="0 0 24 24" style="width:18px;height:18px;">${icon.svg}</svg>
            </div>
            <div>
              <strong>${d.name}</strong>
              ${d.description ? `<div class="text-muted" style="font-size:1.15rem;">${d.description.slice(0, 50)}${d.description.length > 50 ? "…" : ""}</div>` : ""}
            </div>
          </div>
        </td>
        <td><span class="badge badge-gray">${d.code || "—"}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:1.3rem;">${headName}</span>
            <button style="padding:3px 10px;border-radius:7px;border:1.5px solid #2463eb;background:#eff6ff;color:#2463eb;cursor:pointer;font-size:1.1rem;font-family:inherit;"
              onclick="openSetHeadModal('${d._id}','${d.name.replace(/'/g, "\\'")}','${head?._id || ""}')">
              ${head ? "تغيير" : "تعيين"}
            </button>
          </div>
        </td>
        <td><span class="badge badge-blue">${studentsCount.toLocaleString("ar")}</span></td>
        <td><span style="font-weight:600;">${subjectsCount} مادة</span></td>
        <td>
          <div class="action-btns">
            <button class="action-btn edit" title="تعديل"
              onclick="editDept('${d._id}','${d.name.replace(/'/g, "\\'")}','${d.code}','${(d.description||"").replace(/'/g, "\\'")}','${d.location?.building||""}','${d.location?.floor||""}','${d.status||"active"}')">
              <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg>
            </button>
            <button class="action-btn delete" title="حذف" onclick="deleteDept('${d._id}','${d.name.replace(/'/g, "\\'")}')">
              <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/stats`, { headers: PortalUtils.getAuthHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const el   = document.getElementById("totalEnrolled");
    if (el && data.studentsCount !== undefined)
      el.textContent = data.studentsCount.toLocaleString("ar");
  } catch (err) { console.error("Stats error:", err); }
}

// ── Form: Add / Edit Department ───────────────────────────────────────────────
async function loadDoctorsForFormSelect() {
  const sel = document.getElementById("deptHead");
  if (!sel) return;
  try {
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/users?role=doctor&limit=100`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) return;
    const data = await res.json();
    const docs = data.users || [];
    sel.innerHTML = `<option value="">اختر عضو هيئة التدريس...</option>` +
      docs.map((d) => {
        const name = `${d.firstName || ""} ${d.lastName || ""}`.trim() || d.email;
        return `<option value="${d._id}">${name}</option>`;
      }).join("");
  } catch (err) { console.error("Load doctors error:", err); }
}

async function saveDept(e) {
  e.preventDefault();
  const name     = document.getElementById("deptName").value.trim();
  const code     = document.getElementById("deptCode").value.trim().toUpperCase();
  const head     = document.getElementById("deptHead").value;
  const desc     = document.getElementById("deptDesc").value.trim();
  const building = document.getElementById("deptBuilding")?.value.trim() || "";
  const floor    = document.getElementById("deptFloor")?.value.trim() || "";
  const status   = document.getElementById("deptStatus")?.value || "active";

  if (!name || !code) { alert("يرجى إدخال اسم وكود القسم"); return; }

  const btn      = document.getElementById("saveDeptBtn");
  const original = btn.textContent;
  btn.textContent = "جارٍ الحفظ…"; btn.disabled = true;

  try {
    const url = editingDeptId
      ? `${window.CONFIG.API_BASE_URL}/api/admin/departments/${editingDeptId}`
      : `${window.CONFIG.API_BASE_URL}/api/admin/departments`;

    const body = {
      name, code, description: desc, status,
      headOfDepartment: head || null,
      location: { building, floor },
    };

    const res  = await fetch(url, {
      method: editingDeptId ? "PATCH" : "POST",
      headers: PortalUtils.getAuthHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "فشل حفظ القسم");

    const isEditing = !!editingDeptId;
    document.getElementById("addDeptForm").reset();
    editingDeptId = null;
    btn.textContent = "حفظ وإضافة القسم";
    const titleEl = document.getElementById("deptFormTitle");
    if (titleEl) titleEl.textContent = "إضافة قسم جديد";

    loadDepartments();
    PortalUtils.showToast(isEditing ? "✅ تم تحديث القسم بنجاح" : "✅ تم إضافة القسم بنجاح");
  } catch (err) {
    alert(err.message);
    btn.textContent = original;
  } finally {
    btn.disabled = false;
  }
}

function editDept(id, name, code, desc, building, floor, status) {
  editingDeptId = id;
  document.getElementById("deptName").value = name;
  document.getElementById("deptCode").value = code;
  document.getElementById("deptDesc").value = desc;
  if (document.getElementById("deptBuilding")) document.getElementById("deptBuilding").value = building;
  if (document.getElementById("deptFloor"))    document.getElementById("deptFloor").value    = floor;
  if (document.getElementById("deptStatus"))   document.getElementById("deptStatus").value   = status;
  document.getElementById("saveDeptBtn").textContent = "تحديث القسم";
  const titleEl = document.getElementById("deptFormTitle");
  if (titleEl) titleEl.textContent = "تعديل القسم";
  document.getElementById("deptName").focus();
  document.getElementById("deptName").scrollIntoView({ behavior: "smooth", block: "center" });
}

async function deleteDept(id, name) {
  if (!confirm(`هل أنت متأكد من حذف قسم "${name}"؟\nسيتم حذف جميع البيانات المرتبطة.`)) return;
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/departments/${id}`, {
      method: "DELETE", headers: PortalUtils.getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "فشل الحذف");
    loadDepartments();
    PortalUtils.showToast("🗑️ تم حذف القسم بنجاح");
  } catch (err) { alert(err.message); }
}

// ── Set Department Head Modal ─────────────────────────────────────────────────
async function openSetHeadModal(deptId, deptName, currentDoctorId = "") {
  document.getElementById("setHeadDeptId").value = deptId;
  document.getElementById("setHeadDeptName").textContent = `القسم: ${deptName}`;

  const sel = document.getElementById("setHeadDoctorSel");
  sel.innerHTML = `<option value="">جارٍ التحميل...</option>`;

  try {
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/users?role=doctor&limit=100`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    const data = await res.json();
    const docs = data.users || [];
    sel.innerHTML = `<option value="">بدون رئيس (إلغاء التعيين)</option>` +
      docs.map((d) => {
        const name = `${d.firstName || ""} ${d.lastName || ""}`.trim() || d.email;
        return `<option value="${d._id}" ${d._id === currentDoctorId ? "selected" : ""}>${name}</option>`;
      }).join("");
  } catch {
    sel.innerHTML = `<option value="">تعذّر تحميل الدكاترة</option>`;
  }

  document.getElementById("setHeadModal").style.display = "flex";
}

function closeSetHeadModal() {
  document.getElementById("setHeadModal").style.display = "none";
}

async function confirmDeptHead() {
  const deptId   = document.getElementById("setHeadDeptId").value;
  const doctorId = document.getElementById("setHeadDoctorSel").value;
  const btn      = document.getElementById("confirmSetHeadBtn");
  btn.textContent = "جارٍ التعيين…"; btn.disabled = true;

  try {
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/departments/${deptId}/head`, {
      method: "PATCH",
      headers: PortalUtils.getAuthHeaders(),
      body: JSON.stringify({ doctorId: doctorId || null }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "فشل التعيين");
    closeSetHeadModal();
    loadDepartments();
    PortalUtils.showToast("✅ تم تعيين رئيس القسم بنجاح");
  } catch (err) {
    alert(err.message);
  } finally {
    btn.textContent = "تعيين"; btn.disabled = false;
  }
}

function debounce(fn, delay) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), delay); }; }
