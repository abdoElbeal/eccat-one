// Admin Login JS
// Verifies credentials and checks that the returned token has admin role

const form = document.getElementById("adminLoginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const btn = document.getElementById("loginBtn");
const errorMsg = document.getElementById("errorMsg");

// Toggle password visibility
document.getElementById("togglePw").addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
});

// Helper to decode JWT payload without a library
function decodeTokenPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.style.display = "block";
}

function hideError() {
  errorMsg.style.display = "none";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
    return;
  }

  btn.textContent = "جارٍ تسجيل الدخول…";
  btn.disabled = true;

  try {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "فشل تسجيل الدخول");
    }

    const token = data.token;
    if (!token) {
      throw new Error("لم يتم إصدار رمز المصادقة");
    }

    // Decode and verify admin role
    const payload = decodeTokenPayload(token);
    if (!payload) {
      throw new Error("رمز المصادقة غير صالح");
    }

    const role = payload.role || payload.userRole || "";
    if (role !== "admin") {
      throw new Error("ليس لديك صلاحية الوصول إلى لوحة الإدارة");
    }

    // Store token
    localStorage.setItem("adminToken", token);
    localStorage.setItem("adminUser", JSON.stringify(payload));

    // Redirect to dashboard
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Admin login error:", error);
    showError(error.message || "حدث خطأ أثناء تسجيل الدخول");
  } finally {
    btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg> تسجيل الدخول`;
    btn.disabled = false;
  }
});
