// ─── Student Attendance JS ──────────────────────────────────────────────────────
const auth = PortalUtils.guard("student");
if (auth) init();

let html5QrcodeScanner = null;
let isScanning = false;

function init() {
  PortalUtils.setupTopbar(auth.payload);
  
  const p = auth.payload;
  const topbarName = document.getElementById("topbarName");
  if (topbarName) {
    topbarName.textContent = p.firstName ? `${p.firstName} ${p.lastName}`.trim() : (p.fullName || p.name || "طالب");
  }

  document.getElementById("startScanBtn").addEventListener("click", startScanner);
  document.getElementById("stopScanBtn").addEventListener("click", stopScanner);
}

function startScanner() {
  const resEl = document.getElementById("qr-result");
  resEl.textContent = "جاري تهيئة الكاميرا...";
  resEl.style.color = "#475569";

  if (!html5QrcodeScanner) {
    html5QrcodeScanner = new Html5Qrcode("qr-reader");
  }

  const config = { fps: 10, qrbox: { width: 250, height: 250 } };
  html5QrcodeScanner.start(
    { facingMode: "environment" },
    config,
    onScanSuccess,
    onScanFailure
  ).then(() => {
    isScanning = true;
    document.getElementById("startScanBtn").style.display = "none";
    document.getElementById("stopScanBtn").style.display = "inline-flex";
    resEl.textContent = "جاهز للمسح! قم بتوجيه الكاميرا إلى رمز المحاضرة.";
    resEl.style.color = "#2463eb";
  }).catch(err => {
    console.error("Camera start error:", err);
    resEl.style.color = "#ef4444";
    resEl.textContent = "تعذر الوصول للكاميرا، تأكد من إعطاء الصلاحية.";
  });
}

function stopScanner() {
  if (html5QrcodeScanner && isScanning) {
    html5QrcodeScanner.stop().then(() => {
      isScanning = false;
      document.getElementById("startScanBtn").style.display = "inline-flex";
      document.getElementById("stopScanBtn").style.display = "none";
      document.getElementById("qr-result").textContent = "تم إيقاف الكاميرا.";
      document.getElementById("qr-result").style.color = "#64748b";
    }).catch(console.error);
  }
}

async function onScanSuccess(decodedText, decodedResult) {
  // Stop scanning immediately after a successful scan to prevent multiple requests
  stopScanner();

  const resEl = document.getElementById("qr-result");
  resEl.style.color = "#475569";
  resEl.textContent = "جارٍ التحقق والتسجيل...";

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/student/attendance/scan`, {
      method: "POST",
      headers: PortalUtils.getAuthHeaders(),
      body: JSON.stringify({ token: decodedText })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      resEl.style.color = "#16a34a"; // Green
      resEl.innerHTML = `<span style="font-size:1.5rem">✅</span> ${data.message}`;
    } else {
      resEl.style.color = "#ef4444"; // Red
      resEl.innerHTML = `<span style="font-size:1.5rem">❌</span> ${data.message}`;
    }
  } catch (err) {
    resEl.style.color = "#ef4444";
    resEl.textContent = "حدث خطأ في الاتصال بالخادم.";
  }
}

function onScanFailure(error) {
  // Ignore continuous scan failures
}
