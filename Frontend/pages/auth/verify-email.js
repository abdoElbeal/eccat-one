// Get email and user_id from localStorage
const pendingUserId = localStorage.getItem("pendingUserId");
const pendingUserEmail = localStorage.getItem("pendingUserEmail");

// Update email in UI
const emailDisplay = document.querySelector(".highlight");
if (emailDisplay && pendingUserEmail) {
  emailDisplay.textContent = pendingUserEmail;
}

// ── OTP auto-advance + backspace ──
const otpInputs = Array.from(document.querySelectorAll('.otp-input'));

otpInputs.forEach((inp, i) => {
  inp.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(-1);
    if (this.value && i < otpInputs.length - 1) otpInputs[i + 1].focus();
  });

  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Backspace' && !this.value && i > 0) {
      otpInputs[i - 1].focus();
    }
  });

  inp.addEventListener('paste', function (e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    pasted.split('').forEach((ch, j) => {
      if (otpInputs[j]) otpInputs[j].value = ch;
    });
    const next = otpInputs[Math.min(pasted.length, otpInputs.length - 1)];
    if (next) next.focus();
  });
});

// ── OTP Countdown ──
let otpSeconds = 539; // ~9 mins
let otpInterval;
const otpTimerEl = document.getElementById('otpTimer');

function startCountdown() {
  clearInterval(otpInterval);
  otpInterval = setInterval(() => {
    otpSeconds--;
    if (otpSeconds <= 0) {
      clearInterval(otpInterval);
      otpTimerEl.textContent = '00:00';
      document.getElementById('resendTimer').style.display = 'none';
      return;
    }
    const m = String(Math.floor(otpSeconds / 60)).padStart(2, '0');
    const s = String(otpSeconds % 60).padStart(2, '0');
    otpTimerEl.textContent = `${m}:${s}`;
  }, 1000);
}
startCountdown();

// ── Submit OTP ──
document.getElementById('verifyForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const code = otpInputs.map(i => i.value).join('');
  if (code.length < 6) {
    otpInputs.find(i => !i.value)?.focus();
    return;
  }

  if (!pendingUserId) {
    alert("لم يتم العثور على بيانات المستخدم. يرجى إنشاء حساب مجدداً.");
    window.location.href = "register-step1.html";
    return;
  }

  const btn = document.getElementById('verifyBtn');
  const originalText = btn.innerHTML;
  btn.textContent = 'جارٍ التحقق...';
  btn.disabled = true;

  try {
    const API_BASE_URL = window.CONFIG.API_BASE_URL;
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, user_id: pendingUserId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "رمز غير صحيح أو منتهي الصلاحية");
    }

    btn.textContent = 'تم التحقق بنجاح ✓';
    btn.style.background = '#16a34a';

    // Clear localStorage values
    localStorage.removeItem("pendingUserId");
    localStorage.removeItem("pendingUserEmail");

    // Redirect to dashboard or login
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
  } catch (err) {
    alert(err.message || "حدث خطأ أثناء تأكيد البريد الإلكتروني");
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
});

// ── Resend Email ──
window.startResend = async function (e) {
  e.preventDefault();

  if (!pendingUserEmail) {
    alert("البريد الإلكتروني غير متوفر، الرجاء التسجيل مجدداً.");
    return;
  }

  try {
    const API_BASE_URL = window.CONFIG.API_BASE_URL;
    const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pendingUserEmail }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "لا يمكن إرسال الرمز مرة أخرى الآن");
    }

    alert("تم إرسال رمز جديد إلى بريدك الإلكتروني");
    
    // Reset timer and inputs
    otpSeconds = 539; // 9 minutes again
    document.getElementById('resendTimer').style.display = 'block';
    startCountdown();
    otpInputs.forEach(i => { i.value = ''; });
    otpInputs[0].focus();
  } catch (err) {
    alert(err.message || "حدث خطأ أثناء إعادة إرسال الرمز");
  }
};
