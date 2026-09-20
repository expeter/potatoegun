import { EN } from './messages.mjs';
export const LANGUAGE_KEY = 'minizap.language';
export function detectLanguage(languages = [], saved) {
  if (saved === 'de' || saved === 'en') return saved;
  for (const value of languages) {
    const base = String(value).toLowerCase().split('-')[0];
    if (base === 'de' || base === 'en') return base;
  }
  return 'en';
}
let storage;
try { storage = globalThis.localStorage; } catch {}
let saved;try { saved = storage?.getItem(LANGUAGE_KEY); } catch {}
let language = detectLanguage(globalThis.navigator?.languages, saved);
export const getLanguage = () => language;
export const locale = () => language === 'de' ? 'de-DE' : 'en-GB';
const listeners = new Set();
export const onLanguageChange = callback => { listeners.add(callback); return () => listeners.delete(callback); };
export function setLanguage(value) {
  if (!['de','en'].includes(value)) return;
  try { storage?.setItem(LANGUAGE_KEY, value); } catch {}
  if (value === language) return;
  language = value;
  for (const callback of listeners) callback(value);
}
const inverse = new Map(Object.entries(EN).map(([de,en]) => [en,de]));
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = Object.entries(EN).filter(([key]) => /\{\d+\}/.test(key)).flatMap(([de,en]) => [de,en].map(source => {
  const indices = [...source.matchAll(/\{(\d+)\}/g)].map(match=>Number(match[1]));
  return { de, indices, regex: new RegExp('^'+source.split(/\{\d+\}/).map(escape).join('(.*?)')+'$') };
}));
function format(key, values) {
  if(key==='Online-Prüfung fehlgeschlagen: {0} Dein Flug bleibt lokal gespeichert.')values=[t(values[0])];
  let template = language === 'en' ? EN[key] ?? key : key;
  // These counters have explicit singular forms in both supported languages.
  const one=Number(values[0])===1;
  if(key==='{0} Punkte frei' && one)template=language==='en'?'{0} point available':'{0} Punkt frei';
  if(key==='{0} Talente' && one)template=language==='en'?'{0} talent':'{0} Talent';
  if(key===' · Level {0}! +{1} Talentpunkt')template=language==='en'
    ? ' · Level {0}! +{1} talent '+(Number(values[1])===1?'point':'points')
    : ' · Level {0}! +{1} '+(Number(values[1])===1?'Talentpunkt':'Talentpunkte');
  return template.replace(/\{(\d+)\}/g, (_,index)=>String(values[index] ?? ''));
}
// Tagged templates keep interpolated player names/data out of translation lookup.
export function t(source, ...values) {
  if (Array.isArray(source)) {
    const key = source.map((part,i)=>part+(i<values.length?`{${i}}`:'')).join('');
    return format(key,values);
  }
  const text = String(source ?? '');
  if (Object.hasOwn(EN,text)) return language === 'en' ? EN[text] : text;
  if (inverse.has(text)) {const key=inverse.get(text);return language === 'de' ? key : text;}
  for (const {de,indices,regex} of patterns) {
    const match = text.match(regex);if (!match) continue;
    const args=[];indices.forEach((index,i)=>args[index]=match[i+1]);return format(de,args);
  }
  return text;
}
const protectedText = 'script,style,textarea,input,[data-no-translate],.score-name,#proof-data';
export function localizeDOM(root = document) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node=walker.currentNode;if(node.parentElement?.closest(protectedText))continue;
    const original=node.nodeValue,trimmed=original.trim();if(!trimmed)continue;
    const translated=t(trimmed);if(translated!==trimmed)node.nodeValue=original.replace(trimmed,translated);
  }
  for (const node of root.querySelectorAll('[aria-label],[title],[alt],[placeholder]')) {
    if(node.closest('[data-no-translate]'))continue;
    for(const attr of ['aria-label','title','alt','placeholder'])if(node.hasAttribute(attr))node.setAttribute(attr,t(node.getAttribute(attr)));
  }
}
export function localizeHTML(value) {
  const template=document.createElement('template');template.innerHTML=value;localizeDOM(template.content);return template.innerHTML;
}
export function setupLanguageUI() {
  for(const host of document.querySelectorAll('#compact-tools,dialog,#result, .verify-language')) {
    const nav=document.createElement('nav');nav.className='language-switch';nav.setAttribute('aria-label',t('Sprache'));
    nav.innerHTML='<button type="button" data-language="de" lang="de" aria-label="Deutsch"><svg aria-hidden="true" viewBox="0 0 24 16"><path fill="#ffce00" d="M0 0h24v16H0z"/><path fill="#d00" d="M0 0h24v10.67H0z"/><path fill="#111" d="M0 0h24v5.33H0z"/></svg> DE</button><button type="button" data-language="en" lang="en" aria-label="English"><svg aria-hidden="true" viewBox="0 0 24 16"><path fill="#21468b" d="M0 0h24v16H0z"/><path stroke="#fff" stroke-width="4" d="m0 0 24 16M24 0 0 16"/><path stroke="#c8102e" stroke-width="1.5" d="m0 0 24 16M24 0 0 16"/><path stroke="#fff" stroke-width="6" d="M12 0v16M0 8h24"/><path stroke="#c8102e" stroke-width="3" d="M12 0v16M0 8h24"/></svg> EN</button>';
    nav.addEventListener('click',event=>{const button=event.target.closest('[data-language]');if(button)setLanguage(button.dataset.language);});
    nav.addEventListener('keydown',event=>event.stopPropagation());
    if(host.id==='start-dialog')host.querySelector('.start-links').append(nav);else host.append(nav);
  }
  function refresh() {
    document.documentElement.lang=language;localizeDOM();
    for(const button of document.querySelectorAll('[data-language]'))button.setAttribute('aria-pressed',String(button.dataset.language===language));
  }
  refresh();onLanguageChange(refresh);
}
