console.log("Register JS Version: 4.4 - FIXED RELOAD + 400 ERRORS + ENTER KEY");

const form = document.getElementById("registerForm");
const btn = document.getElementById("registerBtn");
const errorBox = document.getElementById("errorBox");

const fullName = document.getElementById("fullName");
const nationalId = document.getElementById("nationalId");
const regCode = document.getElementById("regCode");
const email = document.getElementById("email");
const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");
const terms = document.getElementById("terms");
const nickname = document.getElementById("nickname");
const avatarInput = document.getElementById("avatarInput");
const avatarCircle = document.getElementById("avatarCircle");

function showError(msg) {
  if (errorBox) {
    errorBox.textContent = msg;
    errorBox.style.display = "block";
    errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// Avatar preview
if (avatarInput) {
  avatarInput.addEventListener("change", () => {
    if (avatarInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        avatarCircle.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; border-radius:50%;" />`;
      };
      reader.readAsDataURL(avatarInput.files[0]);
    }
  });
}

// National ID input filter
if (nationalId) {
  nationalId.addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0, 14);
  });
}

// ✅ Hard stop for any form action
function handleSafeSubmit(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  handleSubmitLogic();
  return false;
}

async function handleSubmitLogic() {
  if (errorBox) errorBox.style.display = "none";

  const fields = [
    fullName,
    nationalId,
    regCode,
    email,
    password,
    confirmPassword,
    nickname,
  ];
  const missing = fields.some((f) => !f.value.trim());

  if (missing || !avatarInput.files[0])
    return showError("يرجى تعبئة جميع الحقول");
  if (!terms.checked) return showError("يجب الموافقة على الشروط");
  if (password.value !== confirmPassword.value)
    return showError("كلمتا المرور غير متطابقتين");

  btn.disabled = true;

  try {
    const API_BASE_URL = window.CONFIG?.API_BASE_URL || "http://localhost:3000";

    const formData = new FormData();
    formData.append("fullName", fullName.value);
    formData.append("nationalId", nationalId.value);
    formData.append("registrationCode", regCode.value);
    formData.append("email", email.value);
    formData.append("password", password.value);
    formData.append("passwordConfirm", confirmPassword.value);
    formData.append("nickName", nickname.value);
    formData.append("profileImage", avatarInput.files[0]);

    const response = await fetch(`${API_BASE_URL}/api/auth/users`, {
      method: "POST",
      body: formData,
    });

    let data = {};
    try {
      data = await response.json();
    } catch {}

    if (!response.ok) {
      const msg = data.message || "خطأ في الخادم";
      throw new Error(msg);
    }
    
    // Save pending creds for verify email step
    if (data.user && data.user.id) {
      localStorage.setItem("pendingUserId", data.user.id);
      localStorage.setItem("pendingUserEmail", data.user.email);
    }

    window.location.href = "verify-email.html";
  } catch (err) {
    showError(err.message === "Failed to fetch" ? "لا يمكن الاتصال بالخادم" : err.message);
    btn.disabled = false;
  }
}

if (form) {
  form.addEventListener("submit", handleSafeSubmit);
}

if (btn) {
  btn.addEventListener("click", handleSafeSubmit);
}
