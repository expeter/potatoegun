import { t, locale } from './i18n.mjs';
import { Renderer } from './renderer.mjs';
import { cardRanks, cardPayload, makeProof, embedProof } from '../../shared/share-proof.mjs';

// Lay out the export for the actual available screen area, not a fixed thumbnail.
export async function createShareCard({ screenshot, flight, best, level, appearance = {}, theme = 'junk', ranks, aspect = 1200 / 756 }) {
  await document.fonts.ready;
  const width=1200,height=Math.round(width/Math.max(.75,Math.min(3.5,aspect))),protectedHeight=height-60;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const c=canvas.getContext('2d'),fmt=new Intl.NumberFormat(locale(),{maximumFractionDigits:1});
  const wide=aspect>1.6,portrait=aspect<.95,gold='#efd49a',muted='#e2d2e7',ink='#fff3dc';
  const background=c.createLinearGradient(0,0,width,height);background.addColorStop(0,'#30243f');background.addColorStop(1,'#161e30');
  c.fillStyle=background;c.fillRect(0,0,width,height);
  c.save();c.globalAlpha=.018;const scale=Math.max(width/screenshot.width,height/screenshot.height);c.drawImage(screenshot,0,0,screenshot.width*scale,screenshot.height*scale);c.restore();
  c.strokeStyle='#ead6b25c';c.lineWidth=3;c.beginPath();c.roundRect(12,12,width-24,height-24,24);c.stroke();
  function text(value,x,y,size,color=ink,font='Bangers',maxWidth){c.fillStyle=color;c.font=font.startsWith('700 ')?`700 ${size}px ${font.slice(4)}`:`${size}px ${font}`;if(maxWidth===undefined)c.fillText(value,x,y);else c.fillText(value,x,y,maxWidth);}
  function brand(x,y,size){
    const first=t('KARTOFFEL')+(locale().startsWith('en')?' ':''),second=t('KANONE');
    text(first,x,y,size,ink);const offset=c.measureText(first).width;
    text(second,x+offset,y,size,'#be654c');
  }
  const ranking=cardRanks(ranks);
  function trophy(x,y,size,rank){
    c.save();c.translate(x,y-size*.78);c.scale(size/32,size/32);
    c.fillStyle=c.strokeStyle=['','#f2cb65','#d0dce8','#d79564'][rank];c.lineWidth=2;c.lineJoin='round';c.lineCap='round';
    c.beginPath();c.moveTo(9,4);c.lineTo(23,4);c.lineTo(23,13);c.arc(16,13,7,0,Math.PI);c.closePath();c.fill();
    c.beginPath();c.moveTo(9,7);c.lineTo(4,7);c.lineTo(4,12);c.quadraticCurveTo(4,18,11,18);c.moveTo(23,7);c.lineTo(28,7);c.lineTo(28,12);c.quadraticCurveTo(28,18,21,18);c.moveTo(16,20);c.lineTo(16,27);c.moveTo(10,28);c.lineTo(22,28);c.stroke();c.restore();
  }
  function rankLine(x,y,maxWidth,size){
    const global=ranking.global,detail={provisional:'Vorläufig',comparison:'Vergleich',loading:'Rang offen',offline:'Rang nicht verfügbar',unranked:'Ohne Wertung',unavailable:'Rang nicht verfügbar'}[global.status];
    const parts=[{label:t('Lokal'),rank:ranking.local.rank,value:ranking.local.rank?'#'+fmt.format(ranking.local.rank):ranking.local.outside?'>5':'—'},
      {label:t('Weltweit'),rank:global.rank,value:global.rank?'#'+fmt.format(global.rank):'—'}];
    const measure=font=>{
      c.font=`${font}px "Comic Neue"`;
      return parts.reduce((sum,p)=>sum+c.measureText(p.label+' ').width+(p.rank<=3&&p.rank?font*.85:0)+(()=>{c.font=`700 ${font}px "Comic Neue"`;const w=c.measureText(p.value).width;c.font=`${font}px "Comic Neue"`;return w})(),0)+(detail?c.measureText(' · '+t(detail)).width*.76:0)+font*1.5;
    };
    while(size>18&&measure(size)>maxWidth-28)size--;
    const lineWidth=Math.min(maxWidth,measure(size)+28),height=size+18,baseline=y+size+5;
    c.fillStyle='#ffffff08';c.strokeStyle='#ead6b22b';c.lineWidth=1;c.beginPath();c.roundRect(x,y,lineWidth,height,10);c.fill();c.stroke();
    let at=x+14;
    parts.forEach((p,i)=>{
      if(i){text('·',at,baseline,size,muted,'"Comic Neue"');at+=size*.75;}
      text(p.label+' ',at,baseline,size,muted,'"Comic Neue"');at+=c.measureText(p.label+' ').width;
      if(p.rank&&p.rank<=3){trophy(at,baseline,size*.7,p.rank);at+=size*.85;}
      text(p.value,at,baseline,size,ink,'700 "Comic Neue"');at+=c.measureText(p.value).width;
      if(!i)at+=size*.75;
    });
    if(detail)text(' · '+t(detail),at,baseline,size*.76,muted,'"Comic Neue"');
    return y+height;
  }
  const scene=theme==='classic'?t('ACKER'):appearance.scene==='candy'?t('ZUCKERSCHROTTLAND'):'GOBLIN-GARAGE';
  const stats=[[t('REKORD'),`${fmt.format(best)} m`],[t('HÖHE'),`${fmt.format(Math.floor(flight.maxHeight))} m`],[t('GEPFLANZT'),`${flight.planted||0}`],[t('SCHROTT'),`${flight.pickupMaterial}`]];
  const distance=`${fmt.format(Math.floor(flight.distance*10)/10)} m`;
  const outcome=flight.health>0?t('NOCH AM STÜCK!'):flight.reason==='laser'?t('VOM LASER GERÖSTET'):t('PÜREE MIT AUSSICHT');
  let px,py,portraitScale;
  if(wide){
    // Full-width score strip: no narrow side column or empty middle.
    brand(34,42,34);
    text(outcome,380,42,24,gold,'Bangers',490);
    const rankSize=Math.max(26,Math.min(34,protectedHeight*.075)),statsTop=protectedHeight-(protectedHeight<340?84:113)-10;
    const heroY=Math.min(protectedHeight*.49,statsTop-rankSize-38);
    text(distance,30,heroY,Math.min(136,protectedHeight*.29),ink,'Bangers',860);
    rankLine(34,heroY+12,860,rankSize);
    px=1035;py=protectedHeight*.28;portraitScale=3.3;
    text(`LV. ${level}`,980,Math.max(160,protectedHeight*.61),28,gold);
    stats.forEach(([label,value],i)=>{
      const compact=protectedHeight<340,boxHeight=compact?84:113;
      const x=24+i*290,y=protectedHeight-boxHeight-10;
      c.fillStyle='#ffffff0b';c.beginPath();c.roundRect(x,y,280,boxHeight,14);c.fill();
      text(label,x+14,y+(compact?28:39),compact?30:44,muted,'"Comic Neue"');
      text(value,x+14,y+(compact?73:100),compact?48:68,ink,'Bangers',254);
    });
  }else if(portrait){
    brand(50,95,66);
    text(distance,46,285,185,ink,'Bangers',1100);
    const rankBottom=rankLine(50,318,1090,38);
    text(outcome,50,rankBottom+56,48,gold,'Bangers',1090);
    px=850;py=470;portraitScale=4.2;
    text(`LEVEL ${level}`,55,485,56,gold);
    const top=Math.max(650,protectedHeight*.49),row=(protectedHeight-top-30)/2;
    stats.forEach(([label,value],i)=>{
      const x=55+(i%2)*575,y=top+Math.floor(i/2)*row;
      text(label,x,y,88,muted,'"Comic Neue"');text(value,x,y+125,120,ink,'Bangers',525);
    });
  }else{
    brand(44,88,54);
    text(distance,40,protectedHeight*.40,160,ink,'Bangers',770);
    const rankBottom=rankLine(44,protectedHeight*.40+18,770,32);
    text(outcome,44,rankBottom+46,38,gold,'Bangers',740);
    px=990;py=protectedHeight*.46;portraitScale=3.4;
    text(`LEVEL ${level}`,890,protectedHeight*.82,38,gold);
    const top=protectedHeight*.64,row=protectedHeight*.22;
    stats.forEach(([label,value],i)=>{const x=44+(i%2)*395,y=top+Math.floor(i/2)*row;text(label,x,y,54,muted,'"Comic Neue"');text(value,x,y+80,78,ink,'Bangers',370);});
  }
  const pilot=Object.create(Renderer.prototype);Object.assign(pilot,{ctx:c,scale:5,appearance,reducedMotion:true,lookX:1,lookY:0});
  pilot.potato(px,py,-.12,flight.equipment,1,1,0,portraitScale);
  const proof=makeProof(cardPayload({flight,best,level,appearance,theme,ranks:ranking}),c.getImageData(0,0,width,protectedHeight).data,{width,height,protectedHeight});
  text('KK1 '+proof.values.slice(0,24).toUpperCase().match(/.{4}/g).join(' '),34,height-22,22,gold,'monospace');
  c.textAlign='right';text(scene,width-34,height-22,22,muted,'"Comic Neue"');
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG export failed')),'image/png'));
  return embedProof(blob,proof);
}
