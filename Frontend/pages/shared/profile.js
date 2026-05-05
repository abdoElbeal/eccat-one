// ─── Profile JS ────────────────────────────────────────────────────────────────
// This script works for Students, Doctors, and Admins via PortalUtils

const auth = PortalUtils.guard(); // Ensure logged in
if (auth) init();

function init() {
    PortalUtils.setupTopbar(auth.payload);
    loadUserProfile();

    document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
    document.getElementById('changePassBtn').addEventListener('click', changePassword);
    document.getElementById('imageUpload').addEventListener('change', previewImage);
    document.getElementById('logoutBtn').addEventListener('click', () => PortalUtils.clearAuth());
}

async function loadUserProfile() {
    const payload = auth.payload;
    const userId = payload.id;
    const userRole = payload.role;
    
    // Set UI basics
    document.getElementById('userNameFull').textContent = `${payload.firstName || ""} ${payload.lastName || ""}`.trim() || payload.name;
    document.getElementById('userEmail').textContent = payload.email || '—';
    
    const roleLabels = { student: 'طالب', doctor: 'دكتور', admin: 'مشرف نظام', ta: 'معيد' };
    document.getElementById('userRoleBadge').textContent = roleLabels[userRole] || 'مستخدم';

    try {
        // Fetch full details from correct API
        const endpoint = userRole === 'admin' ? `/api/admin/users/${userId}` : `/api/${userRole}/stats`;
        const res = await fetch(`${window.CONFIG.API_BASE_URL}${endpoint}`, {
            headers: PortalUtils.getAuthHeaders()
        });
        
        if (res.ok) {
            const data = await res.json();
            const user = data.user || data; 
            
            document.getElementById('nicknameInput').value = user.nickName || user.firstName || '';
            document.getElementById('phoneInput').value = user.phone || '';
            document.getElementById('addressInput').value = user.address || '';
            document.getElementById('nationalIdInfo').textContent = user.nationalId || '—';
            document.getElementById('joinDateInfo').textContent = new Date(user.createdAt).toLocaleDateString('ar-EG');
            
            if (user.profileImage) {
                const url = user.profileImage.startsWith('http') ? user.profileImage : `${window.CONFIG.API_BASE_URL}${user.profileImage}`;
                document.getElementById('imagePreview').style.backgroundImage = `url(${url})`;
            }
        }
    } catch (err) {
        console.error("Load profile error:", err);
    }
}

function previewImage(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('imagePreview').style.backgroundImage = `url(${e.target.result})`;
        };
        reader.readAsDataURL(file);
    }
}

async function saveProfile() {
    const btn = document.getElementById('saveProfileBtn');
    btn.disabled = true;
    btn.textContent = 'جارٍ الحفظ...';

    const formData = new FormData();
    formData.append('nickName', document.getElementById('nicknameInput').value);
    formData.append('address', document.getElementById('addressInput').value);
    formData.append('phone', document.getElementById('phoneInput').value);
    
    const fileInput = document.getElementById('imageUpload');
    if (fileInput.files[0]) {
        formData.append('profileImage', fileInput.files[0]);
    }

    try {
        const userRole = auth.payload.role;
        const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/${userRole}/profile`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${PortalUtils.getToken()}`
            },
            body: formData
        });

        if (res.ok) {
            PortalUtils.showToast('تم تحديث الملف الشخصي بنجاح', 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            const d = await res.json();
            PortalUtils.showToast(d.message || 'فشل التحديث', 'error');
        }
    } catch (err) {
        PortalUtils.showToast('خطأ في الاتصال بالسيرفر', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ التغييرات';
    }
}

async function changePassword() {
    const oldPass = document.getElementById('oldPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;

    if (!oldPass || !newPass) return PortalUtils.showToast('يرجى إدخال كلمة المرور', 'error');
    if (newPass !== confirmPass) return PortalUtils.showToast('كلمة المرور غير متطابقة', 'error');

    try {
        const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/auth/change-password`, {
            method: 'POST',
            headers: PortalUtils.getAuthHeaders(),
            body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
        });

        if (res.ok) {
            PortalUtils.showToast('تم تغيير كلمة المرور بنجاح', 'success');
            document.getElementById('oldPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            const d = await res.json();
            PortalUtils.showToast(d.message || 'فشل التغيير', 'error');
        }
    } catch (err) {
        PortalUtils.showToast('خطأ في الاتصال', 'error');
    }
}

