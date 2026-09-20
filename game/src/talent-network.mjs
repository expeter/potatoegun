import { CONFIG, BRANCHES } from '../../shared/config.mjs';
export const NETWORK = { width: 816, height: 732, center: [408,366], positions: {
  armor:[408,238], braces:[408,84], airbag:[638,149],
  wings:[565,366], sail:[735,366], streamline:[638,582],
  pads:[408,493], springs:[408,648], rocket:[179,582],
  magnet:[251,366], satchel:[81,366], recycler:[179,149],
} };
export const talentParents = key => CONFIG.upgrades[key].parents || (CONFIG.upgrades[key].parent ? [CONFIG.upgrades[key].parent] : []);
export const networkEdges = () => Object.keys(NETWORK.positions).flatMap(key => {
  const parents = talentParents(key);
  return (parents.length ? parents : ['center']).map(parent => ({ from:parent, to:key }));
});
export function rankPosition(key, rank) {
  const [x,y]=NETWORK.positions[key], [cx,cy]=NETWORK.center;
  const length=Math.hypot(x-cx,y-cy), ux=(x-cx)/length, uy=(y-cy)/length;
  // The optional third root rank grows sideways, away from the prerequisite path.
  if(rank===3&&!talentParents(key).length)return [x-uy*72,y+ux*72];
  const offset=(rank-2)*54;
  return [x+ux*offset,y+uy*offset];
}
export function networkConnections(equipped) {
  return `<svg class="sprout-connections" viewBox="0 0 ${NETWORK.width} ${NETWORK.height}" aria-hidden="true">${networkEdges().map(({from,to})=>{
    const [x,y]=from==='center'?NETWORK.center:rankPosition(from,2),[ex,ey]=rankPosition(to,1);
    const ready=from==='center'||equipped[from]>=CONFIG.parentRankRequired;
    const active=ready&&equipped[to]>0;
    const branch=BRANCHES.find(b=>b.keys.includes(to));
    const dx=ex-x,dy=ey-y;
    const path=`M${x} ${y} C${x+dx*.32-dy*.09} ${y+dy*.32+dx*.09} ${x+dx*.68-dy*.09} ${y+dy*.68+dx*.09} ${ex} ${ey}`;
    return `<g data-from="${from}" data-to="${to}" class="sprout-path ${active?'grown':ready?'reachable':'dormant'}" style="--sprout:${branch.color}"><path class="sprout-shadow" d="${path}"/><path class="sprout-stem" d="${path}"/><ellipse cx="${(x+ex)/2+7}" cy="${(y+ey)/2}" rx="12" ry="6" transform="rotate(-35 ${(x+ex)/2+7} ${(y+ey)/2})"/></g>`;
  }).join('')}${Object.keys(NETWORK.positions).map(key=>[1,2].map(rank=>{
    const [x,y]=rankPosition(key,rank),[ex,ey]=rankPosition(key,rank+1),dx=ex-x,dy=ey-y;
    const path=`M${x} ${y} C${x+dx*.35-dy*.12} ${y+dy*.35+dx*.12} ${x+dx*.65-dy*.12} ${y+dy*.65+dx*.12} ${ex} ${ey}`;
    const color=BRANCHES.find(b=>b.keys.includes(key)).color;
    return `<g class="rank-stem ${equipped[key]>rank?'grown':''}" style="--sprout:${color}"><path class="sprout-shadow" d="${path}"/><path class="sprout-stem" d="${path}"/></g>`;
  }).join('')).join('')}</svg>`;
}
export const potatoHeart = `<div class="potato-heart" aria-label="Startknolle: vier Richtungen frei"><svg viewBox="0 0 120 140" aria-hidden="true"><path d="M48 18C9 19 9 54 15 85c-2 33 32 49 62 35 28-12 37-39 26-64C99 27 84 7 48 18Z" fill="#d8a964" stroke="#80573c" stroke-width="4"/><path d="M31 48q9-25 30-19" fill="none" stroke="#f2ce87" stroke-width="8" stroke-linecap="round"/><g fill="#aa774c"><ellipse cx="34" cy="88" rx="3" ry="5"/><ellipse cx="85" cy="43" rx="3" ry="5"/><circle cx="75" cy="106" r="3"/></g><path d="M19 60h85" stroke="#554559" stroke-width="6"/><g fill="#d2eee5" stroke="#554559" stroke-width="4"><circle cx="43" cy="61" r="15"/><circle cx="78" cy="61" r="15"/></g><g fill="#423845"><circle cx="47" cy="62" r="4"/><circle cx="81" cy="62" r="4"/></g><path d="M53 85q12 12 22-2" fill="none" stroke="#80573c" stroke-width="3" stroke-linecap="round"/></svg><b>DEINE KNOLLE</b><span>Hier wächst dein Build</span></div>`;
