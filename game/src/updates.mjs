import { t, onLanguageChange } from './i18n.mjs';
export function validRelease(value) {
  return !!value && /^\d+\.\d+\.\d+$/.test(value.version) && /^[a-zA-Z0-9._-]{1,64}$/.test(value.build);
}
export function createUpdateChecker({ current, fetchRelease, available, now = Date.now, interval = 300000 }) {
  let last = -Infinity, busy = false, announced = '';
  return async function check() {
    if (busy || now()-last < interval) return;
    last=now();busy=true;
    try {
      const release=await fetchRelease();
      if(validRelease(release) && release.build!==current.build && release.build!==announced) {
        announced=release.build;available(release);
      }
    } catch { /* An offline update check must never interrupt play. */ }
    finally {busy=false;}
  };
}
export function setupUpdates({ canReload, beforeReload, notify }) {
  const current={version:document.querySelector('meta[name="game-version"]').content,build:document.querySelector('meta[name="game-build"]').content};
  let pending;
  const notices=[];
  for(const host of document.querySelectorAll('#start-dialog,#menu-dialog')) {
    const notice=document.createElement('div');notice.className='update-notice';notice.hidden=true;
    const label=document.createElement('span');label.setAttribute('role','status');
    const button=document.createElement('button');button.className='secondary-button';button.type='button';button.dataset.update='';
    button.addEventListener('click',()=>{
      if(!pending || !canReload())return;
      beforeReload();
      const target=new URL(location.href);target.searchParams.set('_v',pending.build);
      location.replace(target.href);
    });
    notice.append(label,button);host.append(notice);notices.push({notice,label,button});
  }
  function render() {
    for(const {notice,label,button} of notices) {
      notice.hidden=!pending;
      label.textContent=t('Neue Version verfügbar.')+(pending?' v'+pending.version:'');
      button.disabled=!canReload();button.textContent=t(canReload()?'Aktualisieren':'Nach dem Flug aktualisieren');
    }
  }
  const check=createUpdateChecker({current,fetchRelease:async()=>{
    const url=new URL('version.json',document.baseURI);url.searchParams.set('_',Date.now());
    const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw Error('Version check failed');return response.json();
  },available:release=>{pending=release;render();notify?.(t('Neue Version verfügbar.'));}});
  onLanguageChange(render);
  // Refresh enabled state when a menu opens or a flight ends; never reload automatically.
  const observer=new MutationObserver(render);
  for(const target of document.querySelectorAll('#start-dialog,#menu-dialog,#result,#play-controls'))observer.observe(target,{attributes:true,attributeFilter:['open','hidden']});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check();});
  window.addEventListener('pageshow',()=>{void check();});
  window.addEventListener('online',()=>{void check();});
  setInterval(()=>{if(!document.hidden)void check();},300000);
  render();void check();
}
