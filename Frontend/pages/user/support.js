const auth = PortalUtils.guard("student");
if (auth) init();

function init() {
  PortalUtils.setupTopbar(auth.payload);
  loadMyTickets();

  document.getElementById("newTicketBtn")?.addEventListener("click", () => {
    PortalUtils.openSupportModal();
  });
}

async function loadMyTickets() {
  const list = document.getElementById("ticketsList");
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/student/support`, {
      headers: PortalUtils.getAuthHeaders()
    });
    const d = await res.json();
    if (res.ok) {
      if (d.tickets.length === 0) {
        list.innerHTML = `<div class="empty-state" style="padding:60px; text-align:center; background:#fff; border-radius:16px;">
          <svg viewBox="0 0 24 24" style="width:60px; height:60px; fill:#e2e8f0; margin-bottom:15px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <p style="font-size:1.5rem; color:#64748b;">لا توجد لديك طلبات دعم سابقة</p>
        </div>`;
        return;
      }
      list.innerHTML = d.tickets.map(t => renderTicket(t)).join("");
    }
  } catch (err) {
    list.innerHTML = `<div class="error-state">فشل تحميل الطلبات</div>`;
  }
}

function renderTicket(t) {
  const isClosed = t.status === "closed";
  return `
    <div class="ticket-item">
      <div class="ticket-header">
        <div class="ticket-title-wrapper">
          <div class="ticket-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div>
            <div class="ticket-subject">${t.subject}</div>
            <div class="ticket-date">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${new Date(t.createdAt).toLocaleDateString("ar-EG")}
            </div>
          </div>
        </div>
        <span class="status-badge ${isClosed ? 'status-closed' : 'status-open'}">
          ${isClosed ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> مغلق (تم الرد)' : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> مفتوح (قيد الانتظار)'}
        </span>
      </div>
      <div class="ticket-msg">${t.message}</div>
      
      ${t.adminResponse ? `
        <div class="admin-reply">
          <div class="reply-label">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            رد الدعم الفني:
          </div>
          <div class="reply-content">${t.adminResponse}</div>
        </div>
      ` : ''}
    </div>
  `;
}

// Override PortalUtils.showToast success to reload tickets
const originalShowToast = PortalUtils.showToast;
PortalUtils.showToast = function(msg, type) {
  originalShowToast.call(this, msg, type);
  if (type === "success" && msg.includes("بنجاح")) {
    setTimeout(() => loadMyTickets(), 1000);
  }
};
