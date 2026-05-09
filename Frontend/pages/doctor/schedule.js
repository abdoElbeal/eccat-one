// ─── Doctor Schedule JS ────────────────────────────────────────────────────────
const auth = PortalUtils.guard("doctor");
if (auth) init();

function init() {
  PortalUtils.setupTopbar(auth.payload);
  loadSchedule();
}

const AR_DAYS = {
  sunday: "الأحد",
  monday: "الإثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
  saturday: "السبت",
};

async function loadSchedule() {
  const grid = document.getElementById("scheduleGrid");
  if (!grid) return;

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/schedule`, {
      headers: PortalUtils.getAuthHeaders(),
    });

    if (!res.ok) {
      grid.innerHTML = `<div class="empty-state">تعذّر تحميل الجدول.</div>`;
      return;
    }

    const data = await res.json();
    const schedule = data.schedule || {};

    let html = "";
    for (const [dayKey, dayName] of Object.entries(AR_DAYS)) {
      const lectures = schedule[dayKey] || [];
      
      let cardsHtml = "";
      if (lectures.length === 0) {
        cardsHtml = `<div class="empty-day">لا توجد محاضرات في هذا اليوم</div>`;
      } else {
        cardsHtml = lectures.map(lec => {
          return `
            <div class="sch-card" style="--card-color: ${lec.color || '#2463eb'}">
              <div class="sch-time">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ${lec.time}
              </div>
              <div class="sch-title">${lec.name} (${lec.code})</div>
              <div class="sch-meta">
                <span>🏛️ ${lec.location}</span>
                <span>🔵 ${lec.group}</span>
              </div>
            </div>
          `;
        }).join("");
      }

      html += `
        <div class="sch-day">
          <div class="sch-day-header">${dayName}</div>
          <div class="sch-day-content">${cardsHtml}</div>
        </div>
      `;
    }

    grid.innerHTML = html;

  } catch (err) {
    console.error("Schedule error:", err);
    grid.innerHTML = `<div class="empty-state">حدث خطأ أثناء تحميل الجدول.</div>`;
  }
}
