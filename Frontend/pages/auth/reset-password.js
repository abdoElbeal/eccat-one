// ─── Reset Password JS ────────────────────────────────────────────────────────
// Reads ?token=...&userId=... from the URL
const params   = new URLSearchParams(window.location.search);
const token    = params.get("token");
const userId   = params.get("userId");

const form        = document.getElementById("resetForm");
const btn         = document.getElementById("resetBtn");
const errorMsg    = document.getElementById("errorMsg");
const successMsg  = document.getElementById("successMsg");

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = "block";
  successMsg.style.display = "none";
}
function hideError() { errorMsg.style.display = "none"; }

// Guard: if no token/userId in URL, show error immediately
if (!token || !userId) {
  showError("رابط إعادة التعيين غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.");
  btn.disabled = true;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const password        = document.getElementById("password").value.trim();
  const passwordConfirm = document.getElementById("passwordConfirm").value.trim();

  if (!password || !passwordConfirm) {
    return showError("يرجى ملء جميع الحقول");
  }
  if (password !== passwordConfirm) {
    return showError("كلمتا المرور غير متطابقتين");
  }
  if (password.length < 8) {
    return showError("يجب أن تتكون كلمة المرور من 8 أحرف على الأقل");
  }

  const originalHTML = btn.innerHTML;
  btn.innerHTML = "جارٍ الحفظ...";
  btn.disabled  = true;

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, userId, password, passwordConfirm }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "فشل تعيين كلمة المرور");

    // Show success
    form.style.display = "none";
    successMsg.style.display = "flex";

    // Redirect to login after 2.5s
    setTimeout(() => { window.location.href = "login.html"; }, 2500);

  } catch (err) {
    showError(err.message || "حدث خطأ. يرجى المحاولة مرة أخرى.");
    btn.innerHTML = originalHTML;
    btn.disabled  = false;
  }
});
