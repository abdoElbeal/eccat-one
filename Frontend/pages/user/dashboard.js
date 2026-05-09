// ─── Dashboard JS ─────────────────────────────────────────────────────────────
const auth = PortalUtils.guard("student");
if (auth) init();

function init() {
  // 1. Core setup
  PortalUtils.setupTopbar(auth.payload);

  // 2. Personal welcome (Initial from JWT)
  const p = auth.payload;
  const initialName = p.firstName ? `${p.firstName} ${p.lastName}`.trim() : (p.fullName || p.name || "طالب");
  const welcomeName = document.getElementById("welcomeName");
  if (welcomeName) welcomeName.textContent = initialName;

  // 3. Load dynamic sections
  loadDashboardStats();
  loadUpcomingExams();
  loadAnnouncements();

  // Setup sidebar brand
  const brandText = document.querySelector(".sidebar-brand-text span");
  if (brandText) brandText.textContent = auth.payload.university || "جامعة المستقبل";
  // 4. Support Modal Logic
  setupSupportModal();
}

function setupSupportModal() {
  const modal = document.getElementById("supportModal");
  const btn = document.getElementById("supportBtn");
  const close = document.getElementById("closeSupport");
  const send = document.getElementById("sendSupport");

  if (!modal || !btn) return;

  btn.addEventListener("click", () => {
    modal.style.display = "flex";
  });

  close.addEventListener("click", () => {
    modal.style.display = "none";
  });

  send.addEventListener("click", async () => {
    const subject = document.getElementById("supportSubject").value;
    const message = document.getElementById("supportMessage").value;

    if (!subject || !message) {
      alert("يرجى ملء جميع الحقول");
      return;
    }

    send.disabled = true;
    send.textContent = "جاري الإرسال...";

    try {
      const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/student/support`, {
        method: "POST",
        headers: PortalUtils.getAuthHeaders(),
        body: JSON.stringify({ subject, message })
      });
      const d = await res.json();
      if (res.ok) {
        alert(d.message);
        modal.style.display = "none";
        document.getElementById("supportSubject").value = "";
        document.getElementById("supportMessage").value = "";
      } else {
        alert(d.message || "فشل إرسال الطلب");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال بالسيرفر");
    } finally {
      send.disabled = false;
      send.textContent = "إرسال الطلب";
    }
  });
}

// ─── 1. Stats ────────────────────────────────────────────────────────────────
async function loadDashboardStats() {
  const gpaEl      = document.getElementById("statGpa");
  const rankEl     = document.getElementById("statRank");
  const hoursEl    = document.getElementById("statHours");
  const attendEl   = document.getElementById("statAttend");
  const instructorsWrap = document.getElementById("instructorsList");

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/student/stats`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch stats");
    const d = await res.json();

    // 100% Dynamic Name from Database
    const welcomeName = document.getElementById("welcomeName");
    if (welcomeName && d.firstName) {
      welcomeName.textContent = `${d.firstName} ${d.lastName || ""}`.trim();
    }

    // Welcome subtext
    const welcomeSub = document.getElementById("welcomeSub");
    if (welcomeSub && d.welcomeMsg) welcomeSub.textContent = d.welcomeMsg;

    // GPA
    if (gpaEl) {
      gpaEl.textContent = (d.gpa || 0).toFixed(2);
      const gpaBar = document.getElementById("gpaBar");
      if (gpaBar) gpaBar.style.width = `${Math.min(100, Math.round((d.gpa / 4) * 100))}%`;
      const gpaTrend = document.getElementById("gpaTrend");
      if (gpaTrend) {
        if (d.gpa >= 3.7) gpaTrend.textContent = "أداء استثنائي ✨";
        else if (d.gpa >= 3.0) gpaTrend.textContent = "أداء ممتاز 🚀";
        else if (d.gpa >= 2.5) gpaTrend.textContent = "أداء جيد 👍";
        else gpaTrend.textContent = "يحتاج تحسين 📈";
      }
    }

    // Rank
    if (rankEl) {
      rankEl.textContent = d.rank ? `#${d.rank}` : "—";
      const badge = document.querySelector(".stat-card-badge");
      if (badge && d.totalPeers) {
        const pct = Math.round(((d.totalPeers - d.rank + 1) / d.totalPeers) * 100);
        badge.textContent = `أنت ضمن أفضل ${101 - pct}% من طلاب القسم (${d.totalPeers} طالب)`;
      }
    }

    // Hours
    if (hoursEl) {
      hoursEl.textContent = d.completedHours ?? 0;
      const hoursSub = document.getElementById("statHoursSub");
      if (hoursSub) {
        hoursSub.textContent = `تم اجتياز ${d.passedSubjects || 0} مواد بنجاح`;
      }
    }

    // Attendance
    if (attendEl) {
      const att = d.attendance || 95;
      attendEl.textContent = `${att}%`;
      
      const statusBadge = document.querySelector(".badge-purple");
      if (statusBadge) {
        statusBadge.textContent = att >= 85 ? "منتظم" : "تحذير";
        statusBadge.style.background = att >= 85 ? "#f5f3ff" : "#fef2f2";
        statusBadge.style.color = att >= 85 ? "#7c3aed" : "#ef4444";
      }

      // Update dots
      const dots = document.querySelectorAll(".stat-card:nth-child(3) span[style*='border-radius:50%']");
      dots.forEach((dot, idx) => {
        if (att >= 90) dot.style.background = "#22c55e"; // All green
        else if (att >= 75 && idx === 0) dot.style.background = "#ef4444"; // One red
        else if (att < 75) dot.style.background = "#ef4444"; // More red
      });
    }

    // Instructors
    if (instructorsWrap && d.instructors) {
      if (d.instructors.length === 0) {
        instructorsWrap.innerHTML = `<div class="empty-state" style="padding:10px;"><p>لم يتم تعيين محاضرين بعد</p></div>`;
      } else {
        instructorsWrap.innerHTML = d.instructors.map(ins => `
          <div class="instructor-item">
            <div class="avatar" style="background:linear-gradient(135deg, #eff6ff, #dbeafe); color:#2563eb; font-weight:bold;">${ins.initials || "??"}</div>
            <div style="flex:1;">
              <div style="font-weight:700;font-size:1.3rem;color:#1e293b;">${ins.name}</div>
              <div class="text-muted" style="font-size:1.1rem;">${ins.specialization || "محاضر"}</div>
            </div>
            <button class="chat-btn" onclick="location.href='messages.html'" title="مراسلة">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.38 8.38 0 0 1 3.8.9L21 3z"/></svg>
            </button>
          </div>
        `).join("");
      }
    }

  } catch (err) {
    console.error("Dashboard stats error:", err);
  }
}

// ─── 2. Upcoming Exams ───────────────────────────────────────────────────────
async function loadUpcomingExams() {
  const wrap = document.getElementById("examsList");
  if (!wrap) return;
  showSkeleton(wrap, 2);

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/student/exams/upcoming`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    const d = await res.json();
    const exams = d.exams || [];

    if (exams.length === 0) {
      wrap.innerHTML = `
        <div class="empty-state" style="padding:40px 20px;">
          <div style="font-size:3rem;margin-bottom:10px;">📅</div>
          <p>لا توجد امتحانات قادمة حالياً</p>
          <span class="text-muted" style="font-size:1.1rem;">استغل الوقت في المراجعة!</span>
        </div>`;
      return;
    }

    wrap.innerHTML = exams.map(ex => {
      const date = new Date(ex.date);
      const day = date.getDate();
      const month = date.toLocaleDateString("ar-EG", { month: "short" });

      const LABELS = { quiz:"كويز", midterm:"ميدتيرم", final:"نهائي", lab:"عملي", oral:"شفهي" };
      const COLORS = { quiz:"#7c3aed", midterm:"#2463eb", final:"#ea580c", lab:"#16a34a", oral:"#0891b2" };
      
      const lbl = LABELS[ex.type] || ex.type || "امتحان";
      const clr = COLORS[ex.type] || "#2463eb";

      return `
        <div class="exam-item" style="border-right: 4px solid ${clr};">
          <div class="exam-date" style="background:${clr}12; color:${clr};">
            <span class="exam-day">${day}</span>
            <span class="exam-month">${month}</span>
          </div>
          <div class="exam-info">
            <div class="exam-name">${ex.name}</div>
            <div class="exam-meta">
              <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ${ex.location || 'قاعة غير محددة'}</span>
              <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${ex.time || '--:--'}</span>
            </div>
          </div>
          <div class="exam-status" style="background:${clr}20; color:${clr};">${lbl}</div>
        </div>
      `;
    }).join("");

  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><p>تعذر تحميل الامتحانات</p></div>`;
  }
}

// ─── 3. Announcements ────────────────────────────────────────────────────────
async function loadAnnouncements() {
  const wrap = document.getElementById("announcementsList");
  if (!wrap) return;
  showSkeleton(wrap, 3);

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/student/announcements`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    const d = await res.json();
    const ann = d.announcements || [];

    if (ann.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><p>لا توجد إعلانات جديدة</p></div>`;
      return;
    }

    wrap.innerHTML = ann.slice(0, 4).map(a => {
      const isUrgent = a.priority === "urgent";
      const isImportant = a.priority === "important";
      const iconClass = isUrgent ? "high" : (isImportant ? "important" : "");
      let authorName = "الإدارة";
      if (a.createdBy && a.createdBy.firstName) authorName = `${a.createdBy.firstName} ${a.createdBy.lastName || ''}`.trim();

      return `
        <div class="announcement-item">
          <div class="ann-icon ${iconClass}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div class="ann-content">
            <div class="ann-title">
              <span>${a.title}</span>
              ${isUrgent ? '<span class="badge-red">عاجل</span>' : ''}
            </div>
            <div class="ann-desc">${a.content}</div>
            <div class="ann-time">${new Date(a.createdAt).toLocaleDateString("ar-EG")} • ${authorName}</div>
          </div>
        </div>
      `;
    }).join("");

  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><p>تعذر تحميل الإعلانات</p></div>`;
  }
}

function showSkeleton(el, count) {
  let html = "";
  for (let i = 0; i < count; i++) {
    html += `
      <div class="skeleton-item" style="height:64px;background:#f1f5f9;border-radius:12px;margin-bottom:12px;animation:pulse 1.5s infinite;"></div>
    `;
  }
  el.innerHTML = html;
}

// Add animation keyframes for pulse if not in CSS
if (!document.getElementById("dash-animations")) {
  const style = document.createElement("style");
  style.id = "dash-animations";
  style.innerHTML = `
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    .badge-red { font-weight: bold; }
  `;
  document.head.appendChild(style);
}
