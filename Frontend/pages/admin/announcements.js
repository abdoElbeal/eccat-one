// ─── Announcements JS ──────────────────────────────────────────────────────────
const auth = PortalUtils.guard("admin");
if (auth) init();

let allAnnouncements = [];
let allGroups = [];

function init() {
  PortalUtils.setupTopbar(auth.payload);

  document.getElementById("saveAnnBtn").addEventListener("click", saveAnnouncement);
  
  // Filters
  document.getElementById("searchAnn").addEventListener("input", renderGrid);
  document.getElementById("filterTarget").addEventListener("change", renderGrid);
  document.getElementById("filterType").addEventListener("change", renderGrid);

  loadGroups();
  loadAnnouncements();
}

// ─── Load Data ────────────────────────────────────────────────────────────────
async function loadGroups() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/groups`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    const data = await res.json();
    allGroups = data.groups || [];
    
    const sel = document.getElementById("annGroup");
    sel.innerHTML = "<option value=''>اختر المجموعة...</option>";
    allGroups.forEach(g => {
      sel.innerHTML += `<option value="${g._id}">${g.name} (${g.code})</option>`;
    });
  } catch (e) {
    console.error("Failed to load groups for announcements", e);
  }
}

async function loadAnnouncements() {
  const grid = document.getElementById("annGrid");
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:#94a3b8;">جارٍ التحميل...</div>';

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/announcements`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    allAnnouncements = data.announcements || [];
    renderGrid();
  } catch {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:#ef4444;">تعذّر تحميل الإعلانات</div>';
  }
}

// ─── Render Grid ──────────────────────────────────────────────────────────────
function renderGrid() {
  const grid = document.getElementById("annGrid");
  const searchQ = document.getElementById("searchAnn").value.toLowerCase();
  const tFilter = document.getElementById("filterTarget").value;
  const tyFilter = document.getElementById("filterType").value;

  let filtered = allAnnouncements.filter(a => {
    const matchSearch = (a.title || "").toLowerCase().includes(searchQ) || (a.content || "").toLowerCase().includes(searchQ);
    const matchTarget = tFilter === "all" ? true : (a.targetAudience === tFilter);
    const matchType   = tyFilter === "all" ? true : (a.type === tyFilter);
    return matchSearch && matchTarget && matchType;
  });

  if (!filtered.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:#94a3b8;font-size:1.4rem;">لا توجد إعلانات مطابقة</div>';
    return;
  }

  const TYPE_CONFIG = {
    general:  { icon: "📢", color: "bg-blue",   label: "عام" },
    academic: { icon: "📚", color: "bg-purple", label: "أكاديمي" },
    exam:     { icon: "📝", color: "bg-orange", label: "امتحانات" },
    holiday:  { icon: "🌴", color: "bg-green",  label: "إجازة" },
    warning:  { icon: "⚠️", color: "bg-red",    label: "تحذير" },
  };

  const TARGET_LABELS = {
    all: "الجميع", students: "الطلاب", doctors: "الدكاترة", ta: "المعيدين", staff: "هيئة التدريس", group: "مجموعة محددة"
  };

  grid.innerHTML = filtered.map(a => {
    const tConf = TYPE_CONFIG[a.type || "general"] || TYPE_CONFIG.general;
    const dateStr = new Date(a.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
    const isPinned = a.isPinned ? "pinned" : "";
    const isUrgent = a.priority === "urgent" ? "urgent" : "";
    
    let targetStr = TARGET_LABELS[a.targetAudience || "all"];
    if (a.targetAudience === "group" && a.targetGroup) {
      targetStr += ` (${a.targetGroup.name})`;
    }

    return `
      <div class="ann-card ${isPinned} ${isUrgent}">
        <div class="ac-header">
          <div class="ac-icon ${tConf.color}">${tConf.icon}</div>
          <div class="ac-actions">
            <button class="ac-btn pin ${a.isPinned ? 'active' : ''}" onclick="togglePin('${a._id}', ${a.isPinned})" title="${a.isPinned ? 'إلغاء التثبيت' : 'تثبيت في الأعلى'}">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="${a.isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <button class="ac-btn delete" onclick="deleteAnn('${a._id}')" title="حذف">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
        <div class="ac-title">${escHtml(a.title)}</div>
        <div class="ac-content">${escHtml(a.content || "")}</div>
        <div class="ac-meta">
          <span class="ac-badge" style="background:#f1f5f9;color:#475569;">${targetStr}</span>
          ${a.priority === 'urgent' ? '<span class="ac-badge bg-red">عاجل</span>' : ''}
          ${a.priority === 'important' ? '<span class="ac-badge bg-orange">هام</span>' : ''}
        </div>
        <div class="ac-footer">
          <span>📍 ${escHtml(a.source || "إدارة الكلية")}</span>
          <span>${dateStr}</span>
        </div>
      </div>
    `;
  }).join("");
}

// ─── Modal Actions ────────────────────────────────────────────────────────────
function openAnnModal() {
  document.getElementById("annTitle").value = "";
  document.getElementById("annContent").value = "";
  document.getElementById("annType").value = "general";
  document.getElementById("annPriority").value = "normal";
  document.getElementById("annTarget").value = "all";
  document.getElementById("annGroup").value = "";
  document.getElementById("annSource").value = "إدارة الكلية";
  document.getElementById("annPinned").checked = false;
  toggleGroupSelect();
  document.getElementById("annModal").style.display = "flex";
}

function closeAnnModal() {
  document.getElementById("annModal").style.display = "none";
}

function toggleGroupSelect() {
  const target = document.getElementById("annTarget").value;
  document.getElementById("groupWrap").style.display = (target === "group") ? "flex" : "none";
}

// ─── API Actions ──────────────────────────────────────────────────────────────
async function saveAnnouncement() {
  const payload = {
    title: document.getElementById("annTitle").value.trim(),
    content: document.getElementById("annContent").value.trim(),
    type: document.getElementById("annType").value,
    priority: document.getElementById("annPriority").value,
    targetAudience: document.getElementById("annTarget").value,
    source: document.getElementById("annSource").value.trim() || "إدارة الكلية",
    isPinned: document.getElementById("annPinned").checked,
  };

  if (!payload.title) return PortalUtils.showToast("يرجى إدخال عنوان الإعلان", "error");

  if (payload.targetAudience === "group") {
    const groupId = document.getElementById("annGroup").value;
    if (!groupId) return PortalUtils.showToast("يرجى اختيار المجموعة المستهدفة", "error");
    payload.targetGroup = groupId;
  }

  const btn = document.getElementById("saveAnnBtn");
  btn.disabled = true; btn.textContent = "جارٍ النشر...";

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/announcements`, {
      method: "POST",
      headers: { ...PortalUtils.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "خطأ داخلي في الخادم");

    PortalUtils.showToast("✅ تم نشر الإعلان بنجاح", "success");
    closeAnnModal();
    loadAnnouncements();
  } catch (err) {
    PortalUtils.showToast(err.message || "فشل نشر الإعلان", "error");
  } finally {
    btn.disabled = false; btn.textContent = "نشر الإعلان";
  }
}

async function togglePin(id, currentState) {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/announcements/${id}`, {
      method: "PATCH",
      headers: { ...PortalUtils.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !currentState })
    });
    if (!res.ok) throw new Error();
    loadAnnouncements();
  } catch {
    PortalUtils.showToast("فشل تحديث الإعلان", "error");
  }
}

async function deleteAnn(id) {
  if (!confirm("هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء.")) return;
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/announcements/${id}`, {
      method: "DELETE",
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) throw new Error();
    PortalUtils.showToast("تم الحذف بنجاح");
    loadAnnouncements();
  } catch {
    PortalUtils.showToast("فشل حذف الإعلان", "error");
  }
}

function escHtml(str) {
  return (str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
