// ─── Schedule JS ──────────────────────────────────────────────────────────────
const auth = PortalUtils.guard("student");
if (auth) init();

function init() {
  // Logout handled by PortalUtils
  PortalUtils.setupTopbar(auth.payload);
  loadSchedule();
}

const DAY_MAP = {
  sunday: "sun", monday: "mon", tuesday: "tue", wednesday: "wed", thursday: "thu",
};

async function loadSchedule() {
  const statusEl = document.getElementById("schedStatus");
  if (statusEl) statusEl.textContent = "جارٍ التحميل...";

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/student/schedule`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch schedule");
    const d = await res.json();
    
    // Update summary cards
    if (document.getElementById("totalHrsWeek")) document.getElementById("totalHrsWeek").textContent = d.totalHoursPerWeek || 0;
    if (document.getElementById("totalCoursesWeek")) document.getElementById("totalCoursesWeek").textContent = d.coursesCount || 0;
    if (statusEl) statusEl.textContent = d.status || "معتمد";

    renderSchedule(d.schedule || {});

  } catch (err) {
    console.error("Schedule error:", err);
    if (statusEl) statusEl.textContent = "خطأ في التحميل";
  }
}

function renderSchedule(schedule) {
  // Clear all day columns
  document.querySelectorAll(".sched-day-col").forEach(col => {
    const header = col.querySelector(".sched-header-cell");
    col.innerHTML = "";
    if (header) col.appendChild(header);
  });

  Object.entries(schedule).forEach(([day, sessions]) => {
    const dayKey = DAY_MAP[day.toLowerCase()];
    if (!dayKey) return;

    const col = document.querySelector(`.sched-day-col[data-day="${dayKey}"]`);
    if (!col) return;

    if (!sessions || sessions.length === 0) {
      col.innerHTML += `<div class="sched-slot" style="color:#94a3b8; text-align:center; padding:20px;">—</div>`;
      return;
    }

    sessions.forEach(s => {
      const slot = document.createElement("div");
      slot.className = "sched-slot";
      slot.innerHTML = `
        <div class="sched-event" style="--accent:${s.color || '#2463eb'};">
          <div class="se-name">${s.name}</div>
          <div class="se-time">${s.time}</div>
          <div class="se-meta">📍 ${s.location}</div>
          <div class="se-doctor">👤 ${s.instructor}</div>
        </div>
      `;
      col.appendChild(slot);
    });
  });
}
