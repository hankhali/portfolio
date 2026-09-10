/* Story stage — one WebGL object that turns into a working miniature of
   whichever project is on screen.

   Every state is the same pool of N points and M line segments, each with a
   "from" and a "to" position; a single uMix uniform morphs between them, so
   the sphere in the hero literally swims into the next scene. States can also
   animate: each frame they move a handful of their own points (a Pong ball,
   votes in flight, a chat message fanning out, a scan line) and the lines
   attached to those points follow.

   Loaded lazily by main.js after first paint; never blocks render. */

import * as THREE from './assets/vendor/three.module.min.js';

const N = 1024;   // point budget
const M = 2048;   // segment budget

// Ashima simplex noise — standard GLSL 3D noise, MIT.
const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

// Shared by points and line endpoints so a line never detaches from its node:
// the result depends only on (from, to, seed, time), never on which primitive
// is asking.
const MORPH = /* glsl */`
uniform float uTime; uniform float uMix; uniform float uNoiseAmt;
vec3 morph(vec3 from, vec3 to, float seed, out float n){
  vec3 p = mix(from, to, uMix);
  vec3 dir = normalize(p + vec3(0.0005, 0.0003, 0.0007));
  // Mid-transition bulge: the swarm breathes out, then settles.
  p += dir * sin(uMix * 3.14159) * 0.55;
  n = snoise(dir * 1.7 + uTime * 0.16);
  p += dir * n * uNoiseAmt;
  // Faint idle shimmer so nothing ever looks frozen.
  p += vec3(sin(uTime * 0.7 + seed * 9.0), cos(uTime * 0.6 + seed * 7.0), sin(uTime * 0.5 + seed * 5.0)) * 0.008;
  return p;
}`;

const POINT_VERT = NOISE + MORPH + /* glsl */`
uniform float uPixelRatio; uniform float uSize;
attribute vec3 aTo; attribute float aAlphaFrom; attribute float aAlphaTo; attribute float aSeed; attribute float aSize;
varying float vNoise; varying float vAlpha;
void main(){
  float n; vec3 p = morph(position, aTo, aSeed, n);
  vNoise = n; vAlpha = mix(aAlphaFrom, aAlphaTo, uMix);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPixelRatio * aSize * (0.8 + vAlpha * 0.5 + n * 0.3) / -mv.z;
}`;

const POINT_FRAG = /* glsl */`
uniform vec3 uColorA; uniform vec3 uColorB; uniform float uBright;
varying float vNoise; varying float vAlpha;
void main(){
  if (vAlpha < 0.01) discard;
  float r = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.08, r) * vAlpha;
  vec3 col = mix(uColorA, uColorB, vNoise * 0.5 + 0.5) * uBright;
  gl_FragColor = vec4(col, a);
}`;

const EDGE_VERT = NOISE + MORPH + /* glsl */`
attribute vec3 aTo; attribute float aAlphaFrom; attribute float aAlphaTo; attribute float aSeed;
attribute float aProgress; attribute float aOffset; attribute float aSpeed;
varying float vProgress; varying float vOffset; varying float vSpeed; varying float vNoise; varying float vAlpha;
void main(){
  float n; vec3 p = morph(position, aTo, aSeed, n);
  vProgress = aProgress; vOffset = aOffset; vSpeed = aSpeed; vNoise = n;
  vAlpha = mix(aAlphaFrom, aAlphaTo, uMix);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const EDGE_FRAG = /* glsl */`
uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB; uniform vec3 uColorC;
uniform float uBase; uniform float uGlow; uniform float uPulseRate;
varying float vProgress; varying float vOffset; varying float vSpeed; varying float vNoise; varying float vAlpha;
void main(){
  if (vAlpha < 0.01) discard;
  // Each edge pulses for a quarter of its cycle, so the object sparkles rather than strobes.
  float t = fract(uTime * uPulseRate * vSpeed + vOffset) * 4.0;
  float pulse = t < 1.0 ? smoothstep(0.16, 0.0, abs(vProgress - t)) : 0.0;
  vec3 base = mix(uColorA, uColorB, vNoise * 0.5 + 0.5);
  vec3 col = base * uBase + uColorC * pulse * uGlow;
  float a = (0.3 + pulse * 0.9) * vAlpha;
  gl_FragColor = vec4(col, a);
}`;

const DUST_VERT = /* glsl */`
uniform float uTime; uniform float uPixelRatio;
attribute float aSeed;
varying float vSeed;
void main(){
  vec3 p = position;
  p.y += sin(uTime * 0.25 + aSeed * 6.283) * 0.12;
  p.x += cos(uTime * 0.2 + aSeed * 6.283) * 0.12;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.2 + aSeed * 2.2) * uPixelRatio * 4.0 / -mv.z;
  vSeed = aSeed;
}`;

const DUST_FRAG = /* glsl */`
uniform vec3 uColor; uniform float uTime; uniform float uBright;
varying float vSeed;
void main(){
  float r = length(gl_PointCoord - 0.5);
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.8 + vSeed) + vSeed * 20.0);
  float a = smoothstep(0.5, 0.1, r) * twinkle * 0.7;
  gl_FragColor = vec4(uColor * uBright, a);
}`;

const CORE_VERT = /* glsl */`
varying vec3 vNormal; varying vec3 vView;
void main(){
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const CORE_FRAG = /* glsl */`
uniform vec3 uColorA; uniform vec3 uColorB; uniform float uBright;
varying vec3 vNormal; varying vec3 vView;
void main(){
  float fresnel = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.6);
  vec3 col = mix(uColorA, uColorB, fresnel) * uBright;
  gl_FragColor = vec4(col, fresnel * 0.9);
}`;

const THEMES = {
  dark:  { a: '#7c5cff', b: '#22d3ee', c: '#f472b6', dust: '#a78bfa',
           base: 0.4, glow: 1.5, bright: 1.35, blend: THREE.AdditiveBlending },
  light: { a: '#5b21b6', b: '#0e7490', c: '#be185d', dust: '#6d28d9',
           base: 0.95, glow: 1.0, bright: 0.85, blend: THREE.NormalBlending },
};

/* ------------------------------------------------------------------------
   State builders.

   build(fn) calls fn(P, E, ctx). P(x,y,z,alpha,size) adds a point and returns
   its index; E(a,b,alpha) adds a directed edge a -> b (pulses travel that
   way). ctx.animate = (time, dt, set, data) => {...} may move points each
   frame with set(idx, x, y, z); lines attached to that point follow.
   Unused slots collapse to the origin with alpha 0, so new elements emerge
   from the core and vanish back into it.
   ------------------------------------------------------------------------ */

function build(fn) {
  const pts = [], alphas = [], sizes = [], edges = [], ealphas = [];
  const P = (x, y, z, a = 1, s = 1) => { pts.push(x, y, z); alphas.push(a); sizes.push(s); return pts.length / 3 - 1; };
  const E = (a, b, al = 1) => { edges.push(a, b); ealphas.push(al); };
  const ctx = { animate: null };
  fn(P, E, ctx);

  const pos = new Float32Array(N * 3), alp = new Float32Array(N), siz = new Float32Array(N).fill(1);
  const np = Math.min(pts.length / 3, N);
  for (let i = 0; i < np; i++) {
    pos[i * 3] = pts[i * 3]; pos[i * 3 + 1] = pts[i * 3 + 1]; pos[i * 3 + 2] = pts[i * 3 + 2];
    alp[i] = alphas[i]; siz[i] = sizes[i];
  }
  const lpos = new Float32Array(M * 6), lalp = new Float32Array(M * 2), lseed = new Float32Array(M * 2);
  const slots = new Map();   // point index -> line vertex indices that copy it
  const ne = Math.min(edges.length / 2, M);
  for (let i = 0; i < ne; i++) {
    const a = edges[i * 2], b = edges[i * 2 + 1];
    for (let k = 0; k < 3; k++) { lpos[i * 6 + k] = pts[a * 3 + k]; lpos[i * 6 + 3 + k] = pts[b * 3 + k]; }
    const al = Math.min(ealphas[i], alphas[a], alphas[b]);
    lalp[i * 2] = al; lalp[i * 2 + 1] = al;
    lseed[i * 2] = a; lseed[i * 2 + 1] = b;
    if (!slots.has(a)) slots.set(a, []); slots.get(a).push(i * 2);
    if (!slots.has(b)) slots.set(b, []); slots.get(b).push(i * 2 + 1);
  }
  return { pos, alp, siz, lpos, lalp, lseed, np, ne, slots, animate: ctx.animate };
}

const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const tri = (t) => 1 - Math.abs((t % 2) - 1);           // 0..1..0 triangle wave
const easeIn = (t) => t * t;

// Polyline helpers.
function chain(P, E, points, alpha = 1, size = 1, close = false) {
  const ids = points.map(([x, y, z = 0]) => P(x, y, z, alpha, size));
  for (let i = 0; i < ids.length - 1; i++) E(ids[i], ids[i + 1], alpha);
  if (close) E(ids[ids.length - 1], ids[0], alpha);
  return ids;
}
function rect(P, E, x0, y0, x1, y1, n, alpha, size = 1) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push([lerp(x0, x1, i / n), y0]);
  for (let i = 0; i < n; i++) pts.push([x1, lerp(y0, y1, i / n)]);
  for (let i = 0; i < n; i++) pts.push([lerp(x1, x0, i / n), y1]);
  for (let i = 0; i < n; i++) pts.push([x0, lerp(y1, y0, i / n)]);
  return chain(P, E, pts, alpha, size, true);
}
function ring(P, E, cx, cy, r, n, alpha, size = 1, z = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]); }
  return chain(P, E, pts, alpha, size, true);
}

const STATES = {
  // The hero: an abstract network.
  sphere: () => build((P, E) => {
    const g = new THREE.IcosahedronGeometry(2, 3);
    const map = new Map();
    const idx = (x, y, z) => {
      const k = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
      if (!map.has(k)) map.set(k, P(x, y, z));
      return map.get(k);
    };
    const e = new THREE.EdgesGeometry(g).attributes.position;
    for (let i = 0; i < e.count; i += 2) {
      E(idx(e.getX(i), e.getY(i), e.getZ(i)), idx(e.getX(i + 1), e.getY(i + 1), e.getZ(i + 1)));
    }
  }),

  // Transcendence: a live Pong rally. Two paddles track the ball; above the
  // court sits the server every paddle move is sent to, and which pushes the
  // authoritative state back down.
  realtime: () => build((P, E, ctx) => {
    const W = 2.2, H = 1.35;
    rect(P, E, -W, -H, W, H, 14, 0.7);                                   // court
    for (let y = -H + 0.15; y < H; y += 0.3) P(0, y, 0, 0.35, 0.8);      // centre line

    const paddle = (x) => {
      const pts = []; for (let i = 0; i < 9; i++) pts.push([x, -0.4 + i * 0.1]);
      return chain(P, E, pts, 1, 1.6);
    };
    const L = paddle(-W + 0.22), R = paddle(W - 0.22);

    const ballC = P(0, 0, 0, 1, 2.2);
    const ballR = ring(P, E, 0, 0, 0.12, 7, 1, 1.0);
    ballR.forEach((id) => E(ballC, id, 0.9));

    // Server above the court: paddles report up, state comes back down.
    const sc = P(0, 2.05, 0, 1, 1.4);
    const sr = ring(P, E, 0, 2.05, 0.28, 10, 0.9, 0.9);
    sr.forEach((id) => E(sc, id, 0.6));
    E(L[8], sr[7]); E(sr[6], L[8]);
    E(R[8], sr[2]); E(sr[3], R[8]);

    // Rally physics. The AI never misses; the point is the loop, not the game.
    const ball = { x: 0, y: 0.2, vx: 2.4, vy: 1.5 };
    const pad = { l: 0, r: 0 };
    ctx.animate = (time, dt, set) => {
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.y > H - 0.12) { ball.y = H - 0.12; ball.vy = -Math.abs(ball.vy); }
      if (ball.y < -H + 0.12) { ball.y = -H + 0.12; ball.vy = Math.abs(ball.vy); }
      const hit = W - 0.34;
      if (ball.x > hit) { ball.x = hit; ball.vx = -Math.abs(ball.vx); ball.vy += (ball.y - pad.r) * 1.2; }
      if (ball.x < -hit) { ball.x = -hit; ball.vx = Math.abs(ball.vx); ball.vy += (ball.y - pad.l) * 1.2; }
      ball.vy = Math.max(-2.2, Math.min(2.2, ball.vy));

      set(ballC, ball.x, ball.y, 0);
      ballR.forEach((id, i) => { const a = i / 7 * TAU + time * 3; set(id, ball.x + Math.cos(a) * 0.12, ball.y + Math.sin(a) * 0.12, 0); });

      // Paddles chase the ball with a little lag, and stay inside the court.
      const k = Math.min(1, dt * 6);
      pad.l += (ball.y - pad.l) * k * (ball.vx < 0 ? 1 : 0.35);
      pad.r += (ball.y - pad.r) * k * (ball.vx > 0 ? 1 : 0.35);
      pad.l = Math.max(-H + 0.45, Math.min(H - 0.45, pad.l));
      pad.r = Math.max(-H + 0.45, Math.min(H - 0.45, pad.r));
      L.forEach((id, i) => set(id, -W + 0.22, pad.l - 0.4 + i * 0.1, 0));
      R.forEach((id, i) => set(id,  W - 0.22, pad.r - 0.4 + i * 0.1, 0));
    };
  }),

  // Poll voting: a crowd of voters, votes in flight, and a bar chart that is
  // the single tally everyone sees.
  poll: () => build((P, E, ctx) => {
    const heights = [1.2, 2.0, 0.8], xs = [-1.25, 0, 1.25], bases = [];
    heights.forEach((h, b) => {
      rect(P, E, xs[b] - 0.32, -0.3, xs[b] + 0.32, -0.3 + h, 5, 1);
      bases.push([xs[b], -0.3]);
      for (let y = -0.3 + 0.18; y < -0.3 + h - 0.05; y += 0.18) P(xs[b], y, 0, 0.55, 0.8);   // fill
    });
    const axisPts = []; for (let x = -2.1; x <= 2.1; x += 0.15) axisPts.push([x, -0.32]);
    chain(P, E, axisPts, 0.35, 0.7);

    const voters = [];
    for (let i = 0; i < 110; i++) voters.push(P(rand(-2.4, 2.4), rand(-2.35, -1.2), rand(-0.6, 0.6), 0.8));

    // Votes in flight: a handful of points on their way from a voter to a bar.
    const total = heights.reduce((s, h) => s + h, 0);
    const flyers = [];
    for (let i = 0; i < 14; i++) {
      const v = voters[Math.floor(Math.random() * voters.length)];
      const r = Math.random() * total;
      const b = r < heights[0] ? 0 : r < heights[0] + heights[1] ? 1 : 2;
      flyers.push({ id: P(0, 0, 0, 1, 1.7), v, b, phase: Math.random(), speed: 0.35 + Math.random() * 0.25 });
    }
    ctx.animate = (time, dt, set, data) => {
      flyers.forEach((f) => {
        const u = easeIn((time * f.speed + f.phase) % 1);
        const sx = data.pos[f.v * 3], sy = data.pos[f.v * 3 + 1], sz = data.pos[f.v * 3 + 2];
        const [tx, ty] = bases[f.b];
        set(f.id, lerp(sx, tx, u), lerp(sy, ty, u), lerp(sz, 0, u));
      });
    };
  }),

  // Inception: nested containers. Traffic reaches the outer one, some of it
  // the middle one, none of it the database in the centre.
  containers: () => build((P, E) => {
    const cube = (s, alpha) => {
      const corners = [];
      for (let i = 0; i < 8; i++) corners.push(P((i & 1 ? s : -s), (i & 2 ? s : -s), (i & 4 ? s : -s), alpha));
      const pairs = [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
      pairs.forEach(([a, b]) => {
        const ax = (a & 1 ? s : -s), ay = (a & 2 ? s : -s), az = (a & 4 ? s : -s);
        const bx = (b & 1 ? s : -s), by = (b & 2 ? s : -s), bz = (b & 4 ? s : -s);
        let prev = corners[a];
        for (let k = 1; k <= 3; k++) {
          const t = k / 4;
          const id = P(ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t, alpha);
          E(prev, id, alpha); prev = id;
        }
        E(prev, corners[b], alpha);
      });
      return corners;
    };
    const outer = cube(2.05, 0.75), mid = cube(1.3, 0.9), inner = cube(0.62, 1);
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * TAU;
      const w = P(Math.cos(a) * 3.1, rand(-0.6, 0.6), Math.sin(a) * 3.1, 0.8);
      E(w, outer[i % 8]);
    }
    [0, 3, 5, 6].forEach((i) => E(outer[i], mid[i]));
    void inner;   // sealed: nothing points at it
  }),

  // IRC: one server, many clients. A message goes in from one client and
  // fans out to everyone else — the event loop never waits on anyone.
  irc: () => build((P, E, ctx) => {
    const sc = P(0, 0, 0, 1, 1.5);
    const hub = ring(P, E, 0, 0, 0.32, 8, 0.9);
    hub.forEach((id) => E(sc, id, 0.5));

    const CL = 18, cpos = [];
    for (let i = 0; i < CL; i++) {
      const a = i / CL * TAU;
      const cx = Math.cos(a) * 2.35, cz = Math.sin(a) * 2.35, cy = Math.sin(a * 3) * 0.4;
      cpos.push([cx, cy, cz]);
      const c = P(cx, cy, cz, 1, 1.7);
      ring(P, E, cx, cy, 0.14, 6, 0.6, 0.7, cz);                        // tiny chat window
      E(c, hub[i % 8], 0.55); E(hub[(i + 4) % 8], c, 0.55);
    }

    // Messages: one inbound, then a fan-out to everyone else.
    const msgs = []; for (let i = 0; i < CL; i++) msgs.push(P(0, 0, 0, 1, 1.8));
    const CYCLE = 2.2;
    ctx.animate = (time, dt, set) => {
      const cyc = Math.floor(time / CYCLE), u = (time % CYCLE) / CYCLE;
      const from = cyc % CL;
      const [fx, fy, fz] = cpos[from];
      if (u < 0.32) {
        const t = easeIn(u / 0.32);
        msgs.forEach((id, i) => {
          if (i === from) set(id, lerp(fx, 0, t), lerp(fy, 0, t), lerp(fz, 0, t));
          else set(id, 0, 0, 0);
        });
      } else if (u < 0.4) {
        msgs.forEach((id) => set(id, 0, 0, 0));
      } else {
        const t = Math.min(1, (u - 0.4) / 0.45);
        msgs.forEach((id, i) => {
          if (i === from) { set(id, 0, 0, 0); return; }
          const [cx, cy, cz] = cpos[i];
          set(id, lerp(0, cx, t), lerp(0, cy, t), lerp(0, cz, t));
        });
      }
    };
  }),

  // Face recognition: an actual face made of points, a detection box locking
  // on, landmarks the model was tuned to find, and a scan line sweeping the frame.
  vision: () => build((P, E, ctx) => {
    // Faint pixel frame
    for (let r = 0; r < 11; r++) for (let c = 0; c < 15; c++) P((c - 7) * 0.32, (r - 5) * 0.3, -0.05, 0.18, 0.7);

    // Face
    const oval = ring(P, E, 0, 0.05, 0.86, 40, 0.9);
    const eyeL = ring(P, E, -0.34, 0.38, 0.13, 10, 1, 0.9);
    const eyeR = ring(P, E,  0.34, 0.38, 0.13, 10, 1, 0.9);
    const pupL = P(-0.34, 0.38, 0.02, 1, 1.4), pupR = P(0.34, 0.38, 0.02, 1, 1.4);
    const nose = chain(P, E, [[0, 0.22], [-0.1, -0.18], [0.02, -0.24], [0.12, -0.18]], 0.9);
    const mouth = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; mouth.push([lerp(-0.34, 0.34, t), -0.55 - Math.sin(t * Math.PI) * 0.12]); }
    const mouthIds = chain(P, E, mouth, 0.9);
    chain(P, E, [[-0.55, 0.66], [-0.34, 0.74], [-0.14, 0.66]], 0.7);   // brows
    chain(P, E, [[0.14, 0.66], [0.34, 0.74], [0.55, 0.66]], 0.7);

    // Landmark mesh
    E(eyeL[0], eyeR[5], 0.6); E(eyeL[7], nose[0], 0.6); E(eyeR[3], nose[0], 0.6);
    E(nose[1], mouthIds[0], 0.6); E(nose[3], mouthIds[10], 0.6);
    E(mouthIds[0], oval[27], 0.5); E(mouthIds[10], oval[33], 0.5);

    // Detection box with bright corner brackets
    rect(P, E, -1.25, -1.15, 1.25, 1.35, 8, 0.45);
    const bracket = (x, y, sx, sy) => chain(P, E, [[x + sx * 0.35, y], [x, y], [x, y + sy * 0.35]], 1, 1.1);
    bracket(-1.25, -1.15, 1, 1); bracket(1.25, -1.15, -1, 1); bracket(-1.25, 1.35, 1, -1); bracket(1.25, 1.35, -1, -1);

    // Scan line
    const scan = []; for (let i = 0; i <= 22; i++) scan.push([lerp(-2.25, 2.25, i / 22), 0]);
    const scanIds = chain(P, E, scan, 0.9, 0.8);
    ctx.animate = (time, dt, set) => {
      const y = 1.55 - tri(time * 0.32) * 3.1;
      scanIds.forEach((id, i) => set(id, lerp(-2.25, 2.25, i / 22), y, 0.04));
      // Pupils glance around a little.
      const gx = Math.sin(time * 0.9) * 0.04, gy = Math.cos(time * 0.7) * 0.03;
      set(pupL, -0.34 + gx, 0.38 + gy, 0.02); set(pupR, 0.34 + gx, 0.38 + gy, 0.02);
    };
  }),
};

// Per-state camera + motion settings.
const TUNING = {
  sphere:     { noise: 0.24, z: 7.4, spin: 0.09, sway: 0.08, tiltX: 0.0,  core: 1, pulse: 0.11, base: 1.0 },
  realtime:   { noise: 0.0,  z: 7.3, spin: 0.0,  sway: 0.14, tiltX: 0.08, core: 0, pulse: 0.22, base: 2.0 },
  poll:       { noise: 0.0,  z: 7.6, spin: 0.0,  sway: 0.18, tiltX: 0.14, core: 0, pulse: 0.2,  base: 1.6 },
  containers: { noise: 0.03, z: 8.4, spin: 0.12, sway: 0.0,  tiltX: 0.32, core: 0, pulse: 0.16, base: 1.2 },
  irc:        { noise: 0.0,  z: 7.6, spin: 0.1,  sway: 0.0,  tiltX: 0.55, core: 0, pulse: 0.24, base: 1.5 },
  vision:     { noise: 0.0,  z: 7.2, spin: 0.0,  sway: 0.12, tiltX: 0.04, core: 0, pulse: 0.14, base: 1.7 },
};

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function mountScene(container, { theme = 'dark', lowPower = false, state = 'sphere' } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0, 7.4);
  const group = new THREE.Group();
  scene.add(group);

  const t = THEMES[theme] || THEMES.dark;
  const col = (hex) => new THREE.Color(hex);

  /* --- Geometry pools --- */
  const cache = {};
  const stateData = (name) => (cache[name] ||= (STATES[name] || STATES.sphere)());

  const first = stateData(state);
  const pSeed = new Float32Array(N); for (let i = 0; i < N; i++) pSeed[i] = Math.random();

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position',   new THREE.BufferAttribute(first.pos.slice(), 3));
  pGeo.setAttribute('aTo',        new THREE.BufferAttribute(first.pos.slice(), 3));
  pGeo.setAttribute('aAlphaFrom', new THREE.BufferAttribute(first.alp.slice(), 1));
  pGeo.setAttribute('aAlphaTo',   new THREE.BufferAttribute(first.alp.slice(), 1));
  pGeo.setAttribute('aSize',      new THREE.BufferAttribute(first.siz.slice(), 1));
  pGeo.setAttribute('aSeed',      new THREE.BufferAttribute(pSeed, 1));

  const lProgress = new Float32Array(M * 2), lOffset = new Float32Array(M * 2), lSpeed = new Float32Array(M * 2);
  for (let i = 0; i < M; i++) {
    const off = Math.random(), sp = 0.5 + Math.random() * 0.9;
    lProgress[i * 2] = 0; lProgress[i * 2 + 1] = 1;
    lOffset[i * 2] = lOffset[i * 2 + 1] = off;
    lSpeed[i * 2] = lSpeed[i * 2 + 1] = sp;
  }
  const seedOf = (arr) => { const o = new Float32Array(arr.length); for (let i = 0; i < arr.length; i++) o[i] = pSeed[arr[i]] || 0; return o; };

  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute('position',   new THREE.BufferAttribute(first.lpos.slice(), 3));
  lGeo.setAttribute('aTo',        new THREE.BufferAttribute(first.lpos.slice(), 3));
  lGeo.setAttribute('aAlphaFrom', new THREE.BufferAttribute(first.lalp.slice(), 1));
  lGeo.setAttribute('aAlphaTo',   new THREE.BufferAttribute(first.lalp.slice(), 1));
  lGeo.setAttribute('aSeed',      new THREE.BufferAttribute(seedOf(first.lseed), 1));
  lGeo.setAttribute('aProgress',  new THREE.BufferAttribute(lProgress, 1));
  lGeo.setAttribute('aOffset',    new THREE.BufferAttribute(lOffset, 1));
  lGeo.setAttribute('aSpeed',     new THREE.BufferAttribute(lSpeed, 1));

  const shared = {
    uTime: { value: 0 }, uMix: { value: 1 }, uNoiseAmt: { value: TUNING[state].noise },
  };

  const pointMat = new THREE.ShaderMaterial({
    vertexShader: POINT_VERT, fragmentShader: POINT_FRAG,
    transparent: true, depthWrite: false, blending: t.blend,
    uniforms: { ...shared, uPixelRatio: { value: pixelRatio }, uSize: { value: 24 },
                uColorA: { value: col(t.a) }, uColorB: { value: col(t.b) }, uBright: { value: t.bright } },
  });
  const edgeMat = new THREE.ShaderMaterial({
    vertexShader: EDGE_VERT, fragmentShader: EDGE_FRAG,
    transparent: true, depthWrite: false, blending: t.blend,
    uniforms: { ...shared, uColorA: { value: col(t.a) }, uColorB: { value: col(t.b) }, uColorC: { value: col(t.c) },
                uBase: { value: t.base }, uGlow: { value: t.glow }, uPulseRate: { value: TUNING[state].pulse } },
  });
  const points = new THREE.Points(pGeo, pointMat); points.frustumCulled = false;
  const lines  = new THREE.LineSegments(lGeo, edgeMat); lines.frustumCulled = false;
  group.add(lines, points);

  /* --- Fresnel core (hero only) --- */
  const coreMat = new THREE.ShaderMaterial({
    vertexShader: CORE_VERT, fragmentShader: CORE_FRAG,
    transparent: true, depthWrite: false, blending: t.blend,
    uniforms: { uColorA: { value: col(t.a) }, uColorB: { value: col(t.b) }, uBright: { value: t.bright * 0.75 } },
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.55, 48, 48), coreMat);
  group.add(core);

  /* --- Ambient dust --- */
  const dustCount = lowPower ? 220 : 420;
  const dustPos = new Float32Array(dustCount * 3), dustSeed = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    const r = 3.2 + Math.random() * 3.4, th = Math.random() * TAU, ph = Math.acos(2 * Math.random() - 1);
    dustPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    dustPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.8;
    dustPos[i * 3 + 2] = r * Math.cos(ph) - 1.5;
    dustSeed[i] = Math.random();
  }
  const dust = new THREE.BufferGeometry();
  dust.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dust.setAttribute('aSeed', new THREE.BufferAttribute(dustSeed, 1));
  const dustMat = new THREE.ShaderMaterial({
    vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, transparent: true, depthWrite: false, blending: t.blend,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio }, uColor: { value: col(t.dust) }, uBright: { value: t.bright } },
  });
  const dustPoints = new THREE.Points(dust, dustMat);
  scene.add(dustPoints);

  /* --- State machine --- */
  let current = state, currentData = first;
  let tune = { ...TUNING[state] }, target = { ...TUNING[state] };
  let mixT = 1, morphing = false, morphStart = 0;
  const MORPH_MS = 1500;
  let coreLevel = TUNING[state].core;

  function snapshotInto(geo) {
    // Freeze the visible interpolated position into "position" so a new morph
    // starts from wherever the previous one is right now.
    const from = geo.attributes.position, to = geo.attributes.aTo;
    const af = geo.attributes.aAlphaFrom, at = geo.attributes.aAlphaTo;
    const m = easeInOut(mixT);
    for (let i = 0; i < from.count * 3; i++) from.array[i] += (to.array[i] - from.array[i]) * m;
    for (let i = 0; i < af.count; i++) af.array[i] += (at.array[i] - af.array[i]) * m;
    from.needsUpdate = true; af.needsUpdate = true;
  }

  function setState(name) {
    if (!STATES[name] || name === current) return;
    const d = stateData(name);
    snapshotInto(pGeo); snapshotInto(lGeo);
    pGeo.attributes.aTo.array.set(d.pos);       pGeo.attributes.aTo.needsUpdate = true;
    pGeo.attributes.aAlphaTo.array.set(d.alp);  pGeo.attributes.aAlphaTo.needsUpdate = true;
    pGeo.attributes.aSize.array.set(d.siz);     pGeo.attributes.aSize.needsUpdate = true;
    lGeo.attributes.aTo.array.set(d.lpos);      lGeo.attributes.aTo.needsUpdate = true;
    lGeo.attributes.aAlphaTo.array.set(d.lalp); lGeo.attributes.aAlphaTo.needsUpdate = true;
    lGeo.attributes.aSeed.array.set(seedOf(d.lseed)); lGeo.attributes.aSeed.needsUpdate = true;
    current = name; currentData = d; target = { ...TUNING[name] };
    mixT = 0; morphing = true; morphStart = performance.now();
  }

  // Move one point (and every line endpoint that copies it) in the live target arrays.
  const pTo = pGeo.attributes.aTo, lTo = lGeo.attributes.aTo;
  const setPoint = (idx, x, y, z) => {
    const a = pTo.array, i3 = idx * 3;
    a[i3] = x; a[i3 + 1] = y; a[i3 + 2] = z;
    const s = currentData.slots.get(idx);
    if (s) for (let k = 0; k < s.length; k++) { const j = s[k] * 3; lTo.array[j] = x; lTo.array[j + 1] = y; lTo.array[j + 2] = z; }
  };

  /* --- Pointer, resize, loop --- */
  const pointer = { x: 0, y: 0 };
  const onMove = (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  let narrow = false;
  const resize = () => {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    narrow = w < 420;
  };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  const clock = new THREE.Clock();
  let running = true, raf = 0;
  const rot = { x: 0, y: 0 };
  let spinAcc = 0;

  const frame = () => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;

    if (morphing) {
      // Wall-clock, not frame-delta: a morph takes 1.5s even on a janky tab.
      mixT = Math.min(1, (performance.now() - morphStart) / MORPH_MS);
      if (mixT >= 1) morphing = false;
    }
    shared.uMix.value = easeInOut(mixT);
    shared.uTime.value = time;
    dustMat.uniforms.uTime.value = time;

    if (currentData.animate) {
      currentData.animate(time, dt, setPoint, currentData);
      pTo.needsUpdate = true; lTo.needsUpdate = true;
    }

    // Ease camera + motion settings toward the target state.
    const k = 1 - Math.pow(0.001, dt);
    for (const key of ['noise', 'z', 'spin', 'sway', 'tiltX', 'pulse', 'base']) tune[key] += (target[key] - tune[key]) * k;
    coreLevel += (target.core - coreLevel) * k;
    shared.uNoiseAmt.value = tune.noise;
    edgeMat.uniforms.uPulseRate.value = tune.pulse;
    edgeMat.uniforms.uBase.value = THEMES[currentTheme].base * tune.base;
    coreMat.uniforms.uBright.value = (THEMES[currentTheme].bright * 0.75) * coreLevel;
    core.visible = coreLevel > 0.02;
    camera.position.z = tune.z + (narrow ? 1.3 : 0);

    spinAcc += tune.spin * dt;
    rot.y += (pointer.x * 0.4 - rot.y) * 0.04;
    rot.x += (-pointer.y * 0.25 - rot.x) * 0.04;
    group.rotation.y = rot.y + spinAcc + Math.sin(time * 0.25) * tune.sway;
    group.rotation.x = rot.x + tune.tiltX + Math.sin(time * 0.2) * 0.05;
    dustPoints.rotation.y = time * 0.02 + rot.y * 0.3;
    dustPoints.rotation.x = rot.x * 0.2;

    renderer.render(scene, camera);
  };

  const start = () => { if (!running) { running = true; clock.getDelta(); frame(); } };
  const stop  = () => { running = false; cancelAnimationFrame(raf); };

  const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.02 });
  io.observe(container);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);

  let currentTheme = theme;
  const setTheme = (name) => {
    const th = THEMES[name] || THEMES.dark; currentTheme = name;
    for (const m of [edgeMat, pointMat, coreMat, dustMat]) { m.blending = th.blend; m.needsUpdate = true; }
    edgeMat.uniforms.uColorA.value.set(th.a); edgeMat.uniforms.uColorB.value.set(th.b);
    edgeMat.uniforms.uColorC.value.set(th.c); edgeMat.uniforms.uGlow.value = th.glow;
    pointMat.uniforms.uColorA.value.set(th.a); pointMat.uniforms.uColorB.value.set(th.b); pointMat.uniforms.uBright.value = th.bright;
    coreMat.uniforms.uColorA.value.set(th.a); coreMat.uniforms.uColorB.value.set(th.b);
    dustMat.uniforms.uColor.value.set(th.dust); dustMat.uniforms.uBright.value = th.bright;
  };

  frame();
  container.setAttribute('data-ready', 'true');

  const dispose = () => {
    stop(); ro.disconnect(); io.disconnect();
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('visibilitychange', onVis);
    renderer.dispose(); container.removeChild(renderer.domElement);
  };

  return {
    setTheme, setState, dispose, states: Object.keys(STATES),
    get current() { return current; },
    get progress() { return mixT; },
    get running() { return running; },
  };
}
