// ─── Leaderboard JS ───────────────────────────────────────────────────────────
const auth = PortalUtils.guard("student");
if (auth) init();

let currentScope = "dept";
let currentSubjectId = "";
let currentPage  = 1;
let totalPages   = 1;

function init() {
  PortalUtils.setupTopbar(auth.payload);

  document.getElementById("tabDept")?.addEventListener("click", () => setScope("dept"));
  document.getElementById("tabAll")?.addEventListener("click", () => setScope("all"));
  document.getElementById("tabSubject")?.addEventListener("click", () => setScope("subject"));
  
  const subjSel = document.getElementById("subjectSelect");
  if (subjSel) {
    subjSel.addEventListener("change", (e) => {
      currentSubjectId = e.target.value;
      if (currentSubjectId) loadLeaderboard();
    });
  }

  const semSel = document.getElementById("semesterSelect");
  if (semSel) {
    semSel.addEventListener("change", () => {
      currentPage = 1;
      loadLeaderboard();
    });
  }

  document.getElementById("lbPrev")?.addEventListener("click", () => changePage(-1));
  document.getElementById("lbNext")?.addEventListener("click", () => changePage(1));

  loadMyRank(); // To get base details like name, dept
  loadSubjects();
  loadLeaderboard();
}

async function loadSubjects() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/student/courses`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    const d = await res.json();
    const sel = document.getElementById("subjectSelect");
    if (!sel) return;
    
    sel.innerHTML = '<option value="">اختر المادة...</option>';
    if (d.courses && d.courses.length) {
      d.courses.forEach(c => {
        sel.innerHTML += `<option value="${c._id}">${c.name}</option>`;
      });
    }
  } catch (err) {
    console.error("Failed to load subjects:", err);
  }
}

function setScope(scope) {
  currentScope = scope;
  currentPage = 1;
  document.getElementById("tabDept")?.classList.toggle("active", scope === "dept");
  document.getElementById("tabAll")?.classList.toggle("active", scope === "all");
  document.getElementById("tabSubject")?.classList.toggle("active", scope === "subject");
  
  const subjSel = document.getElementById("subjectSelect");
  if (scope === "subject") {
    subjSel.style.display = "block";
    if (!currentSubjectId && subjSel.options.length > 1) {
      subjSel.selectedIndex = 1;
      currentSubjectId = subjSel.value;
    }
  } else {
    subjSel.style.display = "none";
  }

  if (scope === "subject" && !currentSubjectId) return; // Wait for selection
  loadLeaderboard();
}

async function loadMyRank() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/student/stats`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    const d = await res.json();
    
    if (document.getElementById("myRankName")) document.getElementById("myRankName").textContent = `${auth.payload.firstName} ${auth.payload.lastName}`;
    if (document.getElementById("myRankDept")) document.getElementById("myRankDept").textContent = `${d.department || ""} • سنة ${d.yearLevel || 1}`;
  } catch (err) { console.error(err); }
}

async function loadLeaderboard() {
  const tbody = document.getElementById("leaderTable");
  if (!tbody) return;
  showSkeleton(tbody, 5);

  try {
    let url = `${window.CONFIG.API_BASE_URL}/api/student/leaderboard?scope=${currentScope}&page=${currentPage}&limit=10`;
    if (currentScope === "subject" && currentSubjectId) {
      url += `&subjectId=${currentSubjectId}`;
    }
    
    const semSel = document.getElementById("semesterSelect");
    if (semSel && semSel.value) {
      url += `&semester=${encodeURIComponent(semSel.value)}`;
    }

    const res = await fetch(url, { headers: PortalUtils.getAuthHeaders() });
    const d = await res.json();
    const students = d.students || [];
    totalPages = d.totalPages || 1;

    // Dynamically Update My Rank Hero Based on Scope
    if (document.getElementById("myRankNum")) {
      document.getElementById("myRankNum").textContent = d.myRank ? `#${d.myRank}` : "—";
    }
    
    // Update my score from the response payload
    if (document.getElementById("myRankGpa") && d.myScore !== undefined && d.myScore !== null) {
      const isSubject = currentScope === "subject";
      const isSem = !!(semSel && semSel.value);
      const val = typeof d.myScore === "number" ? d.myScore : parseFloat(d.myScore);
      
      let label = isSubject ? `${val} درجة` : `GPA ${val.toFixed(2)}`;
      if (!isSubject && isSem) label = `${val.toFixed(2)} متوسط`;
      document.getElementById("myRankGpa").textContent = label;
      
      const bar = document.getElementById("myRankBar");
      if (bar) {
        if (isSubject || isSem) {
           bar.style.width = `${Math.min(100, (val / 100) * 100)}%`; // Assumes 100 max
        } else {
           bar.style.width = `${Math.min(100, (val / 4) * 100)}%`; // Assumes 4.0 max
        }
      }
    }

    // Update podium
    updatePodium(students);

    if (students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>لا توجد بيانات متاحة</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = students.map((s, i) => {
      const isMe = s._id === auth.payload.id;
      const val = typeof s.gpa === "number" ? s.gpa : parseFloat(s.gpa);
      const isGpa = currentScope !== "subject";
      const displayVal = isGpa ? val.toFixed(2) : val;

      return `
        <tr class="${isMe ? 'me-row' : ''}">
          <td><div class="rank-badge ${s.rank <= 3 ? 'rank-' + s.rank : ''}">${s.rank}</div></td>
          <td>
            <div class="user-row">
              <div class="avatar" style="background:#f1f5f9;">${(s.name || "").slice(0,2)}</div>
              <div class="user-row-info">
                <strong>${s.name} ${isMe ? '(أنت)' : ''}</strong>
                <span class="text-muted">@${s.username}</span>
              </div>
            </div>
          </td>
          <td><span class="gpa-chip">${displayVal}</span></td>
          <td>${s.creditHours || 0}</td>
          <td><span class="trend-chip same">— 0</span></td>
          <td>
            ${isMe ? '-' : `
              <button class="msg-btn" onclick="location.href='messages.html'">
                <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </button>
            `}
          </td>
        </tr>
      `;
    }).join("");

    updatePaginationUI();

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>خطأ في تحميل لوحة المتصدرين</p></div></td></tr>`;
  }
}

function updatePodium(students) {
  const isSubject = currentScope === "subject";
  
  function getScoreStr(s) {
    if (!s) return "";
    const v = typeof s.gpa === "number" ? s.gpa : parseFloat(s.gpa);
    return isSubject ? v + " درجة" : v.toFixed(2);
  }

// 1st
  const el1 = document.querySelector(".podium-slot.first");
  if (el1) {
    if (students[0]) {
      el1.style.visibility = "visible";
      el1.querySelector(".ps-name").textContent = students[0].name;
      el1.querySelector(".ps-gpa").textContent = getScoreStr(students[0]);
      el1.querySelector(".ps-avatar").textContent = students[0].name.slice(0,2);
      if (el1.querySelector(".ps-spec")) el1.querySelector(".ps-spec").textContent = students[0].department || "عام";
    } else {
      el1.style.visibility = "hidden";
    }
  }

  // 2nd
  const el2 = document.querySelector(".podium-slot.second");
  if (el2) {
    if (students[1]) {
      el2.style.visibility = "visible";
      el2.querySelector(".ps-name").textContent = students[1].name;
      el2.querySelector(".ps-gpa").textContent = getScoreStr(students[1]);
      el2.querySelector(".ps-avatar").textContent = students[1].name.slice(0,2);
      if (el2.querySelector(".ps-spec")) el2.querySelector(".ps-spec").textContent = students[1].department || "عام";
    } else {
      el2.style.visibility = "hidden";
    }
  }

  // 3rd
  const el3 = document.querySelector(".podium-slot.third");
  if (el3) {
    if (students[2]) {
      el3.style.visibility = "visible";
      el3.querySelector(".ps-name").textContent = students[2].name;
      el3.querySelector(".ps-gpa").textContent = getScoreStr(students[2]);
      el3.querySelector(".ps-avatar").textContent = students[2].name.slice(0,2);
      if (el3.querySelector(".ps-spec")) el3.querySelector(".ps-spec").textContent = students[2].department || "عام";
    } else {
      el3.style.visibility = "hidden";
    }
  }
}

function updatePaginationUI() {
  const prev = document.getElementById("lbPrev");
  const next = document.getElementById("lbNext");
  if (prev) prev.disabled = currentPage <= 1;
  if (next) next.disabled = currentPage >= totalPages;
}

function changePage(delta) {
  const n = currentPage + delta;
  if (n < 1 || n > totalPages) return;
  currentPage = n;
  loadLeaderboard();
}
