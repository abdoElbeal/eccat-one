// Dashboard JS
const auth = PortalUtils.guard("admin");
if (auth) {
  init();
}

function init() {
  PortalUtils.setupTopbar(auth.payload);

  // Load stats from API
  loadStats();
  loadRecentRegistrations();
  loadActivities();
}

async function loadActivities() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/activities`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) return;
    const data = await res.json();
    const list = document.getElementById('activityList');
    if (!list || !data.activities.length) return;

    list.innerHTML = data.activities.map(a => {
      const user = a.user ? `${a.user.firstName} ${a.user.lastName}` : 'النظام';
      const time = PortalUtils.formatDate(a.createdAt);
      return `
        <div class="activity-item">
          <div class="activity-dot ${a.type || 'blue'}"></div>
          <div>
            <div class="activity-text">${a.action}</div>
            <div class="activity-sub">${a.details} · من قِبَل ${user} · ${time}</div>
          </div>
        </div>`;
    }).join("");
  } catch (err) {
    console.error("Activities error:", err);
  }
}

async function loadStats() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/stats`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) return;
    const data = await res.json();
    const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.textContent = Number(val).toLocaleString("ar"); };
    set("statStudents", data.studentsCount);
    set("statDoctors",  data.doctorsCount);
    set("statTAs",      data.tasCount);
    set("statCourses",  data.subjectsCount);
    set("statDepts",    data.departmentsCount);
    set("statCodes",    data.codesTotal);
  } catch (err) {
    console.error("Stats error:", err);
  }
}

async function loadRecentRegistrations() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/users?limit=5`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) return;
    const data = await res.json();
    const users = data.users || [];
    if (!users.length) return;

    const tbody = document.getElementById("recentRegs");
    if (!tbody) return;
    tbody.innerHTML = "";
    users.forEach((u) => {
      const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "؟";
      const initials = name.slice(0, 2);
      
      let roleLabel = "طالب";
      let badgeClass = "badge-blue";
      if (u.role === "doctor") {
        roleLabel = "دكتور";
        badgeClass = "badge-purple";
      } else if (u.role === "ta") {
        roleLabel = "معيد";
        badgeClass = "badge-green";
      }

      tbody.innerHTML += `
        <tr>
          <td><div class="user-info"><div class="user-avatar">${initials}</div><span>${name}</span></div></td>
          <td>${u.email}</td>
          <td><span class="badge ${badgeClass}">${roleLabel}</span></td>
          <td class="text-muted">${PortalUtils.formatDate(u.createdAt)}</td>
        </tr>`;
    });
  } catch (err) {
    console.error("Recent regs error:", err);
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  return `منذ ${Math.floor(hrs / 24)} يوم`;
}

