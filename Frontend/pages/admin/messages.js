// ─── Messaging JS (Admin) ─────────────────────────────────────────────────────
const auth = PortalUtils.guard("admin");
if (auth) init();

let currentChatId = null;
let chatInterval  = null;

function init() {
  PortalUtils.setupTopbar(auth.payload);

  document.getElementById("sendBtn").addEventListener("click", sendMessage);
  document.getElementById("messageInput").addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
  });

  document.getElementById("newMsgBtn")?.addEventListener("click", () => {
    document.getElementById("newMsgModal").style.display = "flex";
  });
  document.getElementById("closeMsgModal")?.addEventListener("click", closeModal);
  document.getElementById("cancelMsgModal")?.addEventListener("click", closeModal);
  document.getElementById("sendNewMsg")?.addEventListener("click", sendNewMessage);

  document.getElementById("toInput")?.addEventListener("input", debounce(fetchSuggestions, 300));
  document.getElementById("searchInput")?.addEventListener("input", debounce(e => filterConversations(e.target.value), 300));

  loadConversations();
  // Auto-refresh messages every 10s if chat open
  setInterval(() => { if (currentChatId) loadMessages(); }, 10000);
}

// ─── 1. Conversations ────────────────────────────────────────────────────────
async function loadConversations() {
  const list = document.getElementById("conversationsList");
  if (!list) return;

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/messages/conversations`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    const d = await res.json();
    const convos = d.conversations || [];

    if (convos.length === 0) {
      list.innerHTML = `<div class="empty-state" style="padding:40px;text-align:center;color:#94a3b8;"><p>لا توجد محادثات سابقة</p></div>`;
      return;
    }

    list.innerHTML = convos.map(c => {
      const other = c.otherUser;
      const initials = other.name ? other.name.slice(0, 2) : "؟";
      const isSelected = other._id === currentChatId;
      const roleLabel = other.role === "student" ? "طالب" : other.role === "doctor" ? "دكتور" : "مدير";
      return `
        <div class="convo-item ${isSelected ? 'active' : ''}" onclick="openChat('${other._id}', '${other.name}', '${other.role}')">
          <div class="ci-avatar" style="background:#e0f2fe;color:#0369a1;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:700;flex-shrink:0;">${initials}</div>
          <div class="ci-info" style="flex:1;min-width:0;">
            <div class="ci-top">
              <span class="ci-name" style="font-weight:700;">${other.name}</span>
              <span class="ci-time" style="font-size:1.1rem;color:#94a3b8;">${roleLabel}</span>
            </div>
            <div class="ci-preview" style="font-size:1.2rem;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.lastMessage?.content || "بداية المحادثة"}</div>
          </div>
          ${c.unreadCount > 0 ? `<span class="ci-unread-badge">${c.unreadCount}</span>` : ''}
        </div>
      `;
    }).join("");
  } catch (err) { console.error(err); }
}

// ─── 2. Search Users (Admin can search all) ────────────────────────────────────
async function fetchSuggestions() {
  const query = document.getElementById("toInput").value.trim();
  const results = document.getElementById("searchResults");
  if (!results) return;
  if (query.length < 2) { results.style.display = "none"; return; }

  results.innerHTML = `<div style="padding:10px;text-align:center;">جارٍ البحث...</div>`;
  results.style.display = "block";

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/messages/search?q=${encodeURIComponent(query)}`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    const d = await res.json();
    const users = d.users || [];

    if (users.length === 0) {
      results.innerHTML = `<div style="padding:10px;color:#94a3b8;">لم يتم العثور على نتائج</div>`;
      return;
    }

    results.innerHTML = users.map(u => `
      <div class="search-item" onclick="selectUser('${u._id}', '${u.name}')" style="padding:10px;cursor:pointer;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:10px;">
        <div style="width:30px;height:30px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;">👤</div>
        <div>
          <div style="font-weight:600;">${u.name}</div>
          <div style="font-size:1.1rem;color:#94a3b8;">${u.role === 'student' ? 'طالب' : u.role === 'doctor' ? 'دكتور' : 'مدير'}</div>
        </div>
      </div>
    `).join("");
  } catch (err) { console.error(err); }
}

function selectUser(id, name) {
  const results = document.getElementById("searchResults");
  if (results) results.style.display = "none";
  document.getElementById("toInput").value = name;
  document.getElementById("toInput").dataset.selectedId = id;
}

function closeModal() {
  document.getElementById("newMsgModal").style.display = "none";
  const toInput = document.getElementById("toInput");
  if (toInput) { toInput.value = ""; toInput.removeAttribute("data-selected-id"); }
  const msgText = document.getElementById("newMsgText");
  if (msgText) msgText.value = "";
}

async function sendNewMessage() {
  const toId = document.getElementById("toInput")?.dataset.selectedId;
  const text = document.getElementById("newMsgText")?.value.trim();
  const savedName = document.getElementById("toInput")?.value;
  if (!toId || !text) { alert("يرجى اختيار مستخدم وكتابة رسالة."); return; }

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/messages`, {
      method: "POST",
      headers: PortalUtils.getAuthHeaders(),
      body: JSON.stringify({ to: toId, content: text }),
    });
    const data = await res.json();
    if (res.ok) {
      closeModal();
      loadConversations();
      openChat(toId, savedName);
    } else {
      alert(data.message || "حدث خطأ أثناء الإرسال");
    }
  } catch (err) { console.error(err); }
}

// ─── 3. Chat Window ──────────────────────────────────────────────────────────
function openChat(id, name, role) {
  currentChatId = id;
  const nameEl = document.getElementById("chName");
  if (nameEl) nameEl.textContent = name;
  const ipNameEl = document.getElementById("ipName");
  if (ipNameEl) ipNameEl.textContent = name;
  const ipRoleEl = document.getElementById("ipRole");
  if (ipRoleEl) ipRoleEl.textContent = role === "student" ? "طالب" : role === "doctor" ? "دكتور" : "مدير";

  const emptyChat = document.getElementById("emptyChat");
  if (emptyChat) emptyChat.style.display = "none";
  const chatMain = document.getElementById("chatMain");
  if (chatMain) chatMain.style.display = "flex";

  document.querySelectorAll(".convo-item").forEach(item => {
    item.classList.toggle("active", item.getAttribute("onclick")?.includes(id));
  });

  loadMessages();
  if (chatInterval) clearInterval(chatInterval);
  chatInterval = setInterval(loadMessages, 10000);
}

async function loadMessages() {
  if (!currentChatId) return;
  const wrap = document.getElementById("chatMain");
  if (!wrap) return;

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/messages/conversation/${currentChatId}`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    const d = await res.json();
    const msgs = d.messages || [];

    const html = msgs.map(m => {
      const isMe = m.sender === auth.payload.id;
      const time = new Date(m.createdAt).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' });
      return isMe ? `
        <div class="bubble-row sent">
          <div class="bubble sent-b"><p>${escHtml(m.content)}</p><span class="b-time">${time}</span></div>
        </div>
      ` : `
        <div class="bubble-row received">
          <div class="b-avatar">${m.senderName ? m.senderName.slice(0, 2) : "؟"}</div>
          <div class="bubble recv"><p>${escHtml(m.content)}</p><span class="b-time">${time}</span></div>
        </div>
      `;
    }).join("");

    if (wrap.innerHTML !== html) {
      wrap.innerHTML = html;
      wrap.scrollTop = wrap.scrollHeight;
    }
  } catch (err) { console.error(err); }
}

async function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  if (!text || !currentChatId) return;

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/messages`, {
      method: "POST",
      headers: PortalUtils.getAuthHeaders(),
      body: JSON.stringify({ to: currentChatId, content: text }),
    });
    const data = await res.json();
    if (res.ok) {
      input.value = "";
      loadMessages();
      loadConversations();
    } else {
      alert(data.message || "حدث خطأ أثناء الإرسال");
    }
  } catch (err) { console.error(err); }
}

// ─── Utilities ───────────────────────────────────────────────────────────────
function filterConversations(q) {
  const items = document.querySelectorAll(".convo-item");
  const search = q.toLowerCase();
  items.forEach(el => {
    const name = (el.querySelector(".ci-name")?.textContent || "").toLowerCase();
    el.style.display = name.includes(search) ? "" : "none";
  });
}
function escHtml(str) { return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function debounce(fn, d) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), d); }; }

