import { UPGRADE_KEYS } from './config.mjs';
const encoder=new TextEncoder();
// SHA-256 fallback also works on a plain HTTP LAN address without crypto.subtle.
export function sha256(data){
  const bytes=typeof data==='string'?encoder.encode(data):new Uint8Array(data);
  const size=Math.ceil((bytes.length+9)/64)*64,buffer=new Uint8Array(size);buffer.set(bytes);buffer[bytes.length]=128;
  const view=new DataView(buffer.buffer);view.setUint32(size-8,Math.floor(bytes.length/536870912));view.setUint32(size-4,(bytes.length*8)>>>0);
  const k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],w=new Uint32Array(64),r=(x,n)=>(x>>>n)|(x<<(32-n));
  for(let block=0;block<size;block+=64){
    for(let i=0;i<16;i++)w[i]=view.getUint32(block+i*4);
    for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=(r(a,7)^r(a,18)^(a>>>3))+w[i-16]+(r(b,17)^r(b,19)^(b>>>10))+w[i-7];}
    let [a,b,c,d,e,f,g,j]=h;
    for(let i=0;i<64;i++){const t1=(j+(r(e,6)^r(e,11)^r(e,25))+((e&f)^(~e&g))+k[i]+w[i])|0,t2=((r(a,2)^r(a,13)^r(a,22))+((a&b)^(a&c)^(b&c)))|0;j=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;}
    [a,b,c,d,e,f,g,j].forEach((v,i)=>h[i]=(h[i]+v)|0);
  }
  return h.map(v=>(v>>>0).toString(16).padStart(8,'0')).join('');
}
export function cardPayload({flight,best,level,appearance={},theme='junk'}){
  return {v:1,d:Math.floor(flight.distance*10)/10,b:Math.floor(best*10)/10,h:Math.floor(flight.maxHeight),p:flight.planted||0,lv:level,s:flight.pickupMaterial,end:flight.reason,theme,
    looks:Object.fromEntries(Object.entries(appearance).sort(([a],[b])=>a.localeCompare(b))),talents:UPGRADE_KEYS.map(k=>flight.equipment[k]||0)};
}
export function makeProof(payload,pixels,{width=1200,height=756,protectedHeight=676}={}){const data=JSON.stringify(payload);return {format:'KK1',data,values:sha256(data),pixels:sha256(pixels),width,height,protectedHeight};}
export function verifyProof(proof,pixels){
  if(!proof||proof.format!=='KK1'||typeof proof.data!=='string'||proof.data.length>4096)throw Error('Kein unterstützter KK1-Prüfcode.');
  return {values:sha256(proof.data)===proof.values,pixels:pixels?sha256(pixels)===proof.pixels:null,payload:JSON.parse(proof.data)};
}
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export async function embedProof(blob,proof){
  const png=new Uint8Array(await blob.arrayBuffer()),data=encoder.encode('KartoffelkanoneProof\0'+JSON.stringify(proof));
  const chunk=new Uint8Array(data.length+12),view=new DataView(chunk.buffer);view.setUint32(0,data.length);chunk.set(encoder.encode('tEXt'),4);chunk.set(data,8);view.setUint32(chunk.length-4,crc32(chunk.subarray(4,chunk.length-4)));
  return new Blob([png.subarray(0,png.length-12),chunk,png.subarray(png.length-12)],{type:'image/png'});
}
export function extractProof(bytes){
  const png=new Uint8Array(bytes),view=new DataView(png.buffer,png.byteOffset,png.byteLength),decoder=new TextDecoder();
  if(png.length<8||decoder.decode(png.subarray(1,4))!=='PNG')throw Error('Bitte die originale PNG-Flugkarte wählen.');
  for(let at=8;at+12<=png.length;){
    const length=view.getUint32(at);if(at+12+length>png.length)break;
    if(decoder.decode(png.subarray(at+4,at+8))==='tEXt'){
      const content=decoder.decode(png.subarray(at+8,at+8+length)),prefix='KartoffelkanoneProof\0';
      if(content.startsWith(prefix)){if(length>8192)throw Error('Prüfdaten zu groß.');if(crc32(png.subarray(at+4,at+8+length))!==view.getUint32(at+8+length))throw Error('Beschädigte PNG-Prüfdaten.');return JSON.parse(content.slice(prefix.length));}
    }
    at+=12+length;
  }
  throw Error('Kein Prüfcode gefunden. Messenger können PNG-Metadaten entfernen.');
}
