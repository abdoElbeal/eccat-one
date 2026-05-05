// Shared doctor auth guard — token must have role === "doctor"

function getDoctorToken() {
  return localStorage.getItem("token");
}

function decodeTokenPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch { return null; }
}

function PortalUtils.guard("doctor") {
  const token = getDoctorToken();
  if (!token) { window.location.href = "../auth/login.html"; return null; }
  const payload = decodeTokenPayload(token);
  if (!payload || (payload.role !== "doctor" && payload.userRole !== "doctor")) {
    localStorage.removeItem("token");
    window.location.href = "../auth/login.html";
    return null;
  }
  return { token, payload };
}

function PortalUtils.getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getDoctorToken()}`,
  };
}

function doctorAuthHeadersUpload() {
  return { Authorization: `Bearer ${getDoctorToken()}` };
}

function doctorLogout() {
  localStorage.removeItem("token");
  window.location.href = "../auth/login.html";
}

function setDoctorTopbar(payload) {
  const firstName = payload.firstName || "";
  const lastName  = payload.lastName  || "";
  const fullName  = [firstName, lastName].filter(Boolean).join(" ") || "دكتور";

  // Avatar initials
  const avatarEl = document.getElementById("topbarAvatar");
  if (avatarEl) {
    const initials = (firstName[0] || "") + (lastName[0] || "");
    avatarEl.textContent  = initials || "د";
    avatarEl.style.fontSize   = "1.4rem";
    avatarEl.style.fontWeight = "700";
    avatarEl.style.color      = "#fff";
    // Profile image
    if (payload.profileImage) {
      avatarEl.style.backgroundImage = `url(${window.CONFIG?.API_BASE_URL}${payload.profileImage})`;
      avatarEl.style.backgroundSize  = "cover";
      avatarEl.textContent = "";
    }
  }

  const nameEl = document.getElementById("topbarName");
  if (nameEl) nameEl.textContent = `د. ${fullName}`;

  const subEl = document.getElementById("topbarSub");
  if (subEl) subEl.textContent = payload.department || "عضو هيئة التدريس";
}

// ─── Automated Wire-up ────────────────────────────────────────────────────────
function wireDoctorPortalButtons() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", doctorLogout);

  const supportBtn = document.querySelector(".support-btn");
  if (supportBtn) supportBtn.addEventListener("click", openSupportModal);
}

function openSupportModal() {
  if (document.getElementById("supportModal")) {
    document.getElementById("supportModal").style.display = "flex";
    return;
  }
  const modal = document.createElement("div");
  modal.id = "supportModal";
  modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10001;backdrop-filter:blur(4px);`;
  modal.innerHTML = `
    <div style="background:#fff; width:90%; max-width:500px; border-radius:16px; padding:30px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2 style="font-size:1.8rem; font-weight:800; color:#1e293b;">الدعم الفني</h2>
        <button onclick="document.getElementById('supportModal').style.display='none'" style="background:none; border:none; cursor:pointer; font-size:1.5rem;">✕</button>
      </div>
      <p style="font-size:1.3rem; color:#64748b; margin-bottom:20px;">تواجه مشكلة؟ أرسل لنا رسالة وسنقوم بالرد عليك في أقرب وقت.</p>
      <div style="display:flex; flex-direction:column; gap:15px;">
        <input type="text" id="supportSubject" placeholder="الموضوع" style="width:100%; padding:10px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:1.3rem;">
        <textarea id="supportMessage" rows="4" placeholder="اشرح المشكلة بالتفصيل..." style="width:100%; padding:10px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:1.3rem; resize:none;"></textarea>
        <button id="sendSupportBtn" style="background:#2463eb; color:#fff; padding:12px; border:none; border-radius:8px; font-size:1.4rem; font-weight:700; cursor:pointer;">إرسال الطلب</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById("sendSupportBtn").addEventListener("click", () => {
    alert("تم إرسال طلبك بنجاح");
    modal.style.display = "none";
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wireDoctorPortalButtons);
else wireDoctorPortalButtons();
