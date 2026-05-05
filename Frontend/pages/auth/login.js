// ─── Login Page JS ────────────────────────────────────────────────────────────
const form        = document.getElementById("loginForm");
const emailInput  = document.getElementById("email");
const passInput   = document.getElementById("password");
const btn         = document.getElementById("loginBtn");
const toggleBtn   = document.getElementById("toggleLogin");

// Error box – inject if not present
let errorBox = document.getElementById("loginError");
if (!errorBox) {
  errorBox = document.createElement("div");
  errorBox.id = "loginError";
  errorBox.style.cssText = "display:none;background:#fef2f2;border:1.5px solid #fca5a5;color:#dc2626;padding:12px 16px;border-radius:10px;font-size:1.35rem;margin-bottom:14px;text-align:right;";
  form.insertBefore(errorBox, form.firstChild);
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.style.display = "block";
}
function hideError() {
  errorBox.style.display = "none";
}

// Password toggle
if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    passInput.type = passInput.type === "password" ? "text" : "password";
  });
}

// Decode JWT payload without verification (for redirect only)
function decodeJWT(token) {
  try {
    return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch { return null; }
}

// Role → redirect path
function getRedirectPath(role) {
  switch (role) {
    case "admin":   return "../admin/dashboard.html";
    case "doctor":  return "../doctor/dashboard.html";
    case "student": return "../user/dashboard.html";
    default:        return "../user/dashboard.html";
  }
}

// Submit
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const email    = emailInput.value.trim();
  const password = passInput.value.trim();

  if (!email || !password) {
    return showError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
  }

  btn.textContent = "جارٍ تسجيل الدخول...";
  btn.disabled    = true;

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "فشل تسجيل الدخول");
    }

    if (!data.token) throw new Error("لم يتم استلام رمز الجلسة");

    // Standardized storage
    const payload = decodeJWT(data.token);
    const role    = payload?.role || "student";
    
    localStorage.setItem("token", data.token);
    localStorage.setItem("userRole", role);

    // Redirect by role
    window.location.href = getRedirectPath(role);

  } catch (err) {
    showError(err.message || "حدث خطأ أثناء تسجيل الدخول");
    btn.textContent = "تسجيل الدخول";
    btn.disabled    = false;
  }
});
