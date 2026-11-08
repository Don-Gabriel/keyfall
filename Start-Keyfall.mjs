import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const url = 'http://127.0.0.1:5188';
async function isReady() {
  try { const response = await fetch(`${url}/__keyfall`, { signal: AbortSignal.timeout(1500) });
    const marker=await response.text();
    if(marker.startsWith('keyfall-local-')&&marker!=='keyfall-local-0.5.0')throw new Error('An older Keyfall server is still running. Restart Windows, then open Keyfall again.');
    if (marker !== 'keyfall-local-0.5.0') throw new Error('Port 5188 is in use by another application.');
    return true;
  } catch (error) { if (error.message.includes('another application')||error.message.includes('older Keyfall')) throw error; return false; }
}
async function launch() {
  if (!existsSync(join(root, 'dist', 'index.html'))) throw new Error('Build the application first with npm install and npm run build.');
  if (!await isReady()) {
    const server = spawn(process.execPath, [join(root, 'server.mjs')], { cwd: root, detached: true, stdio: 'ignore', windowsHide: true });
    server.unref();
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) { await new Promise(resolve => setTimeout(resolve, 200)); if (await isReady()) { ready = true; break; } }
    if (!ready) throw new Error('The Keyfall server could not start. Port 5188 may be in use.');
  }
  const browsers = [
    join(process.env.ProgramFiles || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'),
    join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'Microsoft/Edge/Application/msedge.exe'),
    join(process.env.ProgramFiles || 'C:/Program Files', 'Microsoft/Edge/Application/msedge.exe'),
  ];
  const browser = browsers.find(existsSync);
  if (!browser) throw new Error(`Install Chrome or Edge, or open ${url} in your browser.`);
  const app = spawn(browser, [`--app=${url}`, '--window-size=1450,950'], { detached: true, stdio: 'ignore' });
  app.on('error', error => console.error(error.message));
  app.unref();
  console.log(`Keyfall opened at ${url}`);
}
launch().catch(error => { console.error(error.message); process.exitCode = 1; });

