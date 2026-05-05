// ─── Messaging JS ─────────────────────────────────────────────────────────────
const auth = PortalUtils.guard("student");
if (auth) init();

let currentChatId = null;
let chatInterval  = null;

function init() {
  // Logout handled by PortalUtils
  PortalUtils.setupTopbar(auth.payload);

  document.getElementById("searchBtn").addEventListener("click", searchDoctors);
  document.getElementById("searchInput").addEventListener("keypress", e => {
    if (e.key === "Enter") searchDoctors();
  });

  document.getElementById("sendBtn").addEventListener("click", sendMessage);
  document.getElementById("messageInput").addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
  });

  loadConversations();
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
      list.innerHTML = `<div class="empty-state" style="padding:40px;"><p>لا توجد محادثات سابقة</p></div>`;
      return;
    }

    list.innerHTML = convos.map(c => {
      const other = c.otherUser;
      const initials = (other.firstName || "").slice(0, 1) + (other.lastName || "").slice(0, 1);
      const isSelected = other._id === currentChatId;
      
      return `
        <div class="convo-item ${isSelected ? 'active' : ''}" onclick="openChat('${other._id}', '${other.firstName} ${other.lastName}')">
          <div class="avatar" style="background:#f1f5f9;color:#475569;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:700;">${initials}</div>
          <div class="convo-info" style="flex:1;margin-right:12px;">
            <div style="font-weight:700;font-size:1.3rem;">د. ${other.firstName} ${other.lastName}</div>
            <div class="text-muted" style="font-size:1.15rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.lastMessage?.content || "بداية المحادثة"}</div>
          </div>
          ${c.unreadCount > 0 ? `<div class="unread-badge" style="background:#2463eb;color:#fff;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;">${c.unreadCount}</div>` : ''}
        </div>
      `;
    }).join("");

  } catch (err) { console.error(err); }
}

// ─── 2. Search Doctors (Restricted) ───────────────────────────────────────────
async function searchDoctors() {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return;

  const results = document.getElementById("searchResults");
  results.innerHTML = `<div style="padding:10px;text-align:center;">جارٍ البحث...</div>`;
  results.style.display = "block";

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/messages/search?q=${query}`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    const d = await res.json();
    const users = d.users || [];

    if (users.length === 0) {
      results.innerHTML = `<div style="padding:10px;color:#94a3b8;">لم يتم العثور على أطباء</div>`;
      return;
    }

    results.innerHTML = users.map(u => `
      <div class="search-item" onclick="startNewChat('${u._id}', '${u.firstName} ${u.lastName}')" style="padding:10px;cursor:pointer;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:10px;">
        <div style="width:30px;height:30px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:1rem;">👤</div>
        <div>
          <div style="font-weight:600;">د. ${u.firstName} ${u.lastName}</div>
          <div style="font-size:1.1rem;color:#94a3b8;">${u.department || 'محاضر'}</div>
        </div>
      </div>
    `).join("");

  } catch (err) { console.error(err); }
}

function startNewChat(id, name) {
  document.getElementById("searchResults").style.display = "none";
  document.getElementById("searchInput").value = "";
  openChat(id, name);
}

// ─── 3. Chat Window ──────────────────────────────────────────────────────────
async function openChat(id, name) {
  currentChatId = id;
  document.getElementById("chatPartnerName").textContent = `د. ${name}`;
  document.getElementById("emptyChat").style.display = "none";
  document.getElementById("chatMain").style.display = "flex";
  
  // Highlight in list
  document.querySelectorAll(".convo-item").forEach(item => {
    item.classList.toggle("active", item.getAttribute("onclick")?.includes(id));
  });

  loadMessages();
  
  // Poll for new messages every 5s
  if (chatInterval) clearInterval(chatInterval);
  chatInterval = setInterval(loadMessages, 5000);
}

async function loadMessages() {
  if (!currentChatId) return;
  const wrap = document.getElementById("messagesWrap");

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/messages/${currentChatId}`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    const d = await res.json();
    const msgs = d.messages || [];

    const html = msgs.map(m => {
      const isMe = m.sender === auth.payload.id;
      return `
        <div class="message ${isMe ? 'me' : 'other'}">
          <div class="message-content">${m.content}</div>
          <div class="message-time">${new Date(m.createdAt).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}</div>
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
    if (res.ok) {
      input.value = "";
      loadMessages();
      loadConversations(); // refresh list
    }
  } catch (err) { console.error(err); }
}
