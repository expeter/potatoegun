import { CONFIG as C, clamp, levelConfig, SPACE_MARKERS } from '../../shared/config.mjs';
import { obstaclesBetween } from '../../shared/physics.mjs';
import { pickupsBetween, trafficBetween, parallaxTiles } from '../../shared/world.mjs';

const TAU = Math.PI * 2;
const colors = { ink: '#43533b', grass: '#819c56', earth: '#c6cb98', potato: '#d6ad70', outline: '#826943' };

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = 0; this.cameraY = 0; this.plants = []; this.seenImpacts = new Set();
    this.trail = [];
    this.particles = [];
    this.lastTrail = -1;
    this.lastEvent = 0;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
  }
  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (this.width === this.canvas.clientWidth && this.height === this.canvas.clientHeight && this.dpr === dpr) return;
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight; this.dpr = dpr;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scale = this.height / (this.level === 'sky' ? 210 : this.level === 'space' ? 270 : 100);
    this.ground = this.height * 0.82;
    this.cannonScale = clamp(this.height / 340, 1.05, 3);
    this.origin = Math.min(this.width * .3, Math.max(100, this.cannonScale * 64 + 24));
  }
  reset(level = 'ground') { this.level = level; this.cameraY = 0; this.plants = []; this.seenImpacts = new Set(); this.lastSquash = -10; this.endedAt = null; this.scale = this.height / (level === 'ground' ? 100 : level === 'sky' ? 210 : 270); this.trail = []; this.particles = []; this.camera = 0; this.lastTrail = -1; this.lastEvent = 0; }
  x(world) { return this.origin + (world - this.camera) * this.scale; }
  y(world) { return this.ground - (world - this.cameraY) * this.scale; }
  ellipse(x, y, rx, ry, fill, stroke) {
    const c = this.ctx;
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.stroke(); }
  }
  path(points, fill, stroke, close = true) {
    const c = this.ctx; c.beginPath();
    points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    if (close) c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.stroke(); }
  }
  cloud(x, y, size, opacity = 0.7) {
    const c = this.ctx; c.save(); c.globalAlpha = opacity;
    this.ellipse(x, y, 30 * size, 9 * size, '#f9f9ed');
    this.ellipse(x - 10 * size, y - 6 * size, 14 * size, 13 * size, '#f9f9ed');
    this.ellipse(x + 8 * size, y - 10 * size, 17 * size, 15 * size, '#f9f9ed');
    c.restore();
  }
  classicBackground(time) {
    const c = this.ctx, w = this.width, h = this.height;
    const sky = c.createLinearGradient(0, 0, 0, this.ground);
    const night=this.appearance?.light==='night';
    sky.addColorStop(0,night?'#202b49':'#e6edda');sky.addColorStop(1,night?'#74858c':'#f0f0d9');
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    this.ellipse(w * .72, h * .2, 31, 31, '#f3ecc5');
    this.ellipse(w * .72, h * .2, 39, 39, '#f3ecc530');
    const drift = this.reducedMotion ? 0 : Math.sin(time * .07) * 4;
    for (const { index: i, x: tileX } of parallaxTiles(this.camera, .22, 225, w)) {
      const x = tileX + 70 + drift;
      this.cloud(x, h * (.19 + ((i % 3 + 3) % 3) * .07), .7 + (Math.abs(i) % 3) * .2, .72);
    }
    for (let layer = 0; layer < 3; layer++) {
      c.beginPath(); c.moveTo(0, this.ground);
      for (let x = 0; x <= w + 10; x += 10) {
        const offset = this.camera * (layer + 1) * .18;
        const y = this.ground - (58 - layer * 15) - Math.sin((x + offset) / (120 + layer * 25) + layer * 2) * (24 - layer * 4) - Math.sin((x + offset) / 67 + layer) * 5;
        c.lineTo(x, y);
      }
      c.lineTo(w + 10, h); c.lineTo(0, h); c.closePath();
      c.fillStyle = ['#c9d7b3', '#b6c89b', '#9fb782'][layer]; c.fill();
    }
    this.farm(w * .76 - this.camera * .22, this.ground - 50);
    // Distant hedgerows and a little orchard.
    for (const { index: i, x: tileX } of parallaxTiles(this.camera, .36, 160, w)) {
      const x = tileX + 33;
      const y = this.ground - 20 - Math.sin(i * 2.4) * 9;
      c.fillStyle = '#879b6d'; c.fillRect(x - 2, y - 22, 4, 27);
      this.ellipse(x - 7, y - 26, 12, 16, '#8ea775');
      this.ellipse(x + 5, y - 31, 13, 19, '#92ab78');
      this.ellipse(x + 14, y - 22, 10, 12, '#8ca271');
    }
    // The collision ground is level; decorative hills are only scenery.
    c.fillStyle = '#a4b875'; c.fillRect(0, this.ground, w, h - this.ground);
    c.fillStyle = '#bfc68e'; c.fillRect(0, this.ground + 10, w, h - this.ground - 10);
    c.fillStyle = '#c8cc9a'; c.fillRect(0, this.ground + 19, w, h - this.ground - 19);
    c.strokeStyle = '#819754'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, this.ground); c.lineTo(w, this.ground); c.stroke();
    for (let i = Math.floor(this.camera / 6) - 10; i < this.camera / 6 + w / (6 * this.scale) + 3; i++) {
      const x = this.x(i * 6), r = Math.sin(i * 53.7);
      if (i % 3 === 0) {
        c.strokeStyle = '#8ea365'; c.lineWidth = 1;
        this.path([[x - 3, this.ground + 2], [x - 4, this.ground - 3 - r * 2], [x, this.ground + 1], [x + 3, this.ground - 4]], null, '#8ea365', false);
      }
      this.ellipse(x + r * 10, this.ground + 25 + r * 7, 1.5, .6, '#a9b581');
    }
    const visibleLeft = this.camera - this.origin / this.scale;
    const visibleRight = visibleLeft + w / this.scale;
    for (let meter = Math.max(0, Math.ceil(visibleLeft / 50) * 50); meter < visibleRight; meter += 50) {
      const x = this.x(meter);
      c.strokeStyle = '#94a66b'; c.lineWidth = 1; this.path([[x, this.ground + 12], [x, this.ground + 18]], null, '#94a66b', false);
      c.fillStyle = '#7f9160'; c.font = '8px "Comic Neue", sans-serif'; c.textAlign = 'center'; c.fillText(`${meter} m`, x, this.ground + 29);
    }
    // Tiny birds above the field.
    for (let i = 0; i < 3; i++) {
      const x = w * .54 + i * 13 - this.camera * .05, y = h * .19 + Math.sin(i * 1.7) * 7;
      c.lineWidth = 1; c.strokeStyle = '#8b9b7a'; c.beginPath(); c.moveTo(x - 4, y); c.quadraticCurveTo(x - 2, y - 3, x, y); c.quadraticCurveTo(x + 2, y - 3, x + 4, y); c.stroke();
    }
    if(night){c.fillStyle='#17213f55';c.fillRect(0,0,w,h);}
  }
  farm(x, y) {
    const c = this.ctx; c.save(); c.translate(x, y); c.globalAlpha = .6;
    c.fillStyle = '#d9d6b6'; c.fillRect(-22, -12, 43, 27);
    this.path([[-28, -12], [0, -31], [28, -12]], '#ad9e79');
    c.fillStyle = '#9ba580'; c.fillRect(-5, -1, 11, 16);
    c.fillStyle = '#ece7c9'; c.fillRect(-16, -4, 6, 7); c.fillRect(12, -4, 6, 7);
    this.path([[43, 15], [50, -32], [59, -32], [67, 15]], '#c2c2a2');
    this.path([[48, -32], [54, -40], [61, -32]], '#a3a687');
    c.lineWidth = 3;
    this.path([[34, -41], [76, -5]], null, '#a8ad8b', false);
    this.path([[36, -5], [74, -43]], null, '#a8ad8b', false);
    this.ellipse(55, -23, 3, 3, '#909d77'); c.restore();
  }
  junkBackground(time) {
    const c = this.ctx, w = this.width, h = this.height;
    const sky = c.createLinearGradient(0, 0, 0, this.ground);
    const palette = this.appearance?.light === 'night' ? ['#18233e','#38446a','#8d7899'] : this.appearance?.scene === 'candy' ? ['#8fd8de','#e2add6','#ffe0b1'] : ['#78618e','#b286a7','#e6b394'];
    palette.forEach((color,i) => sky.addColorStop([0,.6,1][i],color));
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    // A wonky ringed moon over a thoroughly unlicensed spaceport.
    c.save(); c.translate(w * .78 - this.camera * .03, h * .23); c.rotate(-.3);
    this.ellipse(0, 0, 29, 29, '#efd5ae'); this.ellipse(-9, -6, 8, 5, '#dbc59f'); this.ellipse(7, 13, 5, 4, '#dac2a1');
    c.lineWidth = 5; this.ellipse(0, 2, 46, 8, null, '#dfadba'); c.restore();
    for (let i = 0; i < 17; i++) {
      const x = (i * 157.7 + 18 - this.camera * .08 % w + w) % w, y = 18 + (i * 39.3) % (h * .38);
      c.globalAlpha = .3 + (Math.sin(i * 4.1) + 1) * .15; this.ellipse(x, y, 1.2, 1.2, '#ffeccc');
    }
    c.globalAlpha = 1;
    for (const { x: tileX } of parallaxTiles(this.camera, .13, 230, w)) {
      const x = tileX + 77;
      c.save(); c.globalAlpha = .22;
      this.ellipse(x, h * .3, 55, 7, '#efd2c5'); this.ellipse(x - 18, h * .3 - 6, 20, 9, '#efd2c5'); this.ellipse(x + 9, h * .3 - 8, 25, 13, '#efd2c5'); c.restore();
    }
    for (let layer = 0; layer < 3; layer++) {
      const spacing = [190, 135, 100][layer], baseline = this.ground - (2 - layer) * 16;
      for (const { index: i, x } of parallaxTiles(this.camera, .17 + layer * .16, spacing, w, 3)) {
        const peak = 25 + (Math.sin(i * 4.3 + layer) + 1) * 22 + (2 - layer) * 18;
        c.lineWidth = 1;
        this.path([[x - 35, baseline + 10], [x + 8, baseline - peak * .4], [x + 25, baseline - peak], [x + 58, baseline - peak - 5], [x + 68, baseline - peak * .45], [x + spacing + 20, baseline + 15]], ['#987491', '#a07886', '#b58176'][layer]);
        this.path([[x + 25, baseline - peak], [x + 37, baseline - peak + 3], [x + 22, baseline - peak * .5], [x + 8, baseline - peak * .4]], ['#b390a3', '#bc9095', '#d39c86'][layer]);
        if (layer === 2) this.path([[x + 57, baseline - peak + 2], [x + 50, baseline - peak * .5], [x + 80, baseline - 3]], null, '#9d6e6f', false);
      }
    }
    if (this.appearance?.scene === 'candy') {
      for (const { x, index } of parallaxTiles(this.camera, .20, 330, w)) {
        const top = this.ground - 27 - Math.sin(index * 3) * 7;
        c.save();c.globalAlpha=.45;c.lineWidth = 3; this.path([[x+40,this.ground],[x+40,top]],null,'#fff1cf',false);
        this.ellipse(x+40,top,9,9,'#c599b7','#ead7c2');
        c.lineWidth=1.5;c.beginPath();
        for(let i=0;i<80;i++){const a=i*.16,r=i*.085;c.lineTo(x+40+Math.cos(a)*r,top+Math.sin(a)*r);}c.strokeStyle='#ead7c2';c.stroke();c.restore();
      }
    }
    const depotX = w * .65 - this.camera * .27;
    c.save(); c.translate(depotX, this.ground - 17); c.lineWidth = 2;
    this.path([[-45, 12], [-43, -28], [-29, -41], [17, -41], [35, -20], [33, 12]], '#786577', '#6d566e');
    this.path([[-51, -28], [-30, -50], [19, -45], [42, -20]], '#b38982', '#786073');
    c.fillStyle = '#55485d'; c.fillRect(-20, -20, 24, 32);
    c.fillStyle = '#dbb06e'; c.fillRect(-40, -24, 11, 9); c.fillRect(14, -20, 11, 9);
    c.save(); c.translate(-13, -36); c.rotate(-.1); c.fillStyle = '#d4a88c'; c.fillRect(-20, -5, 40, 13); c.fillStyle = '#785869'; c.font = '8px Bangers, sans-serif'; c.textAlign = 'center'; c.fillText('KEIN TÜV', 0, 4); c.restore();
    this.path([[49, 12], [45, -64], [56, -65], [63, 12]], '#8d6d7d', '#705568');
    this.path([[40, -58], [63, -61]], null, '#e4ab7d', false);
    const smoke = this.reducedMotion ? 0 : Math.sin(time * .6) * 4;
    this.ellipse(49 + smoke, -78, 10, 8, '#c7a0b3aa'); this.ellipse(42 + smoke, -94, 13, 9, '#c7a0b366');
    // A rocket assembled from scrap and very optimistic engineering.
    c.save(); c.translate(96, -20); c.rotate(.22);
    this.path([[-10, 27], [-9, -32], [0, -50], [10, -32], [12, 27]], '#baa4a8', '#78637c');
    this.path([[-9, -32], [0, -50], [10, -32]], '#c87c6d', '#78637c');
    this.path([[-9, 9], [-22, 26], [-10, 26]], '#c17c70', '#78637c'); this.path([[11, 9], [24, 26], [12, 26]], '#c17c70', '#78637c');
    this.ellipse(0, -12, 6, 7, '#b0d1cf', '#7b747f'); c.restore(); c.restore();
    // Decorative junk stays behind the physically flat, readable ground.
    for (const { x } of parallaxTiles(this.camera, .6, 120, w)) {
      this.ellipse(x + 12, this.ground - 7, 13, 12, '#836377', '#72536b');
      this.ellipse(x + 12, this.ground - 7, 7, 7, '#bc917e');
      this.path([[x + 26, this.ground], [x + 30, this.ground - 15], [x + 48, this.ground - 20], [x + 57, this.ground]], '#b49388', '#8c6d7c');
    }
    c.fillStyle = '#b7866d'; c.fillRect(0, this.ground, w, h - this.ground);
    c.fillStyle = '#a77768'; c.fillRect(0, this.ground + 10, w, h - this.ground - 10);
    c.fillStyle = '#966978'; c.fillRect(0, this.ground + 23, w, h - this.ground - 23);
    c.lineWidth = 3; this.path([[0, this.ground], [w, this.ground]], null, '#e0af81', false);
    for (const { index: i, x } of parallaxTiles(this.camera, this.scale, 35, w)) {
      this.ellipse(x, this.ground + 16 + Math.sin(i * 6) * 4, 2.5, 1, '#d4a37c');
    }
    const left = this.camera - this.origin / this.scale;
    c.font = '8px "Comic Neue", sans-serif'; c.textAlign = 'center'; c.fillStyle = '#e9c1a2';
    for (let meter = Math.max(0, Math.ceil(left / 50) * 50); meter < left + w / this.scale; meter += 50) c.fillText(`${meter} m`, this.x(meter), this.ground + 22);
  }
  pickup(p, time) {
    const c = this.ctx, x = this.x(p.x), y = this.y(p.y), r = p.value >= 10 ? 9 : 6;
    c.save(); c.translate(x, y); c.rotate(this.reducedMotion ? .2 : Math.sin(time * 2 + p.x) * .2);
    this.ellipse(0, 0, r + 5, r + 5, this.theme === 'classic' ? '#ffdc6940' : '#ffdd8725');
    c.lineWidth = 1.5;
    this.path(Array.from({ length: 6 }, (_, i) => [Math.cos(i * Math.PI / 3) * r, Math.sin(i * Math.PI / 3) * r]), '#f8d27c', '#af7f57');
    this.ellipse(0, 0, r * .4, r * .4, this.theme === 'classic' ? '#c09d64' : '#9a697e');
    this.path([[-r * .4, -r * .55], [r * .2, -r * .65]], null, '#fff2c7', false); c.restore();
  }
  vehicle(t, time) {
    const c = this.ctx; c.save(); c.translate(this.x(t.x), this.y(t.y));
    const size = Math.max(.4, this.scale / 6); c.rotate(t.rotation || 0); c.scale(size, size); c.lineWidth = 1.5;
    this.ellipse(0, 0, 20, 9, '#bd9b98', '#79607e');
    this.ellipse(-3, -7, 10, 9, '#afd5ca', '#79607e');
    this.ellipse(-6, -8, 2, 3, '#66556d'); this.ellipse(1, -8, 2, 3, '#66556d');
    this.ellipse(0, 4, 20, 5, '#b98070', '#79607e');
    for (let i = -1; i <= 1; i++) this.ellipse(i * 10, 5, 2, 2, '#f6d786');
    if (!t.wreck) this.path([[17, 0], [27 + Math.sin(time * 30) * 4, 0], [20, 5]], '#f7ca86');
    else { this.path([[-8,-10],[0,-4],[-3,2],[8,7]], null, '#68515e', false); }
    c.restore();
  }
  wrecks(flight, time) {
    const c = this.ctx;
    for (const wreck of flight.trafficWrecks) {
      const age = flight.elapsed - wreck.hitAt + (flight.ended ? time - this.endedAt : 0);
      if (age > 9) continue;
      const gravity = levelConfig(flight.level).gravity;
      const fallTime = (wreck.vy + Math.sqrt(wreck.vy ** 2 + 2 * gravity * Math.max(0, wreck.y - 1.5))) / gravity;
      const fallingTime = Math.min(age, fallTime), landed = age >= fallTime;
      const x = wreck.x + wreck.vx * fallingTime;
      const y = Math.max(1.5, wreck.y + wreck.vy * fallingTime - gravity * fallingTime ** 2 / 2);
      c.save(); c.globalAlpha = clamp((9 - age) / 2, 0, 1);
      for (let i = 0; i < 4; i++) this.ellipse(this.x(x) - i * 5, this.y(y) - 8 - i * 9 - age * 2, 3 + i * 2, 3 + i * 2, '#aa889777');
      this.vehicle({x, y, rotation: wreck.spin * fallingTime, wreck:true}, time);
      if (landed && age - fallTime < .8) {
        const puff = (age - fallTime) * 18;
        for (let i = -2; i <= 2; i++) this.ellipse(this.x(x) + i * (5 + puff), this.y(0) - 3 - Math.abs(i) * 2, 6 + puff * .25, 4, '#ddba9588');
      }
      c.restore();
    }
  }
  highBackground(time) {
    const c = this.ctx, w = this.width, h = this.height;
    if (this.level === 'sky') {
      const sky = c.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#7185aa'); sky.addColorStop(1, '#ddd0c1'); c.fillStyle = sky; c.fillRect(0, 0, w, h);
      this.ellipse(w * .78, h * .23, 32, 32, '#f3ddb7');
      for (let i = -1; i < w / 160 + 2; i++) {
        const x = i * 170 + 60 - this.camera * .15 % 170;
        const y = 100 + ((i * 97 + this.cameraY * .08) % Math.max(100, h - 80) + h) % Math.max(100, h - 80);
        this.cloud(x, y, 1 + (i % 3 + 3) % 3 * .4, .5);
      }
      // Tiny distant prop planes make this a different world, not a recolored field.
      for (let i = 0; i < 3; i++) {
        const x = (w * .25 + i * 340 - this.camera * .12 + w * 10) % (w + 100), y = 100 + i * 51;
        this.path([[x - 16, y], [x + 16, y], [x + 20, y + 3], [x - 12, y + 5], [x - 20, y - 4]], '#7b729179');
        this.path([[x - 4, y + 2], [x + 3, y - 8], [x + 8, y - 8], [x + 5, y + 5]], '#8b7c9779');
      }
      const floor = this.y(0);
      if (floor < h) { c.fillStyle = '#bac9cf'; c.fillRect(0, floor, w, h - floor); this.path([[0, floor], [w, floor]], null, '#ede2c9', false); }
    } else {
      const sky = c.createLinearGradient(0, 0, w, h);
      sky.addColorStop(0, '#27213f'); sky.addColorStop(.55, '#443055'); sky.addColorStop(1, '#70506d');
      c.fillStyle = sky; c.fillRect(0, 0, w, h);
      this.ellipse(w * .7, h * .6, w * .5, h * .16, '#ab77a010');
      for (let i = 0; i < 100; i++) {
        const x = ((i * 137.53 - this.camera * (.025 + i % 3 * .02)) % w + w) % w;
        const y = ((i * 63.72 + this.cameraY * .045) % h + h) % h;
        this.ellipse(x, y, i % 7 === 0 ? 1.6 : .8, i % 7 === 0 ? 1.6 : .8, ['#ffedc7', '#d7dcef', '#dfbce8'][i % 3]);
      }
      const floor = this.y(0);
      if (floor < h) {
        c.fillStyle = '#7f778f'; c.fillRect(0, floor, w, h - floor);
        this.path([[0, floor], [w, floor]], null, '#b4a6bc', false);
        for (let i = -1; i < w / 80 + 1; i++) this.ellipse(i * 80 - this.camera * this.scale % 80, floor + 20, 18, 5, '#625c79');
      }
      for (const marker of SPACE_MARKERS) {
        const x = this.x(marker.x);
        if (x < -80 || x > w + 80) continue;
        const y = h * .3;
        c.save(); c.textAlign = 'center'; c.font = 'bold 9px "Comic Neue", sans-serif'; c.fillStyle = '#efdfd9';
        if (marker.radius) {
          this.ellipse(x, y, marker.radius, marker.radius, marker.color);
          this.ellipse(x - marker.radius * .3, y - marker.radius * .2, marker.radius * .4, marker.radius * .15, '#ffffff25');
          if (marker.ring) { c.lineWidth = 4; this.ellipse(x, y + 4, marker.radius * 1.55, marker.radius * .3, null, '#cba7bf'); }
          c.fillText(marker.name, x, y + marker.radius + 17);
        } else {
          c.setLineDash([5, 8]); c.lineWidth = 2; this.path([[x, 65], [x, h - 40]], null, '#cef5d7', false); c.setLineDash([]);
          c.fillText(marker.name, x, 81); c.font = '9px "Comic Neue", sans-serif'; c.fillText('Tschüss, Sonnensystem!', x, 95);
        }
        c.restore();
      }
    }
  }
  garden(flight, time) {
    const c = this.ctx;
    for (const impact of flight.impacts) {
      if (this.seenImpacts.has(impact.time)) continue;
      this.seenImpacts.add(impact.time);
      for (let i = 0; i < impact.count; i++) this.plants.push({
        x: impact.x + (i - (impact.count - 1) / 2) * 4, y: impact.y,
        born: time, variety: (impact.variety + i) % 3, count: i === 0 ? impact.count : 0,
      });
      this.lastSquash = time;
    }
    if (this.plants.length > 100) this.plants.splice(0, this.plants.length - 100);
    for (const p of this.plants) {
      const x = this.x(p.x), age = time - p.born;
      if (x < -25 || x > this.width + 25) continue;
      const ground = this.y(p.y), grow = this.reducedMotion ? 1 : clamp((age - .2) / .65, 0, 1);
      // The seed buries itself; the resulting plant has a distinct silhouette.
      this.ellipse(x, ground + 2, 8, 3, '#735246');
      if (age < .4 && !this.reducedMotion) {
        const hop = Math.sin(age / .4 * Math.PI) * 10;
        this.ellipse(x, ground - hop, 3, 4, '#dfb779', '#9a775a');
      }
      c.save(); c.translate(x, ground); c.scale(1, Math.max(.01, grow));
      const height = [13, 22, 17][p.variety];
      this.path([[0,0],[1,-height]], null, '#637747', false);
      this.ellipse(-4, -height * .45, 5, 2.5, '#b5c86d', '#70864e');
      this.ellipse(5, -height * .72, 6, 3, '#8fa759', '#70864e');
      if (p.variety === 1) {
        for (let i = 0; i < 5; i++) this.ellipse(Math.cos(i * TAU / 5) * 3, -height + Math.sin(i * TAU / 5) * 3, 2.5, 2.5, '#e5b1d8');
        this.ellipse(0, -height, 2, 2, '#ffdb7d');
      } else if (p.variety === 2) {
        this.ellipse(-4, -height, 4, 2.5, '#bbd88b'); this.ellipse(3, -height - 2, 4, 3, '#a5c575');
        this.ellipse(1, -2, 5, 3, '#d9a96d', '#966e4b');
      }
      c.restore();
      if (p.count && age < 1.2) { c.fillStyle = '#edffc2'; c.font = 'bold 11px "Comic Neue", sans-serif'; c.textAlign = 'center'; c.fillText(`+${p.count} gepflanzt`, x, ground - 30 - age * 10); }
    }
  }
  attachedHealth(x, y, fraction, equipment) {
    const c = this.ctx, size = Math.max(.7, this.scale / 4.3);
    const top = y - (equipment.sail ? 42 : 21) * size - 10;
    c.save(); c.fillStyle = '#342e45dc'; c.beginPath(); c.roundRect(x - 20, top, 40, 7, 3); c.fill();
    c.fillStyle = fraction > .55 ? '#b9df8c' : fraction > .25 ? '#ffd080' : '#f18896';
    c.beginPath(); c.roundRect(x - 18, top + 2, Math.max(0, fraction * 36), 3, 1); c.fill(); c.restore();
  }
  bouncer(o, time) {
    const c = this.ctx, x = this.x(o.x), top = this.y(o.height), ground = this.y(0), w = o.width * this.scale;
    c.lineWidth = 2;
    this.ellipse(x+w/2, ground+2, w*.65, 3, '#49354433');
    if (o.variant === 'trampoline') {
      this.path([[x+4,ground],[x+8,top+3],[x+w-8,top+3],[x+w-4,ground]], null, '#697d80', false);
      c.fillStyle='#72c1c8';c.strokeStyle='#466b78';c.beginPath();c.roundRect(x-2,top,w+4,7,3);c.fill();c.stroke();
      this.path([[x+5,top+3],[x+w-5,top+3]],null,'#c5f0df',false);
      for(let i=0;i<4;i++) this.path([[x+6+i*(w-12)/3,top+7],[x+6+i*(w-12)/3,top+10]],null,'#a6d7dc',false);
    } else if (o.variant === 'spring') {
      c.fillStyle='#8f7c9f';c.fillRect(x,ground-5,w,5);
      const points=[[x+w*.5,ground-5]];
      for(let i=0;i<6;i++) points.push([x+w*(i%2?.25:.75),ground-6-(ground-top-12)*(i+1)/6]);
      this.path(points,null,'#d8bedc',false);
      c.fillStyle='#c692b9';c.strokeStyle='#70516d';c.beginPath();c.roundRect(x-3,top,w+6,6,2);c.fill();c.stroke();
      this.ellipse(x+w/2,top+3,3,2,'#f9d38d');
    } else {
      c.fillStyle='#da9770';c.strokeStyle='#895d69';c.beginPath();c.roundRect(x,top,w,Math.max(8,ground-top),5);c.fill();c.stroke();
      c.fillStyle='#584555';c.beginPath();c.roundRect(x+4,top+2,Math.max(5,w-8),4,2);c.fill();
      this.ellipse(x+w*.7,top+11,2.5,2.5,'#ffe796');
      this.path([[x+w-2,top+7],[x+w+5,top+7],[x+w+5,top+12]],null,'#895d69',false);
      c.strokeStyle='#fbd8a5';c.lineWidth=1;
      for(let i=0;i<2;i++){const sx=x+w*(.3+i*.4);this.path([[sx,top-3],[sx+2,top-7],[sx-1,top-11]],null,'#fbd8a580',false);}
    }
  }
  obstacle(o, time) {
    const c = this.ctx, x = this.x(o.x), top = this.y(o.height), width = o.width * this.scale;
    c.save();
    if (o.type === 'mushroom' && o.variant && o.variant !== 'mushroom') { this.bouncer(o, time); c.restore(); return; }
    if (o.type === 'mushroom') {
      this.ellipse(x + width / 2, this.ground + 1, width * .65, 3, '#6d874533');
      c.fillStyle = '#e5d9ac'; c.strokeStyle = '#9d9366'; c.lineWidth = 1;
      c.beginPath(); c.roundRect(x + width * .4, top + 7, width * .2, this.ground - top - 7, 2); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(x - 1, top + 9); c.bezierCurveTo(x - 1, top - 4, x + width, top - 5, x + width + 1, top + 9); c.quadraticCurveTo(x + width / 2, top + 14, x - 1, top + 9); c.fillStyle = this.theme === 'classic' ? '#cd7950' : '#e58daf'; c.fill(); c.strokeStyle = '#a86945'; c.stroke();
      this.ellipse(x + width * .3, top + 5, 3, 2, '#efe2be'); this.ellipse(x + width * .66, top + 3, 3, 2, '#efe2be');
      this.ellipse(x + width * .8, top + 8, 2, 1.4, '#efe2be');
    } else if (o.type === 'hay') {
      this.ellipse(x + width / 2, this.ground + 2, width * .6, 3, '#6d874533');
      c.fillStyle = this.theme === 'classic' ? '#dcc786' : '#cba997'; c.strokeStyle = '#ad955b'; c.lineWidth = 1.3;
      c.beginPath(); c.roundRect(x, top, width, this.ground - top, 4); c.fill(); c.stroke();
      c.strokeStyle = '#c2ab6c'; c.lineWidth = .8;
      for (let i = 4; i < this.ground - top; i += 4) { c.beginPath(); c.moveTo(x + 3, top + i); c.lineTo(x + width - 3, top + i - 1); c.stroke(); }
      c.strokeStyle = '#9d935f'; c.lineWidth = 2;
      this.path([[x + width * .25, top], [x + width * .25, this.ground]], null, '#a89a60', false);
      this.path([[x + width * .75, top], [x + width * .75, this.ground]], null, '#a89a60', false);
    } else {
      const bottom = Math.min(this.height, this.y(0)), visibleTop = Math.max(0, top);
      const fade = c.createLinearGradient(x, 0, x + width, 0);
      fade.addColorStop(0, '#f1f7e400'); fade.addColorStop(.5, '#f1f7e438'); fade.addColorStop(1, '#f1f7e400');
      c.fillStyle = fade;
      c.save(); const opacity = c.globalAlpha;
      for (let row = visibleTop; row < bottom; row += 4) {
        c.globalAlpha = opacity * clamp((row + 2 - top) / Math.max(1, o.height * this.scale * .25), 0, 1);
        c.fillRect(x, row, width, Math.min(4, bottom - row));
      }
      c.restore();
      c.strokeStyle = this.theme === 'classic' ? '#91ac7575' : '#eac7f3a0'; c.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const px = x + width * (.08 + i * .12);
        const phase = this.reducedMotion ? .5 : (time * .55 + i * .23) % 1;
        const py = bottom - 8 - phase * Math.max(0, bottom - visibleTop - 22);
        const altitudeFade = clamp((py - top) / Math.max(1, o.height * this.scale * .25), 0, 1);
        c.save(); c.globalAlpha *= altitudeFade;
        c.beginPath(); c.moveTo(px, py); c.bezierCurveTo(px - 7, py - 9, px + 9, py - 12, px + 2, py - 25); c.stroke();
        this.path([[px - 1, py - 20], [px + 2, py - 25], [px + 5, py - 21]], null, this.theme === 'classic' ? '#91ac7575' : '#eac7f3a0', false);
        c.restore();
      }
    }
    c.restore();
  }
  flag(x, y, wind, time, scale = 1) {
    const c = this.ctx; c.save(); c.translate(x, y); c.scale(scale, scale); c.lineWidth = 1.5;
    this.path([[0, 21], [0, -17]], null, this.theme === 'classic' ? '#728064' : '#f2d9b1', false);
    const dir = Math.sign(wind || 1), length = 5 + Math.abs(wind) * 7;
    const flutter = this.reducedMotion ? 0 : Math.sin(time * 5) * Math.min(2, Math.abs(wind));
    this.path([[0, -17], [dir * length * .5, -16 + flutter], [dir * length, -13 - flutter], [dir * length * .9, -3 - flutter], [dir * length * .45, -6 + flutter], [0, -4]], '#f1c663', '#a87b58');
    c.restore();
  }
  cannon(angle, equipment, time, loaded) {
    const c = this.ctx, radians = angle * Math.PI / 180, x = this.x(0), y = this.y(levelConfig(this.level).launchHeight);
    if (x < -180 || y < -120 || y > this.height + 120) return;
    const k = this.cannonScale;
    c.save(); c.translate(x - Math.cos(radians) * 34 * k, y + Math.sin(radians) * 34 * k); c.scale(k, k);
    if (this.level === 'sky') {
      this.path([[-68, 16], [63, 14], [90, 27], [56, 39], [-57, 34], [-81, 8], [-67, 7]], '#d7b785', '#7f6d79');
      this.path([[-8, 26], [10, 0], [29, 0], [22, 29], [49, 43], [-14, 43]], '#ba7978', '#7f6d79');
      for (let i = 0; i < 4; i++) this.ellipse(-43 + i * 16, 24, 4, 4, '#a8d6d3', '#7f6d79');
      this.path([[78, 10], [78, 41]], null, '#746880', false); this.ellipse(78, 26, 3, 20, '#d3cabd88');
    } else {
      const wheelY = (this.y(0) - y) / k - Math.sin(radians) * 34 - 11;
      this.path([[-27, wheelY - 5], [-18, -5], [20, -5], [31, wheelY - 5]], '#8a7650', '#6a6345');
      for (const wx of [-18, 21]) {
        this.ellipse(wx, wheelY, 11, 11, '#6f6448', '#4f523a'); this.ellipse(wx, wheelY, 7, 7, '#b29e6c', '#716545'); this.ellipse(wx, wheelY, 3, 3, '#77704d');
      }
    }
    c.save(); c.rotate(-radians); c.translate(-Math.max(0, 1 - this.shotAge / .18) * 9, 0); c.lineWidth = 1.8;
    c.beginPath(); c.roundRect(-22, -12, 55, 24, 5); c.fillStyle = this.theme === 'classic' ? '#586746' : '#655569'; c.fill(); c.strokeStyle = '#483d54'; c.stroke();
    c.fillStyle = this.theme === 'classic' ? '#7d8960' : '#ca8561'; c.fillRect(-7, -12, 7, 24); c.fillRect(23, -13, 8, 26);
    this.ellipse(34, 0, 4, 11, '#332e40', '#8a6a75');
    c.fillStyle = '#e6cda0'; c.font = '7px Bangers, sans-serif'; c.textAlign = 'center'; c.fillText('NO TÜV', 10, 3);
    if (loaded) {
      // The tiny potato sits INSIDE the mouth, clipped by its metal rim.
      c.save(); c.beginPath(); c.ellipse(33, 0, 5, 9, 0, 0, TAU); c.clip();
      this.potato(31, 1, Math.PI / 2, {}, 1, 1, time, .42); c.restore();
      this.ellipse(34, 0, 5, 11, null, '#bd9878');
    }
    c.restore(); c.restore();
    if (this.shotAge < .13) {
      c.save(); c.translate(x, y); c.rotate(-radians);
      const flash = (1 - this.shotAge / .13) * k;
      c.scale(flash, flash); this.path([[0,-7],[20,-17],[15,-6],[43,0],[15,6],[20,17],[0,7]], '#ffe5a0');
      this.path([[0,-4],[25,0],[0,4]], '#fff9df'); c.restore();
    }
    if (this.level === 'ground') this.flag(x - 68, this.y(0) - 23, this.wind, time, .8);
  }
  aimGuide(angle, charge, charging) {
    const c = this.ctx, x = this.x(0), y = this.y(levelConfig(this.level).launchHeight);
    c.save(); c.translate(x, y); c.rotate(-angle * Math.PI / 180);
    // Worms-like segmented power strip, aligned with the barrel; no ballistic prediction.
    for (let i = 0; i < 13; i++) {
      const filled = charging && i / 13 <= charge;
      const radius = 2 + i * .32;
      c.fillStyle = filled ? (i < 5 ? '#c2dd8a' : i < 10 ? '#ffd078' : '#f296bd') : '#f6e7c33b';
      c.strokeStyle = filled ? '#6f526c' : '#f6e7c380'; c.lineWidth = 1;
      c.beginPath(); c.roundRect(13 + i * 7, -radius, 5, radius * 2, 2); c.fill(); c.stroke();
    }
    c.strokeStyle = this.theme === 'classic' ? '#67794e' : '#fff0c7'; c.lineWidth = 1.5;
    this.ellipse(115, 0, 7, 7, null, c.strokeStyle);
    this.path([[105, 0], [111, 0]], null, c.strokeStyle, false); this.path([[119, 0], [125, 0]], null, c.strokeStyle, false);
    this.path([[115, -10], [115, -4]], null, c.strokeStyle, false); this.path([[115, 4], [115, 10]], null, c.strokeStyle, false);
    c.restore();
  }
  potato(x, y, rotation, equipment, health = 1, wingHealth = 1, time = 0, scaleOverride = null, squash = 0) {
    const c = this.ctx; c.save(); c.translate(x, y); c.rotate(rotation); c.lineWidth = 1.2;
    // The hero is intentionally larger than life, with equipment easy to read.
    const size = scaleOverride ?? Math.max(.7, this.scale / 4.3); c.scale(size * (1 + squash * .6), size * (1 - squash * .45));
    if (equipment.wings) {
      c.save(); c.rotate((1 - wingHealth) * .7);
      this.path([[-3, 0], [-28 - equipment.wings * 3, -7], [-30, 3], [-9, 12], [4, 7]], '#eee8c8', '#9ba283');
      this.path([[-5, 3], [-28, -2]], null, '#b4b69b', false); c.restore();
    }
    if (equipment.rocket) {
      this.path([[-15, -8], [-22, -6], [-22, 9], [-13, 11]], '#9ca9b4', '#675d77');
      if (this.boosting) this.path([[-21, 9], [-17, 24 + Math.sin(time * 20) * 4], [-14, 10]], '#ffd17c', '#ed864f');
    }
    if (equipment.sail) this.path([[0, -16], [-3, -39], [17, -21]], '#ecb9cc', '#88718e');
    if (equipment.magnet) {
      c.strokeStyle = '#ed8b82'; c.lineWidth = 4; c.beginPath(); c.arc(-15, 11, 6, 0, Math.PI); c.stroke();
      c.strokeStyle = '#d6e3ed'; this.path([[-21, 11], [-21, 6]], null, '#d6e3ed', false); this.path([[-9, 11], [-9, 6]], null, '#d6e3ed', false); c.lineWidth = 1.2;
    }
    if (equipment.satchel || equipment.recycler) this.path([[-15, 0], [-23, 3], [-23, 14], [-14, 14]], '#c79561', '#8b6549');
    const look = this.appearance || {};
    if (look.trail === 'bunting') {
      const points = Array.from({length:8},(_,i)=>[-15-i*9, 8+Math.sin(time*7-i*.6)*4]);
      this.path(points,null,'#f5e5be',false);
      points.slice(1).forEach(([px,py],i)=>this.path([[px,py],[px-7,py+1],[px-4,py+11]],['#ffcf69','#ed7797','#7cdad0'][i%3],'#695172'));
    }
    if (look.umbrella === 'umbrella') {
      this.path([[17,5],[17,-38]],null,'#ffe8bc',false);
      this.path([[-7,-36],[0,-48],[17,-53],[34,-47],[41,-36],[29,-39],[17,-35],[6,-39]],'#9ddbd5','#534563');
      this.path([[17,-53],[17,-36]],null,'#faf1bb',false);
    }
    // Scarf and tail.
    const flutter = this.reducedMotion ? 0 : Math.sin(time * 16) * 3;
    this.path([[-8, 4], [-23, 7 + flutter], [-34, 2 + flutter], [-28, 10 + flutter], [-35, 13 + flutter], [-18, 14], [-5, 10]], '#bb5940', '#a74e39');
    c.save(); c.rotate(.2);
    this.ellipse(0, 0, 12, 17, colors.potato, colors.outline);
    this.ellipse(-4, -5, 5, 9, '#e3bf86');
    for (const [px, py] of [[6, -10], [-6, 6], [7, 8], [-3, -12]]) this.ellipse(px, py, 1, 1.5, '#b28a54');
    if (equipment.armor) {
      this.path([[-10, 4], [10, 3], [8, 14], [-7, 15]], '#b4b8a1', '#79866b');
      c.strokeStyle = '#e5e3cd'; this.path([[-7, 6], [7, 5]], null, '#e5e3cd', false);
      for (let i = 0; i < equipment.armor; i++) this.ellipse(-5 + i * 5, 10, 1.1, 1.1, '#728068');
    }
    if (equipment.braces) this.path([[-9, -11], [10, 9], [7, 12], [-11, -8]], '#d5c6a0');
    if (equipment.airbag) this.ellipse(8, 11, 5, 6, '#ebd4ad', '#a49a88');
    if (health < .8) this.path([[7, -13], [3, -8], [7, -4], [3, 1]], null, '#896140', false);
    if (health < .4) this.path([[-6, 3], [-2, 7], [-5, 11], [-2, 15]], null, '#896140', false);
    c.fillStyle = '#b85239'; c.fillRect(-10, 3, 21, 4);
    if (equipment.pads) {
      c.beginPath(); c.roundRect(-10, 12, 20, 6 + equipment.pads, 3); c.fillStyle = '#859471'; c.fill(); c.strokeStyle = '#5f7458'; c.stroke();
      this.path([[-6, 15], [6, 15]], null, '#c1c9a6', false);
    }
    // Flight goggles, strap, glints and a quietly determined smile.
    c.fillStyle = '#655a43'; c.fillRect(-12, -7, 24, 4);
    this.ellipse(-5, -5, 6, 5.5, '#dce8d4', '#596551'); this.ellipse(7, -5, 6, 5.5, '#dce8d4', '#596551');
    this.path([[-1, -5], [2, -5]], null, '#596551', false);
    const lookX = (this.lookX || 0) + (this.reducedMotion ? 0 : Math.sin(time * 1.4) * .9), lookY = this.lookY || 0;
    const blink = !this.reducedMotion && time % 4.4 < .13;
    this.ellipse(-5 + lookX, -5 + lookY, blink ? 3 : 1.5, blink ? .6 : 2.2, '#364b3d'); this.ellipse(7 + lookX, -5 + lookY, blink ? 3 : 1.5, blink ? .6 : 2.2, '#364b3d');
    this.path([[-8, -7], [-5, -8]], null, '#fffef1', false); this.path([[4, -7], [7, -8]], null, '#fffef1', false);
    c.beginPath(); c.moveTo(5, 0); c.quadraticCurveTo(7, 2, 9, 0); c.strokeStyle = '#865e3b'; c.stroke();
    if (look.eyewear === 'shades') {
      this.path([[-12,-10],[13,-10]],null,'#27233a',false);
      this.path([[-11,-9],[-1,-9],[-2,-2],[-9,-2]],'#302d48','#161827');
      this.path([[2,-9],[13,-9],[11,-2],[3,-2]],'#302d48','#161827');
      this.path([[4,-8],[8,-5]],null,'#a5d7e0',false);
    }
    if (look.hat === 'bucket') {
      this.path([[-12,-15],[-9,-31],[8,-31],[13,-15]],'#91a9ad','#424c68');
      this.path([[-15,-15],[16,-15]],null,'#d9e1d2',false);
      this.ellipse(0,-24,2,2,'#f6c76a');
    } else if (look.hat === 'crown') {
      this.path([[-12,-15],[-15,-30],[-5,-24],[0,-34],[5,-24],[14,-30],[11,-15]],'#f6cc68','#916847');
      this.ellipse(0,-20,2,3,'#e96c9b');
    }
    c.restore(); c.restore();
  }
  burst(s) {
    const destroyed = s.health <= 0;
    const count = this.reducedMotion ? 6 : destroyed ? 28 : 9;
    for (let i = 0; i < count; i++) {
      const a = i * 2.39996;
      this.particles.push({ x: s.x, y: s.y, vx: Math.cos(a) * (3 + i % 5 * 2), vy: 5 + Math.sin(a) * 6, life: 1, size: destroyed ? 3 + i % 4 : 1.5, color: destroyed ? ['#e3c995', '#d9b77c', '#efe0b7'][i % 3] : '#b5bd8a' });
    }
  }
  draw({ flight, settings, equipment, phase, best, time, delta, alpha, theme = 'junk', wind = 0, seed = 1, traffic = true, charge = 0, level = 'ground', appearance = {} }) {
    this.appearance = appearance;
    this.shotAge = flight ? flight.elapsed + (flight.ended && this.endedAt !== null ? time-this.endedAt : 0) : Infinity;
    this.level = level; this.theme = theme; this.wind = wind; this.boosting = flight && flight.elapsed > .6 && flight.elapsed < 2.6; this.charge = charge;
    const c = this.ctx;
    let px = 0, py = levelConfig(level).launchHeight;
    if (flight) {
      px = flight.previousX + (flight.x - flight.previousX) * alpha;
      py = flight.previousY + (flight.y - flight.previousY) * alpha;
      if (flight.ended) { px = flight.x; py = flight.y; }
    }
    // Upper worlds track altitude instead of shrinking the potato into a pixel.
    const baseScale = this.height / (level === 'ground' ? 100 : level === 'sky' ? 210 : 270);
    const targetScale = level === 'ground' && flight && flight.elapsed < .32 ? baseScale : level === 'ground' ? Math.min(baseScale, (this.ground - 70) / Math.max(py, 1)) : baseScale;
    this.scale += (targetScale - this.scale) * (1 - Math.exp(-delta * 8));
    const target = flight ? Math.max(0, px - (this.width * .32 - this.origin) / this.scale) : 0;
    this.camera += (target - this.camera) * (1 - Math.exp(-delta * 8));
    const verticalTarget = level === 'ground' ? 0 : Math.max(0, py - this.height * .4 / this.scale);
    this.cameraY = verticalTarget;
    if (level !== 'ground') this.highBackground(time);
    else if (theme === 'classic') this.classicBackground(time); else this.junkBackground(time);
    const left = this.camera - this.origin / this.scale;
    const right = left + this.width / this.scale;
    for (const o of obstaclesBetween(left, right, level)) {
      c.save(); if (flight && (flight.updraftTime.get(o.id) || 0) >= C.updraftDuration) c.globalAlpha = .15;
      this.obstacle(o, time); c.restore();
    }
    for (const p of pickupsBetween(left - 5, right + 5, level, flight?.seed ?? seed)) if (!flight?.collected.has(p.id)) this.pickup(p, time);
    if (flight?.ended && this.endedAt === null) this.endedAt = time;
    if (flight) this.wrecks(flight, time);
    if (traffic) for (const vehicle of trafficBetween(left, right, flight?.elapsed || 0, seed, level)) if (!flight?.trafficHits.has(vehicle.id)) this.vehicle(vehicle, time);
    if (best > 0 && this.x(best) > -30 && this.x(best) < this.width + 30) {
      const x = this.x(best); c.save(); c.setLineDash([3, 4]); c.lineWidth = 1; this.path([[x, this.ground], [x, this.ground - 58]], null, '#a28856', false); c.setLineDash([]);
      this.path([[x, this.ground - 58], [x + 28, this.ground - 58], [x + 24, this.ground - 46], [x, this.ground - 46]], '#ccb77e');
      c.fillStyle = '#fff8dc'; c.font = '8px "Comic Neue", sans-serif'; c.textAlign = 'left'; c.fillText('BEST', x + 3, this.ground - 49); c.restore();
    }
    const loaded = phase === 'ready' || phase === 'charging';
    this.lookX = flight ? clamp(flight.vx * .05, -2, 2) : Math.cos(settings.angle * Math.PI / 180) * 1.6;
    this.lookY = flight ? clamp(-flight.vy * .025, -1.5, 1.5) : -Math.sin(settings.angle * Math.PI / 180) * 1.6;
    this.cannon(settings.angle, equipment, time, loaded);
    if (loaded) this.aimGuide(settings.angle, charge, phase === 'charging');
    if (flight) {
      if (flight.elapsed - this.lastTrail > .065 && !flight.ended) {
        this.trail.push({ x: flight.x, y: flight.y }); this.lastTrail = flight.elapsed;
        if (this.trail.length > 55) this.trail.shift();
      }
      for (let i = 0; i < this.trail.length; i++) {
        const p = this.trail[i]; c.globalAlpha = i / this.trail.length * .3;
        this.ellipse(this.x(p.x), this.y(p.y), 1.6, 1.6, '#fbf8dc');
      }
      c.globalAlpha = 1;
      if (flight.eventSerial !== this.lastEvent) { if (['launch', 'destroyed', 'laser', 'bounce', 'mushroom', 'hay', 'boost', 'updraft', 'traffic-bounce'].includes(flight.event)) this.burst(flight); this.lastEvent = flight.eventSerial; }
      if(flight.vx < -3 && !flight.ended){
        const border=this.x(Math.max(C.rearLaserStart,flight.distance-C.rearLaserDistance));
        c.save();c.globalAlpha=.65;c.strokeStyle='#ff789b';c.lineWidth=2;c.setLineDash([6,5]);
        c.beginPath();c.moveTo(Math.max(8,border),20);c.lineTo(Math.max(8,border),this.ground);c.stroke();
        c.setLineDash([]);c.font='18px Bangers';c.fillStyle='#ffe0da';c.fillText('SICHERHEITSLASER',Math.max(12,border+8),42);c.restore();
      }
      if(flight.reason==='laser' && time-this.endedAt<.4){
        c.save();c.globalAlpha=1-(time-this.endedAt)/.4;c.strokeStyle='#f65b9d';c.lineWidth=12;
        c.beginPath();c.moveTo(0,this.y(flight.y));c.lineTo(this.x(flight.x),this.y(flight.y));c.stroke();
        c.strokeStyle='#fff5d6';c.lineWidth=3;c.stroke();c.restore();
      }
      if(!this.reducedMotion && !flight.ended && flight.elapsed<.32){
        const norm=Math.hypot(flight.vx,flight.vy),dx=flight.vx/norm,dy=-flight.vy/norm;
        c.save();c.strokeStyle='#fff1c0';c.globalAlpha=(1-flight.elapsed/.32)*.7;c.lineWidth=2;
        for(const offset of [-10,0,10]){c.beginPath();c.moveTo(this.x(px)-dx*18-dy*offset,this.y(py)-dy*18+dx*offset);c.lineTo(this.x(px)-dx*70-dy*offset,this.y(py)-dy*70+dx*offset);c.stroke();}c.restore();
      }
      this.garden(flight, time);
      if (flight.health > 0) {
        this.ellipse(this.x(px), this.y(0) + 1, 9 + Math.max(0, 10 - py * .1), 2.5, '#4d613222');
        const rolling = flight.y <= C.radius + .1 && Math.abs(flight.vy) < 1.3;
        const rotation = rolling ? flight.rollAngle : flight.ended ? .2 : clamp(-Math.atan2(flight.vy, Math.abs(flight.vx)) * .35, -.6, .6);
        const squash = this.reducedMotion ? 0 : Math.max(0, 1 - (time - (this.lastSquash ?? -10)) / .25);
        this.potato(this.x(px), this.y(py), rotation, flight.equipment, flight.health / flight.maxHealth, flight.wingHealth, time, null, squash);
        this.attachedHealth(this.x(px), this.y(py), flight.health / flight.maxHealth, flight.equipment);
      }
    }
    for (const p of this.particles) {
      p.x += p.vx * delta; p.y += p.vy * delta; p.vy -= 12 * delta; p.life -= delta * .7;
      c.globalAlpha = Math.max(0, p.life); this.ellipse(this.x(p.x), this.y(Math.max(.5, p.y)), p.size, p.size * .8, p.color);
    }
    this.particles = this.particles.filter(p => p.life > 0); c.globalAlpha = 1;
  }
}
