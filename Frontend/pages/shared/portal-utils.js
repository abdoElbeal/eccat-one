/**
 * portal-utils.js
 * Standardized utilities for all EccatOne portals
 */

const PortalUtils = {
    // ─── 1. AUTH & STORAGE ───────────────────────────────────────────────────
    getToken() {
        return localStorage.getItem("token") || localStorage.getItem("adminToken");
    },

    saveAuth(token, role) {
        localStorage.setItem("token", token);
        localStorage.setItem("userRole", role);
    },

    clearAuth() {
        localStorage.removeItem("token");
        localStorage.removeItem("adminToken");
        localStorage.removeItem("userRole");
        window.location.href = "../auth/login.html";
    },

    getPayload() {
        const token = this.getToken();
        if (!token) return null;
        try {
            const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
            return JSON.parse(atob(base64));
        } catch (e) { return null; }
    },

    guard(requiredRole) {
        const token = this.getToken();
        if (!token) {
            window.location.href = "../auth/login.html";
            return null;
        }
        const payload = this.getPayload();
        if (!payload || (requiredRole && payload.role !== requiredRole)) {
            this.clearAuth();
            return null;
        }
        return { token, payload };
    },

    getAuthHeaders() {
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.getToken()}`
        };
    },

    getUploadHeaders() {
        return {
            "Authorization": `Bearer ${this.getToken()}`
        };
    },

    // ─── 2. UI UTILS ────────────────────────────────────────────────────────
    showToast(msg, type = "info") {
        const existing = document.querySelector(".portal-toast");
        if (existing) existing.remove();

        const toast = document.createElement("div");
        toast.className = `portal-toast ${type}`;
        toast.innerHTML = `<span>${msg}</span>`;
        
        // Style injection if not exists
        if (!document.getElementById("portal-toast-styles")) {
            const style = document.createElement("style");
            style.id = "portal-toast-styles";
            style.textContent = `
                .portal-toast {
                    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
                    background: #1e293b; color: #fff; padding: 12px 24px; border-radius: 12px;
                    font-size: 1.3rem; z-index: 100000; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
                    animation: toastSlideUp 0.3s ease-out;
                    direction: rtl;
                }
                .portal-toast.success { background: #16a34a; }
                .portal-toast.error { background: #dc2626; }
                @keyframes toastSlideUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transition = "opacity 0.5s";
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    },

    // ─── 3. SHARED COMPONENTS ────────────────────────────────────────────────
    setupTopbar(payload) {
        const firstName = payload.firstName || "";
        const lastName = payload.lastName || "";
        const fullName = `${firstName} ${lastName}`.trim() || payload.name || "مستخدم";
        
        const nameEl = document.getElementById("topbarName") || document.getElementById("userNameTop");
        if (nameEl) nameEl.textContent = fullName;

        const subEl = document.getElementById("topbarSub") || document.getElementById("userRoleTop");
        if (subEl) {
            const roles = { student: "طالب", doctor: "دكتور", admin: "مدير النظام", ta: "معيد" };
            subEl.textContent = roles[payload.role] || payload.role;
        }

        const avatar = document.getElementById("topbarAvatar");
        if (avatar) {
            if (payload.profileImage) {
                const url = payload.profileImage.startsWith("http") ? payload.profileImage : `${window.CONFIG.API_BASE_URL}${payload.profileImage}`;
                avatar.innerHTML = `<img src="${url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.src='../../assets/default-avatar.png'">`;
            } else {
                const initials = (firstName[0] || "") + (lastName[0] || "") || fullName.slice(0, 2);
                avatar.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, #2463eb, #7c3aed);color:#fff;font-weight:700;font-size:1.4rem;border-radius:50%;">${initials.toUpperCase()}</div>`;
            }
        }
    },

    wireCommonButtons() {
        // Logout
        document.getElementById("logoutBtn")?.addEventListener("click", () => this.clearAuth());

        // Sidebar Toggle (Mobile)
        this.setupSidebar();

        // Support
        const supportBtn = document.getElementById("supportBtn") || document.querySelector(".support-btn");
        supportBtn?.addEventListener("click", () => this.openSupportModal());
        
        document.getElementById("nav-help")?.addEventListener("click", (e) => {
            e.preventDefault();
            this.openSupportModal();
        });

        // Settings (Profile)
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.textContent.includes("الإعدادات")) {
                item.addEventListener('click', (e) => {
                   // Only redirect if it's not already on profile page
                   if (!window.location.pathname.includes('profile.html')) {
                       e.preventDefault();
                       const path = window.location.pathname.includes('/shared/') ? 'profile.html' : '../shared/profile.html';
                       window.location.href = path;
                   }
                });
            }
        });
        this.setupNotifications();
    },

    setupSidebar() {
        const hamburger = document.getElementById("hamburgerBtn");
        const sidebar = document.querySelector(".sidebar");
        const backdrop = document.querySelector(".sidebar-backdrop");

        if (!hamburger || !sidebar) return;

        const toggle = () => {
            const isOpen = sidebar.classList.contains("open");
            if (isOpen) {
                sidebar.classList.remove("open");
                backdrop?.classList.remove("active");
                hamburger.setAttribute("aria-expanded", "false");
            } else {
                sidebar.classList.add("open");
                backdrop?.classList.add("active");
                hamburger.setAttribute("aria-expanded", "true");
            }
        };

        hamburger.addEventListener("click", (e) => {
            e.stopPropagation();
            toggle();
        });

        backdrop?.addEventListener("click", () => {
            if (sidebar.classList.contains("open")) toggle();
        });

        // Close sidebar on nav item click (mobile)
        sidebar.querySelectorAll(".nav-item").forEach(item => {
            item.addEventListener("click", () => {
                if (window.innerWidth <= 900 && sidebar.classList.contains("open")) toggle();
            });
        });
    },

    openSupportModal() {
        if (document.getElementById("supportModal")) {
            document.getElementById("supportModal").style.display = "flex";
            return;
        }
        const modal = document.createElement("div");
        modal.id = "supportModal";
        modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000001;backdrop-filter:blur(4px);`;
        modal.innerHTML = `
            <div style="background:#fff; width:90%; max-width:500px; border-radius:16px; padding:30px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1); direction:rtl; position:relative;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h2 style="font-size:1.8rem; font-weight:800; color:#1e293b; margin:0;">الدعم الفني</h2>
                    <button onclick="document.getElementById('supportModal').style.display='none'" style="background:none; border:none; cursor:pointer; font-size:1.5rem;">✕</button>
                </div>
                <p style="font-size: 1.3rem; color: #64748b; margin-bottom: 20px;">تواجه مشكلة؟ أرسل لنا رسالة وسنقوم بالرد عليك في أقرب وقت.</p>
                <div style="display:flex; flex-direction:column; gap:15px;">
                    <input type="text" id="supportSubject" placeholder="الموضوع" style="width:100%; padding:12px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:1.3rem;">
                    <textarea id="supportMessage" rows="4" placeholder="اشرح المشكلة بالتفصيل..." style="width:100%; padding:12px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:1.3rem; resize:none;"></textarea>
                    <button id="sendSupportBtn" style="background:#2463eb; color:#fff; padding:12px; border:none; border-radius:8px; font-size:1.4rem; font-weight:700; cursor:pointer;">إرسال الطلب</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        
        document.getElementById("sendSupportBtn").addEventListener("click", async () => {
            const subject = document.getElementById("supportSubject").value;
            const message = document.getElementById("supportMessage").value;
            if (!subject || !message) {
                this.showToast("يرجى ملء جميع الحقول", "error");
                return;
            }

            const btn = document.getElementById("sendSupportBtn");
            btn.disabled = true;
            btn.textContent = "جاري الإرسال...";

            try {
                const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/student/support`, {
                    method: "POST",
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({ subject, message })
                });
                const d = await res.json();
                if (res.ok) {
                    this.showToast(d.message || "تم إرسال طلبك بنجاح", "success");
                    modal.style.display = "none";
                } else {
                    this.showToast(d.message || "فشل إرسال الطلب", "error");
                }
            } catch (err) {
                this.showToast("خطأ في الاتصال بالسيرفر", "error");
            } finally {
                btn.disabled = false;
                btn.textContent = "إرسال الطلب";
            }
        });
    },

    setupNotifications() {
        const bell = document.querySelector(".topbar-bell") || document.querySelector(".topbar-icon-btn");
        if (!bell) return;

        bell.addEventListener("click", (e) => {
            e.preventDefault();
            this.showToast("🔔 لا توجد إشعارات جديدة في الوقت الحالي", "info");
            const dot = bell.querySelector(".notif-dot");
            if (dot) dot.style.display = "none";
        });
    },

    formatDate(dateStr) {
        if (!dateStr) return "";
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `منذ ${mins} دقيقة`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `منذ ${hrs} ساعة`;
        return `منذ ${Math.floor(hrs / 24)} يوم`;
    }
};

// Auto-run common logic if we are in a portal
if (typeof window !== "undefined" && !window.location.pathname.includes("/auth/")) {
    document.addEventListener("DOMContentLoaded", () => {
        PortalUtils.wireCommonButtons();
    });
}
