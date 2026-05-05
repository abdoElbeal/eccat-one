// ─── Shared User Auth Guard ───────────────────────────────────────────────────
// Include BEFORE every student portal JS

function getUserToken() {
  return localStorage.getItem("token");
}

function decodeTokenPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch (err) {
    console.error("Token decode error:", err);
    return null;
  }
}

function PortalUtils.guard("student") {
  const token = getUserToken();
  if (!token) {
    console.warn("No token found, redirecting to login...");
    window.location.href = "../auth/login.html";
    return null;
  }
  const payload = decodeTokenPayload(token);
  if (!payload) {
    console.error("Invalid token payload, clearing storage...");
    localStorage.removeItem("token");
    window.location.href = "../auth/login.html";
    return null;
  }
  
  // Ensure only students access this portal
  if (payload.role !== "student") {
    console.warn("Unauthorized role for student portal:", payload.role);
    window.location.href = "../auth/login.html";
    return null;
  }
  
  return { token, payload };
}

function PortalUtils.getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getUserToken()}`,
  };
}

function userLogout() {
  localStorage.removeItem("token");
  window.location.href = "../auth/login.html";
}

// ─── Topbar Population ────────────────────────────────────────────────────────
function setTopbarUser(payload) {
  const firstName = payload.firstName || "";
  const lastName  = payload.lastName  || "";
  const fullName  = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : (payload.name || "طالب");

  // Avatar: photo first, then initials
  const avatar = document.getElementById("topbarAvatar");
  if (avatar) {
    if (payload.profileImage) {
      const imgSrc = payload.profileImage.startsWith('http') 
        ? payload.profileImage 
        : `${window.CONFIG.API_BASE_URL}${payload.profileImage}`;
      
      avatar.innerHTML = `<img src="${imgSrc}" alt="${fullName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.parentElement.innerHTML='<span style=\\'font-size:1.3rem;font-weight:700;color:#fff;\\'>${fullName.slice(0, 2)}</span>'" />`;
    } else {
      const initials = fullName.slice(0, 2);
      avatar.innerHTML = `<span style="font-size:1.3rem;font-weight:700;color:#fff;">${initials}</span>`;
    }
  }

  const nameEl = document.getElementById("topbarName");
  if (nameEl) nameEl.textContent = fullName;

  const idEl = document.getElementById("topbarId");
  if (idEl) idEl.textContent = `ID: ${payload.nationalId || payload.id || ""}`;
}

// ─── Skeleton & UI Helpers ───────────────────────────────────────────────────
function showSkeleton(el, rows = 3) {
  if (!el) return;
  const isTableBody = el.tagName === "TBODY";
  if (isTableBody) {
    const cols = el.closest("table")?.querySelectorAll("thead th").length || 6;
    el.innerHTML = Array(rows).fill(`
      <tr>
        ${Array(cols).fill(`
          <td><div class="skeleton-shimmer" style="height:14px;border-radius:6px;width:80%;"></div></td>
        `).join("")}
      </tr>`).join("");
  } else {
    el.innerHTML = Array(rows).fill(`
      <div style="display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid #f1f5f9;">
        <div class="skeleton-shimmer" style="width:40px;height:40px;border-radius:50%;flex-shrink:0;"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
          <div class="skeleton-shimmer" style="height:14px;border-radius:6px;width:60%;"></div>
          <div class="skeleton-shimmer" style="height:10px;border-radius:6px;width:40%;"></div>
        </div>
      </div>`).join("");
  }
}

function injectGlobalStyles() {
  if (document.getElementById("portal-global-styles")) return;
  const style = document.createElement("style");
  style.id = "portal-global-styles";
  style.textContent = `
    @keyframes skeletonShimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .skeleton-shimmer {
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: skeletonShimmer 1.5s infinite linear;
    }
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 48px 24px; gap: 12px;
      color: #94a3b8; text-align: center; width: 100%;
    }
    .empty-state svg { width: 48px; height: 48px; opacity: .4; margin-bottom: 8px; }
    .empty-state p { font-size: 1.4rem; font-weight: 500; }
    
    .toast-msg {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: #1e293b; color: #fff; padding: 12px 24px; border-radius: 12px;
      font-size: 1.3rem; z-index: 10000; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
      display: flex; align-items: center; gap: 10px; animation: toastSlideUp 0.3s ease-out;
    }
    @keyframes toastSlideUp {
      from { transform: translate(-50%, 20px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

function PortalUtils.showToast(msg, type = "info") {
  const existing = document.querySelector(".toast-msg");
  if (existing) existing.remove();
  
  const t = document.createElement("div");
  t.className = "toast-msg";
  const icon = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";
  t.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
  document.body.appendChild(t);
  
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transition = "opacity 0.5s";
    setTimeout(() => t.remove(), 500);
  }, 3000);
}

// ─── Automated Wire-up ────────────────────────────────────────────────────────
function wirePortalButtons() {
  // Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", userLogout);

  // Support
  const supportBtn = document.getElementById("supportBtn");
  if (supportBtn) supportBtn.addEventListener("click", openSupportModal);

  // Active Nav
  const currentPath = window.location.pathname;
  document.querySelectorAll(".nav-item").forEach(item => {
    const href = item.getAttribute("href");
    if (href && currentPath.includes(href)) {
      item.classList.add("active");
    }
  });
}

function openSupportModal() {
  if (document.getElementById("supportModal")) {
    document.getElementById("supportModal").style.display = "flex";
    return;
  }

  const modal = document.createElement("div");
  modal.id = "supportModal";
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
    z-index: 10001; backdrop-filter: blur(4px);
  `;

  modal.innerHTML = `
    <div style="background: #fff; width: 90%; max-width: 500px; border-radius: 16px; padding: 30px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="font-size: 1.8rem; font-weight: 800; color: #1e293b;">الدعم الفني</h2>
        <button onclick="document.getElementById('supportModal').style.display='none'" style="background:none; border:none; cursor:pointer; font-size:1.5rem;">✕</button>
      </div>
      <p style="font-size: 1.3rem; color: #64748b; margin-bottom: 20px;">تواجه مشكلة؟ أرسل لنا رسالة وسنقوم بالرد عليك في أقرب وقت.</p>
      <div style="display: flex; flex-direction: column; gap: 15px;">
        <div>
          <label style="display:block; font-size:1.2rem; font-weight:600; margin-bottom:5px;">الموضوع</label>
          <input type="text" id="supportSubject" placeholder="مثلاً: مشكلة في الجدول" style="width:100%; padding:10px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:1.3rem;">
        </div>
        <div>
          <label style="display:block; font-size:1.2rem; font-weight:600; margin-bottom:5px;">الرسالة</label>
          <textarea id="supportMessage" rows="4" placeholder="اشرح المشكلة بالتفصيل..." style="width:100%; padding:10px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:1.3rem; resize:none;"></textarea>
        </div>
        <button id="sendSupportBtn" style="background:#2463eb; color:#fff; padding:12px; border:none; border-radius:8px; font-size:1.4rem; font-weight:700; cursor:pointer; transition:background 0.2s;">إرسال الطلب</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("sendSupportBtn").addEventListener("click", async () => {
    const subject = document.getElementById("supportSubject").value;
    const message = document.getElementById("supportMessage").value;
    if (!subject || !message) return PortalUtils.showToast("يرجى ملء جميع الخانات", "error");

    document.getElementById("sendSupportBtn").disabled = true;
    document.getElementById("sendSupportBtn").textContent = "جارٍ الإرسال...";

    try {
      // Mock API call or real one if exists
      await new Promise(r => setTimeout(r, 1000));
      PortalUtils.showToast("تم إرسال طلبك بنجاح", "success");
      modal.style.display = "none";
      document.getElementById("supportSubject").value = "";
      document.getElementById("supportMessage").value = "";
    } catch (e) {
      PortalUtils.showToast("حدث خطأ في الإرسال", "error");
    } finally {
      document.getElementById("sendSupportBtn").disabled = false;
      document.getElementById("sendSupportBtn").textContent = "إرسال الطلب";
    }
  });
}

// Auto-run on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", wirePortalButtons);
} else {
  wirePortalButtons();
}

injectGlobalStyles();
