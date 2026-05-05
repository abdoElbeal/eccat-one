// ─── Doctor Messages JS ──────────────────────────────────────────────────────
const auth = PortalUtils.guard("doctor");
if (auth) init();

let activeConvId   = "";
let activeConvName = "";

function init() {
  // Logout handled by PortalUtils
  PortalUtils.setupTopbar(auth.payload);

  document.getElementById("sendBtn").addEventListener("click", sendMessage);
  document.getElementById("msgInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  
  document.getElementById("newMsgBtn").addEventListener("click", () => {
    document.getElementById("newMsgModal").style.display = "flex";
  });
  document.getElementById("closeMsgModal").addEventListener("click", closeModal);
  document.getElementById("cancelMsgModal").addEventListener("click", closeModal);
  document.getElementById("sendNewMsg").addEventListener("click", sendNewMessage);
  
  document.getElementById("toInput").addEventListener("input", debounce(fetchSuggestions, 300));
  document.getElementById("searchInput")?.addEventListener("input", debounce((e) => filterConversations(e.target.value), 300));

  loadConversations();
  
  // Auto refresh messages every 10s if a conversation is open
  setInterval(() => {
    if (activeConvId) loadMessages(activeConvId, true);
  }, 10000);
}

// ─── Load Conversations ──────────────────────────────────────────────────────
async function loadConversations() {
  const list = document.getElementById("convList");
  if (list) list.innerHTML = Array(3).fill('<div style="height:70px;margin:10px;background:#f1f5f9;border-radius:12px;animation:skeletonShimmer 1.5s infinite;"></div>').join('');

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/messages/conversations`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) return;
    const data  = await res.json();
    const convs = data.conversations || [];
    
    if (list) {
      if (!convs.length) {
        list.innerHTML = '<div class="empty-state" style="padding:40px;text-align:center;color:#94a3b8;">لا توجد محادثات بعد</div>';
      } else {
        list.innerHTML = convs.map(c => {
          const initials = c.otherUser?.name.slice(0, 2) || "؟";
          const time = new Date(c.lastMessage.time).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
          const unread = c.unread > 0 ? `<span class="ci-unread-badge">${c.unread}</span>` : "";
          
          return `
            <div class="conv-item ${c.id === activeConvId ? 'active' : ''} ${c.unread > 0 ? 'unread' : ''}" 
                 data-id="${c.id}" data-name="${c.otherUser.name}" onclick="openConv(this)">
              <div class="ci-avatar" style="background:#e0f2fe;color:#0369a1;">${initials}</div>
              <div class="ci-info">
                <div class="ci-top">
                  <strong>${c.otherUser.name}</strong>
                  <span class="ci-time">${time}</span>
                </div>
                <div class="ci-last-msg">${c.lastMessage.isMine ? 'أنت: ' : ''}${c.lastMessage.content}</div>
              </div>
              ${unread}
            </div>`;
        }).join("");
      }
    }
  } catch (err) { console.error(err); }
}

// ─── Open Conversation ───────────────────────────────────────────────────────
function openConv(el) {
  const id = el.dataset.id;
  const name = el.dataset.name;
  
  document.querySelectorAll(".conv-item").forEach(i => i.classList.remove("active"));
  el.classList.add("active");
  el.classList.remove("unread");
  const badge = el.querySelector(".ci-unread-badge");
  if (badge) badge.remove();

  activeConvId = id;
  activeConvName = name;

  document.getElementById("chName").textContent = name;
  document.getElementById("chAvatar").textContent = name.slice(0, 2);
  document.getElementById("ipName").textContent = name;
  document.getElementById("ipAvatar").textContent = name.slice(0, 2);
  
  document.getElementById("chatWelcome").style.display = "none";
  document.getElementById("chatMain").style.display = "flex";

  loadMessages(id);
}

// ─── Load Messages ───────────────────────────────────────────────────────────
async function loadMessages(convId, isSilent = false) {
  const body = document.getElementById("chatBody");
  if (!isSilent) body.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;">جارٍ التحميل...</div>';

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/messages/conversation/${convId}`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    if (!res.ok) return;
    const data = await res.json();
    const messages = data.messages || [];
    
    renderMessages(messages);
  } catch (err) { console.error(err); }
}

function renderMessages(messages) {
  const body = document.getElementById("chatBody");
  const html = messages.map(m => {
    const time = new Date(m.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    return m.isMine ? `
      <div class="bubble-row sent">
        <div class="bubble sent-b"><p>${escHtml(m.content)}</p><span class="b-time">${time}</span></div>
      </div>` : `
      <div class="bubble-row received">
        <div class="b-avatar">${m.senderName.slice(0, 2)}</div>
        <div class="bubble recv"><p>${escHtml(m.content)}</p><span class="b-time">${time}</span></div>
      </div>`;
  }).join("");
  
  const oldScroll = body.scrollHeight;
  body.innerHTML = `<div class="date-sep"><span>الرسائل</span></div>` + html;
  
  // Scroll to bottom if we were already near bottom or it's the first load
  if (body.scrollHeight > oldScroll) scrollToBottom();
}

// ─── Send Message ────────────────────────────────────────────────────────────
async function sendMessage() {
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  if (!text || !activeConvId) return;

  input.value = "";
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/messages`, {
      method: "POST",
      headers: PortalUtils.getAuthHeaders(),
      body: JSON.stringify({ conversationId: activeConvId, content: text }),
    });
    if (res.ok) {
      loadMessages(activeConvId, true);
      loadConversations(); // Update last message in list
    }
  } catch (err) { console.error(err); }
}

// ─── New Message Modal ───────────────────────────────────────────────────────
async function fetchSuggestions() {
  const q = document.getElementById("toInput").value.trim();
  const list = document.getElementById("suggestionsList");
  if (q.length < 2) { list.style.display = "none"; return; }

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/messages/search?q=${encodeURIComponent(q)}`, {
      headers: PortalUtils.getAuthHeaders(),
    });
    const data = await res.json();
    const users = data.users || [];
    
    if (!users.length) { list.style.display = "none"; return; }
    
    list.innerHTML = users.map(u => `
      <div class="suggestion-item" data-id="${u._id}" data-name="${u.name}">
        <div class="avatar" style="width:32px;height:32px;font-size:1.1rem;">${u.name.slice(0, 2)}</div>
        <div>
          <div style="font-weight:600;">${u.name}</div>
          <div class="text-muted" style="font-size:1rem;">${u.role === 'student' ? 'طالب' : 'زميل'}</div>
        </div>
      </div>`).join("");
    
    list.style.display = "block";
    list.querySelectorAll(".suggestion-item").forEach(item => {
      item.addEventListener("click", () => {
        document.getElementById("toInput").value = item.dataset.name;
        document.getElementById("toInput").dataset.selectedId = item.dataset.id;
        list.style.display = "none";
      });
    });
  } catch (err) { console.error(err); }
}

async function sendNewMessage() {
  const toId = document.getElementById("toInput").dataset.selectedId;
  const text = document.getElementById("newMsgText").value.trim();
  if (!toId || !text) return;

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/messages`, {
      method: "POST",
      headers: PortalUtils.getAuthHeaders(),
      body: JSON.stringify({ to: toId, content: text }),
    });
    if (res.ok) {
      closeModal();
      loadConversations();
    }
  } catch (err) { console.error(err); }
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function closeModal() {
  document.getElementById("newMsgModal").style.display = "none";
  document.getElementById("toInput").value = "";
  document.getElementById("newMsgText").value = "";
}
function scrollToBottom() { const b = document.getElementById("chatBody"); if (b) b.scrollTop = b.scrollHeight; }
function escHtml(str) { return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function debounce(fn, d) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), d); }; }
