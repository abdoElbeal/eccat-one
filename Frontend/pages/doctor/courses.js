// ─── Doctor Courses JS — Full Course Management ───────────────────────────────
const auth = PortalUtils.guard("doctor");

const ACCENTS   = ["#2463eb","#7c3aed","#16a34a","#ea580c","#0891b2","#d97706"];
const BADGE_CLS = ["badge-blue","badge-purple","badge-green","badge-orange","badge-blue","badge-orange"];
const FILL_CLS  = ["","purple","green","orange","","orange"];
const ICON_BG   = ["blue","purple","green","orange","blue","orange"];

let allCourses     = [];
let activeCourseId = null; // subjectId currently open in detail modal
let activeTab      = "exams";

if (auth) init();

function init() {
  PortalUtils.setupTopbar(auth.payload);
  document.getElementById("searchInput")?.addEventListener("input", e => filterCards(e.target.value));
  loadCourses();
}

// ─── 1. Load courses list ─────────────────────────────────────────────────────
async function loadCourses() {
  const grid = document.getElementById("coursesGrid");
  grid.innerHTML = skeletonCards(3);

  try {
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/courses`, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    allCourses  = data.courses || [];

    if (!allCourses.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:60px;"><p>لا توجد مواد مسندة لك في هذا الفصل</p></div>`;
      return;
    }

    setText("totalCoursesCount",  allCourses.length);
    setText("totalStudentsCount", allCourses.reduce((s,c) => s+(c.studentCount||0), 0));

    // Count active assignments across all courses (rough: just show courses count x1)
    setText("totalAssignmentsCount", "—");

    renderCourses(allCourses);
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:60px;"><p>حدث خطأ أثناء التحميل</p></div>`;
  }
}

function renderCourses(courses) {
  const grid = document.getElementById("coursesGrid");
  grid.innerHTML = courses.map((c, i) => {
    const accent   = ACCENTS[i % ACCENTS.length];
    const fillCls  = FILL_CLS[i % FILL_CLS.length];
    const bgCls    = ICON_BG[i % ICON_BG.length];
    const badgeCls = BADGE_CLS[i % BADGE_CLS.length];
    const progress = c.semesterProgress || 0;
    const passRate = c.passRate || 0;

    return `
      <div class="course-card" data-name="${(c.name||"").toLowerCase()}" data-code="${(c.code||"").toLowerCase()}" style="cursor:pointer;" onclick="openCourseDetail('${c._id}', '${esc(c.name)}', '${esc(c.code)}')">
        <div class="cc-top">
          <div class="cc-icon ${bgCls}"><svg viewBox="0 0 24 24" fill="${accent}" width="22" height="22"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
          <span class="cc-code badge ${badgeCls}">${c.code}</span>
        </div>
        <h3 class="cc-name">${c.name}</h3>
        <p class="cc-desc">${c.description || ""}</p>
        <div class="cc-stats">
          <div class="ccs"><span class="ccs-value">${c.studentCount||0}</span><span class="ccs-label">طالب</span></div>
          <div class="ccs"><span class="ccs-value">${c.creditHours||3}</span><span class="ccs-label">ساعات</span></div>
          <div class="ccs"><span class="ccs-value">${passRate}%</span><span class="ccs-label">نجاح</span></div>
        </div>
        <div class="cc-progress-row"><span>إنجاز الفصل</span><span style="color:${accent};font-weight:700;">${progress}%</span></div>
        <div class="progress-bar"><div class="progress-fill ${fillCls}" style="width:${progress}%;${!fillCls?`background:${accent}`:""}"></div></div>
        <div class="cc-actions" onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-primary" onclick="openCourseDetail('${c._id}','${esc(c.name)}','${esc(c.code)}')">إدارة المادة</button>
          <a href="grades.html?course=${c.code}" class="btn btn-sm btn-ghost">الدرجات</a>
          <a href="students.html?course=${c.code}" class="btn btn-sm btn-ghost">الطلاب</a>
        </div>
        <div class="cc-accent" style="background:${accent};"></div>
      </div>`;
  }).join("");
}

// ─── 2. Course Detail Modal ───────────────────────────────────────────────────
async function openCourseDetail(subjectId, name, code) {
  activeCourseId = subjectId;
  document.getElementById("detailCourseName").textContent = name;
  document.getElementById("detailCourseCode").textContent = code;
  document.getElementById("detailStudentCount").textContent = "";
  document.getElementById("goToGradesBtn").href = `grades.html?course=${code}`;
  document.getElementById("courseDetailModal").style.display = "flex";

  switchTab("exams");
  loadCourseDetail(subjectId);
}

function closeCourseDetail() {
  document.getElementById("courseDetailModal").style.display = "none";
  activeCourseId = null;
  cancelExamForm();
  cancelAsgnForm();
}

async function loadCourseDetail(subjectId) {
  try {
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/courses/${subjectId}`, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();

    document.getElementById("detailStudentCount").textContent = `· ${data.studentCount || 0} طالب`;

    renderExams(data.exams || []);
    renderAssignments(data.assignments || []);

    // Count active assignments for stat
    setText("totalAssignmentsCount", (data.assignments||[]).filter(a => new Date(a.dueDate) >= new Date()).length);
  } catch (err) { console.error(err); }
}

function switchTab(tab) {
  activeTab = tab;
  ["exams","assignments","grades"].forEach(t => {
    document.getElementById(`panel${cap(t)}`).style.display = t === tab ? "block" : "none";
    document.getElementById(`tab${cap(t)}`).classList.toggle("active", t === tab);
  });
}

// ─── 3. EXAMS ────────────────────────────────────────────────────────────────
function renderExams(exams) {
  try {
    const el = document.getElementById("examsList");
    if (!exams || !exams.length) {
      el.innerHTML = `<p style="color:#94a3b8;text-align:center;padding:20px;">لا توجد اختبارات مجدولة</p>`; return;
    }
    const LABELS = { quiz:"كويز", midterm:"ميدتيرم", final:"نهائي", lab:"عملي", oral:"شفهي" };
    const COLORS = { quiz:"#7c3aed", midterm:"#2463eb", final:"#ea580c", lab:"#16a34a", oral:"#0891b2" };

    el.innerHTML = exams.map(e => {
      const d   = new Date(e.date);
      const lbl = LABELS[e.type] || e.type;
      const clr = COLORS[e.type] || "#2463eb";
      const isPast = d < new Date();
      const dateStr = typeof e.date === 'string' ? e.date.split("T")[0] : "";
      
      return `
        <div class="exam-row">
          <div class="exam-type-badge" style="background:${clr}18;color:${clr};">${lbl}</div>
          <div class="exam-info">
            <div class="exam-title">${e.title}</div>
            <div class="exam-meta">
              📅 ${isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ar-EG",{weekday:"short",year:"numeric",month:"long",day:"numeric"})}
              · ⏰ ${e.time} · ⏱ ${e.duration||60} دقيقة · 📍 ${e.location||"—"} · 💯 ${e.totalMarks||20} درجة
            </div>
            ${e.notes ? `<div style="font-size:1.1rem;color:#64748b;margin-top:4px;">📌 ${e.notes}</div>` : ""}
          </div>
          ${isPast ? `<span class="badge" style="background:#f1f5f9;color:#94a3b8;">منتهي</span>` : `<span class="badge badge-green">قادم</span>`}
          <div style="display:flex;gap:6px;">
            <button class="btn btn-sm btn-ghost" onclick="editExam('${e._id}','${esc(e.title)}','${e.type}','${dateStr}','${e.time}',${e.duration||60},'${esc(e.location||"")}',${e.totalMarks||20},'${esc(e.notes||"")}')">تعديل</button>
            <button class="btn btn-sm" style="background:#fee2e2;color:#b91c1c;" onclick="deleteExam('${e._id}')">حذف</button>
          </div>
        </div>`;
    }).join("");
  } catch (err) {
    console.error("renderExams error:", err);
    document.getElementById("examsList").innerHTML = `<p style="color:red;text-align:center;padding:20px;">خطأ في عرض الاختبارات</p>`;
  }
}

function showExamForm(reset=true) {
  if (reset) {
    document.getElementById("editExamId").value = "";
    document.getElementById("examTitle").value = "";
    document.getElementById("examType").value = "quiz";
    document.getElementById("examDate").value = "";
    document.getElementById("examTime").value = "";
    document.getElementById("examDuration").value = 60;
    document.getElementById("examMarks").value = 20;
    document.getElementById("examLocation").value = "";
    document.getElementById("examNotes").value = "";
    document.getElementById("examFormTitle").textContent = "إضافة اختبار";
  }
  document.getElementById("examForm").style.display = "block";
  document.getElementById("examForm").scrollIntoView({ behavior:"smooth" });
}

function cancelExamForm() { document.getElementById("examForm").style.display = "none"; }

function editExam(id, title, type, date, time, duration, location, marks, notes) {
  document.getElementById("editExamId").value    = id;
  document.getElementById("examTitle").value     = title;
  document.getElementById("examType").value      = type;
  document.getElementById("examDate").value      = date;
  document.getElementById("examTime").value      = time;
  document.getElementById("examDuration").value  = duration;
  document.getElementById("examMarks").value     = marks;
  document.getElementById("examLocation").value  = location;
  document.getElementById("examNotes").value     = notes;
  document.getElementById("examFormTitle").textContent = "تعديل الاختبار";
  showExamForm(false);
}

async function saveExam() {
  const editId  = document.getElementById("editExamId").value;
  const payload = {
    subjectId:  activeCourseId,
    title:      document.getElementById("examTitle").value.trim(),
    type:       document.getElementById("examType").value,
    date:       document.getElementById("examDate").value,
    time:       document.getElementById("examTime").value,
    duration:   +document.getElementById("examDuration").value,
    location:   document.getElementById("examLocation").value.trim(),
    totalMarks: +document.getElementById("examMarks").value,
    notes:      document.getElementById("examNotes").value.trim(),
  };
  if (!payload.title || !payload.date || !payload.time) { alert("يرجى ملء الحقول المطلوبة"); return; }

  const btn = document.getElementById("saveExamBtn");
  btn.disabled = true; btn.textContent = "جارٍ الحفظ...";

  try {
    const url    = editId ? `${window.CONFIG.API_BASE_URL}/api/doctor/exams/${editId}` : `${window.CONFIG.API_BASE_URL}/api/doctor/exams`;
    const method = editId ? "PATCH" : "POST";
    const res    = await fetch(url, { method, headers: PortalUtils.getAuthHeaders(), body: JSON.stringify(payload) });
    if (!res.ok) throw new Error((await res.json()).message);
    cancelExamForm();
    loadCourseDetail(activeCourseId);
  } catch (err) { alert(err.message); }
  finally { btn.disabled = false; btn.textContent = "حفظ الاختبار"; }
}

async function deleteExam(examId) {
  if (!confirm("هل تريد حذف هذا الاختبار؟")) return;
  try {
    await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/exams/${examId}`, { method:"DELETE", headers: PortalUtils.getAuthHeaders() });
    loadCourseDetail(activeCourseId);
  } catch (err) { alert("خطأ في الحذف"); }
}

// ─── 4. ASSIGNMENTS ───────────────────────────────────────────────────────────
function renderAssignments(assignments) {
  try {
    const el = document.getElementById("assignmentsList");
    if (!assignments || !assignments.length) {
      el.innerHTML = `<p style="color:#94a3b8;text-align:center;padding:20px;">لا توجد واجبات</p>`; return;
    }
    el.innerHTML = assignments.map(a => {
      const due     = new Date(a.dueDate);
      const isOver  = due < new Date();
      const typeLabel = a.assignmentType === "pdf" ? "📄 رفع PDF" : "📋 ورقي";
      
      const dObj = a.dueDate ? new Date(a.dueDate) : null;
      const dStr = dObj && !isNaN(dObj) ? dObj.toISOString().split("T")[0] : "";
      const tStr = dObj && !isNaN(dObj) ? dObj.toTimeString().slice(0,5) : "";

      return `
        <div class="asgn-row">
          <div>
            <div class="asgn-title">${a.title}</div>
            <div class="asgn-meta">${typeLabel} · موعد التسليم: ${isNaN(due.getTime()) ? "—" : due.toLocaleString("ar-EG")} · ${a.maxGrade} درجة</div>
            ${a.description ? `<div style="font-size:1.15rem;color:#64748b;margin-top:3px;">${a.description}</div>` : ""}
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
            <div class="submissions-badge" onclick="viewSubmissions('${a._id}','${esc(a.title)}')">
              <span>${a.submittedCount||0}</span> تسليم
              ${a.gradedCount ? `<span style="color:#16a34a;font-size:1rem;"> · ${a.gradedCount} مصحح</span>` : ""}
            </div>
            ${isOver ? `<span class="badge" style="background:#fee2e2;color:#b91c1c;">منتهي</span>` : `<span class="badge badge-green">نشط</span>`}
            <button class="btn btn-sm btn-ghost" onclick="editAssignment('${a._id}','${esc(a.title)}','${esc(a.description||"")}','${a.assignmentType}','${dStr}','${tStr}',${a.maxGrade})">تعديل</button>
            <button class="btn btn-sm" style="background:#fee2e2;color:#b91c1c;" onclick="deleteAssignment('${a._id}')">حذف</button>
          </div>
        </div>`;
    }).join("");
  } catch (err) {
    console.error("renderAssignments error:", err);
    document.getElementById("assignmentsList").innerHTML = `<p style="color:red;text-align:center;padding:20px;">خطأ في عرض الواجبات</p>`;
  }
}

function showAssignmentForm(reset=true) {
  if (reset) {
    document.getElementById("editAsgnId").value   = "";
    document.getElementById("asgnTitle").value    = "";
    document.getElementById("asgnDesc").value     = "";
    document.getElementById("asgnType").value     = "pdf";
    document.getElementById("asgnDate").value     = "";
    document.getElementById("asgnTime").value     = "";
    document.getElementById("asgnMaxGrade").value = 10;
    document.getElementById("asgnFormTitle").textContent = "إضافة واجب";
  }
  document.getElementById("assignmentForm").style.display = "block";
  document.getElementById("assignmentForm").scrollIntoView({ behavior:"smooth" });
}

function cancelAsgnForm() { document.getElementById("assignmentForm").style.display = "none"; }

function editAssignment(id, title, desc, type, date, time, maxGrade) {
  document.getElementById("editAsgnId").value   = id;
  document.getElementById("asgnTitle").value    = title;
  document.getElementById("asgnDesc").value     = desc;
  document.getElementById("asgnType").value     = type;
  document.getElementById("asgnDate").value     = date;
  document.getElementById("asgnTime").value     = time;
  document.getElementById("asgnMaxGrade").value = maxGrade;
  document.getElementById("asgnFormTitle").textContent = "تعديل الواجب";
  showAssignmentForm(false);
}

async function saveAssignment() {
  const editId  = document.getElementById("editAsgnId").value;
  const btn = document.getElementById("saveAsgnBtn");
  
  const dateVal = document.getElementById("asgnDate").value;
  const timeVal = document.getElementById("asgnTime").value;

  const payload = {
    subjectId:      activeCourseId,
    title:          document.getElementById("asgnTitle").value.trim(),
    description:    document.getElementById("asgnDesc").value.trim(),
    assignmentType: document.getElementById("asgnType").value,
    dueDate:        (dateVal && timeVal) ? `${dateVal}T${timeVal}` : "",
    maxGrade:       +document.getElementById("asgnMaxGrade").value,
  };

  if (!payload.title) { 
    PortalUtils.showToast("يرجى إدخال عنوان الواجب", "error"); 
    return; 
  }
  if (!dateVal) { 
    PortalUtils.showToast("يرجى تحديد تاريخ التسليم", "error"); 
    return; 
  }
  if (!timeVal) { 
    PortalUtils.showToast("يرجى تحديد وقت التسليم", "error"); 
    return; 
  }
  if (!payload.subjectId) {
    PortalUtils.showToast("خطأ: لم يتم تحديد المادة", "error");
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = "جارٍ الحفظ..."; }

  try {
    const url    = editId ? `${window.CONFIG.API_BASE_URL}/api/doctor/assignments/${editId}` : `${window.CONFIG.API_BASE_URL}/api/doctor/assignments`;
    const method = editId ? "PATCH" : "POST";
    const res    = await fetch(url, { method, headers: PortalUtils.getAuthHeaders(), body: JSON.stringify(payload) });
    
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "فشل حفظ الواجب");

    PortalUtils.showToast(editId ? "تم تعديل الواجب بنجاح" : "تمت إضافة الواجب بنجاح", "success");
    cancelAsgnForm();
    loadCourseDetail(activeCourseId);
  } catch (err) {
    console.error("Save Assignment Error:", err);
    PortalUtils.showToast(err.message, "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = editId ? "تعديل الواجب" : "حفظ الواجب"; }
  }
}

async function deleteAssignment(asgnId) {
  if (!confirm("هل تريد حذف هذا الواجب؟")) return;
  try {
    await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/assignments/${asgnId}`, { method:"DELETE", headers: PortalUtils.getAuthHeaders() });
    loadCourseDetail(activeCourseId);
  } catch (err) { alert("خطأ في الحذف"); }
}

// ─── 5. SUBMISSIONS VIEWER ────────────────────────────────────────────────────
async function viewSubmissions(asgnId, title) {
  document.getElementById("submissionsTitle").textContent = `تسليمات: ${title}`;
  document.getElementById("submissionsBody").innerHTML = `<p style="text-align:center;padding:20px;color:#94a3b8;">جارٍ التحميل...</p>`;
  document.getElementById("submissionsModal").style.display = "flex";

  try {
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/assignments/${asgnId}/submissions`, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    const asgn = data.assignment;
    const subs = asgn?.submissions || [];

    if (!subs.length) {
      document.getElementById("submissionsBody").innerHTML = `<p style="text-align:center;padding:30px;color:#94a3b8;">لا توجد تسليمات حتى الآن</p>`; return;
    }

    document.getElementById("submissionsBody").innerHTML = subs.map(s => {
      const student = s.student || {};
      const name    = `${student.firstName||""} ${student.lastName||""}`.trim() || "—";
      const statusColor = s.status === "graded" ? "#16a34a" : s.status === "late" ? "#ea580c" : "#2463eb";
      const statusLabel = s.status === "graded" ? "مصحح" : s.status === "late" ? "متأخر" : "مسلَّم";

      return `
        <div style="display:flex;align-items:flex-start;gap:14px;padding:14px;border-bottom:1px solid #f1f5f9;">
          <div style="width:38px;height:38px;border-radius:50%;background:#eff6ff;color:#2463eb;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">${name.slice(0,2)}</div>
          <div style="flex:1;">
            <div style="font-weight:700;font-size:1.3rem;">${name}</div>
            <div style="font-size:1.1rem;color:#64748b;">${new Date(s.submittedAt).toLocaleString("ar-EG")}</div>
            ${s.fileUrl ? `<a href="${window.CONFIG.API_BASE_URL}${s.fileUrl}" target="_blank" style="font-size:1.2rem;color:#2463eb;display:inline-flex;align-items:center;gap:4px;margin-top:4px;">📄 ${s.fileName||"تحميل الملف"}</a>` : (s.submissionType==="paper" ? `<span style="font-size:1.15rem;color:#64748b;">📋 ورقي — سيُسلَّم في الكلاس</span>` : "")}
            ${s.notes ? `<div style="font-size:1.15rem;color:#64748b;margin-top:4px;">💬 ${s.notes}</div>` : ""}
            ${s.status==="graded" ? `<div style="margin-top:8px;"><span style="color:#16a34a;font-weight:700;">✓ الدرجة: ${s.grade} / ${asgn.maxGrade}</span>${s.feedback ? ` · ${s.feedback}` : ""}</div>` : ""}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
            <span style="background:${statusColor}18;color:${statusColor};padding:3px 12px;border-radius:20px;font-size:1.1rem;font-weight:700;">${statusLabel}</span>
            ${s.status !== "graded" ? `
              <div style="display:flex;gap:6px;align-items:center;">
                <input type="number" id="grade_${s._id}" placeholder="الدرجة" min="0" max="${asgn.maxGrade}" style="width:70px;padding:5px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:1.2rem;text-align:center;outline:none;">
                <button class="btn btn-sm btn-primary" onclick="submitGrade('${asgnId}','${s.student?._id}','${s._id}',${asgn.maxGrade})">رصد</button>
              </div>` : ""}
          </div>
        </div>`;
    }).join("");
  } catch (err) {
    document.getElementById("submissionsBody").innerHTML = `<p style="color:#ef4444;text-align:center;padding:20px;">خطأ في التحميل</p>`;
  }
}

async function submitGrade(asgnId, studentId, subId, maxGrade) {
  const gradeVal = document.getElementById(`grade_${subId}`)?.value;
  if (!gradeVal) { alert("أدخل الدرجة"); return; }
  if (+gradeVal > maxGrade) { alert(`الدرجة لا تتجاوز ${maxGrade}`); return; }

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/doctor/assignments/${asgnId}/grade/${studentId}`, {
      method: "PATCH",
      headers: PortalUtils.getAuthHeaders(),
      body: JSON.stringify({ grade: +gradeVal }),
    });
    if (!res.ok) throw new Error((await res.json()).message);
    // Reload submissions
    document.getElementById(`grade_${subId}`).closest("div[style*='flex-direction:column']").innerHTML = `<span style="color:#16a34a;font-weight:700;">✓ تم الرصد</span>`;
    loadCourseDetail(activeCourseId);
  } catch (err) { alert(err.message); }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function filterCards(q) {
  const ql = q.toLowerCase();
  document.querySelectorAll(".course-card").forEach(card => {
    const match = (card.dataset.name||"").includes(ql) || (card.dataset.code||"").includes(ql);
    card.style.display = match ? "" : "none";
  });
}
function setText(id, v) { const el=document.getElementById(id); if(el) el.textContent=v; }
function esc(s) { return String(s).replace(/'/g,"&#39;"); }
function cap(s) { return s.charAt(0).toUpperCase()+s.slice(1); }
function skeletonCards(n) {
  return Array(n).fill(`<div class="course-card" style="animation:skeletonShimmer 1.5s infinite;"><div style="height:200px;background:#e2e8f0;border-radius:10px;"></div></div>`).join("");
}
