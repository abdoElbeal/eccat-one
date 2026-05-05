const auth = PortalUtils.guard("admin");
if (auth) init();

function init() {
  PortalUtils.setupTopbar(auth.payload);
  loadTickets();
}

async function loadTickets() {
  const list = document.getElementById("ticketsList");
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/support`, {
      headers: PortalUtils.getAuthHeaders()
    });
    const d = await res.json();
    if (res.ok) {
      if (d.tickets.length === 0) {
        list.innerHTML = `<div class="panel" style="padding:40px; text-align:center;">لا توجد طلبات دعم حالياً</div>`;
        return;
      }
      list.innerHTML = d.tickets.map(t => renderTicket(t)).join("");
    }
  } catch (err) {
    list.innerHTML = `<div class="error-state">فشل تحميل الرسائل</div>`;
  }
}

function renderTicket(t) {
  const isClosed = t.status === "closed";
  const student = t.student || { firstName: "طالب", lastName: "غير معروف" };
  const studentName = `${student.firstName} ${student.lastName}`;
  const avatarUrl = student.profileImage ? `${window.CONFIG.API_BASE_URL}${student.profileImage}` : "";
  
  return `
    <div class="ticket-card" id="ticket-${t._id}">
      <div class="ticket-header">
        <div class="student-info">
          <div class="student-avatar">
            ${avatarUrl ? `<img src="${avatarUrl}">` : student.firstName[0]}
          </div>
          <div>
            <div style="font-weight:700; color:#1e293b;">${studentName}</div>
            <div style="font-size:1rem; color:#64748b;">${student.department?.name || 'عام'} - سنة ${student.yearLevel || 1}</div>
          </div>
        </div>
        <span class="status-badge ${isClosed ? 'status-closed' : 'status-open'}">
          ${isClosed ? 'مغلق' : 'مفتوح'}
        </span>
      </div>
      <div class="ticket-subject">${t.subject}</div>
      <div class="ticket-msg">${t.message}</div>
      
      ${t.adminResponse ? `
        <div style="margin-top:12px; padding:12px; background:#f0fdf4; border-radius:8px; border-right:4px solid #16a34a;">
          <div style="font-weight:700; color:#16a34a; margin-bottom:4px;">الرد الإداري:</div>
          <div style="color:#1e293b;">${t.adminResponse}</div>
        </div>
      ` : ''}

      <div class="ticket-footer">
        <div style="font-size:1rem; color:#94a3b8;">${new Date(t.createdAt).toLocaleString("ar-EG")}</div>
        ${!isClosed ? `
          <button class="btn btn-primary btn-sm" onclick="showReply('${t._id}')">رد الآن</button>
        ` : ''}
      </div>

      <div id="reply-area-${t._id}" class="reply-area">
        <textarea id="reply-text-${t._id}" class="form-control" placeholder="اكتب ردك هنا..." style="width:100%; margin:12px 0;"></textarea>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
            <input type="checkbox" id="close-ticket-${t._id}" checked>
            <span>إغلاق الطلب بعد الرد</span>
          </label>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-secondary btn-sm" onclick="showReply('${t._id}', false)">إلغاء</button>
            <button class="btn btn-success btn-sm" onclick="sendReply('${t._id}')">إرسال الرد</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.showReply = (id, show = true) => {
  document.getElementById(`reply-area-${id}`).classList.toggle("active", show);
};

window.sendReply = async (id) => {
  const text = document.getElementById(`reply-text-${id}`).value;
  const shouldClose = document.getElementById(`close-ticket-${id}`).checked;
  if (!text) return alert("يرجى كتابة الرد");

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/support/${id}`, {
      method: "PUT",
      headers: PortalUtils.getAuthHeaders(),
      body: JSON.stringify({ response: text, status: shouldClose ? "closed" : "open" })
    });
    if (res.ok) {
      PortalUtils.showToast("تم إرسال الرد بنجاح", "success");
      loadTickets();
    }
  } catch (err) {
    alert("فشل الإرسال");
  }
};
