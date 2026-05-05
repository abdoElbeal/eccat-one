// Users Management JS
let currentRole = new URLSearchParams(window.location.search).get("role") || "student";
let currentPage = 1;
const PER_PAGE = 10;

const auth = PortalUtils.guard("admin");
if (auth) init();

function init() {
  // Logout handled by PortalUtils

  // Role tabs
  document.getElementById("tabStudents").addEventListener("click", () => setRole("student"));
  document.getElementById("tabDoctors").addEventListener("click", () => setRole("doctor"));
  document.getElementById("tabTAs").addEventListener("click", () => setRole("ta"));

  // Set initial active tab
  document.getElementById("tabStudents").classList.toggle("active", currentRole === "student");
  document.getElementById("tabDoctors").classList.toggle("active", currentRole === "doctor");
  document.getElementById("tabTAs").classList.toggle("active", currentRole === "ta");

  // Search & filter
  document.getElementById("searchInput").addEventListener("input", debounce(() => { currentPage = 1; loadUsers(); }, 400));
  document.getElementById("deptFilter").addEventListener("change", () => { currentPage = 1; loadUsers(); });
  document.getElementById("statusFilter").addEventListener("change", () => { currentPage = 1; loadUsers(); });

  // Top search bar mirrors to searchInput
  document.getElementById("topSearch")?.addEventListener("input", debounce((e) => {
    document.getElementById("searchInput").value = e.target.value;
    currentPage = 1;
    loadUsers();
  }, 400));

  // Pagination
  document.getElementById("prevPage").addEventListener("click", () => changePage(-1));
  document.getElementById("nextPage").addEventListener("click", () => changePage(1));
  document.querySelectorAll(".page-btns [data-page]").forEach((btn) => {
    btn.addEventListener("click", () => { currentPage = parseInt(btn.dataset.page); loadUsers(); });
  });

  document.getElementById("yearFilter").addEventListener("change", () => { currentPage = 1; loadUsers(); });

  // Add user modal
  document.getElementById("addUserBtn").addEventListener("click", openAddModal);
  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("cancelModal").addEventListener("click", closeModal);

  document.getElementById("addUserModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("addUserModal")) closeModal();
  });

  // Role tabs inside modal
  document.querySelectorAll("#addUserModal .role-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("#addUserModal .role-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const role = tab.dataset.role;
      document.getElementById("newUserRole").value = role;
      
      // Toggle role specific fields
      const taGroup = document.getElementById("taDegreeGroup");
      if (taGroup) taGroup.style.display = role === "ta" ? "block" : "none";

      const yearGroup = document.getElementById("yearLevelGroup");
      if (yearGroup) yearGroup.style.display = role === "student" ? "block" : "none";
    });
  });

  // Photo preview
  document.getElementById("newUserPhoto").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById("userPhotoPreview").src = ev.target.result;
      document.getElementById("userPhotoPreview").style.display = "block";
      document.getElementById("photoPlaceholder").style.display = "none";
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("saveUserBtn").addEventListener("click", saveUser);
  document.getElementById("exportBtn").addEventListener("click", exportUsers);

  // Load departments for filter dropdown
  loadDeptsForFilterBar();
  loadUsers();
  loadSummaryStats();
}

function setRole(role) {
  currentRole = role;
  currentPage = 1;
  document.getElementById("tabStudents").classList.toggle("active", role === "student");
  document.getElementById("tabDoctors").classList.toggle("active", role === "doctor");
  document.getElementById("tabTAs").classList.toggle("active", role === "ta");
  loadUsers();
}

async function loadUsers() {
  const search = document.getElementById("searchInput").value.trim();
  const dept   = document.getElementById("deptFilter").value;
  const year   = document.getElementById("yearFilter").value;
  const params = new URLSearchParams({
    role: currentRole, page: currentPage, limit: PER_PAGE,
    ...(search && { search }),
    ...(dept   && { department: dept }),
    ...(year   && { yearLevel: year }),
  });

  document.getElementById("usersTable").innerHTML =
    `<tr><td colspan="6" class="text-center text-muted" style="padding:30px;">جارٍ التحميل...</td></tr>`;

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/users?${params}`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `خطأ ${res.status}`);
    }
    const data = await res.json();
    renderUsers(data.users || []);
    const info = document.getElementById("paginationInfo");
    if (info && data.total !== undefined)
      info.textContent = `عرض ${Math.min(PER_PAGE, data.users?.length || 0)} من أصل ${data.total.toLocaleString("ar")} مستخدم`;
  } catch (err) {
    console.error("Load users error:", err);
    document.getElementById("usersTable").innerHTML =
      `<tr><td colspan="6" class="text-center" style="padding:30px;color:#ef4444;">
        ⚠️ تعذّر تحميل المستخدمين: ${err.message}
        <br><button onclick="loadUsers()" style="margin-top:10px;padding:6px 16px;background:#2463eb;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit;">إعادة المحاولة</button>
      </td></tr>`;
  }
}

function renderUsers(users) {
  const tbody = document.getElementById("usersTable");
  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:30px;">لا توجد نتائج</td></tr>`;
    return;
  }
  tbody.innerHTML = users.map((u) => {
    const name     = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "—";
    const initials = name.slice(0, 2);
    const isActive = u.isVerified;
    const dept     = u.department?.name || u.department || "—";
    
    let roleLabel = "طالب";
    let roleClass = "badge-blue";
    if (u.role === "doctor") {
      roleLabel = "دكتور";
      roleClass = "badge-purple";
    } else if (u.role === "ta") {
      roleLabel = "معيد";
      roleClass = "badge-green";
    }

    const photoHtml = u.profileImage
      ? `<img src="${window.CONFIG.API_BASE_URL}${u.profileImage}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;" onerror="this.style.display='none';this.nextSibling.style.display='flex';" /><div class="user-avatar" style="display:none;">${initials}</div>`
      : `<div class="user-avatar">${initials}</div>`;
    
    // Encode user data for edit button
    const safeUser = encodeURIComponent(JSON.stringify(u));

    return `
      <tr onclick="viewDetails('${u._id}')" style="cursor:pointer;">
        <td>${photoHtml}</td>
        <td>
          <div style="font-weight:600;">${name}</div>
          <div class="text-muted" style="font-size:1.15rem;">${u.nationalId || ""}</div>
        </td>
        <td>${u.email}</td>
        <td><span class="badge ${roleClass}">${roleLabel}</span> · <span class="text-muted">${dept}</span></td>
        <td><span class="status-dot ${isActive ? "active" : "inactive"}">${isActive ? "مفعّل" : "غير مفعّل"}</span></td>
        <td>
          <div class="action-btns">
            <button class="action-btn edit" title="تعديل" onclick="event.stopPropagation(); editUser(decodeURIComponent('${safeUser}'))">
              <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 02 2h14a2 2 0 0 02-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg>
            </button>
            <button class="action-btn delete" title="حذف" onclick="event.stopPropagation(); deleteUser('${u._id}','${name.replace(/'/g, "\\'")}')">
              <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

async function viewDetails(userId) {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/users/${userId}`, {
      headers: PortalUtils.getAuthHeaders()
    });
    const data = await res.json();
    const u = data.user;

    document.getElementById("det_name").textContent = u.fullName;
    document.getElementById("det_email").textContent = u.email;
    document.getElementById("det_natId").textContent = u.nationalId;
    document.getElementById("det_age").textContent = u.age || "—";
    document.getElementById("det_year").textContent = u.yearLevel ? "السنة " + u.yearLevel : "—";
    document.getElementById("det_dept").textContent = u.department?.name || u.department || "غير محدد";
    document.getElementById("det_address").textContent = u.address || "—";
    
    document.getElementById("det_photo").src = u.profileImage 
      ? `${window.CONFIG.API_BASE_URL}${u.profileImage}`
      : "../../assets/avatar.png";

    const badge = document.getElementById("det_role_badge");
    badge.textContent = u.role === "student" ? "طالب" : (u.role === "doctor" ? "دكتور" : (u.role === "ta" ? "معيد" : "مشرف"));
    badge.className = "badge " + (u.role === "student" ? "badge-blue" : (u.role === "doctor" ? "badge-purple" : "badge-green"));

    const groupBox = document.getElementById("det_group");
    groupBox.textContent = u.groupId ? `${u.groupId.name} (${u.groupId.code})` : "غير معين لمجموعة بعد";
    groupBox.style.color = u.groupId ? "#16a34a" : "#2463eb";

    document.getElementById("det_edit_btn").onclick = () => {
       closeDetailsModal();
       editUser(u);
    };

    document.getElementById("userDetailsModal").style.display = "flex";
  } catch (err) {
    console.error(err);
    alert("تعذر تحميل بيانات المستخدم");
  }
}

function closeDetailsModal() {
  document.getElementById("userDetailsModal").style.display = "none";
}

// ── Modal Helpers ─────────────────────────────────────────────────────────────
function openAddModal() {
  document.getElementById("addUserModalTitle").textContent = "إضافة مستخدم جديد";
  document.getElementById("editUserId").value = "";
  
  // Reset form
  document.getElementById("newUserFirstName").value = "";
  document.getElementById("newUserLastName").value  = "";
  document.getElementById("newUserEmail").value     = "";
  document.getElementById("newUserNatId").value     = "";
  document.getElementById("newUserAge").value       = "";
  document.getElementById("newUserPassword").value  = "";
  document.getElementById("newUserAddress").value   = "";
  document.getElementById("newUserHighSchool").value = "";
  document.getElementById("newUserRole").value      = "student";
  document.getElementById("newUserPhoto").value     = "";
  document.getElementById("userPhotoPreview").src   = "";
  document.getElementById("userPhotoPreview").style.display  = "none";
  document.getElementById("photoPlaceholder").style.display  = "flex";
  
  // Enable role tabs
  document.querySelectorAll("#addUserModal .role-tab").forEach((t) => {
    t.style.pointerEvents = "auto";
    t.style.opacity = "1";
    t.classList.remove("active");
  });
  document.getElementById("modalRoleStudent").classList.add("active");

  document.getElementById("addUserModal").style.display = "flex";
  loadDeptsForModal();
}

function editUser(userJson) {
  const u = typeof userJson === "string" ? JSON.parse(userJson) : userJson;
  
  document.getElementById("addUserModalTitle").textContent = "تعديل بيانات المستخدم";
  document.getElementById("editUserId").value = u._id;
  
  document.getElementById("newUserFirstName").value = u.firstName || "";
  document.getElementById("newUserLastName").value  = u.lastName || "";
  document.getElementById("newUserEmail").value     = u.email || "";
  document.getElementById("newUserNatId").value     = u.nationalId || "";
  document.getElementById("newUserAge").value       = u.age || "";
  document.getElementById("newUserPassword").value  = ""; // Keep empty for no change
  document.getElementById("newUserPassword").placeholder = "اتركه فارغاً للحفاظ على الحالي";
  document.getElementById("newUserAddress").value   = u.address || "";
  document.getElementById("newUserHighSchool").value = u.highSchoolName || "";
  document.getElementById("newUserRole").value      = u.role;
  document.getElementById("newUserPhoto").value     = "";

  // Set TA field if editing a TA
  const taGroup = document.getElementById("taDegreeGroup");
  if (taGroup) {
     taGroup.style.display = u.role === "ta" ? "block" : "none";
     if (u.role === "ta") document.getElementById("newUserDegree").value = u.degree || "Bachelor's";
  }

  if (u.profileImage) {
    document.getElementById("userPhotoPreview").src = `${window.CONFIG.API_BASE_URL}${u.profileImage}`;
    document.getElementById("userPhotoPreview").style.display = "block";
    document.getElementById("photoPlaceholder").style.display = "none";
  } else {
    document.getElementById("userPhotoPreview").style.display = "none";
    document.getElementById("photoPlaceholder").style.display = "flex";
  }

  // Set role tab and disable role switching during edit
  document.querySelectorAll("#addUserModal .role-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.role === u.role);
    t.style.pointerEvents = "none";
    t.style.opacity = "0.7";
  });

  document.getElementById("addUserModal").style.display = "flex";
  loadDeptsForModal(u.department?._id || u.department || "");
}

function closeModal() {
  document.getElementById("addUserModal").style.display = "none";
}

async function loadDeptsForModal(selectedDeptId = "") {
  const sel = document.getElementById("newUserDept");
  sel.innerHTML = `<option value="">جارٍ التحميل...</option>`;
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/departments`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const depts = data.departments || [];
    if (!depts.length) {
      sel.innerHTML = `<option value="">لا توجد أقسام — أضف من صفحة الأقسام</option>`;
      return;
    }
    sel.innerHTML = `<option value="">اختر القسم...</option>` +
      depts.map((d) => `<option value="${d._id}" ${d._id === selectedDeptId ? "selected" : ""}>${d.name} (${d.code})</option>`).join("");
  } catch {
    sel.innerHTML = `<option value="">تعذّر تحميل الأقسام</option>`;
  }
}

async function loadDeptsForFilterBar() {
  const sel = document.getElementById("deptFilter");
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/departments`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) return;
    const data = await res.json();
    const depts = data.departments || [];
    sel.innerHTML = `<option value="">كل الأقسام</option>` +
      depts.map((d) => `<option value="${d._id}">${d.name}</option>`).join("");
  } catch { /* keep default */ }
}

// ── Save User (FormData to support image upload) ──────────────────────────────
async function saveUser() {
  const editId        = document.getElementById("editUserId").value;
  const firstName     = document.getElementById("newUserFirstName").value.trim();
  const lastName      = document.getElementById("newUserLastName").value.trim();
  const email         = document.getElementById("newUserEmail").value.trim();
  const nationalId    = document.getElementById("newUserNatId").value.trim();
  const dept          = document.getElementById("newUserDept").value;
  const role          = document.getElementById("newUserRole").value;
  const password      = document.getElementById("newUserPassword").value.trim();
  const age           = document.getElementById("newUserAge").value;
  const yearLevel     = document.getElementById("newUserYearLevel").value;
  const address       = document.getElementById("newUserAddress").value.trim();
  const highSchoolName = document.getElementById("newUserHighSchool").value.trim();
  const photoFile     = document.getElementById("newUserPhoto").files[0];

  if (!firstName || !lastName) { alert("يرجى إدخال الاسم الأول واسم العائلة"); return; }
  if (!email)      { alert("يرجى إدخال البريد الإلكتروني"); return; }
  if (!nationalId) { alert("يرجى إدخال الرقم الوطني"); return; }
  if (nationalId.length !== 14) { alert("الرقم الوطني يجب أن يكون 14 رقماً"); return; }

  let endpoint = "/api/admin/users/student";
  if (role === "doctor") endpoint = "/api/admin/users/doctor";
  if (role === "ta")     endpoint = "/api/admin/users/ta";
  if (role === "admin")  endpoint = "/api/admin/users/admin";

  let method = "POST";
  
  if (editId) {
    endpoint = `/api/admin/users/${editId}`;
    method = "PATCH";
  }

  const btn = document.getElementById("saveUserBtn");
  const origText = btn.innerHTML;
  btn.textContent = "جارٍ الحفظ…";
  btn.disabled = true;

  try {
    const fd = new FormData();
    fd.append("firstName", firstName);
    fd.append("lastName", lastName);
    fd.append("email", email);
    fd.append("nationalId", nationalId);
    fd.append("role", role);
    if (dept)           fd.append("department", dept);
    if (password)       fd.append("password", password);
    if (age)            fd.append("age", age);
    if (address)        fd.append("address", address);
    
    if (role === "student" && highSchoolName) {
      fd.append("highSchoolName", highSchoolName);
    }
    if (role === "student" && yearLevel) {
      fd.append("yearLevel", yearLevel);
    }
    if (role === "ta") {
      const degree = document.getElementById("newUserDegree").value;
      fd.append("degree", degree);
    }

    if (photoFile)      fd.append("profileImage", photoFile);

    const res = await fetch(`${window.CONFIG.API_BASE_URL}${endpoint}`, {
      method: method,
      headers: PortalUtils.getUploadHeaders(),
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "فشل حفظ المستخدم");

    closeModal();
    loadUsers();
    loadSummaryStats();
    PortalUtils.showToast(editId ? "✅ تم تحديث بيانات المستخدم بنجاح" : "✅ تم إضافة المستخدم بنجاح");
  } catch (err) {
    alert(err.message);
  } finally {
    btn.innerHTML = origText;
    btn.disabled = false;
  }
}

// ── Delete User ───────────────────────────────────────────────────────────────
async function deleteUser(id, name) {
  if (!confirm(`هل أنت متأكد من حذف المستخدم "${name}"؟\nهذا الإجراء لا يمكن التراجع عنه.`)) return;
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/users/${id}`, {
      method: "DELETE",
      headers: PortalUtils.getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "فشل الحذف");
    loadUsers();
    loadSummaryStats();
    PortalUtils.showToast("🗑️ تم حذف المستخدم بنجاح");
  } catch (err) {
    alert(err.message);
  }
}

// ── Summary Stats ─────────────────────────────────────────────────────────────
async function loadSummaryStats() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/stats`, { headers: PortalUtils.getAuthHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    if (data.studentsCount !== undefined)
      document.getElementById("totalStudents").textContent = data.studentsCount.toLocaleString("ar");
    if (data.doctorsCount !== undefined)
      document.getElementById("totalDoctors").textContent = data.doctorsCount.toLocaleString("ar");
    if (data.tasCount !== undefined && document.getElementById("totalTAs"))
      document.getElementById("totalTAs").textContent = data.tasCount.toLocaleString("ar");
    
    // Active rate (logic: verified / total)
    if (data.totalUsers && data.totalVerified !== undefined) {
      const rate = Math.round((data.totalVerified / data.totalUsers) * 100);
      const el = document.getElementById("activeRate");
      if (el) el.textContent = `${rate}%`;
    }

  } catch (err) { console.error("Stats error:", err); }
}

// ── Export CSV ────────────────────────────────────────────────────────────────
function exportUsers() {
  const rows = document.querySelectorAll("#usersTable tr");
  if (!rows.length) return;
  const headers = ["الاسم", "البريد الإلكتروني", "الدور والقسم", "الحالة"];
  const data = [...rows].map((row) => {
    const cells = row.querySelectorAll("td");
    return [
      cells[1]?.textContent.trim() || "",
      cells[2]?.textContent.trim() || "",
      cells[3]?.textContent.trim() || "",
      cells[4]?.textContent.trim() || "",
    ];
  });
  const csv = [headers, ...data].map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `users_${currentRole}_${Date.now()}.csv`;
  a.click();
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function closeModal() { document.getElementById("addUserModal").style.display = "none"; }
function changePage(delta) { currentPage = Math.max(1, currentPage + delta); loadUsers(); }
function debounce(fn, delay) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), delay); }; }
