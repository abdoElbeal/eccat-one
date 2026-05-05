const form    = document.getElementById('forgotForm');
const btn     = document.getElementById('resetBtn');
const success = document.getElementById('successMsg');
const resetEmailInput = document.getElementById('resetEmail');

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  const email = resetEmailInput.value.trim();
  
  if (!email) {
    resetEmailInput.focus();
    return;
  }

  const originalContent = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<svg viewBox="0 0 24 24" style="animation:spin 1s linear infinite"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8Z"/></svg> جارٍ الإرسال…';

  try {
    const API_BASE_URL = window.CONFIG.API_BASE_URL;
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "تعذر إرسال رابط التعيين. تأكد من صحة البريد الإلكتروني.");
    }

    btn.classList.add('sent');
    btn.innerHTML = '✓ تم الإرسال بنجاح';
    success.style.display = 'flex';
  } catch (err) {
    alert(err.message || "حدث خطأ أثناء الإرسال. يرجى المحاولة لاحقاً.");
    btn.innerHTML = originalContent;
    btn.disabled = false;
  }
});
