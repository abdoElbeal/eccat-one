const fs = require('fs');
let c = fs.readFileSync('Frontend/pages/user/support.html', 'utf8');
c = c.replace('</nav>', `</nav>
        <div class="sidebar-footer">
          <button class="support-btn" id="supportBtn">الدعم الفني</button>
          <a href="../shared/profile.html" class="nav-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>الإعدادات</a>
          <button class="nav-item logout" id="logoutBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>تسجيل الخروج</button>
        </div>`);
fs.writeFileSync('Frontend/pages/user/support.html', c);
