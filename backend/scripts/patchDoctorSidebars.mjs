import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const doctorPagesDir = path.join(__dirname, "../../Frontend/pages/doctor");

const sidebarLink = `<a href="announcements.html" class="nav-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>الإعلانات</a>`;

async function patch() {
  const files = await fs.readdir(doctorPagesDir);
  for (const file of files) {
    if (!file.endsWith(".html")) continue;
    if (file === "announcements.html") continue;

    const fp = path.join(doctorPagesDir, file);
    let content = await fs.readFile(fp, "utf-8");

    if (content.includes("announcements.html")) continue;

    const targetPoint = `<a href="messages.html"`;
    if (content.includes(targetPoint)) {
      content = content.replace(targetPoint, sidebarLink + "\n          " + targetPoint);
      await fs.writeFile(fp, content);
      console.log(`Patched ${file}`);
    }
  }
}

patch().catch(console.error);
