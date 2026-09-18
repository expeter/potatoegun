import { CONFIG as C, clamp } from './config.mjs';
import { obstaclesBetween, equipmentStats } from './physics.mjs';

const TAU = Math.PI * 2;
const colors = { ink: '#43533b', grass: '#819c56', earth: '#c6cb98', potato: '#d6ad70', outline: '#826943' };

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = 0;
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
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scale = this.height / 100;
    this.ground = this.height * 0.82;
    this.origin = Math.min(100, this.width * 0.2);
  }
  reset() { this.trail = []; this.particles = []; this.camera = 0; this.lastTrail = -1; this.lastEvent = 0; }
  x(world) { return this.origin + (world - this.camera) * this.scale; }
  y(world) { return this.ground - world * this.scale; }
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
  background(time) {
    const c = this.ctx, w = this.width, h = this.height;
    const sky = c.createLinearGradient(0, 0, 0, this.ground);
    sky.addColorStop(0, '#e6edda'); sky.addColorStop(1, '#f0f0d9');
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    this.ellipse(w * .72, h * .2, 31, 31, '#f3ecc5');
    this.ellipse(w * .72, h * .2, 39, 39, '#f3ecc530');
    const drift = this.reducedMotion ? 0 : Math.sin(time * .07) * 4;
    for (let i = -1; i < Math.ceil(w / 220) + 2; i++) {
      const x = i * 225 + 70 - (this.camera * .22 % 225) + drift;
      this.cloud(x, h * (.19 + (i % 3) * .07), .7 + (Math.abs(i) % 3) * .2, .72);
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
    for (let i = -1; i < Math.ceil(w / 160) + 2; i++) {
      const x = i * 160 + 33 - this.camera * .36 % 160;
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
      c.fillStyle = '#7f9160'; c.font = '8px Arial'; c.textAlign = 'center'; c.fillText(`${meter} m`, x, this.ground + 29);
    }
    // Tiny birds above the field.
    for (let i = 0; i < 3; i++) {
      const x = w * .54 + i * 13 - (this.camera * .05 % 40), y = h * .19 + Math.sin(i * 1.7) * 7;
      c.lineWidth = 1; c.strokeStyle = '#8b9b7a'; c.beginPath(); c.moveTo(x - 4, y); c.quadraticCurveTo(x - 2, y - 3, x, y); c.quadraticCurveTo(x + 2, y - 3, x + 4, y); c.stroke();
    }
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
  obstacle(o, time) {
    const c = this.ctx, x = this.x(o.x), top = this.y(o.height), width = o.width * this.scale;
    c.save();
    if (o.type === 'mushroom') {
      this.ellipse(x + width / 2, this.ground + 1, width * .65, 3, '#6d874533');
      c.fillStyle = '#e5d9ac'; c.strokeStyle = '#9d9366'; c.lineWidth = 1;
      c.beginPath(); c.roundRect(x + width * .4, top + 7, width * .2, this.ground - top - 7, 2); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(x - 1, top + 9); c.bezierCurveTo(x - 1, top - 4, x + width, top - 5, x + width + 1, top + 9); c.quadraticCurveTo(x + width / 2, top + 14, x - 1, top + 9); c.fillStyle = '#cd7950'; c.fill(); c.strokeStyle = '#a86945'; c.stroke();
      this.ellipse(x + width * .3, top + 5, 3, 2, '#efe2be'); this.ellipse(x + width * .66, top + 3, 3, 2, '#efe2be');
      this.ellipse(x + width * .8, top + 8, 2, 1.4, '#efe2be');
    } else if (o.type === 'hay') {
      this.ellipse(x + width / 2, this.ground + 2, width * .6, 3, '#6d874533');
      c.fillStyle = '#dcc786'; c.strokeStyle = '#ad955b'; c.lineWidth = 1.3;
      c.beginPath(); c.roundRect(x, top, width, this.ground - top, 4); c.fill(); c.stroke();
      c.strokeStyle = '#c2ab6c'; c.lineWidth = .8;
      for (let i = 4; i < this.ground - top; i += 4) { c.beginPath(); c.moveTo(x + 3, top + i); c.lineTo(x + width - 3, top + i - 1); c.stroke(); }
      c.strokeStyle = '#9d935f'; c.lineWidth = 2;
      this.path([[x + width * .25, top], [x + width * .25, this.ground]], null, '#a89a60', false);
      this.path([[x + width * .75, top], [x + width * .75, this.ground]], null, '#a89a60', false);
    } else {
      const fade = c.createLinearGradient(x, 0, x + width, 0);
      fade.addColorStop(0, '#e4eed900'); fade.addColorStop(.5, '#f1f7e447'); fade.addColorStop(1, '#e4eed900');
      c.fillStyle = fade; c.fillRect(x, top, width, this.ground - top);
      c.strokeStyle = '#91ac7575'; c.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        const px = x + width * (.12 + i * .17);
        const phase = this.reducedMotion ? .5 : (time * .2 + i * .23) % 1;
        const py = this.ground - 8 - phase * (this.ground - top - 22);
        c.beginPath(); c.moveTo(px, py); c.bezierCurveTo(px - 7, py - 9, px + 9, py - 12, px + 2, py - 25); c.stroke();
        this.path([[px - 1, py - 20], [px + 2, py - 25], [px + 5, py - 21]], null, '#91ac7575', false);
      }
    }
    c.restore();
  }
  cannon(angle) {
    const c = this.ctx, x = this.x(0), y = this.ground;
    if (x < -120) return;
    c.save(); c.translate(x - 14, y - 13);
    this.ellipse(0, 14, 39, 5, '#596e3830');
    c.lineWidth = 2;
    this.path([[-27, 8], [-18, -12], [20, -12], [31, 8]], '#8a7650', '#6a6345');
    c.save(); c.translate(4, -6); c.rotate(-angle * Math.PI / 180);
    c.beginPath(); c.roundRect(-22, -12, 55, 24, 5); c.fillStyle = '#586746'; c.fill(); c.strokeStyle = '#3e503b'; c.stroke();
    c.fillStyle = '#7d8960'; c.fillRect(-7, -12, 7, 24); c.fillRect(23, -13, 8, 26);
    this.ellipse(34, 0, 4, 12, '#3e4d37', '#354332');
    c.fillStyle = '#bcc69a'; c.font = 'bold 7px Arial'; c.textAlign = 'center'; c.fillText('K-01', 11, 3);
    c.restore();
    for (const wx of [-18, 21]) {
      this.ellipse(wx, 7, 12, 12, '#6f6448', '#4f523a'); this.ellipse(wx, 7, 8, 8, '#b29e6c', '#716545'); this.ellipse(wx, 7, 3, 3, '#77704d');
      for (let a = 0; a < TAU; a += TAU / 5) this.path([[wx + Math.cos(a) * 3, 7 + Math.sin(a) * 3], [wx + Math.cos(a) * 8, 7 + Math.sin(a) * 8]], null, '#786e4b', false);
    }
    c.restore();
    // Start flag.
    c.lineWidth = 1.5;
    this.path([[x - 48, y], [x - 48, y - 44]], null, '#89926b', false);
    this.path([[x - 48, y - 44], [x - 28, y - 40], [x - 48, y - 31]], '#d58a61');
  }
  potato(x, y, rotation, equipment, health = 1, wingHealth = 1, time = 0) {
    const c = this.ctx; c.save(); c.translate(x, y); c.rotate(rotation); c.lineWidth = 1.2;
    // The hero is intentionally larger than life, with equipment easy to read.
    const size = Math.max(.75, this.scale / 4.3); c.scale(size, size);
    if (equipment.wings) {
      c.save(); c.rotate((1 - wingHealth) * .7);
      this.path([[-3, 0], [-28 - equipment.wings * 3, -7], [-30, 3], [-9, 12], [4, 7]], '#eee8c8', '#9ba283');
      this.path([[-5, 3], [-28, -2]], null, '#b4b69b', false); c.restore();
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
    this.ellipse(-3, -5, 1.3, 2, '#364b3d'); this.ellipse(9, -5, 1.3, 2, '#364b3d');
    this.path([[-8, -7], [-5, -8]], null, '#fffef1', false); this.path([[4, -7], [7, -8]], null, '#fffef1', false);
    c.beginPath(); c.moveTo(5, 0); c.quadraticCurveTo(7, 2, 9, 0); c.strokeStyle = '#865e3b'; c.stroke();
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
  draw({ flight, settings, equipment, phase, best, time, delta, alpha }) {
    const c = this.ctx;
    let px = 0, py = C.launchHeight;
    if (flight) {
      px = flight.previousX + (flight.x - flight.previousX) * alpha;
      py = flight.previousY + (flight.y - flight.previousY) * alpha;
      if (flight.ended) { px = flight.x; py = flight.y; }
    }
    const target = flight ? Math.max(0, px - (this.width * .32 - this.origin) / this.scale) : 0;
    this.camera += (target - this.camera) * (1 - Math.exp(-delta * 8));
    // Zoom out vertically only for unusually high flights; physics stays unchanged.
    const baseScale = this.height / 100;
    const targetScale = Math.min(baseScale, (this.ground - 70) / Math.max(py, 1));
    this.scale += (targetScale - this.scale) * (1 - Math.exp(-delta * 6));
    this.background(time);
    const left = this.camera - this.origin / this.scale;
    for (const o of obstaclesBetween(left, left + this.width / this.scale)) this.obstacle(o, time);
    if (best > 0 && this.x(best) > -30 && this.x(best) < this.width + 30) {
      const x = this.x(best); c.save(); c.setLineDash([3, 4]); c.lineWidth = 1; this.path([[x, this.ground], [x, this.ground - 58]], null, '#a28856', false); c.setLineDash([]);
      this.path([[x, this.ground - 58], [x + 28, this.ground - 58], [x + 24, this.ground - 46], [x, this.ground - 46]], '#ccb77e');
      c.fillStyle = '#fff8dc'; c.font = '8px Arial'; c.textAlign = 'left'; c.fillText('BEST', x + 3, this.ground - 49); c.restore();
    }
    this.cannon(settings.angle);
    if (phase === 'ready') {
      const speed = Math.sqrt(2 * settings.energy * C.energyMultiplier / equipmentStats(equipment).mass), angle = settings.angle * Math.PI / 180;
      c.save(); c.setLineDash([2, 7]); c.lineWidth = 1.5; c.strokeStyle = '#79896970'; c.beginPath();
      for (let t = 0; t <= .9; t += .03) {
        const x = this.x(speed * Math.cos(angle) * t), y = this.y(C.launchHeight + speed * Math.sin(angle) * t - .5 * C.gravity * t * t);
        if (t === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke(); c.restore();
      this.potato(this.x(0) + 13, this.y(C.launchHeight) - 24, -.1, equipment, 1, 1, time);
    }
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
      if (flight.eventSerial !== this.lastEvent) { if (['destroyed', 'bounce', 'mushroom', 'hay'].includes(flight.event)) this.burst(flight); this.lastEvent = flight.eventSerial; }
      if (flight.health > 0) {
        this.ellipse(this.x(px), this.ground + 1, 9 + Math.max(0, 10 - py * .1), 2.5, '#4d613222');
        const rotation = flight.ended ? .2 : clamp(-Math.atan2(flight.vy, Math.abs(flight.vx)) * .35, -.6, .6);
        this.potato(this.x(px), this.y(py), rotation, flight.equipment, flight.health / flight.maxHealth, flight.wingHealth, time);
      }
    }
    for (const p of this.particles) {
      p.x += p.vx * delta; p.y += p.vy * delta; p.vy -= 12 * delta; p.life -= delta * .7;
      c.globalAlpha = Math.max(0, p.life); this.ellipse(this.x(p.x), this.y(Math.max(.5, p.y)), p.size, p.size * .8, p.color);
    }
    this.particles = this.particles.filter(p => p.life > 0); c.globalAlpha = 1;
  }
}
