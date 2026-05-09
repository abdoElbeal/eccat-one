window.onerror = function(msg, url, line) {
  console.error("JS Error: " + msg + " at line " + line);
};
console.log("FINANCIALS JS LOADED");

const auth = PortalUtils.guard("student");

let myBills = [];

if (auth) init();

function init() {
  PortalUtils.setupTopbar(auth.payload);
  loadFinancials();
}

async function loadFinancials() {
  const tbody = document.getElementById("billsTableBody");
  if (!tbody) return;

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/student/billing/my-bills`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    const d = await res.json();
    
    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>${d.message || "فشل تحميل البيانات"}</p></div></td></tr>`;
      return;
    }

    myBills = d.bills || [];
    const summary = d.summary || { totalOwed: 0, totalPaid: 0, remaining: 0 };

    // Update Summary Cards
    if (document.getElementById("statTotalOwed")) document.getElementById("statTotalOwed").textContent = summary.totalOwed + " ج.م";
    if (document.getElementById("statTotalPaid")) document.getElementById("statTotalPaid").textContent = summary.totalPaid + " ج.م";
    if (document.getElementById("statRemaining")) document.getElementById("statRemaining").textContent = summary.remaining + " ج.م";

    if (myBills.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>لا توجد أي فواتير حالياً</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = myBills.map(b => {
      let statusHtml = "";
      if (b.status === "unpaid") statusHtml = `<span class="badge" style="background:#fee2e2;color:#991b1b;">غير مدفوع</span>`;
      else if (b.status === "partial") statusHtml = `<span class="badge" style="background:#fef3c7;color:#92400e;">دفع جزئي</span>`;
      else statusHtml = `<span class="badge" style="background:#dcfce7;color:#166534;">مكتمل</span>`;

      const remaining = b.amount - b.paidAmount;

      return `
        <tr>
          <td>
            <div style="font-weight:600;font-size:1.1rem;">${b.title}</div>
            <div class="text-muted" style="font-size:0.9rem;">${b.type}</div>
          </td>
          <td>${b.academicYear} <br><span class="text-muted">${b.semester}</span></td>
          <td style="font-weight:700;">${b.amount} ج.م</td>
          <td style="color:#16a34a;">${b.paidAmount} ج.م</td>
          <td style="color:#dc2626;font-weight:700;">${remaining} ج.م</td>
          <td>${statusHtml}</td>
        </tr>
      `;
    }).join("");

  } catch (err) {
    console.error("Financials error:", err);
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>حدث خطأ في تحميل الفواتير</p></div></td></tr>`;
  }
}
