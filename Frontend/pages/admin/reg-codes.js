// Registration Codes Management JS
const auth = PortalUtils.guard("admin");

let currentPage = 1;
const PER_PAGE = 10;

if (auth) {
  init();
}

function init() {
  // Logout handled by PortalUtils

  // Role selection
  document.getElementById("roleStudent").addEventListener("click", () => selectRole("student"));
  document.getElementById("roleDoctor").addEventListener("click", () => selectRole("doctor"));
  document.getElementById("roleTA").addEventListener("click", () => selectRole("ta"));

  // Generate form
  document.getElementById("genCodeForm").addEventListener("submit", generateCode);

  // CSV export
  document.getElementById("csvExportBtn")?.addEventListener("click", () =>
    alert("توليد جماعي عبر CSV – قيد التطوير")
  );

  // Clear used codes
  document.getElementById("clearUsedBtn")?.addEventListener("click", deleteUsedCodes);

  // Pagination
  document.getElementById("codePrev").addEventListener("click", () => changePage(-1));
  document.getElementById("codeNext").addEventListener("click", () => changePage(1));
  document.querySelectorAll(".page-btns [data-page]").forEach((btn) => {
    btn.addEventListener("click", () => { currentPage = parseInt(btn.dataset.page); loadCodes(); });
  });

  // Top-bar search (already has id="topSearchInput")
  document.getElementById("topSearchInput")?.addEventListener("input", debounce(loadCodes, 400));

  // Load departments for the generate-code form
  loadDeptsForCodeForm();

  startApp();
}

function startApp() {
  currentPage = 1;
  loadCodes();
  loadStats();
}

// ── Load departments into the form select ─────────────────────────────────────
async function loadDeptsForCodeForm() {
  const sel = document.getElementById("codesDept");
  if (!sel) return;
  sel.innerHTML = `<option value="">جارٍ التحميل...</option>`;
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/departments`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) throw new Error();
    const data  = await res.json();
    const depts = data.departments || [];
    if (!depts.length) {
      sel.innerHTML = `<option value="">لا توجد أقسام — أضف من صفحة الأقسام</option>`;
      return;
    }
    sel.innerHTML = `<option value="">اختر القسم...</option>` +
      depts.map((d) => `<option value="${d._id}">${d.name} (${d.code})</option>`).join("");
  } catch {
    sel.innerHTML = `<option value="">تعذّر التحميل</option>`;
  }
}

// ── Role selection ─────────────────────────────────────────────────────────────
function selectRole(role) {
  document.getElementById("selectedRole").value = role;
  document.getElementById("roleStudent").classList.toggle("active", role === "student");
  document.getElementById("roleDoctor").classList.toggle("active", role === "doctor");
  document.getElementById("roleTA").classList.toggle("active", role === "ta");
  
  const yearGroup = document.getElementById("yearGroup");
  if (yearGroup) yearGroup.style.display = (role === "student") ? "block" : "none";
}

// ── Load Codes ────────────────────────────────────────────────────────────────
async function loadCodes() {
  const search = document.getElementById("topSearchInput")?.value.trim() || "";
  const tbody  = document.getElementById("codesTable");
  tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:24px;">جارٍ التحميل...</td></tr>`;

  try {
    const params = new URLSearchParams({ limit: PER_PAGE });
    if (search) params.set("search", search);
    const url = `${window.CONFIG.API_BASE_URL}/api/admin/codes/${currentPage}?${params}`;

    const res = await fetch(url, { headers: PortalUtils.getAuthHeaders() });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `خطأ ${res.status}`);
    }

    const data  = await res.json();
    const codes = data.codes || data || [];
    renderCodes(codes);

    if (data.total !== undefined) {
      const from = (currentPage - 1) * PER_PAGE + 1;
      const to   = Math.min(currentPage * PER_PAGE, data.total);
      document.getElementById("codesPagInfo").textContent =
        `عرض ${from}-${to} من أصل ${data.total.toLocaleString("ar")} كود`;
    }
  } catch (err) {
    console.error("Load codes error:", err);
    document.getElementById("codesTable").innerHTML = `
      <tr><td colspan="6" style="padding:40px;text-align:center;">
        <div style="color:#ef4444;font-size:1.4rem;margin-bottom:10px;">⚠️ تعذّر تحميل الأكواد</div>
        <div style="color:#94a3b8;margin-bottom:16px;">${err.message}</div>
        <button onclick="loadCodes()"
          style="padding:9px 22px;background:#2463eb;color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:1.3rem;font-family:inherit;font-weight:600;">
          🔄 إعادة المحاولة
        </button>
      </td></tr>`;
  }
}

function renderCodes(codes) {
  const tbody = document.getElementById("codesTable");

  if (!codes.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:30px;">لا توجد أكواد</td></tr>`;
    return;
  }

  tbody.innerHTML = codes
    .map((c) => {
      const isUsed     = c.isUsed || c.used;
      const statusClass = isUsed ? "used" : "active";
      const statusLabel = isUsed ? "مُستخدم" : "غير مستخدم";
      
      let roleLabel = "طالب";
      let badgeClass = "badge-blue";
      if (c.role === "doctor") {
        roleLabel = "دكتور";
        badgeClass = "badge-purple";
      } else if (c.role === "ta") {
        roleLabel = "معيد";
        badgeClass = "badge-green";
      }

      const fullName   = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.name || c.fullName || "—";

      return `
        <tr>
          <td><span class="code-text">${c.code}</span></td>
          <td><strong>${fullName}</strong></td>
          <td>${c.department?.name || c.department || '—'}</td>
          <td><span class="badge ${badgeClass}">${roleLabel}</span></td>
          <td><span class="status-dot ${statusClass}">${statusLabel}</span></td>
          <td>
            <div class="action-btns">
              <button class="action-btn copy" title="نسخ الكود" onclick="copyCode('${c.code}')">
                <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              </button>
              <button class="action-btn delete" title="حذف الكود" onclick="deleteCode('${c._id}')">
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    })
    .join("");
}

// ── Generate Code ─────────────────────────────────────────────────────────────
async function generateCode(e) {
  e.preventDefault();

  const firstName      = document.getElementById("firstName").value.trim();
  const lastName       = document.getElementById("lastName").value.trim();
  const natId          = document.getElementById("natId").value.trim();
  const age            = parseInt(document.getElementById("ageInput").value);
  const highSchoolName = document.getElementById("highSchool").value.trim();
  const address        = document.getElementById("addressInput").value.trim();
  const dept           = document.getElementById("codesDept").value;
  const role           = document.getElementById("selectedRole").value;
  const yearLevel      = document.getElementById("yearLevel").value;

  if (!firstName || !lastName || !natId || !age || !highSchoolName || !address || !dept) {
    alert("يرجى تعبئة جميع الحقول المطلوبة");
    return;
  }

  const btn = document.getElementById("genBtn");
  btn.textContent = "جارٍ التوليد…";
  btn.disabled    = true;

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/codes`, {
      method: "POST",
      headers: PortalUtils.getAuthHeaders(),
      body: JSON.stringify({
        firstName, lastName, nationalId: natId, age,
        highSchoolName, address, department: dept, role,
        yearLevel: role === "student" ? yearLevel : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "فشل التوليد");

    document.getElementById("genCodeForm").reset();
    selectRole("student");
    loadDeptsForCodeForm(); // reload dept select after reset
    startApp();

    PortalUtils.showToast(`✅ تم توليد الكود: ${data.registerationCode?.code || "—"}`);
  } catch (err) {
    alert(err.message);
  } finally {
    btn.textContent = "توليد كود جديد";
    btn.disabled    = false;
  }
}

// ── Delete Code ───────────────────────────────────────────────────────────────
async function deleteCode(id) {
  if (!confirm("هل أنت متأكد من حذف هذا الكود؟")) return;

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/codes/${id}`, {
      method: "DELETE",
      headers: PortalUtils.getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "فشل الحذف");
    loadCodes();
    loadStats();
    PortalUtils.showToast("🗑️ تم حذف الكود بنجاح");
  } catch (err) {
    alert(err.message);
  }
}

// ── Copy ──────────────────────────────────────────────────────────────────────
function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    PortalUtils.showToast(`📋 تم النسخ: ${code}`);
  }).catch(() => {
    alert(`الكود: ${code}`);
  });
}

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/codes/stats`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.total   !== undefined) document.getElementById("totalCodes").textContent  = data.total.toLocaleString("ar");
    if (data.unused  !== undefined) document.getElementById("unusedCodes").textContent = data.unused.toLocaleString("ar");
    if (data.used    !== undefined) document.getElementById("usedCodes").textContent   = data.used.toLocaleString("ar");
    if (data.usageRate !== undefined) document.getElementById("usageRate").textContent = `${data.usageRate}%`;
  } catch (err) { console.error("Stats error:", err); }
}

// ── Pagination ────────────────────────────────────────────────────────────────
function changePage(delta) {
  currentPage = Math.max(1, currentPage + delta);
  loadCodes();
}

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
async function deleteUsedCodes() {
  if (!confirm("هل أنت متأكد من حذف جميع الأكواد المستخدمة؟ لا يمكن التراجع عن هذا الإجراء.")) return;
  const btn = document.getElementById("clearUsedBtn");
  const orig = btn.textContent;
  btn.textContent = "جارٍ الحذف..."; btn.disabled = true;

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/codes/used/all`, {
      method: "DELETE",
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) throw new Error("فشل حذف الأكواد");
    const data = await res.json();
    PortalUtils.showToast(`✅ ${data.message}`);
    loadCodes();
    loadStats();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.textContent = orig; btn.disabled = false;
  }
}
