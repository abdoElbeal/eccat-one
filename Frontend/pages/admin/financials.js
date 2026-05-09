window.onerror = function(msg, url, line) {
  console.error("Error: ", msg, "at", line);
};

const auth = PortalUtils.guard("admin");
if (auth) init();

function init() {
  PortalUtils.setupTopbar(auth.payload);
  loadBills();

  document.getElementById("filterYear")?.addEventListener("change", loadBills);
  document.getElementById("filterSemester")?.addEventListener("change", loadBills);
  document.getElementById("filterStatus")?.addEventListener("change", loadBills);
  document.getElementById("searchInput")?.addEventListener("keyup", (e) => {
    if (e.key === "Enter") loadBills();
  });
}

async function loadBills() {
  const tbody = document.getElementById("billsTableBody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" class="text-center">جارٍ التحميل...</td></tr>`;

  try {
    const year = document.getElementById("filterYear")?.value || "";
    const sem = document.getElementById("filterSemester")?.value || "";
    const status = document.getElementById("filterStatus")?.value || "";
    const search = document.getElementById("searchInput")?.value || "";

    let url = `${window.CONFIG.API_BASE_URL}/api/admin/billing?page=1&limit=50`;
    if (year) url += `&academicYear=${encodeURIComponent(year)}`;
    if (sem) url += `&semester=${encodeURIComponent(sem)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const res = await fetch(url, { headers: PortalUtils.getAuthHeaders() });
    const data = await res.json();
    const bills = data.bills || [];

    if (!bills.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center">لا توجد فواتير مطابقة</td></tr>`;
      return;
    }

    tbody.innerHTML = bills.map(b => {
      const studentName = b.student ? `${b.student.firstName} ${b.student.lastName}` : "طالب محذوف";
      const natId = b.student ? b.student.nationalId : "";
      
      let statusHtml = "";
      if (b.status === "unpaid") statusHtml = `<span class="badge" style="background:#fee2e2;color:#991b1b;">غير مدفوع</span>`;
      else if (b.status === "partial") statusHtml = `<span class="badge" style="background:#fef3c7;color:#92400e;">دفع جزئي</span>`;
      else statusHtml = `<span class="badge" style="background:#dcfce7;color:#166534;">مكتمل</span>`;

      const remaining = b.amount - b.paidAmount;

      return `
        <tr>
          <td>
            <div style="font-weight:600;">${studentName}</div>
            <div class="text-muted" style="font-size:0.8rem;">${natId}</div>
          </td>
          <td>
            <div style="font-weight:600;">${b.title}</div>
            <div class="text-muted" style="font-size:0.8rem;">${b.type}</div>
          </td>
          <td>${b.academicYear} <br><span class="text-muted">${b.semester}</span></td>
          <td style="font-weight:700;">${b.amount} ج.م</td>
          <td style="color:#16a34a;">${b.paidAmount} ج.م</td>
          <td style="color:#dc2626;">${remaining} ج.م</td>
          <td>${statusHtml}</td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="openPayModal('${b._id}', ${remaining})" ${remaining <= 0 ? "disabled" : ""}>تسجيل دفعة</button>
          </td>
        </tr>
      `;
    }).join("");

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">حدث خطأ أثناء جلب البيانات</td></tr>`;
  }
}

// ─── Modals ───────────────────────────────────────────────────────────────────
function openBillModal() {
  document.getElementById("billForm").reset();
  document.getElementById("billModal").style.display = "flex";
}
function closeBillModal() {
  document.getElementById("billModal").style.display = "none";
}

async function handleIssueBill(e) {
  e.preventDefault();
  const btn = document.getElementById("issueBillBtn");
  btn.disabled = true;
  btn.textContent = "جاري الإصدار...";

  try {
    const payload = {
      title: document.getElementById("billTitle").value,
      type: document.getElementById("billType").value,
      amount: document.getElementById("billAmount").value,
      academicYear: document.getElementById("billYear").value,
      semester: document.getElementById("billSemester").value,
      dueDate: document.getElementById("billDueDate").value || undefined,
    };

    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/billing/generate`, {
      method: "POST",
      headers: { ...PortalUtils.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      closeBillModal();
      loadBills();
    } else {
      alert(data.message || "فشل إصدار الفواتير");
    }
  } catch (err) {
    console.error(err);
    alert("خطأ في الاتصال بالخادم");
  } finally {
    btn.disabled = false;
    btn.textContent = "إصدار للجميع";
  }
}

function openPayModal(billId, remaining) {
  document.getElementById("payForm").reset();
  document.getElementById("payBillId").value = billId;
  document.getElementById("payAmount").max = remaining;
  document.getElementById("payAmount").value = remaining; // Suggest full amount
  document.getElementById("payModal").style.display = "flex";
}
function closePayModal() {
  document.getElementById("payModal").style.display = "none";
}

async function handlePayment(e) {
  e.preventDefault();
  const btn = document.getElementById("paySubmitBtn");
  btn.disabled = true;
  btn.textContent = "جاري الحفظ...";

  try {
    const id = document.getElementById("payBillId").value;
    const payload = {
      amount: document.getElementById("payAmount").value,
      receiptNumber: document.getElementById("payReceipt").value,
      notes: document.getElementById("payNotes").value,
    };

    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/admin/billing/${id}/pay`, {
      method: "POST",
      headers: { ...PortalUtils.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok) {
      closePayModal();
      loadBills();
    } else {
      alert(data.message || "فشل تسجيل الدفع");
    }
  } catch (err) {
    console.error(err);
    alert("خطأ في الاتصال بالخادم");
  } finally {
    btn.disabled = false;
    btn.textContent = "تأكيد الدفع";
  }
}
