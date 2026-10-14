import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_DIR = path.resolve(process.cwd(), '.impeccable/restoration-review');

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'ipad', width: 820, height: 1180 },
];

const PAGES = [
  { key: 'landing', url: 'http://localhost:4173/?landing=true' },
  { key: 'focus-room', url: 'http://localhost:4173/?view=timer' },
  { key: 'tasks', url: 'http://localhost:4173/?view=planner' },
  { key: 'calendar', url: 'http://localhost:4173/?view=calendar' },
  { key: 'rankings', url: 'http://localhost:4173/?view=rankings' },
  { key: 'settings-wallpapers', url: 'http://localhost:4173/?view=timer&settings=true' },
  { key: 'scene-picker', url: 'http://localhost:4173/?view=timer&scene_picker=true' },
];

for (const page of PAGES) {
  for (const vp of VIEWPORTS) {
    const outFile = path.join(OUT_DIR, `restored-${page.key}-${vp.name}.png`);
    const cmd = `"${CHROME_PATH}" --headless --no-sandbox --hide-scrollbars --virtual-time-budget=2500 --window-size=${vp.width},${vp.height} --screenshot="${outFile}" "${page.url}"`;
    console.log(`Capturing ${page.key} on ${vp.name}...`);
    try {
      execSync(cmd, { stdio: 'ignore', timeout: 20000 });
      console.log(`Saved: ${outFile}`);
    } catch (e) {
      console.error(`Failed: ${outFile}`, e.message);
    }
  }
}
console.log('Restoration review screenshots captured successfully!');
