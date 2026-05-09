// ─── Student Assignments JS ───────────────────────────────────────────────────
const auth = PortalUtils.guard("student");
if (auth) init();

let allAssignments = [];
let activeFilter   = "all";
let currentAsgnId  = null;
let currentAsgnType = "pdf";

function init() {
  PortalUtils.setupTopbar(auth.payload);
  loadAssignments();
}

async function loadAssignments() {
  const list = document.getElementById("assignmentsList");
  list.innerHTML = `<div style="padding:60px;text-align:center;color:#94a3b8;">جارٍ التحميل...</div>`;

  try {
    const res  = await fetch(`${window.CONFIG.API_BASE_URL}/api/student/assignments`, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    allAssignments = data.assignments || [];

    renderSummary(allAssignments);
    renderList(allAssignments);

    document.getElementById("asgnSummary").style.display = "flex";
    document.getElementById("asgnTabs").style.display    = "flex";
  } catch (err) {
    console.error(err);
    list.innerHTML = `<div style="padding:60px;text-align:center;color:#ef4444;">خطأ في تحميل الواجبات</div>`;
  }
}

function renderSummary(items) {
  const submitted = items.filter(a => a.mySubmission).length;
  const graded    = items.filter(a => a.mySubmission?.status === "graded").length;
  const late      = items.filter(a => a.mySubmission?.status === "late").length;
  const pending   = items.filter(a => !a.mySubmission).length;

  document.getElementById("sumTotal").textContent     = items.length;
  document.getElementById("sumSubmitted").textContent = submitted;
  document.getElementById("sumGraded").textContent    = graded;
  document.getElementById("sumLate").textContent      = late;
  document.getElementById("sumPending").textContent   = pending;
}

function filterTab(filter, btn) {
  activeFilter = filter;
  document.querySelectorAll(".asgn-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");

  let filtered = allAssignments;
  if (filter === "pending")   filtered = allAssignments.filter(a => !a.mySubmission && !a.isOverdue);
  if (filter === "submitted") filtered = allAssignments.filter(a => a.mySubmission && a.mySubmission.status !== "graded");
  if (filter === "graded")    filtered = allAssignments.filter(a => a.mySubmission?.status === "graded");
  if (filter === "overdue")   filtered = allAssignments.filter(a => a.isOverdue && !a.mySubmission);

  renderList(filtered);
}

function renderList(items) {
  const list = document.getElementById("assignmentsList");

  if (!items.length) {
    list.innerHTML = `
      <div style="text-align:center;padding:60px;color:#94a3b8;">
        <svg viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" style="width:48px;height:48px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
        <p style="font-size:1.4rem;">لا توجد واجبات في هذا القسم</p>
      </div>`; return;
  }

  list.innerHTML = items.map(a => {
    const due     = new Date(a.dueDate);
    const now     = new Date();
    const diffMs  = due - now;
    const diffH   = Math.round(diffMs / 3600000);
    const isPast  = diffMs < 0;
    const isUrgent = !isPast && diffH <= 24;

    const sub     = a.mySubmission;
    const subLabel = !sub ? (isPast ? "⛔ منتهي بدون تسليم" : "⏳ لم يُسلَّم بعد")
                   : sub.status === "graded"    ? `✅ مصحح — الدرجة: ${sub.grade ?? "—"} / ${a.maxGrade}`
                   : sub.status === "late"      ? "⚠️ تسليم متأخر"
                   : "✔ تم التسليم";

    const subColor = !sub ? (isPast ? "#b91c1c" : isUrgent ? "#ea580c" : "#2463eb")
                   : sub.status === "graded" ? "#16a34a"
                   : sub.status === "late"   ? "#ea580c"
                   : "#16a34a";

    const typeIcon = a.assignmentType === "pdf" ? "📄 رفع PDF" : "📋 ورقي";
    const dueText  = isPast ? `انتهى: ${due.toLocaleString("ar-EG")}`
                   : isUrgent ? `⚡ متبقي ${diffH} ساعة`
                   : due.toLocaleString("ar-EG");

    const canSubmit = !isPast || !sub; // allow late submission

    return `
      <div class="asgn-card ${isPast && !sub ? "overdue" : ""} ${isUrgent && !sub ? "urgent" : ""}">
        <div class="asgn-card-left">
          <div class="asgn-subject-badge">${a.subject?.code || "—"}</div>
          <h3 class="asgn-card-title">${a.title}</h3>
          ${a.description ? `<p class="asgn-card-desc">${a.description}</p>` : ""}
          <div class="asgn-card-meta">
            <span>📚 ${a.subject?.name || "—"}</span>
            <span>👨‍🏫 ${a.doctor || "—"}</span>
            <span>${typeIcon}</span>
            <span>💯 ${a.maxGrade} درجة</span>
          </div>
          <div class="asgn-due ${isUrgent ? "urgent-text" : ""}">🗓 ${dueText}</div>
          ${sub?.feedback ? `<div class="asgn-feedback">💬 تعليق الدكتور: ${sub.feedback}</div>` : ""}
        </div>
        <div class="asgn-card-right">
          <div class="asgn-status-pill" style="background:${subColor}18;color:${subColor};">${subLabel}</div>
          ${sub?.fileUrl ? `<a href="${window.CONFIG.API_BASE_URL}${sub.fileUrl}" target="_blank" class="btn btn-ghost btn-sm" style="margin-top:8px;">📄 عرض الملف</a>` : ""}
          ${canSubmit ? `<button class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="openSubmitModal('${a._id}','${esc(a.title)}','${a.assignmentType}',${a.maxGrade})">
            ${sub ? "إعادة التسليم" : "تسليم الواجب"}
          </button>` : ""}
        </div>
      </div>`;
  }).join("");
}

// ─── Submit Modal ─────────────────────────────────────────────────────────────
function openSubmitModal(asgnId, title, type, maxGrade) {
  currentAsgnId   = asgnId;
  currentAsgnType = type;

  document.getElementById("submitModalTitle").textContent = title;
  document.getElementById("submitModalSub").textContent   = type === "pdf" ? "رفع ملف PDF" : "واجب ورقي";

  const body = document.getElementById("submitModalBody");
  if (type === "pdf") {
    body.innerHTML = `
      <div style="border:2px dashed #e2e8f0;border-radius:14px;padding:28px;text-align:center;cursor:pointer;transition:border-color .2s;" id="dropZone" onclick="document.getElementById('pdfInput').click()">
        <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" style="width:40px;height:40px;margin-bottom:10px;display:block;margin-left:auto;margin-right:auto;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p style="color:#64748b;font-size:1.3rem;">اضغط لاختيار ملف PDF</p>
        <p id="selectedFileName" style="color:#2463eb;font-size:1.2rem;margin-top:8px;"></p>
        <input type="file" id="pdfInput" accept=".pdf,application/pdf" style="display:none;" onchange="onFileSelected(this)">
      </div>
      <div class="field-group" style="margin-top:14px;">
        <label>ملاحظات (اختياري)</label>
        <input type="text" id="submitNotes" placeholder="أي ملاحظات للدكتور" />
      </div>`;
  } else {
    // Paper type — just notes
    body.innerHTML = `
      <div style="background:#f0fdf4;border-radius:14px;padding:20px;border:1.5px solid #bbf7d0;text-align:center;margin-bottom:16px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.5" style="width:36px;height:36px;display:block;margin:0 auto 10px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
        <p style="color:#15803d;font-size:1.3rem;font-weight:600;">واجب ورقي — سيُسلَّم للدكتور مباشرة</p>
        <p style="color:#64748b;font-size:1.2rem;margin-top:6px;">اضغط "تسليم" لتأكيد أنك سلّمت الورقة للدكتور</p>
      </div>
      <div class="field-group">
        <label>ملاحظات (اختياري)</label>
        <input type="text" id="submitNotes" placeholder="أي ملاحظات للدكتور" />
      </div>`;
  }

  document.getElementById("submitModal").style.display = "flex";
}

function onFileSelected(input) {
  const file = input.files[0];
  if (file) document.getElementById("selectedFileName").textContent = `✓ ${file.name}`;
}

function closeSubmitModal() {
  document.getElementById("submitModal").style.display = "none";
  currentAsgnId = null;
}

async function doSubmit() {
  if (!currentAsgnId) return;
  const btn = document.getElementById("submitBtn");
  btn.disabled = true; btn.textContent = "جارٍ التسليم...";

  const notes = document.getElementById("submitNotes")?.value || "";
  const formData = new FormData();
  formData.append("notes", notes);

  if (currentAsgnType === "pdf") {
    const fileInput = document.getElementById("pdfInput");
    if (!fileInput?.files[0]) {
      alert("يرجى اختيار ملف PDF أولاً");
      btn.disabled = false; btn.textContent = "تسليم الواجب"; return;
    }
    formData.append("file", fileInput.files[0]);
  }

  try {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/student/assignments/${currentAsgnId}/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }, // multipart: don't set Content-Type
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    alert(data.message || "تم التسليم بنجاح");
    closeSubmitModal();
    loadAssignments();
  } catch (err) {
    alert(err.message || "خطأ في التسليم");
  } finally {
    btn.disabled = false; btn.textContent = "تسليم الواجب";
  }
}

function esc(s) { return String(s).replace(/'/g, "&#39;"); }
