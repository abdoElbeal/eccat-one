// ─── Admin Schedule Management ────────────────────────────────────────────────
// State MUST come before auth (TDZ prevention)
let currentGroupId   = "";
let currentGroupYear = 1;
let selectedColor    = "";
let allSubjects      = [];
let allDoctors       = [];

const DAYS = [
  { key: "Saturday",  ar: "السبت",    en: "Sat" },
  { key: "Sunday",    ar: "الأحد",    en: "Sun" },
  { key: "Monday",    ar: "الاثنين",  en: "Mon" },
  { key: "Tuesday",   ar: "الثلاثاء", en: "Tue" },
  { key: "Wednesday", ar: "الأربعاء", en: "Wed" },
  { key: "Thursday",  ar: "الخميس",   en: "Thu" },
  { key: "Friday",    ar: "الجمعة",   en: "Fri" },
];

const TIME_SLOTS = [
  { id: "08",  start: "08:00", end: "09:30",  label: "08:00", endLabel: "09:30" },
  { id: "09",  start: "09:00", end: "10:30",  label: "09:00", endLabel: "10:30" },
  { id: "10",  start: "10:00", end: "11:30",  label: "10:00", endLabel: "11:30" },
  { id: "10h", start: "10:30", end: "12:00",  label: "10:30", endLabel: "12:00" },
  { id: "11",  start: "11:00", end: "12:30",  label: "11:00", endLabel: "12:30" },
  { id: "12",  start: "12:00", end: "13:30",  label: "12:00", endLabel: "13:30" },
  { id: "13",  start: "13:00", end: "14:30",  label: "01:00", endLabel: "02:30" },
  { id: "13h", start: "13:30", end: "15:00",  label: "01:30", endLabel: "03:00" },
  { id: "14",  start: "14:00", end: "15:30",  label: "02:00", endLabel: "03:30" },
  { id: "15",  start: "15:00", end: "16:30",  label: "03:00", endLabel: "04:30" },
];

const COLOR_MAP = {
  "":             { bg: "linear-gradient(135deg,#eff6ff,#e0e7ff)", border: "#2463eb",  label: "أزرق" },
  "color-purple": { bg: "linear-gradient(135deg,#f5f3ff,#ede9fe)", border: "#7c3aed",  label: "بنفسجي" },
  "color-green":  { bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "#16a34a",  label: "أخضر" },
  "color-orange": { bg: "linear-gradient(135deg,#fff7ed,#ffedd5)", border: "#ea580c",  label: "برتقالي" },
  "color-cyan":   { bg: "linear-gradient(135deg,#e0f2fe,#cffafe)", border: "#0891b2",  label: "سماوي" },
  "color-red":    { bg: "linear-gradient(135deg,#fef2f2,#fee2e2)", border: "#ef4444",  label: "أحمر" },
};

const auth = PortalUtils.guard("admin");
if (auth) init();

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  PortalUtils.setupTopbar(auth.payload);

  document.getElementById("addSlotBtn").addEventListener("click", () => {
    if (!currentGroupId) return PortalUtils.showToast("يرجى اختيار السنة والمجموعة أولاً", "error");
    openSlotModal();
  });
  document.getElementById("saveSlotBtn").addEventListener("click", saveSlot);
  document.getElementById("yearSelect").addEventListener("change", onYearChange);
  document.getElementById("groupSelect").addEventListener("change", onGroupChange);
  document.getElementById("slotModal").addEventListener("click", e => { if (e.target.id === "slotModal") closeSlotModal(); });

  loadSubjectsAndDoctors();
  buildGrid();
}

// ── Schedule Grid ─────────────────────────────────────────────────────────────
function buildGrid() {
  const grid      = document.getElementById("schedGrid");
  const todayDay  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];
  let html = `<div class="sched-col-header time-col">الوقت</div>`;

  DAYS.forEach(d => {
    const isToday = d.key === todayDay;
    html += `<div class="sched-col-header day-col ${isToday ? "today" : ""}">
               <div class="day-name">${d.ar}</div>
               <div class="day-name-en">${d.en}</div>
             </div>`;
  });

  TIME_SLOTS.forEach(slot => {
    html += `<div class="sched-time-cell">
               <span class="t-start">${slot.label}</span>
               <span class="t-end">${slot.endLabel}</span>
             </div>`;
    DAYS.forEach(d => {
      html += `<div class="sched-day-cell" id="cell-${d.key}-${slot.id}"
                    onclick="quickAddSlot('${d.key}','${slot.start}','${slot.end}')">
                 <div class="add-hint">
                   <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:currentColor;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                   إضافة
                 </div>
               </div>`;
    });
  });
  grid.innerHTML = html;
}

// ── Year → Load Groups ────────────────────────────────────────────────────────
async function onYearChange() {
  const year  = document.getElementById("yearSelect").value;
  const sel   = document.getElementById("groupSelect");
  currentGroupId = "";
  sel.innerHTML  = "<option value=''>جارٍ تحميل المجموعات...</option>";
  sel.disabled   = true;
  document.getElementById("refreshBtn").disabled = true;
  document.getElementById("schedWrapper").style.display    = "none";
  document.getElementById("schedPlaceholder").style.display = "block";

  if (!year) {
    sel.innerHTML = "<option value=''>اختر المجموعة...</option>";
    return;
  }

  try {
    const res   = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/groups?yearLevel=${year}`, { headers: PortalUtils.getAuthHeaders() });
    const data  = await res.json();
    const groups = data.groups || [];

    if (!groups.length) {
      sel.innerHTML = `<option value="">لا توجد مجموعات للسنة ${year}</option>`;
      return;
    }
    sel.innerHTML = "<option value=''>اختر المجموعة...</option>";
    groups.forEach(g => {
      sel.innerHTML += `<option value="${g._id}" data-year="${g.yearLevel}">${g.name} (${g.code}) — ${g.students?.length || 0} طالب</option>`;
    });
    sel.disabled = false;

    // Auto-select if only one group
    if (groups.length === 1) {
      sel.value = groups[0]._id;
      currentGroupYear = groups[0].yearLevel;
      onGroupChange();
    }
  } catch (e) {
    PortalUtils.showToast("فشل تحميل المجموعات", "error");
    sel.innerHTML = "<option value=''>خطأ في التحميل</option>";
  }
}

// ── Group Selected ────────────────────────────────────────────────────────────
function onGroupChange() {
  const sel = document.getElementById("groupSelect");
  currentGroupId = sel.value;
  const opt = sel.options[sel.selectedIndex];
  currentGroupYear = parseInt(opt?.dataset?.year || "1");

  document.getElementById("refreshBtn").disabled = !currentGroupId;
  if (currentGroupId) {
    document.getElementById("schedWrapper").style.display    = "block";
    document.getElementById("schedPlaceholder").style.display = "none";
    // Filter subjects for this year level
    updateSubjectFilter();
    loadSchedule();
  } else {
    document.getElementById("schedWrapper").style.display    = "none";
    document.getElementById("schedPlaceholder").style.display = "block";
  }
}

// ── Filter subjects by year ───────────────────────────────────────────────────
function updateSubjectFilter() {
  const subSel = document.getElementById("slotSubject");
  subSel.innerHTML = "<option value=''>اختر المادة...</option>";
  const filtered = allSubjects.filter(s => !s.yearLevel || s.yearLevel === currentGroupYear);
  const rest     = allSubjects.filter(s => s.yearLevel && s.yearLevel !== currentGroupYear);

  if (filtered.length) {
    const grp = document.createElement("optgroup");
    grp.label = `السنة ${currentGroupYear} (${filtered.length} مادة)`;
    filtered.forEach(s => {
      const o = document.createElement("option");
      o.value = s._id; o.textContent = `${s.name} (${s.code || ""})`;
      grp.appendChild(o);
    });
    subSel.appendChild(grp);
  }

  if (rest.length) {
    const grp = document.createElement("optgroup");
    grp.label = "مواد أخرى";
    rest.forEach(s => {
      const o = document.createElement("option");
      o.value = s._id; o.textContent = `${s.name} (${s.code || ""}) — سنة ${s.yearLevel}`;
      grp.appendChild(o);
    });
    subSel.appendChild(grp);
  }
}

// ── Clear Grid Cells ──────────────────────────────────────────────────────────
function clearCells() {
  document.querySelectorAll(".sched-day-cell").forEach(c => {
    const hint = c.querySelector(".add-hint");
    c.innerHTML = "";
    if (hint) c.appendChild(hint);
  });
}

// ── Load & Render Schedule ───────────────────────────────────────────────────
async function loadSchedule() {
  if (!currentGroupId) return;
  clearCells();
  try {
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/schedules/group/${currentGroupId}`, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    const slots = data.schedules || [];
    slots.forEach(renderSlot);
    updateStats(slots);
  } catch {
    PortalUtils.showToast("فشل تحميل الجدول", "error");
  }
}

function updateStats(slots) {
  // Calculate weekly hours
  let totalMin = 0;
  const subjects = new Set();
  slots.forEach(s => {
    subjects.add(s.subjectId?._id || s.subjectId);
    try {
      const [sh, sm] = s.startTime.split(":").map(Number);
      const [eh, em] = s.endTime.split(":").map(Number);
      totalMin += (eh * 60 + em) - (sh * 60 + sm);
    } catch (_) {}
  });
  const hrs = Math.round(totalMin / 60);
  const heroStat = document.getElementById("schedHeroStat");
  if (heroStat) heroStat.textContent = `${slots.length} حصة أسبوعياً · ${hrs} ساعة · ${subjects.size} مادة`;
}

function renderSlot(s) {
  const startHr  = s.startTime.substring(0, 2);
  const startMin = s.startTime.substring(3, 5);
  const slotId   = startMin === "30" ? startHr + "h" : startHr;
  const cell     = document.getElementById(`cell-${s.dayOfWeek}-${slotId}`);
  if (!cell) return;

  const subjectName = s.subjectId?.name || "مادة";
  const doctorName  = s.doctorId ? `${s.doctorId.firstName || ""} ${s.doctorId.lastName || ""}`.trim() : "—";
  const colorCls    = s.colorClass || "";

  const item = document.createElement("div");
  item.className = `sched-item ${colorCls}`;
  item.innerHTML = `
    <div class="si-subject">${subjectName}</div>
    <div class="si-doctor">
      <svg viewBox="0 0 24 24" style="width:11px;height:11px;fill:#475569;display:inline;vertical-align:middle;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      ${doctorName}
    </div>
    ${s.room ? `<div class="si-room">🚪 ${s.room}</div>` : ""}
    <div style="font-size:1.05rem;color:#94a3b8;margin-top:2px;">⏰ ${s.startTime}–${s.endTime}</div>
    <button class="si-delete" onclick="deleteSlot('${s._id}',event)" title="حذف">✕</button>
  `;
  cell.appendChild(item);
}

// ── Quick Add from cell click ─────────────────────────────────────────────────
function quickAddSlot(day, startTime, endTime) {
  if (!currentGroupId) return PortalUtils.showToast("يرجى اختيار السنة والمجموعة أولاً", "error");
  document.getElementById("slotDay").value   = day;
  document.getElementById("slotStart").value = startTime;
  document.getElementById("slotEnd").value   = endTime;

  const dayAr = DAYS.find(d => d.key === day)?.ar || day;
  const ctx = document.getElementById("slotContext");
  ctx.textContent = `📅 ${dayAr}  |  ⏰ ${startTime} — ${endTime}`;
  ctx.style.display = "block";
  openSlotModal();
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openSlotModal() {
  document.getElementById("slotModal").style.display = "flex";
}
function closeSlotModal() {
  document.getElementById("slotModal").style.display = "none";
  document.getElementById("slotContext").style.display = "none";
}

function pickColor(el, color) {
  document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("selected"));
  el.classList.add("selected");
  selectedColor = color;
}

// ── Save Slot ─────────────────────────────────────────────────────────────────
async function saveSlot() {
  if (!currentGroupId) return PortalUtils.showToast("يرجى اختيار المجموعة", "error");

  const payload = {
    groupId:    currentGroupId,
    subjectId:  document.getElementById("slotSubject").value,
    doctorId:   document.getElementById("slotDoctor").value  || "",
    dayOfWeek:  document.getElementById("slotDay").value,
    startTime:  document.getElementById("slotStart").value,
    endTime:    document.getElementById("slotEnd").value,
    room:       document.getElementById("slotRoom").value.trim(),
    colorClass: selectedColor,
  };

  if (!payload.subjectId) return PortalUtils.showToast("يرجى اختيار المادة", "error");
  if (!payload.startTime || !payload.endTime)  return PortalUtils.showToast("يرجى تحديد وقت البدء والانتهاء", "error");

  const btn = document.getElementById("saveSlotBtn");
  btn.disabled = true; btn.textContent = "جارٍ الحفظ...";

  try {
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/schedules`, {
      method: "POST",
      headers: PortalUtils.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      PortalUtils.showToast("✅ تمت إضافة الحصة بنجاح", "success");
      closeSlotModal();
      loadSchedule();
    } else {
      PortalUtils.showToast("⚠️ " + (data.message || "فشل الحفظ"), "error");
    }
  } catch {
    PortalUtils.showToast("خطأ في الاتصال بالخادم", "error");
  } finally {
    btn.disabled = false; btn.textContent = "حفظ في الجدول";
  }
}

// ── Delete Slot ───────────────────────────────────────────────────────────────
async function deleteSlot(id, e) {
  e.stopPropagation();
  if (!confirm("هل تريد حذف هذه الحصة من الجدول؟")) return;
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/schedules/${id}`, {
      method: "DELETE", headers: PortalUtils.getAuthHeaders()
    });
    if (res.ok) { PortalUtils.showToast("✅ تم حذف الحصة", "success"); loadSchedule(); }
    else PortalUtils.showToast("فشل الحذف", "error");
  } catch { PortalUtils.showToast("خطأ في الاتصال", "error"); }
}

// ── Load Subjects & Doctors ───────────────────────────────────────────────────
async function loadSubjectsAndDoctors() {
  try {
    const [subRes, docRes, taRes] = await Promise.all([
      fetch(`${window.CONFIG.API_BASE_URL}/api/admin/subjects?limit=200`, { headers: PortalUtils.getAuthHeaders() }),
      fetch(`${window.CONFIG.API_BASE_URL}/api/admin/users?role=doctor&limit=100`, { headers: PortalUtils.getAuthHeaders() }),
      fetch(`${window.CONFIG.API_BASE_URL}/api/admin/users?role=ta&limit=100`,    { headers: PortalUtils.getAuthHeaders() }),
    ]);
    const subData = await subRes.json();
    const docData = await docRes.json();
    const taData  = await taRes.json();

    allSubjects = subData.subjects || [];

    // Build doctor list
    allDoctors = [
      ...(docData.users || []).map(u => ({ ...u, prefix: "د." })),
      ...(taData.users  || []).map(u => ({ ...u, prefix: "م." })),
    ];

    const docSel = document.getElementById("slotDoctor");
    docSel.innerHTML = "<option value=''>بدون محاضر</option>";
    allDoctors.forEach(u => {
      docSel.innerHTML += `<option value="${u._id}">${u.prefix} ${u.firstName} ${u.lastName}</option>`;
    });

    // Initialize subject list (no filter yet)
    const subSel = document.getElementById("slotSubject");
    subSel.innerHTML = "<option value=''>اختر المادة...</option>";
    allSubjects.forEach(s => {
      subSel.innerHTML += `<option value="${s._id}">${s.name} (${s.code || ""})</option>`;
    });

  } catch (e) {
    console.error(e);
    PortalUtils.showToast("فشل تحميل المواد أو الأساتذة", "error");
  }
}
