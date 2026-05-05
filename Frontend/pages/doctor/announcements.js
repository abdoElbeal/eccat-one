// ─── Doctor Announcements JS ──────────────────────────────────────────────────
const auth = PortalUtils.guard("doctor");
if (auth) init();

function init() {
  PortalUtils.setupTopbar(auth.payload);
  loadAnnouncements();
}

async function loadAnnouncements() {
  const grid = document.getElementById("annGrid");
  
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/announcements`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch announcements");
    
    const data = await res.json();
    const anns = data.announcements || [];
    
    if (!anns.length) {
      grid.innerHTML = '<div class="empty-state">لا توجد إعلانات حالياً</div>';
      return;
    }
    
    const TYPE_CONFIG = {
      general:  { icon: "📢", color: "bg-blue",   label: "عام" },
      academic: { icon: "📚", color: "bg-purple", label: "أكاديمي" },
      exam:     { icon: "📝", color: "bg-orange", label: "امتحانات" },
      holiday:  { icon: "🌴", color: "bg-green",  label: "إجازة" },
      warning:  { icon: "⚠️", color: "bg-red",    label: "تحذير" },
    };

    grid.innerHTML = anns.map(a => {
      const tConf = TYPE_CONFIG[a.type || "general"] || TYPE_CONFIG.general;
      const dateStr = new Date(a.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
      const isPinned = a.isPinned ? "pinned" : "";
      const isUrgent = a.priority === "urgent" ? "urgent" : "";
      
      let priorityBadge = "";
      if (a.priority === "urgent") priorityBadge = '<span class="ac-badge bg-red">عاجل</span>';
      else if (a.priority === "important") priorityBadge = '<span class="ac-badge bg-orange">هام</span>';
      
      return `
        <div class="ann-card ${isPinned} ${isUrgent}">
          <div class="ac-header">
            <div class="ac-icon ${tConf.color}">${tConf.icon}</div>
            ${a.isPinned ? '<div style="color:#f59e0b;" title="مثبت">📌</div>' : ''}
          </div>
          <div class="ac-title">${escHtml(a.title)}</div>
          <div class="ac-content">${escHtml(a.content || "")}</div>
          <div class="ac-meta">
            ${priorityBadge}
            <span class="ac-badge" style="background:#f1f5f9;color:#475569;">${tConf.label}</span>
          </div>
          <div class="ac-footer">
            <span>📍 ${escHtml(a.source || "إدارة الكلية")}</span>
            <span>${dateStr}</span>
          </div>
        </div>
      `;
    }).join("");
    
  } catch (err) {
    grid.innerHTML = '<div class="empty-state" style="color:#ef4444;">حدث خطأ أثناء تحميل الإعلانات</div>';
  }
}

function escHtml(str) {
  return (str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
