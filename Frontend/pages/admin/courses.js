// ─── Admin Courses Management JS ─────────────────────────────────────────────
// State MUST be declared before any execution (avoids Temporal Dead Zone)
let activeTab = "subjects";
let currentPage = 1;
const PER_PAGE = 10;
let allSubjects = [];

const auth = PortalUtils.guard("admin");
if (auth) init();

function init() {
  PortalUtils.setupTopbar(auth.payload);
  bindEvents();
  loadSubjects();
  loadDepts();
  loadGradesMeta(); // populate grades dropdown immediately
}

function bindEvents() {
  // Subjects Filters
  document.getElementById("courseSearch")?.addEventListener("input", debounce(() => { currentPage=1; loadSubjects(); }, 400));
  document.getElementById("courseDeptFilter")?.addEventListener("change", () => { currentPage=1; loadSubjects(); });
  document.getElementById("courseYearFilter")?.addEventListener("change", () => { currentPage=1; loadSubjects(); });
  document.getElementById("courseSemFilter")?.addEventListener("change", () => { currentPage=1; loadSubjects(); });

  // Exams Filters
  document.getElementById("examGroupFilter")?.addEventListener("change", () => loadExams());
  document.getElementById("examSubjectFilter")?.addEventListener("change", () => loadExams());

  // Pagination
  document.getElementById("cpPrev")?.addEventListener("click", () => changePage(-1));
  document.getElementById("cpNext")?.addEventListener("click", () => changePage(1));

  // Modals close on backdrop click
  ["subjectModal", "assignModal", "examModal", "gradeModal"].forEach(id => {
    document.getElementById(id)?.addEventListener("click", (e) => {
      if (e.target.id === id) window[`close${id.charAt(0).toUpperCase() + id.slice(1)}`]();
    });
  });

  // Thumbnail preview
  document.getElementById("sm_thumbnail")?.addEventListener("change", handleThumbPreview);
  
  // Auto-calculate Total in Grade Modal
  ["gm_activities", "gm_midTerm", "gm_final"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", calculateGradeTotal);
  });
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".admin-tab").forEach(t =>
    t.classList.toggle("active", t.dataset.tab === tab)
  );
  // Only toggle these two specific tabs - never touch anything else
  const TABS = ["subjects", "exams"];
  TABS.forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (el) el.style.display = (t === tab) ? "block" : "none";
  });
  // ALWAYS keep grades section visible
  const gs = document.querySelector(".grades-always-section");
  if (gs) { gs.style.display = "block"; gs.style.visibility = "visible"; }
  loadData();
}


async function loadData() {
  if (activeTab === "subjects") loadSubjects();
  if (activeTab === "exams") {
    loadExams();
    loadGroupsSelect("examGroupFilter");
    loadSubjectsSelect("examSubjectFilter");
  }
}

// ─── Subjects Tab ────────────────────────────────────────────────────────────
async function loadSubjects() {
  const tbody = document.getElementById("coursesTable");
  tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:40px;">جارٍ التحميل...</td></tr>`;


  try {
    const search = document.getElementById("courseSearch").value;
    const dept = document.getElementById("courseDeptFilter").value;
    const year = document.getElementById("courseYearFilter").value;
    const sem = document.getElementById("courseSemFilter").value;

    let url = `${window.CONFIG.API_BASE_URL}/api/admin/subjects?page=${currentPage}&limit=${PER_PAGE}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (dept) url += `&department=${dept}`;
    if (year) url += `&yearLevel=${year}`;
    if (sem) url += `&semester=${sem}`;

    const res = await fetch(url, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    const subjects = data.subjects || [];
    allSubjects = subjects; 

    if (!subjects.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:40px;">لا توجد مواد دراسية تطابق البحث</td></tr>`;
      return;
    }

    tbody.innerHTML = subjects.map(s => {
      const deptName = s.department?.name || "—";
      const docName = s.assignedDoctor ? `${s.assignedDoctor.firstName} ${s.assignedDoctor.lastName}` : "لم يعين";
      const enrolled = s.enrolledStudents?.length || 0;
      
      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              ${s.thumbnail ? `<img src="${window.CONFIG.API_BASE_URL}${s.thumbnail}" style="width:40px; height:30px; border-radius:4px; object-fit:cover;">` : ''}
              <div>
                <div style="font-weight:600;">${s.name}</div>
                <div class="text-muted" style="font-size:1.1rem;">${s.code}</div>
              </div>
            </div>
          </td>
          <td><span class="badge badge-gray">${s.code}</span></td>
          <td>${deptName}</td>
          <td>سنة ${s.yearLevel} - ترم ${s.semester}</td>
          <td>
            <div style="display:flex; align-items:center; gap:6px;">
              ${docName} 
              <button class="btn-icon" onclick="openAssignModal('${s._id}', '${s.name}', 'doctor')" title="تعيين دكتور">✎</button>
            </div>
          </td>
          <td><span class="badge badge-blue">${enrolled} طالب</span></td>
          <td>
            <div class="action-btns">
              <button class="action-btn edit" onclick="openSubjectModal('${s._id}')" title="تعديل">✎</button>
              <button class="action-btn delete" onclick="deleteSubject('${s._id}')" title="حذف">🗑</button>
            </div>
          </td>
        </tr>`;
    }).join("");

    document.getElementById("tabBadgeSubjects").textContent = data.total || 0;
    renderPagination(data.total);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red" style="padding:40px;">⚠️ خطأ في التحميل: ${err.message}</td></tr>`;
  }
}

// ─── Exams Tab ───────────────────────────────────────────────────────────────
async function loadExams() {
  const tbody = document.getElementById("examsTable");
  tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:40px;">جارٍ التحميل...</td></tr>`;

  try {
    const groupId = document.getElementById("examGroupFilter").value;
    const subjectId = document.getElementById("examSubjectFilter").value;

    let url = `${window.CONFIG.API_BASE_URL}/api/admin/exams`;
    const params = [];
    if (groupId) params.push(`groupId=${groupId}`);
    if (subjectId) params.push(`subjectId=${subjectId}`);
    if (params.length) url += `?${params.join("&")}`;

    const res = await fetch(url, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    const exams = data.exams || [];

    if (!exams.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:40px;">لا توجد امتحانات مسجلة</td></tr>`;
      document.getElementById("tabBadgeExams").textContent = 0;
      return;
    }

    tbody.innerHTML = exams.map(e => `
      <tr>
        <td>${e.subject?.name || e.courseName}</td>
        <td><span class="badge ${e.type === 'نهائي' ? 'badge-purple' : 'badge-blue'}">${e.type}</span></td>
        <td>${new Date(e.date).toLocaleDateString('ar-EG')}</td>
        <td>${e.time}</td>
        <td>${e.location}</td>
        <td>${e.groupId?.name || "—"}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn edit" onclick="openExamModal('${e._id}')">✎</button>
            <button class="action-btn delete" onclick="deleteExam('${e._id}')">🗑</button>
          </div>
        </td>
      </tr>`).join("");
    
    document.getElementById("tabBadgeExams").textContent = exams.length;
  } catch {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red" style="padding:40px;">⚠️ خطأ في تحميل الامتحانات</td></tr>`;
  }
}

// ─── Grades Tab ──────────────────────────────────────────────────────────────
async function loadGradesMeta() {
  const sel = document.getElementById("gradeSubjectSel");
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/subjects?limit=100`, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    const subjects = data.subjects || [];
    sel.innerHTML = `<option value="">اختر مادة لعرض درجاتها</option>` + 
      subjects.map(s => `<option value="${s._id}">${s.name} (${s.code})</option>`).join("");
  } catch {}
}

async function loadGradesBySubject() {
  const subjectId = document.getElementById("gradeSubjectSel").value;
  if (!subjectId) return;

  const panel = document.getElementById("gradesPanel");
  panel.innerHTML = `<div class="panel text-center" style="padding:40px;">جارٍ تحميل الدرجات...</div>`;


  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/subjects/${subjectId}/students`, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    const rows = data.grades || [];

    if (!rows.length) {
      panel.innerHTML = `<div class="panel text-center" style="padding:60px; color:#94a3b8; background:#fff; border-radius:12px; border:2px dashed #e2e8f0;">لا توجد درجات مسجلة لهذه المادة بعد. استخدم زر "إضافة درجة" للبدء.</div>`;
      return;
    }

    panel.innerHTML = `
      <div class="panel">
        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr><th>الطالب</th><th>أعمال السنة</th><th>ميدتيرم</th><th>نهائي</th><th>المجموع</th><th>الحالة</th><th>الإجراءات</th></tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td>
                    <div style="font-weight:600;">${r.studentName}</div>
                    <div class="text-muted" style="font-size:1.1rem;">${r.nationalId}</div>
                  </td>
                  <td>${r.activities || 0}/20</td>
                  <td>${r.midTerm || 0}/30</td>
                  <td>${r.final || 0}/50</td>
                  <td><strong style="color:#2463eb; font-size:1.5rem;">${r.total || 0}</strong></td>
                  <td><span class="badge ${r.status === 'passed' ? 'badge-green' : 'badge-red'}">${r.status === 'passed' ? 'ناجح' : 'راسب'}</span></td>
                  <td>
                    <div class="action-btns">
                      <button class="action-btn edit" onclick="openGradeModal('${r.gradeId}', '${r.studentId}')" title="تعديل">✎</button>
                      <button class="action-btn delete" onclick="deleteGrade('${r.gradeId}')" title="حذف">🗑</button>
                    </div>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch (err) {
    panel.innerHTML = `<div class="panel text-center text-red" style="padding:40px;">⚠️ خطأ في تحميل الدرجات: ${err.message}</div>`;
  }
}

// ─── Modals Logic ────────────────────────────────────────────────────────────

// Subject Modal
async function openSubjectModal(id = null) {
  const modal = document.getElementById("subjectModal");
  const title = document.getElementById("subjectModalTitle");
  const btn = document.getElementById("subjectModalSave");
  
  // Reset
  document.getElementById("sm_editId").value = id || "";
  document.getElementById("sm_name").value = "";
  document.getElementById("sm_code").value = "";
  document.getElementById("sm_academicYear").value = "2025/2026";
  document.getElementById("sm_desc").value = "";
  document.getElementById("thumbPreview").style.display = "none";
  document.getElementById("thumbPlaceholder").style.display = "flex";

  await loadDepts("sm_dept");

  if (id) {
    title.textContent = "تعديل المادة";
    btn.textContent = "تحديث";
    const s = allSubjects.find(x => x._id === id);
    if (s) {
      document.getElementById("sm_name").value = s.name;
      document.getElementById("sm_code").value = s.code;
      document.getElementById("sm_dept").value = s.department?._id || s.department || "";
      document.getElementById("sm_yearLevel").value = s.yearLevel;
      document.getElementById("sm_semester").value = s.semester;
      document.getElementById("sm_academicYear").value = s.academicYear || "2025/2026";
      document.getElementById("sm_desc").value = s.description || "";
      if (s.thumbnail) {
        document.getElementById("thumbPreview").src = window.CONFIG.API_BASE_URL + s.thumbnail;
        document.getElementById("thumbPreview").style.display = "block";
        document.getElementById("thumbPlaceholder").style.display = "none";
      }
    }
  } else {
    title.textContent = "إضافة مادة جديدة";
    btn.textContent = "إضافة";
  }

  modal.style.display = "flex";
}

function closeSubjectModal() { document.getElementById("subjectModal").style.display = "none"; }

async function saveSubject() {
  const id = document.getElementById("sm_editId").value;
  const fd = new FormData();
  fd.append("name", document.getElementById("sm_name").value.trim());
  fd.append("code", document.getElementById("sm_code").value.trim());
  fd.append("department", document.getElementById("sm_dept").value);
  fd.append("yearLevel", document.getElementById("sm_yearLevel").value);
  fd.append("semester", document.getElementById("sm_semester").value);
  fd.append("academicYear", document.getElementById("sm_academicYear").value.trim());
  fd.append("description", document.getElementById("sm_desc").value.trim());
  
  const file = document.getElementById("sm_thumbnail").files[0];
  if (file) fd.append("thumbnail", file);

  try {
    const url = id ? `${window.CONFIG.API_BASE_URL}/api/admin/subjects/${id}` : `${window.CONFIG.API_BASE_URL}/api/admin/subjects`;
    const res = await fetch(url, {
      method: id ? "PATCH" : "POST",
      headers: PortalUtils.getUploadHeaders(),
      body: fd
    });
    if (res.ok) {
      closeSubjectModal();
      loadSubjects();
      PortalUtils.showToast("✅ تم حفظ المادة بنجاح");
    } else {
      const d = await res.json();
      alert(d.message || "فشل الحفظ");
    }
  } catch (err) { alert(err.message); }
}

async function deleteSubject(id) {
  if (!confirm("هل أنت متأكد من حذف هذه المادة؟ سيتم حذف الدرجات والامتحانات المرتبطة بها نهائياً!")) return;
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/subjects/${id}`, {
      method: "DELETE",
      headers: PortalUtils.getAuthHeaders()
    });
    if (res.ok) { loadSubjects(); PortalUtils.showToast("🗑️ تم حذف المادة"); }
  } catch (err) { alert(err.message); }
}

// Exam Modal
async function openExamModal(id = null) {
  const modal = document.getElementById("examModal");
  document.getElementById("em_editId").value = id || "";
  
  await Promise.all([
    loadSubjectsSelect("em_subject"),
    loadGroupsSelect("em_group")
  ]);

  if (id) {
    document.getElementById("examModalTitle").textContent = "تعديل الامتحان";
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/exams`, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    const e = data.exams.find(x => x._id === id);
    if (e) {
      document.getElementById("em_subject").value = e.subject?._id || "";
      document.getElementById("em_type").value = e.type;
      document.getElementById("em_group").value = e.groupId?._id || "";
      document.getElementById("em_date").value = e.date.split('T')[0];
      document.getElementById("em_time").value = e.time;
      document.getElementById("em_location").value = e.location;
    }
  } else {
    document.getElementById("examModalTitle").textContent = "إضافة امتحان جديد";
    document.getElementById("em_date").value = "";
    document.getElementById("em_time").value = "";
    document.getElementById("em_location").value = "";
  }

  modal.style.display = "flex";
}

function closeExamModal() { document.getElementById("examModal").style.display = "none"; }

async function saveExam() {
  const id = document.getElementById("em_editId").value;
  const btn = document.getElementById("examModalSave");
  const subSel = document.getElementById("em_subject");
  
  if (!subSel.value) { alert("يرجى اختيار المادة الدراسية أولاً"); return; }

  const payload = {
    subject: subSel.value,
    courseName: subSel.options[subSel.selectedIndex].text,
    type: document.getElementById("em_type").value,
    groupId: document.getElementById("em_group").value || null, // Convert empty to null
    date: document.getElementById("em_date").value,
    time: document.getElementById("em_time").value,
    location: document.getElementById("em_location").value.trim()
  };

  if (!payload.date || !payload.time || !payload.location) {
    alert("يرجى ملء التاريخ والوقت والمكان"); return;
  }

  const originalText = btn.textContent;
  btn.textContent = "جارٍ الحفظ...";
  btn.disabled = true;

  try {
    const url = id ? `${window.CONFIG.API_BASE_URL}/api/admin/exams/${id}` : `${window.CONFIG.API_BASE_URL}/api/admin/exams`;
    const res = await fetch(url, {
      method: id ? "PATCH" : "POST",
      headers: PortalUtils.getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok) {
      closeExamModal();
      loadExams();
      PortalUtils.showToast("✅ تم حفظ الامتحان بنجاح");
    } else {
      throw new Error(data.message || "فشل حفظ الامتحان");
    }
  } catch (err) {
    alert("❌ خطأ: " + err.message);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

async function deleteExam(id) {
  if (!confirm("هل أنت متأكد من حذف هذا الامتحان؟")) return;
  const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/exams/${id}`, { method: "DELETE", headers: PortalUtils.getAuthHeaders() });
  if (res.ok) { loadExams(); PortalUtils.showToast("🗑️ تم حذف الامتحان"); }
}

// Grade Modal
async function openGradeModal(gradeId = null, studentId = null) {
  const modal = document.getElementById("gradeModal");
  const subjectId = document.getElementById("gradeSubjectSel").value;
  const subjectName = document.getElementById("gradeSubjectSel").options[document.getElementById("gradeSubjectSel").selectedIndex].text;

  document.getElementById("gm_editId").value = gradeId || "";
  document.getElementById("gm_subjectId").value = subjectId;
  document.getElementById("gm_subjectName").value = subjectName;

  await loadStudentsSelect("gm_student");

  // Reset fields
  document.getElementById("gm_activities").value = "";
  document.getElementById("gm_midTerm").value = "";
  document.getElementById("gm_final").value = "";
  document.getElementById("gm_totalPreview").style.display = "none";

  if (gradeId && studentId) {
    document.getElementById("gradeModalTitle").textContent = "تعديل درجة الطالب";
    document.getElementById("gm_student").value = studentId;
    document.getElementById("gm_student").disabled = true;
    
    // Fetch current grade data from table or API
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/subjects/${subjectId}/students`, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    const g = data.grades.find(x => x.gradeId === gradeId);
    if (g) {
      document.getElementById("gm_activities").value = g.activities || 0;
      document.getElementById("gm_midTerm").value = g.midtermScore || g.midTerm || 0;
      document.getElementById("gm_final").value = g.finalScore || g.final || 0;
      calculateGradeTotal();
    }
  } else {
    document.getElementById("gradeModalTitle").textContent = "رصد درجة جديدة";
    document.getElementById("gm_student").disabled = false;
  }

  modal.style.display = "flex";
}

function calculateGradeTotal() {
  const act = parseInt(document.getElementById("gm_activities").value) || 0;
  const mid = parseInt(document.getElementById("gm_midTerm").value) || 0;
  const fin = parseInt(document.getElementById("gm_final").value) || 0;
  const total = act + mid + fin;
  document.getElementById("gm_totalVal").textContent = total;
  document.getElementById("gm_totalPreview").style.display = "block";
}

function closeGradeModal() { document.getElementById("gradeModal").style.display = "none"; }

async function saveGrade() {
  const id = document.getElementById("gm_editId").value;
  const payload = {
    student: document.getElementById("gm_student").value,
    subject: document.getElementById("gm_subjectId").value,
    activities: parseInt(document.getElementById("gm_activities").value) || 0,
    midTerm: parseInt(document.getElementById("gm_midTerm").value) || 0,
    final: parseInt(document.getElementById("gm_final").value) || 0,
    semester: document.getElementById("gm_semester").value,
    academicYear: document.getElementById("gm_academicYear").value || "2025/2026"
  };

  if (!payload.student || !payload.subject) { alert("يرجى اختيار الطالب والمادة"); return; }

  try {
    const url = id ? `${window.CONFIG.API_BASE_URL}/api/admin/grades/${id}` : `${window.CONFIG.API_BASE_URL}/api/admin/grades`;
    const res = await fetch(url, {
      method: id ? "PATCH" : "POST",
      headers: PortalUtils.getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.ok) { 
      closeGradeModal(); 
      loadGradesBySubject(); 
      PortalUtils.showToast("✅ تم حفظ الدرجة بنجاح"); 
    } else {
      const d = await res.json();
      alert(d.message || "فشل رصد الدرجة");
    }
  } catch (err) { alert(err.message); }
}

async function deleteGrade(id) {
  if (!confirm("هل أنت متأكد من حذف سجل هذه الدرجة؟")) return;
  const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/grades/${id}`, { method: "DELETE", headers: PortalUtils.getAuthHeaders() });
  if (res.ok) { loadGradesBySubject(); PortalUtils.showToast("🗑️ تم حذف الدرجة"); }
}

// ─── Assign Logic ────────────────────────────────────────────────────────────
function openAssignModal(subjectId, subjectName, role) {
  const modal = document.getElementById("assignModal");
  document.getElementById("assignSubjectId").value = subjectId;
  document.getElementById("assignSubjectName").textContent = `المادة: ${subjectName}`;
  document.getElementById("assignRole").value = role;
  loadUsersForAssign(role);
  modal.style.display = "flex";
}

function closeAssignModal() { document.getElementById("assignModal").style.display = "none"; }

async function loadUsersForAssign(role) {
  const sel = document.getElementById("assignDoctorSel");
  sel.innerHTML = `<option value="">جارٍ التحميل...</option>`;
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/users?role=${role}&limit=100`, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    sel.innerHTML = `<option value="">بدون تعيين (إلغاء)</option>` + 
      data.users.map(u => `<option value="${u._id}">${u.firstName} ${u.lastName}</option>`).join("");
  } catch { sel.innerHTML = `<option value="">خطأ في التحميل</option>`; }
}

async function confirmAssign() {
  const sId = document.getElementById("assignSubjectId").value;
  const uId = document.getElementById("assignDoctorSel").value;
  const role = document.getElementById("assignRole").value;
  const payload = role === "doctor" ? { doctorId: uId || null } : { taId: uId || null };

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/subjects/${sId}/assign`, {
      method: "PATCH",
      headers: PortalUtils.getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.ok) { closeAssignModal(); loadSubjects(); PortalUtils.showToast("✅ تم التعيين بنجاح"); }
  } catch (err) { alert(err.message); }
}

// ─── Shared Helpers ─────────────────────────────────────────────────────────
async function loadDepts(id = "courseDeptFilter") {
  const sel = document.getElementById(id);
  if (!sel || sel.options.length > 1) return;
  const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/departments`, { headers: PortalUtils.getAuthHeaders() });
  const data = await res.json();
  const depts = data.departments || [];
  sel.innerHTML = `<option value="">القسم...</option>` + depts.map(d => `<option value="${d._id}">${d.name}</option>`).join("");
}

async function loadSubjectsSelect(id) {
  const sel = document.getElementById(id);
  const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/subjects?limit=100`, { headers: PortalUtils.getAuthHeaders() });
  const data = await res.json();
  const subjects = data.subjects || [];
  sel.innerHTML = `<option value="">كل المواد</option>` + subjects.map(s => `<option value="${s._id}">${s.name}</option>`).join("");
}

async function loadGroupsSelect(id) {
  const sel = document.getElementById(id);
  const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/groups`, { headers: PortalUtils.getAuthHeaders() });
  const data = await res.json();
  const groups = data.groups || [];
  sel.innerHTML = `<option value="">كل المجموعات</option>` + groups.map(g => `<option value="${g._id}">${g.name}</option>`).join("");
}

async function loadStudentsSelect(id) {
  const sel = document.getElementById(id);
  const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/users?role=student&limit=500`, { headers: PortalUtils.getAuthHeaders() });
  const data = await res.json();
  const students = data.users || [];
  sel.innerHTML = `<option value="">اختر الطالب...</option>` + students.map(u => `<option value="${u._id}">${u.firstName} ${u.lastName} (${u.nationalId})</option>`).join("");
}

function renderPagination(total) {
  const pages = Math.ceil(total / PER_PAGE);
  document.getElementById("coursePagInfo").textContent = `صفحة ${currentPage} من ${pages}`;
  document.getElementById("cpPrev").disabled = currentPage === 1;
  document.getElementById("cpNext").disabled = currentPage === pages || pages === 0;
}

function handleThumbPreview(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById("thumbPreview").src = ev.target.result;
    document.getElementById("thumbPreview").style.display = "block";
    document.getElementById("thumbPlaceholder").style.display = "none";
  };
  reader.readAsDataURL(file);
}

function changePage(delta) { currentPage = Math.max(1, currentPage + delta); loadSubjects(); }
function debounce(fn, delay) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), delay); }; }

// ─── Bulk Student Grades Logic ───────────────────────────────────────────────
let currentBulkStudent = null;
let currentBulkSubjects = [];

async function openStudentBulkGradeModal() {
  const modal = document.getElementById("studentBulkGradeModal");
  modal.style.display = "flex";
  
  const sel = document.getElementById("bulk_studentSelect");
  sel.innerHTML = `<option value="">جارٍ التحميل...</option>`;
  
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/users?role=student&limit=500`, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    const students = data.users || [];
    
    sel.innerHTML = `<option value="">اختر الطالب...</option>` + 
      students.map(u => `<option value="${u._id}" data-dept="${u.department?._id || u.department || ''}" data-year="${u.yearLevel}">${u.firstName} ${u.lastName} (${u.nationalId})</option>`).join("");
  } catch (err) {
    sel.innerHTML = `<option value="">خطأ في تحميل الطلاب</option>`;
  }
}

function closeStudentBulkGradeModal() {
  document.getElementById("studentBulkGradeModal").style.display = "none";
  currentBulkStudent = null;
  currentBulkSubjects = [];
  document.getElementById("bulk_subjectsContainer").innerHTML = `<div style="text-align:center; padding:40px; color:#94a3b8;"><p>يرجى اختيار طالب لعرض المواد الدراسية المتاحة</p></div>`;
  document.getElementById("bulkSaveBtn").disabled = true;
  document.getElementById("bulk_statusMsg").textContent = "";
}

async function loadStudentSubjectsForBulk() {
  const sel = document.getElementById("bulk_studentSelect");
  const studentId = sel.value;
  if (!studentId) return;

  const opt = sel.options[sel.selectedIndex];
  const deptId = opt.dataset.dept;
  const yearLevel = opt.dataset.year;
  const semester = document.getElementById("bulk_semester").value;
  const academicYear = document.getElementById("bulk_academicYear").value;

  const container = document.getElementById("bulk_subjectsContainer");
  container.innerHTML = `<div style="text-align:center; padding:40px;">جارٍ جلب المواد والدرجات الحالية...</div>`;
  document.getElementById("bulkSaveBtn").disabled = true;

  try {
    // 1. Fetch Subjects for this student's year/dept/sem
    let subUrl = `${window.CONFIG.API_BASE_URL}/api/admin/subjects?department=${deptId}&yearLevel=${yearLevel}&semester=${semester}&limit=50`;
    const subRes = await fetch(subUrl, { headers: PortalUtils.getAuthHeaders() });
    const subData = await subRes.json();
    const subjects = subData.subjects || [];

    if (!subjects.length) {
      container.innerHTML = `<div style="text-align:center; padding:40px; color:#ef4444; font-weight:600;">لا توجد مواد مسجلة لهذا الطالب في هذا الفصل الدراسي (${yearLevel}/${semester})</div>`;
      return;
    }

    // 2. Fetch existing grades for this student
    const gradeRes = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/grades/student/${studentId}`, { headers: PortalUtils.getAuthHeaders() });
    const gradeData = await gradeRes.json();
    const existingGrades = gradeData.grades || [];

    currentBulkSubjects = subjects;
    currentBulkStudent = studentId;

    // 3. Render Table
    let html = `
      <table class="admin-table" style="background:#fff;">
        <thead>
          <tr>
            <th style="width:250px;">المادة</th>
            <th>أعمال السنة (20)</th>
            <th>ميدتيرم (30)</th>
            <th>نهائي (50)</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>`;

    subjects.forEach(s => {
      const g = existingGrades.find(x => x.subject?._id === s._id || x.subject === s._id);
      const act = g?.activities || 0;
      const mid = g?.midTerm || 0;
      const fin = g?.final || 0;
      const total = act + mid + fin;

      html += `
        <tr data-subject-id="${s._id}">
          <td>
            <div style="font-weight:700; color:#1e293b;">${s.name}</div>
            <div style="font-size:1.1rem; color:#64748b;">${s.code}</div>
          </td>
          <td><input type="number" class="bulk-input act" value="${act}" min="0" max="20" oninput="updateBulkTotal(this)"></td>
          <td><input type="number" class="bulk-input mid" value="${mid}" min="0" max="30" oninput="updateBulkTotal(this)"></td>
          <td><input type="number" class="bulk-input fin" value="${fin}" min="0" max="50" oninput="updateBulkTotal(this)"></td>
          <td class="bulk-total" style="font-weight:800; font-size:1.4rem; color:#2463eb;">${total}</td>
        </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
    document.getElementById("bulkSaveBtn").disabled = false;

  } catch (err) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:#ef4444;">خطأ: ${err.message}</div>`;
  }
}

function updateBulkTotal(input) {
  const row = input.closest("tr");
  const act = parseInt(row.querySelector(".act").value) || 0;
  const mid = parseInt(row.querySelector(".mid").value) || 0;
  const fin = parseInt(row.querySelector(".fin").value) || 0;
  row.querySelector(".bulk-total").textContent = act + mid + fin;
}

async function saveBulkGrades() {
  const btn = document.getElementById("bulkSaveBtn");
  const status = document.getElementById("bulk_statusMsg");
  const studentId = currentBulkStudent;
  const academicYear = document.getElementById("bulk_academicYear").value;
  const semester = document.getElementById("bulk_semester").value;

  const rows = document.querySelectorAll("#bulk_subjectsContainer tr[data-subject-id]");
  const total = rows.length;
  let saved = 0;

  btn.disabled = true;
  btn.textContent = "جارٍ الحفظ...";
  status.textContent = `جارٍ حفظ الدرجات (0 / ${total})...`;
  status.style.color = "#2463eb";

  try {
    for (const row of rows) {
      const subjectId = row.dataset.subjectId;
      const activities = parseInt(row.querySelector(".act").value) || 0;
      const midTerm = parseInt(row.querySelector(".mid").value) || 0;
      const final = parseInt(row.querySelector(".fin").value) || 0;

      const payload = {
        student: studentId,
        subject: subjectId,
        activities,
        midTerm,
        final,
        semester,
        academicYear
      };

      const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/grades`, {
        method: "POST",
        headers: PortalUtils.getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        saved++;
        status.textContent = `جارٍ حفظ الدرجات (${saved} / ${total})...`;
      }
    }

    status.textContent = `✅ تم حفظ ${saved} مادة بنجاح!`;
    status.style.color = "#22c55e";
    PortalUtils.showToast("تم تحديث كشف الدرجات بنجاح");
    
    setTimeout(() => {
      btn.textContent = "حفظ الكل";
      btn.disabled = false;
    }, 2000);

  } catch (err) {
    status.textContent = `❌ خطأ أثناء الحفظ: ${err.message}`;
    status.style.color = "#ef4444";
    btn.disabled = false;
    btn.textContent = "حفظ الكل";
  }
}

// Global Counts
async function loadCounts() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/stats`, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    // Subjects count is already in tab badge, but can use global if needed
  } catch {}
}

// Add CSS for bulk inputs
const style = document.createElement('style');
style.textContent = `
  .bulk-input {
    width: 65px;
    padding: 8px 5px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 1.3rem;
    font-family: inherit;
    text-align: center;
    transition: border-color 0.2s;
  }
  .bulk-input:focus {
    border-color: #2463eb;
    outline: none;
    box-shadow: 0 0 0 3px rgba(36,99,235,0.1);
  }
`;
document.head.appendChild(style);
