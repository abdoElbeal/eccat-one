import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userPagesDir = path.join(__dirname, "../../Frontend/pages/user");

const sidebarLink = `<a href="announcements.html" class="nav-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>الإعلانات</a>`;

async function patch() {
  const files = await fs.readdir(userPagesDir);
  for (const file of files) {
    if (!file.endsWith(".html")) continue;
    
    // announcements.html already has it
    if (file === "announcements.html") continue;

    const fp = path.join(userPagesDir, file);
    let content = await fs.readFile(fp, "utf-8");

    // Don't inject if it already exists
    if (content.includes("announcements.html")) continue;

    // Inject before <a href="leaderboard.html"
    const targetPoint = `<a href="leaderboard.html"`;
    if (content.includes(targetPoint)) {
      content = content.replace(targetPoint, sidebarLink + "\n          " + targetPoint);
      await fs.writeFile(fp, content);
      console.log(`Patched ${file}`);
    } else {
       // if no leaderboard, maybe just inject before messages
       const target2 = `<a href="messages.html"`;
       if (content.includes(target2)) {
         content = content.replace(target2, sidebarLink + "\n          " + target2);
         await fs.writeFile(fp, content);
         console.log(`Patched ${file} (fallback 1)`);
       }
    }
  }
}

patch().catch(console.error);
