// ─── Admin Groups Management ──────────────────────────────────────────────────
// State MUST be before auth to avoid Temporal Dead Zone
let allGroups      = [];
let allDepts       = [];
let currentGroupId = "";
let currentGroupYear      = 1;
let currentGroupName      = "";
let currentGroupCapacity  = 0;
let currentGroupDept      = "";

const auth = PortalUtils.guard("admin");
if (auth) init();

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  PortalUtils.setupTopbar(auth.payload);

  // Buttons
  document.getElementById("addGroupBtn").addEventListener("click", () => openGroupModal());
  document.getElementById("closeGroupModal").addEventListener("click", closeGroupModal);
  document.getElementById("cancelGroup").addEventListener("click", closeGroupModal);
  document.getElementById("saveGroup").addEventListener("click", saveGroup);
  document.getElementById("groupModal").addEventListener("click", e => { if (e.target.id === "groupModal") closeGroupModal(); });
  document.getElementById("membersModal").addEventListener("click", e => { if (e.target.id === "membersModal") closeMembersModal(); });

  // Filters
  document.getElementById("yearFilter").addEventListener("change", renderCards);
  document.getElementById("deptFilter").addEventListener("change", renderCards);
  document.getElementById("topSearch").addEventListener("input", renderCards);

  // Auto-generate code when name/year/dept changes
  ["groupName","groupYear","groupDept"].forEach(id =>
    document.getElementById(id)?.addEventListener("input", autoGenerateCode)
  );
  document.getElementById("groupYear")?.addEventListener("change", autoGenerateCode);
  document.getElementById("groupDept")?.addEventListener("change", autoGenerateCode);

  // Student search
  document.getElementById("searchStudentBtn").addEventListener("click", searchStudents);
  document.getElementById("studentSearchInput").addEventListener("keydown", e => {
    if (e.key === "Enter") searchStudents();
  });

  loadDepts();
  loadGroups();
}

// ── Code Auto-Generator ───────────────────────────────────────────────────────
function autoGenerateCode() {
  const name  = document.getElementById("groupName").value.trim();
  const year  = document.getElementById("groupYear").value;
  const dept  = document.getElementById("groupDept");
  const deptText = dept.options[dept.selectedIndex]?.text?.replace(/^عام.*$/, "") || "";
  const deptCode = deptText.slice(0, 2).toUpperCase() || "GN";
  const nameCode  = name.replace(/\s+/g, "").slice(0, 3).toUpperCase() || "GRP";
  const codeEl = document.getElementById("groupCode");
  if (!codeEl.dataset.manual) {
    codeEl.value = `Y${year}-${deptCode}-${nameCode}`;
  }
}

// ─── Load Departments ─────────────────────────────────────────────────────────
async function loadDepts() {
  try {
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/departments`, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    allDepts   = data.departments || [];
    const opts = allDepts.map(d => `<option value="${d._id}">${d.name}</option>`).join("");
    document.getElementById("deptFilter").innerHTML += opts;
    document.getElementById("groupDept").innerHTML  = `<option value="">عام / مشترك</option>` + opts;
  } catch (e) { console.error(e); }
}

// ─── Load Groups ──────────────────────────────────────────────────────────────
async function loadGroups() {
  const grid = document.getElementById("groupsGrid");
  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#94a3b8;font-size:1.4rem;">⏳ جارٍ تحميل المجموعات...</div>`;
  try {
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/groups`, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    allGroups  = data.groups || [];
    updateHeroStats();
    renderCards();
  } catch {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#ef4444;">⚠️ خطأ في تحميل المجموعات</div>`;
  }
}

// ─── Hero Stats ───────────────────────────────────────────────────────────────
function updateHeroStats() {
  document.getElementById("heroTotalGroups").textContent  = allGroups.length;
  const totalStudents = allGroups.reduce((s, g) => s + (g.students?.length || 0), 0);
  document.getElementById("heroTotalStudents").textContent = totalStudents;
  const fills = allGroups.filter(g => g.capacity > 0).map(g => ((g.students?.length || 0) / g.capacity) * 100);
  const avg   = fills.length ? Math.round(fills.reduce((a, b) => a + b, 0) / fills.length) : 0;
  document.getElementById("heroAvgFill").textContent = avg + "%";
}

// ─── Render Cards ─────────────────────────────────────────────────────────────
function renderCards() {
  const yearVal  = document.getElementById("yearFilter").value;
  const deptVal  = document.getElementById("deptFilter").value;
  const search   = (document.getElementById("topSearch")?.value || "").toLowerCase();
  const grid     = document.getElementById("groupsGrid");

  let filtered = allGroups.filter(g => {
    const matchYear = !yearVal || String(g.yearLevel) === yearVal;
    const matchDept = !deptVal || String(g.department?._id || g.department) === deptVal;
    const matchSearch = !search || g.name.toLowerCase().includes(search) || g.code.toLowerCase().includes(search);
    return matchYear && matchDept && matchSearch;
  });

  if (!filtered.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;" class="empty-state">
        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <h3>لا توجد مجموعات</h3>
        <p>لم يتم إنشاء مجموعات بعد. اضغط على "مجموعة جديدة" للبدء.</p>
      </div>`;
    return;
  }

  // Group by yearLevel for display
  const byYear = {};
  filtered.forEach(g => {
    const y = g.yearLevel || 0;
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(g);
  });

  const yearNames = { 1:"السنة الأولى", 2:"السنة الثانية", 3:"السنة الثالثة", 4:"السنة الرابعة" };
  let html = "";

  Object.keys(byYear).sort().forEach(yr => {
    const groups = byYear[yr];
    html += `
      <div style="grid-column:1/-1; display:flex; align-items:center; gap:12px; margin:8px 0 4px;">
        <div style="background:linear-gradient(135deg,#2463eb,#7c3aed);color:#fff;font-size:1.2rem;font-weight:700;padding:4px 16px;border-radius:20px;">
          ${yearNames[yr] || `السنة ${yr}`}
        </div>
        <div style="flex:1;height:1px;background:#e2e8f0;"></div>
        <span style="font-size:1.2rem;color:#94a3b8;">${groups.length} مجموعة</span>
      </div>`;
    groups.forEach(g => { html += buildCard(g); });
  });

  grid.innerHTML = html;
}

function buildCard(g) {
  const count    = g.students?.length || 0;
  const cap      = g.capacity || 0;
  const pct      = cap > 0 ? Math.min(100, Math.round((count / cap) * 100)) : 0;
  const fillCls  = pct >= 90 ? "full" : pct >= 60 ? "mid" : "low";
  const deptName = g.department?.name || "عام";
  const yearNames = { 1:"سنة 1", 2:"سنة 2", 3:"سنة 3", 4:"سنة 4" };

  return `
    <div class="group-card" onclick="openMembersModal('${g._id}')">
      <div class="group-card-header">
        <div class="group-card-icon">
          <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><circle cx="16" cy="3.13" r="4"/></svg>
        </div>
        <div class="group-card-meta">
          <h3>${g.name}</h3>
          <span class="code-pill">${g.code}</span>
        </div>
        <div class="group-card-actions" onclick="event.stopPropagation()">
          <button class="action-btn edit" onclick="openGroupModal('${g._id}')" title="تعديل">✎</button>
          <button class="action-btn delete" onclick="deleteGroup('${g._id}','${g.name}')" title="حذف">🗑</button>
        </div>
      </div>
      <div class="group-card-body">
        <div class="gc-info-row">
          <span class="gc-chip"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${yearNames[g.yearLevel] || "—"}</span>
          <span class="gc-chip"><svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>${deptName}</span>
          ${!g.isActive ? `<span class="gc-chip" style="background:#fee2e2;color:#ef4444;">غير نشطة</span>` : ""}
        </div>
        <div class="capacity-block">
          <div class="capacity-row">
            <span class="cap-label">الطلاب المسجّلون</span>
            <span class="cap-val">${count}${cap > 0 ? ` / ${cap}` : ""}</span>
          </div>
          ${cap > 0 ? `
          <div class="cap-bar"><div class="cap-fill ${fillCls}" style="width:${pct}%"></div></div>
          <div style="font-size:1.1rem;color:#94a3b8;margin-top:4px;">${pct}% امتلاء ${pct >= 90 ? "🔴 ممتلئة" : pct >= 60 ? "🟡 شبه ممتلئة" : "🟢 متاحة"}</div>
          ` : `<div style="font-size:1.15rem;color:#94a3b8;">بدون حد أقصى</div>`}
        </div>
      </div>
      <div class="group-card-footer">
        <button class="btn" style="background:#eff6ff;color:#2463eb;border:none;padding:8px 14px;border-radius:8px;font-family:inherit;font-size:1.2rem;cursor:pointer;" onclick="event.stopPropagation();openMembersModal('${g._id}')">
          👥 إدارة الطلاب
        </button>
        <button class="btn" style="background:#f0fdf4;color:#16a34a;border:none;padding:8px 14px;border-radius:8px;font-family:inherit;font-size:1.2rem;cursor:pointer;" onclick="event.stopPropagation();openGroupModal('${g._id}')">
          ✎ تعديل
        </button>
      </div>
    </div>`;
}

// ─── Group Modal (Create / Edit) ──────────────────────────────────────────────
async function openGroupModal(id = null) {
  const modal = document.getElementById("groupModal");
  document.getElementById("modalTitle").textContent = id ? "تعديل المجموعة" : "إضافة مجموعة جديدة";
  document.getElementById("saveGroup").textContent = id ? "حفظ التعديلات" : "حفظ المجموعة";
  document.getElementById("groupId").value = id || "";

  // Reset
  ["groupName","groupCode","groupCapacity"].forEach(fid => {
    const el = document.getElementById(fid);
    if (el) el.value = fid === "groupCapacity" ? "30" : "";
  });
  document.getElementById("groupCode").dataset.manual = "";
  document.getElementById("groupYear").value = "1";
  document.getElementById("groupDept").value = "";
  document.getElementById("groupActive").checked = true;

  if (id) {
    const g = allGroups.find(x => x._id === id);
    if (g) {
      document.getElementById("groupName").value     = g.name;
      document.getElementById("groupCode").value     = g.code;
      document.getElementById("groupCode").dataset.manual = "1";
      document.getElementById("groupYear").value     = String(g.yearLevel || 1);
      document.getElementById("groupCapacity").value = g.capacity || "";
      document.getElementById("groupDept").value     = g.department?._id || g.department || "";
      document.getElementById("groupActive").checked = g.isActive !== false;
    }
  }

  modal.style.display = "flex";
  document.getElementById("groupName").focus();
}

function closeGroupModal() {
  document.getElementById("groupModal").style.display = "none";
}

async function saveGroup() {
  const id       = document.getElementById("groupId").value;
  const name     = document.getElementById("groupName").value.trim();
  const code     = document.getElementById("groupCode").value.trim();
  const yearLevel= parseInt(document.getElementById("groupYear").value);
  const capacity = parseInt(document.getElementById("groupCapacity").value) || 0;
  const dept     = document.getElementById("groupDept").value;
  const isActive = document.getElementById("groupActive").checked;

  if (!name || !code) { PortalUtils.showToast("الاسم والكود مطلوبان", "error"); return; }

  const btn = document.getElementById("saveGroup");
  btn.disabled = true; btn.textContent = "جارٍ الحفظ...";

  try {
    const method = id ? "PATCH" : "POST";
    const url    = id ? `${window.CONFIG.API_BASE_URL}/api/admin/groups/${id}` : `${window.CONFIG.API_BASE_URL}/api/admin/groups`;
    const body   = { name, code, yearLevel, isActive };
    if (capacity > 0) body.capacity = capacity;
    if (dept) body.department = dept;

    const res = await fetch(url, { method, headers: PortalUtils.getAuthHeaders(), body: JSON.stringify(body) });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "فشل الحفظ");
    PortalUtils.showToast(id ? "✅ تم تحديث المجموعة" : "✅ تم إنشاء المجموعة", "success");
    closeGroupModal();
    loadGroups();
  } catch (e) {
    PortalUtils.showToast("⚠️ " + e.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = id ? "حفظ التعديلات" : "حفظ المجموعة";
  }
}

async function deleteGroup(id, name) {
  if (!confirm(`هل تريد حذف مجموعة "${name}"؟ سيتم إزالة جميع الطلاب منها.`)) return;
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/groups/${id}`, { method: "DELETE", headers: PortalUtils.getAuthHeaders() });
    if (!res.ok) throw new Error("فشل الحذف");
    PortalUtils.showToast("✅ تم حذف المجموعة", "success");
    loadGroups();
  } catch (e) {
    PortalUtils.showToast("⚠️ " + e.message, "error");
  }
}

// ─── Members Modal ────────────────────────────────────────────────────────────
async function openMembersModal(groupId) {
  currentGroupId = groupId;
  const g = allGroups.find(x => x._id === groupId);
  if (!g) return;

  currentGroupYear     = g.yearLevel;
  currentGroupName     = g.name;
  currentGroupCapacity = g.capacity || 0;
  currentGroupDept     = g.department?._id || g.department || "";

  document.getElementById("membersModalTitle").textContent = `إدارة طلاب — ${g.name}`;
  document.getElementById("membersModalSub").textContent   =
    `${g.code} · السنة ${g.yearLevel} · ${g.students?.length || 0} طالب${g.capacity ? ` / ${g.capacity}` : ""}`;

  const capEl = document.getElementById("membersCap");
  if (g.capacity > 0) {
    const pct = Math.round(((g.students?.length || 0) / g.capacity) * 100);
    capEl.textContent = `${g.students?.length || 0} / ${g.capacity} (${pct}%)`;
    capEl.style.color = pct >= 90 ? "#ef4444" : pct >= 60 ? "#f59e0b" : "#22c55e";
  } else {
    capEl.textContent = `${g.students?.length || 0} طالب`;
  }

  // Reset search
  document.getElementById("studentSearchInput").value = "";
  document.getElementById("searchResultsBox").style.display = "none";
  document.getElementById("searchPlaceholder").style.display = "block";

  switchTab("members");
  document.getElementById("membersModal").style.display = "flex";
  await loadMembers(groupId);
}

function closeMembersModal() {
  document.getElementById("membersModal").style.display = "none";
}

async function loadMembers(groupId) {
  const tbody = document.getElementById("membersTableBody");
  tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:30px;color:#94a3b8;">جارٍ التحميل...</td></tr>`;
  try {
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/groups/${groupId || currentGroupId}`, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    const members = data.group?.students || [];

    if (!members.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="members-empty">لا يوجد طلاب في هذه المجموعة بعد</td></tr>`;
      return;
    }

    tbody.innerHTML = members.map(s => {
      const name = `${s.firstName || ""} ${s.lastName || ""}`.trim() || "طالب";
      const initials = name.slice(0, 2);
      return `
        <tr>
          <td>
            <div class="mem-row">
              <div class="mem-avatar">${initials}</div>
              <div>
                <strong>${name}</strong>
                <div style="font-size:1.1rem;color:#94a3b8;">${s.email || ""}</div>
              </div>
            </div>
          </td>
          <td>${s.nationalId || "—"}</td>
          <td>${s.email || "—"}</td>
          <td>
            <button class="action-btn delete" onclick="removeStudent('${s._id}','${name}')" title="إزالة من المجموعة">✕</button>
          </td>
        </tr>`;
    }).join("");
  } catch {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#ef4444;">خطأ في التحميل</td></tr>`;
  }
}

async function removeStudent(studentId, name) {
  if (!confirm(`إزالة "${name}" من المجموعة؟`)) return;
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/groups/remove-student`, {
      method: "POST", headers: PortalUtils.getAuthHeaders(),
      body: JSON.stringify({ groupId: currentGroupId, studentId })
    });
    if (!res.ok) throw new Error("فشلت الإزالة");
    PortalUtils.showToast(`✅ تم إزالة ${name}`, "success");
    await loadMembers();
    loadGroups();
  } catch (e) { PortalUtils.showToast("⚠️ " + e.message, "error"); }
}

// ─── Search & Add Students ────────────────────────────────────────────────────
async function searchStudents() {
  const q   = document.getElementById("studentSearchInput").value.trim();
  const box = document.getElementById("searchResultsBox");
  const ph  = document.getElementById("searchPlaceholder");

  if (!q) { PortalUtils.showToast("اكتب اسماً للبحث", "error"); return; }

  box.style.display = "none";
  ph.innerHTML = `<div style="padding:20px;color:#94a3b8;">🔍 جارٍ البحث...</div>`;
  ph.style.display = "block";

  try {
    // Filter by year and dept of the current group
    let url = `${window.CONFIG.API_BASE_URL}/api/admin/users?role=student&search=${encodeURIComponent(q)}&yearLevel=${currentGroupYear}`;
    if (currentGroupDept) url += `&department=${currentGroupDept}`;

    const res  = await fetch(url, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    const students = (data.users || data.students || []).filter(s => s.role === "student");

    if (!students.length) {
      ph.innerHTML = `<div style="padding:24px;text-align:center;color:#94a3b8;">لا يوجد طلاب مطابقون في السنة ${currentGroupYear}</div>`;
      return;
    }

    ph.style.display = "none";
    box.style.display = "block";
    box.innerHTML = students.map(s => {
      const name = `${s.firstName} ${s.lastName}`;
      const alreadyInGroup = allGroups
        .find(g => g._id === currentGroupId)?.students
        ?.some(m => String(m._id || m) === String(s._id));
      return `
        <div class="sr-item">
          <div class="sr-avatar">${name.slice(0,2)}</div>
          <div class="sr-info">
            <strong>${name}</strong>
            <small>${s.nationalId || s.email || ""} · ${s.groupId?.name ? `مجموعة: ${s.groupId.name}` : "بدون مجموعة"}</small>
          </div>
          ${alreadyInGroup
            ? `<span style="color:#22c55e;font-size:1.2rem;font-weight:700;">✓ مضاف</span>`
            : `<button class="btn btn-primary" style="padding:6px 16px;font-size:1.2rem;" onclick="addStudent('${s._id}','${name}')">+ إضافة</button>`
          }
        </div>`;
    }).join("");
  } catch (e) {
    ph.innerHTML = `<div style="padding:24px;color:#ef4444;">⚠️ خطأ: ${e.message}</div>`;
  }
}

async function addStudent(studentId, name) {
  // Check capacity
  const g = allGroups.find(x => x._id === currentGroupId);
  if (g?.capacity > 0 && (g.students?.length || 0) >= g.capacity) {
    PortalUtils.showToast("⚠️ المجموعة وصلت للحد الأقصى!", "error");
    return;
  }

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/groups/add-student`, {
      method: "POST", headers: PortalUtils.getAuthHeaders(),
      body: JSON.stringify({ groupId: currentGroupId, studentId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "فشلت الإضافة");
    PortalUtils.showToast(`✅ تم إضافة ${name}`, "success");
    await loadGroups();
    await loadMembers();
    // Refresh results
    searchStudents();
  } catch (e) { PortalUtils.showToast("⚠️ " + e.message, "error"); }
}

// ─── Tab Switching (inside Members Modal) ─────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll(".modal-tab").forEach(t =>
    t.classList.toggle("active", t.id === `tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)
  );
  document.querySelectorAll(".tab-section").forEach(s =>
    s.classList.toggle("active", s.id === `section${tab.charAt(0).toUpperCase() + tab.slice(1)}`)
  );
}

// ─── Legacy Logout (kept for backward compat) ─────────────────────────────────
function logout() { PortalUtils.clearAuth(); }
