import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import http from 'http';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_DIR = path.resolve(process.cwd(), '.impeccable/theme-review');

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'tablet', width: 820, height: 1180, mobile: true },
  { name: 'mobile', width: 390, height: 844, mobile: true },
];

const THEME_CASES = [
  // 5 Themes on Focus Room
  { name: 'focus-violet-night', url: 'http://localhost:4173/?view=timer&theme=violet-night' },
  { name: 'focus-ocean-teal', url: 'http://localhost:4173/?view=timer&theme=ocean-teal' },
  { name: 'focus-midnight-blue', url: 'http://localhost:4173/?view=timer&theme=midnight-blue' },
  { name: 'focus-rose-dusk', url: 'http://localhost:4173/?view=timer&theme=rose-dusk' },
  { name: 'focus-forest-mist', url: 'http://localhost:4173/?view=timer&theme=forest-mist' },

  // ScenePickerModal open
  { name: 'scene-picker-modal', url: 'http://localhost:4173/?view=timer&theme=violet-night&scene_picker=true' },

  // Representative Data Pages on different themes showing stable dark charcoal surfaces
  { name: 'tasks-ocean-teal', url: 'http://localhost:4173/?view=planner&theme=ocean-teal' },
  { name: 'calendar-midnight-blue', url: 'http://localhost:4173/?view=calendar&theme=midnight-blue' },
  { name: 'rankings-rose-dusk', url: 'http://localhost:4173/?view=rankings&theme=rose-dusk' },
  { name: 'analytics-forest-mist', url: 'http://localhost:4173/?view=analytics&theme=forest-mist' },
  { name: 'landing-violet-night', url: 'http://localhost:4173/?landing=true&theme=violet-night' },
];

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function captureWithCdp(url, vp, outFile) {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--no-sandbox',
    '--remote-debugging-port=9222',
    url,
  ]);

  try {
    await new Promise(r => setTimeout(r, 2000));
    const list = await getJson('http://localhost:9222/json');
    const target = list.find(p => p.url.includes('4173') && p.webSocketDebuggerUrl);
    if (!target) {
      throw new Error('Target page not found in Chrome debugging endpoints');
    }

    const ws = new WebSocket(target.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      let msgId = 1;
      const send = (method, params = {}) => {
        const id = msgId++;
        ws.send(JSON.stringify({ id, method, params }));
        return id;
      };

      ws.onopen = () => {
        send('Emulation.setDeviceMetricsOverride', {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: 1,
          mobile: vp.mobile,
        });
        setTimeout(() => {
          send('Page.captureScreenshot', { format: 'png' });
        }, 1200);
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.result?.data) {
          writeFileSync(outFile, Buffer.from(msg.result.data, 'base64'));
          ws.close();
          resolve();
        }
      };

      ws.onerror = reject;
      setTimeout(() => reject(new Error('Capture timeout')), 10000);
    });
  } finally {
    chrome.kill();
    await new Promise(r => setTimeout(r, 400));
  }
}

async function run() {
  console.log('Starting preview server...');
  const server = spawn('pnpm', ['preview', '--port', '4173'], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1800));

  try {
    for (const testCase of THEME_CASES) {
      for (const vp of VIEWPORTS) {
        const outFile = path.join(OUT_DIR, `${testCase.name}-${vp.name}.png`);
        console.log(`Capturing ${testCase.name} (${vp.name})...`);
        try {
          await captureWithCdp(testCase.url, vp, outFile);
          console.log(`  Saved: ${outFile}`);
        } catch (e) {
          console.error(`  Error capturing ${outFile}:`, e.message);
        }
      }
    }
  } finally {
    server.kill();
    console.log('Done! All screenshots captured.');
    process.exit(0);
  }
}

run();
