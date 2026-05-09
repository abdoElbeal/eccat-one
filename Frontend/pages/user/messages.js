// ─── Messaging JS (Student) ───────────────────────────────────────────────────
const auth = PortalUtils.guard("student");
if (auth) init();

let activeConvId = null;
let chatInterval = null;

function init() {
  PortalUtils.setupTopbar(auth.payload);

  document.getElementById("sendBtn")?.addEventListener("click", sendMessage);
  document.getElementById("msgInput")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  document.getElementById("newMsgBtn")?.addEventListener("click", () => {
    document.getElementById("newMsgModal").style.display = "flex";
  });
  document.getElementById("closeMsgModal")?.addEventListener("click", closeModal);
  document.getElementById("cancelMsgModal")?.addEventListener("click", closeModal);
  document.getElementById("sendNewMsg")?.addEventListener("click", sendNewMessage);

  document.getElementById("toInput")?.addEventListener("input", debounce(fetchSuggestions, 300));
  document.getElementById("searchInput")?.addEventListener("input", debounce((e) => filterConversations(e.target.value), 300));

  loadConversations();
  setInterval(() => { if (activeConvId) loadMessages(activeConvId); }, 10000);
}

// ─── 1. Conversations ────────────────────────────────────────────────────────
async function loadConversations() {
  const list = document.getElementById("convList");
  if (!list) return;

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/messages/conversations`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    const data = await res.json();
    const convos = data.conversations || [];

    if (convos.length === 0) {
      list.innerHTML = `<div class="empty-state" style="padding:40px;text-align:center;color:#94a3b8;"><p>لا توجد رسائل سابقة</p></div>`;
      return;
    }

    list.innerHTML = convos.map(c => {
      const other = c.otherUser;
      const initials = other.name ? other.name.slice(0, 2) : "؟";
      const isSelected = other._id === activeConvId;
      return `
        <div class="conv-item ${isSelected ? 'active' : ''}" onclick="openChat('${other._id}', '${other.name}')" data-name="${other.name}">
          <div class="ci-avatar" style="background:#e0f2fe;color:#0369a1;">${initials}</div>
          <div class="ci-info">
            <div class="ci-top">
              <span class="ci-name">${other.name}</span>
              <span class="ci-time">${c.lastMessage ? new Date(c.lastMessage.createdAt).toLocaleDateString("ar-EG") : ""}</span>
            </div>
            <div class="ci-preview">${c.lastMessage?.content || "بداية المحادثة"}</div>
          </div>
          ${c.unreadCount > 0 ? `<span class="ci-unread-badge">${c.unreadCount}</span>` : ""}
        </div>
      `;
    }).join("");
  } catch (err) { console.error(err); }
}

// ─── 2. Search & New Chat ────────────────────────────────────────────────────
async function fetchSuggestions() {
  const query = document.getElementById("toInput").value.trim();
  const list = document.getElementById("suggestionsList");
  if (!list) return;
  if (query.length < 2) { list.style.display = "none"; return; }

  list.innerHTML = `<div style="padding:10px;text-align:center;">جارٍ البحث...</div>`;
  list.style.display = "block";

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/messages/search?q=${encodeURIComponent(query)}`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    const d = await res.json();
    const users = d.users || [];

    if (users.length === 0) {
      list.innerHTML = `<div style="padding:10px;color:#94a3b8;">لم يتم العثور على أطباء</div>`;
      return;
    }

    list.innerHTML = users.map(u => `
      <div class="search-item" onclick="selectUser('${u._id}', '${u.name}')" style="padding:12px;cursor:pointer;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;">👨‍🏫</div>
        <div>
          <div style="font-weight:600;font-size:1.2rem;">${u.name}</div>
          <div style="font-size:1rem;color:#94a3b8;">${u.role === 'doctor' ? 'دكتور' : 'مدير'}</div>
        </div>
      </div>
    `).join("");
  } catch (err) { console.error(err); }
}

function selectUser(id, name) {
  const list = document.getElementById("suggestionsList");
  if (list) list.style.display = "none";
  const input = document.getElementById("toInput");
  input.value = name;
  input.dataset.selectedId = id;
}

async function sendNewMessage() {
  const toId = document.getElementById("toInput")?.dataset.selectedId;
  const text = document.getElementById("newMsgText")?.value.trim();
  if (!toId || !text) return;

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/messages`, {
      method: "POST",
      headers: PortalUtils.getAuthHeaders(),
      body: JSON.stringify({ to: toId, content: text }),
    });
    const data = await res.json();
    if (res.ok) {
      closeModal();
      openChat(toId, document.getElementById("toInput").value);
      loadConversations();
    } else {
      alert(data.message || "فشل إرسال الرسالة");
    }
  } catch (err) { console.error(err); }
}

// ─── 3. Chat Window ──────────────────────────────────────────────────────────
async function openChat(id, name) {
  activeConvId = id;
  document.getElementById("chName").textContent = name;
  document.getElementById("ipName").textContent = name;
  document.getElementById("chAvatar").textContent = name.slice(0, 2);
  document.getElementById("ipAvatar").textContent = name.slice(0, 2);

  document.getElementById("emptyChat").style.display = "none";
  const chatMain = document.getElementById("chatMain");
  chatMain.style.display = "flex";
  chatMain.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;">جارٍ التحميل...</div>';

  document.querySelectorAll(".conv-item").forEach(el => {
    el.classList.toggle("active", el.getAttribute("onclick").includes(id));
  });

  loadMessages(id);
}

async function loadMessages(id) {
  if (!id) return;
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/messages/conversation/${id}`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    const d = await res.json();
    const msgs = d.messages || [];

    const chatMain = document.getElementById("chatMain");
    const html = msgs.map(m => {
      const isMe = m.sender === auth.payload.id;
      const time = new Date(m.createdAt).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' });
      return isMe ? `
        <div class="bubble-row sent">
          <div class="bubble sent-b"><p>${escHtml(m.content)}</p><span class="b-time">${time}</span></div>
        </div>
      ` : `
        <div class="bubble-row received">
          <div class="b-avatar" style="background:#e0f2fe;color:#0369a1;">${m.senderName ? m.senderName.slice(0, 2) : "؟"}</div>
          <div class="bubble recv"><p>${escHtml(m.content)}</p><span class="b-time">${time}</span></div>
        </div>
      `;
    }).join("");

    if (chatMain.innerHTML !== html) {
      chatMain.innerHTML = html;
      chatMain.scrollTop = chatMain.scrollHeight;
    }
  } catch (err) { console.error(err); }
}

async function sendMessage() {
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  if (!text || !activeConvId) return;

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/messages`, {
      method: "POST",
      headers: PortalUtils.getAuthHeaders(),
      body: JSON.stringify({ to: activeConvId, content: text }),
    });
    const data = await res.json();
    if (res.ok) {
      input.value = "";
      loadMessages(activeConvId);
      loadConversations();
    } else {
      alert(data.message || "فشل الإرسال");
    }
  } catch (err) { console.error(err); }
}

// ─── Utilities ───────────────────────────────────────────────────────────────
function closeModal() {
  document.getElementById("newMsgModal").style.display = "none";
  const toInput = document.getElementById("toInput");
  toInput.value = "";
  toInput.removeAttribute("data-selected-id");
  document.getElementById("newMsgText").value = "";
}
function filterConversations(q) {
  const items = document.querySelectorAll(".conv-item");
  const search = q.toLowerCase();
  items.forEach(el => {
    const name = (el.dataset.name || "").toLowerCase();
    el.style.display = name.includes(search) ? "" : "none";
  });
}
function escHtml(str) { return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function debounce(fn, d) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), d); }; }
