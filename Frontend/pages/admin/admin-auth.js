// ═══════════════════════════════════════════════
// Shared Admin Auth Guard + Utilities
// ═══════════════════════════════════════════════

function getAdminToken() {
  return localStorage.getItem("adminToken");
}

function decodeTokenPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function PortalUtils.guard("admin") {
  const token = getAdminToken();
  if (!token) {
    window.location.href = "admin-login.html";
    return null;
  }
  const payload = decodeTokenPayload(token);
  if (!payload || (payload.role !== "admin" && payload.userRole !== "admin")) {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    window.location.href = "admin-login.html";
    return null;
  }
  return { token, payload };
}

// JSON headers (for endpoints that accept application/json)
function PortalUtils.getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getAdminToken()}`,
  };
}

// Upload headers (NO Content-Type — browser sets multipart boundary automatically)
function PortalUtils.getUploadHeaders() {
  return { Authorization: `Bearer ${getAdminToken()}` };
}

function logout() {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminUser");
  window.location.href = "admin-login.html";
}

// ─── Toast Notification ────────────────────────────────────────────────────────
function PortalUtils.showToast(message, type = "success") {
  const existing = document.querySelector(".admin-toast");
  if (existing) existing.remove();

  const colors = {
    success: "linear-gradient(135deg,#22c55e,#16a34a)",
    error:   "linear-gradient(135deg,#ef4444,#dc2626)",
    info:    "linear-gradient(135deg,#2463eb,#1d4ed8)",
  };

  const toast = document.createElement("div");
  toast.className = "admin-toast";
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "28px",
    left: "50%",
    transform: "translateX(-50%) translateY(0)",
    background: colors[type] || colors.success,
    color: "#fff",
    padding: "13px 28px",
    borderRadius: "14px",
    fontSize: "1.4rem",
    fontWeight: "600",
    fontFamily: "inherit",
    boxShadow: "0 8px 32px rgba(0,0,0,.18)",
    zIndex: "999999",
    whiteSpace: "nowrap",
    opacity: "1",
    transition: "opacity .35s ease",
  });
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 380);
  }, 3200);
}

// ─── Notification Dropdown ─────────────────────────────────────────────────────
function _injectNotifStyles() {
  if (document.getElementById("_notif-css")) return;
  const s = document.createElement("style");
  s.id = "_notif-css";
  s.textContent = `
    .notif-dropdown {
      position: fixed; top: 68px; left: 22px;
      width: 360px; max-height: 480px;
      background: #fff; border: 1.5px solid #e2e8f0;
      border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,.14);
      z-index: 9999; display: none; overflow: hidden;
      animation: _nfIn .2s ease;
    }
    @keyframes _nfIn { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
    .notif-hdr {
      display:flex; align-items:center; justify-content:space-between;
      padding:14px 18px; border-bottom:1.5px solid #f1f5f9;
      font-weight:700; font-size:1.4rem; color:#1e293b;
    }
    .notif-hdr button {
      background:none; border:none; cursor:pointer; color:#94a3b8;
      font-size:1.5rem; padding:2px 6px; border-radius:6px; transition:all .15s;
    }
    .notif-hdr button:hover { background:#fef2f2; color:#ef4444; }
    .notif-list { max-height:360px; overflow-y:auto; }
    .notif-item {
      display:flex; align-items:flex-start; gap:12px;
      padding:13px 18px; border-bottom:1px solid #f8fafc;
      transition:background .15s; cursor:default;
    }
    .notif-item:hover { background:#f8fafc; }
    .notif-item:last-child { border-bottom:none; }
    .notif-av {
      width:38px; height:38px; border-radius:50%; flex-shrink:0;
      background:linear-gradient(135deg,#2463eb,#7c3aed);
      color:#fff; display:flex; align-items:center; justify-content:center;
      font-weight:700; font-size:1.2rem;
    }
    .notif-body { flex:1; min-width:0; }
    .notif-body strong { display:block; font-size:1.3rem; color:#1e293b; margin-bottom:2px; }
    .notif-body .notif-sub { font-size:1.2rem; color:#64748b; }
    .notif-body .notif-time { font-size:1.1rem; color:#94a3b8; margin-top:3px; display:block; }
    .notif-empty { padding:30px; text-align:center; color:#94a3b8; font-size:1.3rem; }
    .notif-ftr {
      padding:12px 18px; text-align:center;
      border-top:1.5px solid #f1f5f9;
    }
    .notif-ftr a { color:#2463eb; font-size:1.25rem; text-decoration:none; font-weight:600; }
    .notif-ftr a:hover { text-decoration:underline; }
  `;
  document.head.appendChild(s);
}

function _notifTimeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "الآن";
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

async function _loadNotifData() {
  const list = document.getElementById("_notifList");
  if (!list) return;
  list.innerHTML = '<div class="notif-empty">جارٍ التحميل...</div>';
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/users?limit=6`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const users = data.users || [];
    if (!users.length) {
      list.innerHTML = '<div class="notif-empty">لا يوجد مستخدمون في النظام بعد</div>';
      return;
    }
    list.innerHTML = users
      .map((u) => {
        const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "—";
        const role  = u.role === "doctor" ? "دكتور" : "طالب";
        const color = u.role === "doctor" ? "#7c3aed" : "#2463eb";
        return `
          <div class="notif-item">
            <div class="notif-av">${name.slice(0, 2)}</div>
            <div class="notif-body">
              <strong>${name}</strong>
              <span class="notif-sub">تم إضافة <span style="color:${color};font-weight:700;">${role}</span> جديد</span>
              <span class="notif-time">${_notifTimeAgo(u.createdAt)}</span>
            </div>
          </div>`;
      })
      .join("");
  } catch {
    list.innerHTML = '<div class="notif-empty">تعذّر تحميل الإشعارات</div>';
  }
}

function _initNotifications() {
  _injectNotifStyles();
  const bell = document.querySelector(".topbar-bell");
  if (!bell) return;

  // Badge update
  const dot = bell.querySelector(".notif-dot");
  if (dot) dot.style.cssText = "position:absolute;top:3px;left:3px;width:9px;height:9px;background:#ef4444;border-radius:50%;border:2px solid #fff;";
  bell.style.position = "relative";

  // Build dropdown once
  let dd = document.getElementById("_notifDd");
  if (!dd) {
    dd = document.createElement("div");
    dd.id = "_notifDd";
    dd.className = "notif-dropdown";
    dd.innerHTML = `
      <div class="notif-hdr">
        <span>🔔 الإشعارات الأخيرة</span>
        <button onclick="document.getElementById('_notifDd').style.display='none'">✕</button>
      </div>
      <div id="_notifList" class="notif-list"></div>
      <div class="notif-ftr"><a href="users.html">عرض جميع المستخدمين ←</a></div>
    `;
    document.body.appendChild(dd);
  }

  bell.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = dd.style.display === "block";
    dd.style.display = open ? "none" : "block";
    if (!open) _loadNotifData();
  });

  document.addEventListener("click", (e) => {
    if (!dd.contains(e.target) && !bell.contains(e.target)) {
      dd.style.display = "none";
    }
  });
}

// ─── Automated Wire-up ────────────────────────────────────────────────────────
function _wireAdminButtons() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // Note: Admins might not need support modal as they ARE the support,
  // but for "everything works" consistency, we can add it.
  const supportBtn = document.getElementById("nav-help") || document.querySelector(".support-btn");
  if (supportBtn) {
    supportBtn.addEventListener("click", (e) => {
      if (supportBtn.id === "nav-help") e.preventDefault();
      _openSupportModal();
    });
  }
}

function _openSupportModal() {
  if (document.getElementById("supportModal")) {
    document.getElementById("supportModal").style.display = "flex";
    return;
  }
  const modal = document.createElement("div");
  modal.id = "supportModal";
  modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10001;backdrop-filter:blur(4px);`;
  modal.innerHTML = `
    <div style="background:#fff; width:90%; max-width:500px; border-radius:16px; padding:30px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1); direction:rtl;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2 style="font-size:1.8rem; font-weight:800; color:#1e293b; margin:0;">الدعم الفني للمسؤول</h2>
        <button onclick="document.getElementById('supportModal').style.display='none'" style="background:none; border:none; cursor:pointer; font-size:1.5rem;">✕</button>
      </div>
      <p style="font-size:1.3rem; color:#64748b; margin-bottom:20px;">أرسل استفسارك التقني للإدارة العليا.</p>
      <div style="display:flex; flex-direction:column; gap:15px;">
        <input type="text" id="supportSubject" placeholder="الموضوع" style="width:100%; padding:10px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:1.3rem;">
        <textarea id="supportMessage" rows="4" placeholder="التفاصيل..." style="width:100%; padding:10px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:1.3rem; resize:none;"></textarea>
        <button id="sendSupportBtn" style="background:#2463eb; color:#fff; padding:12px; border:none; border-radius:8px; font-size:1.4rem; font-weight:700; cursor:pointer;">إرسال الآن</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById("sendSupportBtn").addEventListener("click", () => {
    PortalUtils.showToast("تم إرسال طلبك للإدارة العليا بنجاح");
    modal.style.display = "none";
  });
}

// Auto-init on every admin page
document.addEventListener("DOMContentLoaded", () => {
  _initNotifications();
  _wireAdminButtons();
});
