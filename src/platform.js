import { Capacitor } from '@capacitor/core';
import './native.css';

export const nativePlatform = Capacitor.isNativePlatform();

export async function exportFile(data, name, type) {
  const filename = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
  const blob = new Blob([data], { type });
  if (nativePlatform) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'), import('@capacitor/share')
    ]);
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const file = await Filesystem.writeFile({
      path: `keyfall-exports/${filename}`, data: base64,
      directory: Directory.Cache, recursive: true
    });
    await Share.share({ title: filename, files: [file.uri], dialogTitle: 'Save or share MIDI' });
    return;
  }
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function installNativeNavigation(navigation, suspend) {
  if (!nativePlatform) return;
  document.body.classList.add('native-app');
  const watch = document.getElementById('watch-folder');
  if (watch) { watch.disabled = true; document.getElementById('folder-status').textContent = 'Use Import songs on this device. Watched folders are available in desktop Chrome/Edge.'; }
  const { App } = await import('@capacitor/app');
  await App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) suspend();
  });
  await App.addListener('backButton', async () => {
    const popup = document.querySelector(':popover-open');
    if (popup) { popup.hidePopover(); return; }
    if (navigation.view() === 'home' && !document.querySelector('dialog[open]')) {
      await App.minimizeApp();
    } else {
      const dialog = [...document.querySelectorAll('dialog[open]')].at(-1);
      if (dialog) {
        if (dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) dialog.close();
      } else await navigation.back();
    }
  });
}
