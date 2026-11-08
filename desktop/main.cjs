const { app, BrowserWindow, protocol, net, session, dialog, Menu } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const os = require('node:os');
const smoke = process.env.KEYFALL_SMOKE === '1';
if (smoke) app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'keyfall-smoke-')));
protocol.registerSchemesAsPrivileged([{ scheme: 'keyfall', privileges: {
  standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true
} }]);
const local = url => { try { return new URL(url).origin === 'null' && new URL(url).protocol === 'keyfall:' && new URL(url).host === 'app'; } catch { return false; } };
let mainWindow;
async function openWindow() {
  mainWindow = new BrowserWindow({ width: 1440, height: 960, minWidth: 390, minHeight: 520,
    title: 'Keyfall', backgroundColor: '#26323b', show: !smoke,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => { if (!local(url)) event.preventDefault(); });
  await mainWindow.loadURL('keyfall://app/index.html');
  if (smoke) {
    try {
      const result = await mainWindow.webContents.executeJavaScript(`(async()=>{
        const until=async f=>{for(let i=0;i<100;i++){if(f())return;await new Promise(r=>setTimeout(r,100));}throw Error('UI timeout');};
        await until(()=>document.querySelector('#home-free'));
        const piano=await fetch('/piano.json').then(r=>r.json());
        document.querySelector('#home-free').click();await until(()=>document.querySelector('#app').dataset.view==='free');
        const ctx=new AudioContext();await ctx.resume();
        if(ctx.state!=='running')throw Error('Audio context did not start');await ctx.close();
        localStorage.setItem('smoke','ok');
        return {secure:isSecureContext,keys:document.querySelectorAll('.key').length,samples:Object.keys(piano).length,storage:localStorage.getItem('smoke'),view:document.querySelector('#app').dataset.view};
      })()`, true);
      if (!result.secure || result.keys !== 88 || result.samples < 88 || result.storage !== 'ok') throw Error(JSON.stringify(result));
      console.log('KEYFALL_SMOKE_OK', JSON.stringify(result)); app.exit(0);
    } catch (error) { console.error(error); app.exit(1); }
  }
}
app.whenReady().then(async () => {
  const root = path.resolve(__dirname, '../dist');
  protocol.handle('keyfall', request => {
    const url = new URL(request.url);
    if (url.host !== 'app' || !['GET', 'HEAD'].includes(request.method)) return new Response('Forbidden', { status: 403 });
    let file;
    try { file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)); }
    catch { return new Response('Bad path', { status: 400 }); }
    const relative = path.relative(root, file);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  session.defaultSession.setPermissionCheckHandler((contents, permission, origin) => local(origin) && permission === 'midi');
  session.defaultSession.setPermissionRequestHandler(async (contents, permission, callback) => {
    if (!local(contents.getURL()) || !['midi', 'midiSysex'].includes(permission)) return callback(false);
    if (permission === 'midiSysex') return callback(false);
    const choice = await dialog.showMessageBox(mainWindow, { type: 'question', buttons: ['Allow', 'Cancel'], defaultId: 1, cancelId: 1,
      title: 'Connect a MIDI piano', message: 'Allow Keyfall to use your connected MIDI instruments?' });
    callback(choice.response === 0);
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { role: 'editMenu' }, { label: 'View', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }] }
  ]));
  await openWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) openWindow(); });
}).catch(error => { console.error(error); app.exit(1); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
if (smoke) setTimeout(() => { console.error('Smoke test timed out'); app.exit(1); }, 30000).unref();
