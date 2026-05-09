const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, '../Frontend/pages/admin');
const userDir = path.join(__dirname, '../Frontend/pages/user');

const adminFinancialLink = `      <a href="financials.html"   class="nav-item"><svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="14" x2="6.01" y2="14"/></svg>الماليات</a>\n`;

const userFinancialLink = `          <a href="financials.html" class="nav-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="14" x2="6.01" y2="14"/></svg>الماليات</a>\n`;

function updateAdminFiles() {
  const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html') && f !== 'admin-login.html');
  for (const file of files) {
    const filePath = path.join(adminDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('href="financials.html"')) {
      // Find the courses link to insert after it
      const coursesLinkRegex = /<a href="courses\.html"[\s\S]*?<\/a>\r?\n/;
      content = content.replace(coursesLinkRegex, match => match + adminFinancialLink);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated admin file: ${file}`);
    }
  }
}

function updateUserFiles() {
  const files = fs.readdirSync(userDir).filter(f => f.endsWith('.html'));
  for (const file of files) {
    const filePath = path.join(userDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('href="financials.html"')) {
      // Find the leaderboard link to insert after it
      const leaderboardLinkRegex = /<a href="leaderboard\.html"[\s\S]*?<\/a>\r?\n/;
      content = content.replace(leaderboardLinkRegex, match => match + userFinancialLink);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated user file: ${file}`);
    }
  }
}

updateAdminFiles();
updateUserFiles();
console.log("Done");
