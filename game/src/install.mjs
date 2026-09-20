let pending;
let installed = matchMedia('(display-mode:standalone)').matches || matchMedia('(display-mode:fullscreen)').matches || navigator.standalone === true;
const buttons = () => document.querySelectorAll('[data-install]');
function update() { for (const button of document.querySelectorAll('[data-install], [data-install-note]')) button.hidden = installed; }
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); pending = event; update(); });
window.addEventListener('appinstalled', () => { installed = true; pending = null; update(); document.getElementById('install-nudge').hidden = true; });
export function setupInstall(openDialog) {
  const guide = document.getElementById('install-guide');
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  guide.textContent = ios ? 'In Safari öffnen → Teilen (Quadrat mit Pfeil nach oben) → Zum Home-Bildschirm → „Als Web-App öffnen“ aktivieren → Hinzufügen.' : 'Öffne das Menü deines Browsers und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“. Falls dieser Eintrag fehlt, öffne das Spiel in einem unterstützten Browser wie Chrome oder Edge.';
  for (const button of buttons()) button.addEventListener('click', async () => {
    if (pending) {
      const prompt = pending; pending = null;
      try { await prompt.prompt(); await prompt.userChoice; } catch { openDialog('install-dialog'); }
    } else openDialog('install-dialog');
  });
  document.getElementById('dismiss-install').addEventListener('click', () => { document.getElementById('install-nudge').hidden = true; });
  update();
}
let suggested = false;
export function suggestInstall() {
  if (installed || suggested) return;
  suggested = true;
  try { if (localStorage.getItem('minizap.install-suggested')) return; localStorage.setItem('minizap.install-suggested', '1'); } catch {}
  document.getElementById('install-nudge').hidden = false;
}
