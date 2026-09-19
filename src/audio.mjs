// Tiny procedural cartoon foley. Created only after an explicit user gesture.
export class GameAudio {
  constructor(){this.enabled=true;this.context=null;this.master=null;this.last=new Map();this.voices=new Set();this.played=0;this.musicEnabled=true;this.musicVoices=new Set();this.musicTimer=null;this.musicSession=0;this.musicStarts=0;}
  unlock(){
    if(!this.enabled&&!this.musicEnabled)return;
    try{
      if(!this.context){
        const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
        this.context=new Audio();this.master=this.context.createGain();this.master.gain.value=.13;
        const limiter=this.context.createDynamicsCompressor();limiter.threshold.value=-16;limiter.ratio.value=10;
        this.master.connect(limiter);limiter.connect(this.context.destination);
        this.effectsGain=this.context.createGain();this.effectsGain.gain.value=this.enabled?1:0;this.effectsGain.connect(this.master);
        this.musicGain=this.context.createGain();this.musicGain.gain.value=.5;this.musicGain.connect(this.master);
      }
      if(this.context.state==='suspended'){const session=this.musicSession;this.context.resume().then(()=>{if(session===this.musicSession)this.startMusic();}).catch(()=>{});}
      else this.startMusic();
    }catch{/* Audio is optional, even if a browser blocks it. */}
  }
  setEnabled(value){
    this.enabled=!!value;if(this.effectsGain)this.effectsGain.gain.value=this.enabled?1:0;
    if(!this.enabled)for(const voice of this.voices)if(!this.musicVoices.has(voice)){try{voice.stop();}catch{}}
  }
  stop(){this.stopMusic();for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();}
  tone(start,end,duration=.15,delay=0,type='sine',volume=.5,music=false){
    const ctx=this.context;if((music?!this.musicEnabled:!this.enabled)||!ctx||ctx.state!=='running'||this.voices.size>18)return;
    const at=ctx.currentTime+delay,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;
    osc.frequency.setValueAtTime(start,at);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),at+duration);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.008);gain.gain.exponentialRampToValueAtTime(.001,at+duration);
    osc.connect(gain);gain.connect(music?this.musicGain:this.effectsGain);this.voices.add(osc);if(music)this.musicVoices.add(osc);osc.onended=()=>{this.voices.delete(osc);this.musicVoices.delete(osc);osc.disconnect();gain.disconnect();};osc.start(at);osc.stop(at+duration+.02);
  }
  noise(duration=.2,volume=.8){
    const ctx=this.context;if(!this.enabled||!ctx||ctx.state!=='running'||this.voices.size>18)return;
    if(!this.noiseBuffer){this.noiseBuffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const data=this.noiseBuffer.getChannelData(0);let seed=713;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=seed/1073741824-1;}}
    const source=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();source.buffer=this.noiseBuffer;filter.type='lowpass';filter.frequency.value=1800;
    source.connect(filter);filter.connect(gain);gain.connect(this.effectsGain);gain.gain.setValueAtTime(volume,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);
    this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};source.start();source.stop(ctx.currentTime+duration);
  }
  pauseMusic(value){this.musicPaused=!!value;if(this.musicPaused)this.stopMusic();else this.startMusic();}
  setMusicEnabled(value){this.musicEnabled=!!value;if(this.musicEnabled)this.startMusic();else this.stopMusic();}
  stopMusic(){
    this.musicSession++;if(this.musicTimer!==null)clearInterval(this.musicTimer);this.musicTimer=null;
    if(this.musicGain)this.musicGain.gain.value=0;
    for(const voice of this.musicVoices){try{voice.stop();}catch{}voice.disconnect();}
    this.musicVoices.clear();
  }
  startMusic(){
    if(this.musicPaused||!this.musicEnabled||globalThis.document?.hidden||!this.context||this.context.state!=='running'||this.musicTimer!==null)return;
    const session=++this.musicSession;this.musicStarts++;this.musicGain.gain.value=.5;
    let step=0,next=this.context.currentTime+.08;
    const tick=()=>{
      if(session!==this.musicSession||!this.musicEnabled||this.context.state!=='running')return;
      // A light original eight-bar polka, with swung plucks and a soft oom-pah bass.
      // Schedule by audio time, never simulation time: 8x testing does not speed up music.
      if(next<this.context.currentTime-.2)next=this.context.currentTime+.03;
      while(next<this.context.currentTime+.18){
        const at=Math.max(0,next-this.context.currentTime),bar=Math.floor(step/8)%8,pos=step%8;
        const chords=[[48,52,55],[48,52,57],[45,48,52],[45,48,52],[41,45,48],[43,47,50],[48,52,55],[43,47,50]];
        const chord=chords[bar],freq=midi=>440*2**((midi-69)/12);
        if(pos===0||pos===4)this.tone(freq(chord[pos===0?0:2]-12),freq(chord[pos===0?0:2]-12),.22,at,'triangle',.40,true);
        if(pos===2||pos===6)chord.forEach(note=>this.tone(freq(note),freq(note),.14,at,'triangle',.13,true));
        const melody=[0,2,4,null,7,4,2,null],offset=melody[(pos+(bar===3?2:0))%8];
        if(offset!==null && !(bar===7&&pos>3)){
          const midi=chord[0]+24+offset;
          this.tone(freq(midi)*1.015,freq(midi),.19,at,'sine',.22,true);
        }
        if(pos===2||pos===6)this.tone(1100,180,.035,at,'triangle',.09,true);
        next+=(60/114/2)*(pos%2===0?1.12:.88);step++;
      }
    };
    this.musicTimer=setInterval(tick,80);tick();
  }
  play(event,value=0){
    if(!this.enabled||!this.context||this.context.state!=='running')return;
    const now=this.context.currentTime,limit=event==='charge'?.10:event==='pickup'?.07:.045;
    if(now-(this.last.get(event)??-Infinity)<limit)return;this.last.set(event,now);this.played++;
    switch(event){
      case 'charge':this.tone(150+value*650,180+value*760,.10,0,'triangle',.17);break;
      case 'launch':this.noise(.21,.9);this.tone(190,42,.26,0,'triangle',.9);break;
      case 'laser':this.tone(1600,100,.22,0,'sawtooth',.4);this.noise(.15,.5);break;
      case 'destroyed':this.noise(.3,1);this.tone(150,25,.3,0,'sawtooth',.4);this.tone(470,70,.24,.08,'sine',.4);break;
      case 'boost':this.noise(.12,.2);this.tone(160,740,.23,0,'triangle',.6);break;
      case 'bounce':this.tone(270,70,.17,0,'sine',.65);break;
      case 'mushroom':case 'traffic-bounce':this.tone(140,580,.17,0,'triangle',.65);this.tone(580,220,.22,.13,'sine',.4);break;
      case 'hay':this.noise(.18,.45);this.tone(95,40,.15,0,'sine',.45);break;
      case 'pickup':this.tone(850,1150,.09,0,'sine',.4);this.tone(1300,1700,.09,.06,'sine',.3);break;
      case 'traffic':this.noise(.2,.65);this.tone(710,110,.3,0,'square',.18);break;
      case 'updraft':this.noise(.25,.12);this.tone(270,700,.3,0,'sine',.2);break;
      case 'airbag':this.noise(.35,.3);break;
      case 'talent':case 'cosmetic':this.tone(400,520,.09,0,'triangle',.4);this.tone(650,800,.12,.07,'sine',.4);break;
      case 'achievement':[523,659,784,1047].forEach((f,i)=>this.tone(f,f,.17,i*.09,'triangle',.4));break;
      case 'result':[392,494,587].forEach((f,i)=>this.tone(f,f,.16,i*.08,'sine',.35));break;
      case 'failure':this.tone(250,170,.17,0,'triangle',.3);this.tone(160,70,.24,.16,'triangle',.3);break;
      default:break;
    }
  }
}
const audioSlot=Symbol.for('kartoffelkanone.audio');
export const gameAudio=globalThis[audioSlot]||(globalThis[audioSlot]=new GameAudio());
