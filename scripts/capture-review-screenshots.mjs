import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_DIR = path.resolve(process.cwd(), '.impeccable/review');

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 390, height: 844 },
];

const PAGES = [
  { key: 'landing', url: 'http://localhost:4173/?landing=true' },
  { key: 'focus', url: 'http://localhost:4173/?view=timer' },
  { key: 'tasks', url: 'http://localhost:4173/?view=planner' },
  { key: 'calendar', url: 'http://localhost:4173/?view=calendar' },
  { key: 'analytics', url: 'http://localhost:4173/?view=analytics' },
  { key: 'groups', url: 'http://localhost:4173/?view=groups' },
  { key: 'rankings', url: 'http://localhost:4173/?view=rankings' },
  { key: 'profile', url: 'http://localhost:4173/?view=profile' },
  { key: 'inbox', url: 'http://localhost:4173/?view=inbox' },
  { key: 'support', url: 'http://localhost:4173/?view=support' },
  { key: 'admin', url: 'http://localhost:4173/?view=admin' },
];

for (const page of PAGES) {
  for (const vp of VIEWPORTS) {
    const outFile = path.join(OUT_DIR, `final-${page.key}-${vp.name}.png`);
    const cmd = `"${CHROME_PATH}" --headless --no-sandbox --hide-scrollbars --virtual-time-budget=2000 --window-size=${vp.width},${vp.height} --screenshot="${outFile}" "${page.url}"`;
    console.log(`Capturing ${page.key} on ${vp.name}...`);
    try {
      execSync(cmd, { stdio: 'ignore', timeout: 15000 });
      console.log(`Saved: ${outFile}`);
    } catch (e) {
      console.error(`Failed: ${outFile}`, e.message);
    }
  }
}
console.log('Finished capturing all review screenshots!');
