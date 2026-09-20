import { t, locale } from './i18n.mjs';
import { Renderer } from './renderer.mjs';
import { cardPayload, makeProof, embedProof } from '../../shared/share-proof.mjs';

// Lay out the export for the actual available screen area, not a fixed thumbnail.
export async function createShareCard({ screenshot, flight, best, level, appearance = {}, theme = 'junk', aspect = 1200 / 756 }) {
  await document.fonts.ready;
  const width=1200,height=Math.round(width/Math.max(.75,Math.min(3.5,aspect))),protectedHeight=height-60;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const c=canvas.getContext('2d'),fmt=new Intl.NumberFormat(locale(),{maximumFractionDigits:1});
  const wide=aspect>1.6,portrait=aspect<.95,gold='#efd49a',muted='#e2d2e7',ink='#fff3dc';
  const background=c.createLinearGradient(0,0,width,height);background.addColorStop(0,'#30243f');background.addColorStop(1,'#161e30');
  c.fillStyle=background;c.fillRect(0,0,width,height);
  c.save();c.globalAlpha=.018;const scale=Math.max(width/screenshot.width,height/screenshot.height);c.drawImage(screenshot,0,0,screenshot.width*scale,screenshot.height*scale);c.restore();
  c.strokeStyle='#ead6b25c';c.lineWidth=3;c.beginPath();c.roundRect(12,12,width-24,height-24,24);c.stroke();
  function text(value,x,y,size,color=ink,font='Bangers',maxWidth){c.fillStyle=color;c.font=`${size}px ${font}`;if(maxWidth===undefined)c.fillText(value,x,y);else c.fillText(value,x,y,maxWidth);}
  const scene=theme==='classic'?t('ACKER'):appearance.scene==='candy'?t('ZUCKERSCHROTTLAND'):'GOBLIN-GARAGE';
  const stats=[[t('REKORD'),`${fmt.format(best)} m`],[t('HÖHE'),`${fmt.format(Math.floor(flight.maxHeight))} m`],[t('GEPFLANZT'),`${flight.planted||0}`],[t('SCHROTT'),`${flight.pickupMaterial}`]];
  const distance=`${fmt.format(Math.floor(flight.distance*10)/10)} m`;
  const outcome=flight.health>0?t('NOCH AM STÜCK!'):flight.reason==='laser'?t('VOM LASER GERÖSTET'):t('PÜREE MIT AUSSICHT');
  let px,py,portraitScale;
  if(wide){
    // Full-width score strip: no narrow side column or empty middle.
    text(t('KARTOFFELKANONE'),34,46,38,gold);
    text(distance,30,protectedHeight*.47,Math.min(152,protectedHeight*.41),ink,'Bangers',860);
    text(outcome,34,protectedHeight*.61,34,gold,'Bangers',850);
    px=1035;py=protectedHeight*.28;portraitScale=3.3;
    text(`LV. ${level}`,980,protectedHeight*.61,32,gold);
    stats.forEach(([label,value],i)=>{
      const x=24+i*290,y=protectedHeight-123;
      c.fillStyle='#ffffff0b';c.beginPath();c.roundRect(x,y,280,113,14);c.fill();
      text(label,x+14,y+39,44,muted,'"Comic Neue"');
      text(value,x+14,y+100,68,ink,'Bangers',254);
    });
  }else if(portrait){
    text(t('KARTOFFELKANONE'),50,95,66,gold);
    text(distance,46,285,185,ink,'Bangers',1100);
    text(outcome,50,355,48,gold,'Bangers',1090);
    px=850;py=470;portraitScale=4.2;
    text(`LEVEL ${level}`,55,485,56,gold);
    const top=Math.max(650,protectedHeight*.49),row=(protectedHeight-top-30)/2;
    stats.forEach(([label,value],i)=>{
      const x=55+(i%2)*575,y=top+Math.floor(i/2)*row;
      text(label,x,y,88,muted,'"Comic Neue"');text(value,x,y+125,120,ink,'Bangers',525);
    });
  }else{
    text(t('KARTOFFELKANONE'),44,88,54,gold);
    text(distance,40,protectedHeight*.40,160,ink,'Bangers',770);
    text(outcome,44,protectedHeight*.49,38,gold,'Bangers',740);
    px=990;py=protectedHeight*.46;portraitScale=3.4;
    text(`LEVEL ${level}`,890,protectedHeight*.82,38,gold);
    const top=protectedHeight*.64,row=protectedHeight*.22;
    stats.forEach(([label,value],i)=>{const x=44+(i%2)*395,y=top+Math.floor(i/2)*row;text(label,x,y,54,muted,'"Comic Neue"');text(value,x,y+80,78,ink,'Bangers',370);});
  }
  const pilot=Object.create(Renderer.prototype);Object.assign(pilot,{ctx:c,scale:5,appearance,reducedMotion:true,lookX:1,lookY:0});
  pilot.potato(px,py,-.12,flight.equipment,1,1,0,portraitScale);
  const proof=makeProof(cardPayload({flight,best,level,appearance,theme}),c.getImageData(0,0,width,protectedHeight).data,{width,height,protectedHeight});
  text('KK1 '+proof.values.slice(0,24).toUpperCase().match(/.{4}/g).join(' '),34,height-22,22,gold,'monospace');
  c.textAlign='right';text(scene,width-34,height-22,22,muted,'"Comic Neue"');
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG export failed')),'image/png'));
  return embedProof(blob,proof);
}
