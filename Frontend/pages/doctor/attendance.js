// ─── Doctor Attendance JS ──────────────────────────────────────────────────────
const auth = PortalUtils.guard("doctor");

let currentSessionId = null;
let qrCodeObj = null;
let refreshInterval = null;
let rosterInterval = null;
let timerInterval = null;
let timeRemaining = 30;

if (auth) init();

function init() {
  PortalUtils.setupTopbar(auth.payload);

  document.getElementById("startSessionBtn")?.addEventListener("click", startSession);
  document.getElementById("endSessionBtn")?.addEventListener("click", endSession);

  loadSetupData();
  loadHistory();
}

// ─── Setup Phase ─────────────────────────────────────────────────────────────
async function loadSetupData() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/grades?subject=__placeholder__`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    const data = await res.json();
    
    const subjectSelect = document.getElementById("subjectSelect");
    if (subjectSelect && data.subjects?.length) {
      subjectSelect.innerHTML = data.subjects.map(s => 
        `<option value="${s.code}" data-id="${s._id}">${s.name} — ${s.code}</option>`
      ).join("");
    }
  } catch (err) { console.error("Setup data error:", err); }
}

async function startSession() {
  const code = document.getElementById("subjectSelect").value;
  if (!code) return PortalUtils.showToast("يرجى اختيار المادة", "error");

  const btn = document.getElementById("startSessionBtn");
  btn.disabled = true;
  btn.textContent = "جاري البدء...";

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/attendance`, {
      method: "POST",
      headers: PortalUtils.getAuthHeaders(),
      body: JSON.stringify({ subjectCode: code }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Failed to start session");

    currentSessionId = data.session._id;
    
    // Switch UI
    document.getElementById("setupSection").style.display = "none";
    document.getElementById("activeSection").style.display = "block";
    
    startLiveUpdates();
  } catch (err) {
    PortalUtils.showToast(err.message, "error");
    btn.disabled = false;
    btn.textContent = "بدء الجلسة";
  }
}

function startLiveUpdates() {
  refreshQr();
  refreshRoster();
  
  refreshInterval = setInterval(refreshQr, 30000); // 30s
  rosterInterval  = setInterval(refreshRoster, 5000); // 5s
}

async function refreshQr() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/attendance/${currentSessionId}/refresh`, {
      method: "POST",
      headers: PortalUtils.getAuthHeaders(),
    });
    const data = await res.json();
    
    const qrWrap = document.getElementById("qrCodeWrap");
    qrWrap.innerHTML = "";
    
    // Simple QR display (Using a public QR API for demo)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${data.qrToken}`;
    const img = document.createElement("img");
    img.src = qrUrl;
    img.alt = "QR Code";
    qrWrap.appendChild(img);

    // Reset timer
    timeRemaining = 30;
    updateTimer();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeRemaining--;
      updateTimer();
      if (timeRemaining <= 0) clearInterval(timerInterval);
    }, 1000);

  } catch (err) { console.error("QR refresh error:", err); }
}

function updateTimer() {
  const el = document.getElementById("timerProgress");
  const num = document.getElementById("timerNum");
  if (el) el.style.width = `${(timeRemaining / 30) * 100}%`;
  if (num) num.textContent = timeRemaining;
}

async function refreshRoster() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/attendance/${currentSessionId}`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    const data = await res.json();
    
    const list = document.getElementById("rosterList");
    const count = document.getElementById("presentCount");
    
    if (count) count.textContent = data.presentCount;
    
    if (list) {
      if (!data.students?.length) {
        list.innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8;">بانتظار مسح الطلاب للرمز...</div>`;
      } else {
        list.innerHTML = data.students.map(s => `
          <div class="roster-item">
            <div style="display:flex;align-items:center;gap:12px;">
              <div class="roster-avatar">${s.name.slice(0,2)}</div>
              <div>
                <div style="font-weight:700;font-size:1.3rem;">${s.name}</div>
                <div style="font-size:1.1rem;color:#64748b;">${s.studentNo}</div>
              </div>
            </div>
            <span class="badge badge-green">حاضر</span>
          </div>
        `).join("");
      }
    }
  } catch (err) { console.error("Roster refresh error:", err); }
}

async function endSession() {
  if (!confirm("هل أنت متأكد من إنهاء جلسة التحضير؟")) return;

  try {
    await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/attendance/${currentSessionId}/close`, {
      method: "POST",
      headers: PortalUtils.getAuthHeaders(),
    });
    
    clearInterval(refreshInterval);
    clearInterval(rosterInterval);
    clearInterval(timerInterval);
    
    location.reload();
  } catch (err) { PortalUtils.showToast("تعذّر إنهاء الجلسة", "error"); }
}

// ─── History ─────────────────────────────────────────────────────────────────
async function loadHistory() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/attendance/history`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    const data = await res.json();
    
    const tbody = document.getElementById("historyTable");
    if (tbody) {
      if (!data.sessions?.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:#94a3b8;">لا يوجد سجل حضور سابق</td></tr>`;
      } else {
        tbody.innerHTML = data.sessions.map((s, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td style="font-weight:700;">${s.subjectName}</td>
            <td>${new Date(s.startTime).toLocaleDateString("ar-EG")}</td>
            <td>${s.presentCount} طالب</td>
            <td><span class="badge badge-blue">مكتملة</span></td>
          </tr>
        `).join("");
      }
    }
  } catch (err) { console.error("History error:", err); }
}
