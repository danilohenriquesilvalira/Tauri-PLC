import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/* ═══════════════════════════════════════════════════════
   Eclusa de Crestuma-Lever — comporta vagão, plano fechado
   Cena leve para fundo de login: sem câmara completa,
   sem casinha, sem árvores/pássaros/barco, sem OrbitControls.
═══════════════════════════════════════════════════════ */
const GATE_W   = 9.6;
const GATE_H   = 10.0;
const GATE_CY  = 4.0;          // centro vertical da comporta
const WATER_Y  = 0.0;          // nível da água em primeiro plano
const WALL_TOP = 8.4;
const WALL_BOT = -3.0;
const TWR_TOP  = WALL_TOP + 2.6;

/* FOV dinâmico — garante que a comporta nunca fica cortada em telas estreitas (mobile) */
const BASE_FOV = 42, BASE_ASPECT = 16 / 9;
function fovForAspect(aspect: number) {
  const baseHalf = Math.tan((BASE_FOV * Math.PI / 180) / 2);
  const wantedHalfW = baseHalf * BASE_ASPECT;
  if (aspect >= BASE_ASPECT) return BASE_FOV;
  const half = wantedHalfW / aspect;
  return THREE.MathUtils.clamp(2 * Math.atan(half) * 180 / Math.PI, BASE_FOV, 100);
}

function bx(
  w: number, h: number, d: number, x: number, y: number, z: number,
  mat: THREE.Material, scene: THREE.Scene, cast = true
) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = cast; m.receiveShadow = true;
  scene.add(m); return m;
}
/* Caixa com bordas chanfradas/arredondadas — evita o ar "quadrado duro" */
function rbx(
  w: number, h: number, d: number, x: number, y: number, z: number,
  mat: THREE.Material, scene: THREE.Scene, cast = true, radius = 0.05
) {
  const r = Math.min(radius, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.max(r, 0.001)), mat);
  m.position.set(x, y, z);
  m.castShadow = cast; m.receiveShadow = true;
  scene.add(m); return m;
}
function cy(
  rt: number, rb: number, h: number, x: number, y: number, z: number,
  mat: THREE.Material, scene: THREE.Scene, segs = 10
) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  scene.add(m); return m;
}

/* ══════════════════════════════════════════════════════
   SKY SHADER — gradiente simples, sem custo
══════════════════════════════════════════════════════ */
const SKY_V = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }`;
const SKY_F = /* glsl */`
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uSunDir;
  uniform float uNight;
  varying vec3 vDir;
  void main(){
    float h = clamp(vDir.y, 0.0, 1.0);
    vec3 sky = mix(uHorizon, uZenith, sqrt(h));
    float sun = max(dot(normalize(vDir), uSunDir), 0.0);
    float glowFade = 1.0 - uNight * 0.88;
    sky += vec3(1.0,0.9,0.6) * pow(sun, 6.0) * 0.45 * glowFade;
    sky += vec3(1.0,1.0,0.9) * pow(sun, 80.0) * 1.2 * glowFade;
    gl_FragColor = vec4(sky, 1.0);
  }`;

function buildSky(scene: THREE.Scene) {
  const sunDir = new THREE.Vector3(0.35, 0.42, -0.78).normalize();
  const mat = new THREE.ShaderMaterial({
    vertexShader: SKY_V, fragmentShader: SKY_F,
    uniforms: {
      uZenith:  { value: new THREE.Color('#4488CC') },
      uHorizon: { value: new THREE.Color('#A8D0EE') },
      uSunDir:  { value: sunDir },
      uNight:   { value: 0 },
    },
    side: THREE.BackSide, depthWrite: false,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(120, 20, 14), mat));
  return { sunDir, uZenith: mat.uniforms.uZenith.value as THREE.Color, uHorizon: mat.uniforms.uHorizon.value as THREE.Color, uNight: mat.uniforms.uNight };
}

/* ══════════════════════════════════════════════════════
   WATER SHADER — calma, azul-verde do reservatório do Douro
══════════════════════════════════════════════════════ */
const WAT_V = /* glsl */`
  uniform float uTime;
  varying float vE; varying vec3 vW;
  void main(){
    vec4 wp = modelMatrix * vec4(position,1.0);
    float e = sin(wp.x*0.38+uTime*0.55)*0.030
             +sin(wp.z*0.52+uTime*0.70)*0.024
             +sin((wp.x*0.28+wp.z*0.42)+uTime*0.48)*0.016;
    wp.y+=e; vE=e; vW=wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const WAT_F = /* glsl */`
  uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow;
  varying float vE; varying vec3 vW;
  void main(){
    float t = clamp((vE + 0.04) / 0.08, 0.0, 1.0);
    vec3 col = mix(uDeep, uShallow, t);
    float r = sin(vW.x*1.6+uTime*0.8)*sin(vW.z*2.0+uTime*1.0);
    col += uShallow * pow(max(r,0.0),5.0) * 0.05;
    gl_FragColor = vec4(col, 1.0);
  }`;

function buildWater(scene: THREE.Scene) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: WAT_V, fragmentShader: WAT_F,
    uniforms: {
      uTime:    { value: 0 },
      uDeep:    { value: new THREE.Color('#1C4A50') },
      uShallow: { value: new THREE.Color('#3D9296') },
    },
    transparent: false, side: THREE.FrontSide,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(70, 60, 40, 40), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(0, WATER_Y, 14);
  scene.add(m);

  const deepDay = new THREE.Color('#1C4A50'), deepNight = new THREE.Color('#051418');
  const shallowDay = new THREE.Color('#3D9296'), shallowNight = new THREE.Color('#0d2c2e');

  return {
    animate(t: number, night: number) {
      mat.uniforms.uTime.value = t;
      (mat.uniforms.uDeep.value as THREE.Color).lerpColors(deepDay, deepNight, night);
      (mat.uniforms.uShallow.value as THREE.Color).lerpColors(shallowDay, shallowNight, night);
    },
  };
}

/* ══════════════════════════════════════════════════════
   PAREDES DE BETÃO — secção curta flanqueando a comporta
══════════════════════════════════════════════════════ */
function buildWalls(scene: THREE.Scene) {
  const mWet   = new THREE.MeshStandardMaterial({ color: '#363a2f', roughness: 0.97 });
  const mDry   = new THREE.MeshStandardMaterial({ color: '#8a8678', roughness: 0.92 });
  const mStain = new THREE.MeshStandardMaterial({ color: '#1c1f18', roughness: 0.98 });
  const mWalk  = new THREE.MeshStandardMaterial({ color: '#8c8a7c', roughness: 0.86 });
  const mRail  = new THREE.MeshStandardMaterial({ color: '#6a7278', metalness: 0.85, roughness: 0.45 });
  const mShed  = new THREE.MeshStandardMaterial({ color: '#c9c4ae', roughness: 0.75 });
  const mShedD = new THREE.MeshStandardMaterial({ color: '#272b24', roughness: 0.8 });

  const wetH = (WATER_Y) - WALL_BOT;
  const dryH = WALL_TOP - WATER_Y;

  // afastada da calha-guia (GATE_W/2+0.50 é a borda externa da calha) — evita z-fighting
  for (const sx of [-1, 1] as const) {
    const xW = sx * (GATE_W / 2 + 1.60);
    rbx(1.8, wetH, 14, xW, WALL_BOT + wetH / 2, 6, mWet, scene, true, 0.04);
    rbx(1.8, dryH, 14, xW, WATER_Y + dryH / 2, 6, mDry, scene, true, 0.04);
    // faixa de maré/infiltração — escura, onde a água bate na parede (realismo das fotos reais)
    rbx(1.86, 1.1, 14, xW, WATER_Y + 0.05, 6, mStain, scene, false, 0.05);
    // tampo do passadiço
    rbx(2.6, 0.22, 14, xW, WALL_TOP + 0.11, 6, mWalk, scene, true, 0.03);
    // guarda-corpo simples
    for (let i = 0; i <= 4; i++) {
      cy(0.045, 0.045, 0.95, xW, WALL_TOP + 0.6, 0.5 + i * 3, mRail, scene, 6);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 14, 6), mRail);
    bar.rotation.x = Math.PI / 2; bar.position.set(xW, WALL_TOP + 1.05, 6); scene.add(bar);
  }

  // caixa de controlo/equipamento — montada sobre o passadiço direito (como na foto real)
  const shedX = GATE_W / 2 + 1.60;
  rbx(0.95, 0.85, 0.85, shedX, WALL_TOP + 0.22 + 0.425, 2.4, mShed, scene, true, 0.04);
  bx(0.05, 0.5, 0.4, shedX - 0.46, WALL_TOP + 0.22 + 0.30, 2.4, mShedD, scene, false);

  // junta de dilatação — linha vertical fina e escura, típica de painéis de betão grandes
  const mJoint = new THREE.MeshStandardMaterial({ color: '#1c1f18', roughness: 0.95 });
  for (const sx of [-1, 1] as const) {
    const xW = sx * (GATE_W / 2 + 1.60);
    for (const zJ of [2.2, 9.2]) {
      bx(0.04, WALL_TOP - WALL_BOT - 0.3, 0.10, xW - sx * 0.92, (WALL_TOP + WALL_BOT) / 2, zJ, mJoint, scene, false);
    }
  }

  // saída de drenagem com mancha de oxidação — detalhe autêntico visto em paredes reais
  const mPipe = new THREE.MeshStandardMaterial({ color: '#3a3e36', metalness: 0.7, roughness: 0.5 });
  const mRust = new THREE.MeshStandardMaterial({ color: '#5a3018', roughness: 0.95, transparent: true, opacity: 0.55 });
  const drainX = -(GATE_W / 2 + 1.60 - 0.9);
  const drainY = WATER_Y + 0.5, drainZ = -3.5;
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.30, 8), mPipe);
  pipe.rotation.z = Math.PI / 2; pipe.position.set(drainX + 0.15, drainY, drainZ); scene.add(pipe);
  const rust = new THREE.Mesh(new THREE.PlaneGeometry(0.30, drainY - WATER_Y + 0.3), mRust);
  rust.rotation.y = Math.PI / 2;
  rust.position.set(drainX + 0.01, WATER_Y + (drainY - WATER_Y) / 2, drainZ); scene.add(rust);
}

/* ══════════════════════════════════════════════════════
   COMPORTA VAGÃO + TORRES-GUIA (versão enxuta)
══════════════════════════════════════════════════════ */
function buildGate(scene: THREE.Scene) {
  const mG   = new THREE.MeshStandardMaterial({ color: '#4a534a', roughness: 0.52, metalness: 0.72 });
  const mRb  = new THREE.MeshStandardMaterial({ color: '#363f33', roughness: 0.60, metalness: 0.68 });
  const mYl  = new THREE.MeshStandardMaterial({ color: '#d4a010', roughness: 0.5, metalness: 0.15, emissive: new THREE.Color('#3a2800'), emissiveIntensity: 0.25 });
  const mBo  = new THREE.MeshStandardMaterial({ color: '#1c3a10', roughness: 1.0 });
  const mBt  = new THREE.MeshStandardMaterial({ color: '#b0bcc8', roughness: 0.1, metalness: 0.95 });
  const mTw  = new THREE.MeshStandardMaterial({ color: '#585f65', roughness: 0.5, metalness: 0.8 });
  const mGr  = new THREE.MeshStandardMaterial({ color: '#707878', roughness: 0.42, metalness: 0.82 });
  const mCa  = new THREE.MeshStandardMaterial({ color: '#b0bcc8', roughness: 0.1, metalness: 0.95 });
  const mRiv = new THREE.MeshStandardMaterial({ color: '#1c2018', roughness: 0.35, metalness: 0.9 });
  const mLed = new THREE.MeshStandardMaterial({ color: '#0c2018', roughness: 0.4, metalness: 0.25, emissive: new THREE.Color('#28FF8C'), emissiveIntensity: 1.2 });

  const gate = new THREE.Group();
  gate.position.set(0, GATE_CY, 0);
  scene.add(gate);

  const panel = new THREE.Mesh(new RoundedBoxGeometry(GATE_W, GATE_H, 0.75, 2, 0.05), mG);
  panel.castShadow = true; panel.receiveShadow = true; gate.add(panel);

  // nervuras horizontais
  for (let i = 0; i < 5; i++) {
    const y = -GATE_H / 2 + 0.6 + i * (GATE_H / 4.2);
    const r1 = new THREE.Mesh(new RoundedBoxGeometry(GATE_W + 0.06, 0.30, 0.92, 2, 0.04), mRb);
    r1.position.set(0, y, 0); r1.castShadow = true; gate.add(r1);
  }
  // longarinas verticais
  for (const xi of [-GATE_W / 2 + 0.35, 0, GATE_W / 2 - 0.35]) {
    const v = new THREE.Mesh(new RoundedBoxGeometry(0.22, GATE_H, 0.82, 2, 0.03), mRb);
    v.position.set(xi, 0, 0); v.castShadow = true; gate.add(v);
  }
  // vedantes amarelos — z contido para não cruzar o biofouling
  const sk = (x: number) => {
    const s = new THREE.Mesh(new RoundedBoxGeometry(0.14, GATE_H, 0.08, 2, 0.02), mYl);
    s.position.set(x, 0, 0.45); gate.add(s);
  };
  sk(-(GATE_W / 2 - 0.05));
  sk( (GATE_W / 2 - 0.05));
  // biofouling na base (recuado, sem tocar nos vedantes)
  const bio = new THREE.Mesh(new RoundedBoxGeometry(GATE_W + 0.02, GATE_H * 0.22, 0.74, 2, 0.03), mBo);
  bio.position.set(0, -GATE_H / 2 + GATE_H * 0.11, 0); bio.castShadow = false; gate.add(bio);
  // olhais de içamento — projetados para fora da face do painel
  for (const xi of [-GATE_W / 3, 0, GATE_W / 3]) {
    const e = new THREE.Mesh(new RoundedBoxGeometry(0.20, 0.32, 0.18, 2, 0.03), mRb);
    e.position.set(xi, GATE_H / 2 - 0.16, 0.42); e.castShadow = false; gate.add(e);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 8), mBt);
    p.position.set(xi, GATE_H / 2 - 0.16 + 0.21, 0.42); p.castShadow = false; gate.add(p);
  }

  // rebites — nitidez de engenharia, num único draw call (InstancedMesh)
  const rivCols = [-GATE_W / 2 + 0.35, 0, GATE_W / 2 - 0.35];
  const rivRows = 5;
  const rivGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.10, 8);
  const rivets = new THREE.InstancedMesh(rivGeo, mRiv, rivCols.length * rivRows);
  rivets.castShadow = false; rivets.receiveShadow = false;
  let ri = 0;
  const rivM = new THREE.Matrix4();
  const rivQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  for (const xi of rivCols) {
    for (let i = 0; i < rivRows; i++) {
      const y = -GATE_H / 2 + 0.6 + i * (GATE_H / 4.2);
      rivM.compose(new THREE.Vector3(xi, y, 0.55), rivQuat, new THREE.Vector3(1, 1, 1));
      rivets.setMatrixAt(ri++, rivM);
    }
  }
  gate.add(rivets);

  // faixa LED indicadora — toque digital/moderno (monitorização EDP)
  const led = new THREE.Mesh(new RoundedBoxGeometry(GATE_W - 1.2, 0.05, 0.05, 2, 0.02), mLed);
  led.position.set(0, GATE_H / 2 - 0.55, 0.40); led.castShadow = false; gate.add(led);

  // calhas-guia — preenchem TODO o vão entre a comporta e a parede (sem frestas para o céu "vazar")
  const railW = 0.70; // borda da comporta (GATE_W/2=4.8) → face interna da parede (GATE_W/2+1.60-0.9=5.5)
  for (const sx of [-1, 1] as const) {
    const xG = sx * (GATE_W / 2 + railW / 2);
    rbx(railW, TWR_TOP - WALL_BOT, 0.40, xG, (TWR_TOP + WALL_BOT) / 2, 0, mGr, scene, true, 0.04);
  }

  // torres simples (colunas + viga superior) — silhueta do guincho, sem treliça completa
  for (const sx of [-1, 1] as const) {
    const xt = sx * (GATE_W / 2 - 0.20);
    rbx(0.34, TWR_TOP - WALL_TOP, 0.34, xt, (TWR_TOP + WALL_TOP) / 2, 0, mTw, scene, true, 0.04);
  }
  rbx(GATE_W + 0.5, 0.36, 0.46, 0, TWR_TOP, 0, mTw, scene, true, 0.04);

  // semáforo de tráfego — sinaliza o estado da comporta (vermelho = fechada), como na foto real
  const mSigPole = new THREE.MeshStandardMaterial({ color: '#3a3e38', metalness: 0.6, roughness: 0.5 });
  const mSigBox  = new THREE.MeshStandardMaterial({ color: '#1c1e1a', roughness: 0.6, metalness: 0.3 });
  const mSigRed  = new THREE.MeshStandardMaterial({ color: '#3a0808', roughness: 0.4, emissive: new THREE.Color('#ff1818'), emissiveIntensity: 1.6 });
  const sigX = 1.6, sigPoleH = 0.55;
  cy(0.035, 0.035, sigPoleH, sigX, TWR_TOP + 0.18 + sigPoleH / 2, 0.35, mSigPole, scene, 8);
  const sigBox = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.30, 0.18, 2, 0.03), mSigBox);
  sigBox.position.set(sigX, TWR_TOP + 0.18 + sigPoleH + 0.16, 0.35); scene.add(sigBox);
  const sigLens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 12), mSigRed);
  sigLens.rotation.x = Math.PI / 2;
  sigLens.position.set(sigX, TWR_TOP + 0.18 + sigPoleH + 0.16, 0.45); scene.add(sigLens);

  // cabos de içamento (estética, sem animação de contrapeso)
  for (const sx of [-1, 1] as const) {
    const xt = sx * (GATE_W / 2 - 0.20);
    const cTop = GATE_CY + GATE_H / 2;
    const cH = TWR_TOP - 0.1 - cTop;
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, cH, 6), mCa);
    cable.castShadow = false;
    cable.position.set(xt, (cTop + TWR_TOP - 0.1) / 2, 0); scene.add(cable);
  }

  return {
    animate(t: number, night: number) {
      gate.position.y = GATE_CY + Math.sin(t * 0.35) * 0.025;
      mLed.emissiveIntensity = (1.0 + Math.sin(t * 1.4) * 0.6) * (1 + night * 0.8);
      mSigRed.emissiveIntensity = 1.6 * (1 + night * 0.7);
    },
  };
}

/* ══════════════════════════════════════════════════════
   TEXTURAS PROCEDURAIS (canvas) — sem assets externos
══════════════════════════════════════════════════════ */
function makeDotTexture(): THREE.Texture {
  const size = 64;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}
function makeShaftTexture(): THREE.Texture {
  const w = 48, h = 256;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const gy = ctx.createLinearGradient(0, 0, 0, h);
  gy.addColorStop(0,   'rgba(255,250,225,0)');
  gy.addColorStop(0.45,'rgba(255,250,225,0.9)');
  gy.addColorStop(1,   'rgba(255,250,225,0)');
  ctx.fillStyle = gy; ctx.fillRect(0, 0, w, h);
  const gx = ctx.createLinearGradient(0, 0, w, 0);
  gx.addColorStop(0, 'rgba(0,0,0,1)');
  gx.addColorStop(0.5, 'rgba(0,0,0,0)');
  gx.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = gx; ctx.fillRect(0, 0, w, h);
  return new THREE.CanvasTexture(c);
}
/* ══════════════════════════════════════════════════════
   PARTÍCULAS EM SUSPENSÃO — bruma/poeira a contraluz
══════════════════════════════════════════════════════ */
function buildParticles(scene: THREE.Scene) {
  const COUNT = 60;
  const positions = new Float32Array(COUNT * 3);
  const speeds = new Float32Array(COUNT);
  const baseY = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const x = (Math.random() - 0.5) * 16;
    const y = Math.random() * 9 - 1;
    const z = -3 - Math.random() * 10;
    positions[i*3] = x; positions[i*3+1] = y; positions[i*3+2] = z;
    speeds[i] = 0.12 + Math.random() * 0.22;
    baseY[i] = y;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.20, map: makeDotTexture(), transparent: true, opacity: 0.5,
    color: new THREE.Color('#dff2f0'), depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  const posAttr = geo.attributes.position as THREE.BufferAttribute;
  return {
    animate(t: number) {
      for (let i = 0; i < COUNT; i++) {
        let y = baseY[i] + ((t * speeds[i]) % 10);
        if (y > 9) y -= 10;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
    },
  };
}

/* ══════════════════════════════════════════════════════
   RAIOS DE LUZ VOLUMÉTRICOS — atrás da comporta
══════════════════════════════════════════════════════ */
function buildLightShafts(scene: THREE.Scene, sunDir: THREE.Vector3) {
  const tex = makeShaftTexture();
  const yaw = Math.atan2(sunDir.x, sunDir.z);
  const defs = [
    { x: -3.4, w: 2.6, h: 15, rotZ: 0.10, sp: 0.5,  base: 0.10 },
    { x:  0.6, w: 3.4, h: 17, rotZ: -0.07, sp: 0.38, base: 0.14 },
    { x:  4.0, w: 2.1, h: 14, rotZ: 0.14, sp: 0.62, base: 0.09 },
  ];
  const planes = defs.map(d => {
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: d.base,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h), mat);
    m.position.set(d.x, 7.5, -8);
    m.rotation.y = yaw;
    m.rotation.z = d.rotZ;
    scene.add(m);
    return { mat, sp: d.sp, base: d.base };
  });
  return {
    animate(t: number) {
      planes.forEach((p, i) => {
        p.mat.opacity = p.base + (Math.sin(t * p.sp + i * 2) * 0.5 + 0.5) * p.base * 0.8;
      });
    },
  };
}

/* ══════════════════════════════════════════════════════
   VEGETAÇÃO DISTANTE — silhueta simples na margem, ao fundo
══════════════════════════════════════════════════════ */
function buildBackdrop(scene: THREE.Scene) {
  const mHill = new THREE.MeshStandardMaterial({ color: '#2f4a2c', roughness: 1.0 });
  const mTree = new THREE.MeshStandardMaterial({ color: '#27431f', roughness: 1.0 });
  const z = -26;
  // morro baixo cobrindo o horizonte
  const hill = new THREE.Mesh(new THREE.SphereGeometry(13, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mHill);
  hill.position.set(0, WALL_TOP - 6.5, z); hill.scale.set(1.7, 0.55, 1); scene.add(hill);
  // copas de árvores — clusters simples, baixo poly
  const defs = [-9, -6, -3.5, -1, 1.5, 4, 6.5, 9];
  defs.forEach((x, i) => {
    const h = 2.2 + (i % 3) * 0.5;
    const t = new THREE.Mesh(new THREE.SphereGeometry(1.3 + (i % 2) * 0.3, 7, 5), mTree);
    t.position.set(x, WALL_TOP - 0.3 + h * 0.3, z + 2 + (i % 2));
    t.scale.y = 0.8;
    t.castShadow = false; t.receiveShadow = false;
    scene.add(t);
  });
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export const EclusaScene = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const nightTargetRef = useRef(0); // 0 = dia, 1 = noite — lido a cada frame pelo loop
  const [isNight, setIsNight] = useState(false);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false; // cena quase estática — recalcula sombra só quando preciso
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.setClearColor(new THREE.Color('#A8D0EE'));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#A8D0EE');
    scene.fog = new THREE.FogExp2(0xA8D0EE, 0.018);

    const camBase = new THREE.Vector3(2.5, 4.6, 17);
    const lookBase = new THREE.Vector3(0, 4.0, 0);
    const camera = new THREE.PerspectiveCamera(
      fovForAspect(el.clientWidth / el.clientHeight), el.clientWidth / el.clientHeight, 0.1, 150
    );
    camera.position.copy(camBase);
    camera.lookAt(lookBase);

    const { sunDir, uZenith, uHorizon, uNight } = buildSky(scene);

    const ambient = new THREE.AmbientLight(0x6080a8, 2.5);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffe0a0, 4.6);
    sun.position.set(-12, 14, -8); sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.left = -16; sun.shadow.camera.right = 16;
    sun.shadow.camera.top = 16;   sun.shadow.camera.bottom = -16;
    sun.shadow.camera.far = 60;   sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x9cc0ec, 1.4);
    fill.position.set(10, 8, 14); scene.add(fill);
    // luz de contorno — separa a comporta do fundo, traz nitidez
    const rim = new THREE.DirectionalLight(0xb8eaf0, 1.6);
    rim.position.set(-7, 6, 11); scene.add(rim);

    // ── Paleta dia/noite ──────────────────────────────────
    const zenithDay = new THREE.Color('#4488CC'), zenithNight = new THREE.Color('#050b1a');
    const horizonDay = new THREE.Color('#A8D0EE'), horizonNight = new THREE.Color('#16223a');
    const bgDay = new THREE.Color('#A8D0EE'), bgNight = new THREE.Color('#0a1220');
    const ambColDay = new THREE.Color(0x6080a8), ambColNight = new THREE.Color(0x1c2840);
    const sunColDay = new THREE.Color(0xffe0a0), sunColNight = new THREE.Color(0x9fb8ff);
    const fillColDay = new THREE.Color(0x9cc0ec), fillColNight = new THREE.Color(0x2a3c58);
    const rimColDay = new THREE.Color(0xb8eaf0), rimColNight = new THREE.Color(0x3c5070);
    const ambIntDay = 2.5, ambIntNight = 1.0;
    const sunIntDay = 4.6, sunIntNight = 1.2;
    const fillIntDay = 1.4, fillIntNight = 0.45;
    const rimIntDay = 1.6, rimIntNight = 0.4;
    let dnT = 0; // valor suavizado, segue nightTargetRef.current

    const { animate: animWater }    = buildWater(scene);
    const gate                       = buildGate(scene);
    buildWalls(scene);
    buildBackdrop(scene);
    const { animate: animParticles } = buildParticles(scene);
    const { animate: animShafts }    = buildLightShafts(scene, sunDir);

    renderer.shadowMap.needsUpdate = true; // uma única passada — geometria não se move

    const onResize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      const aspect = el.clientWidth / el.clientHeight;
      camera.aspect = aspect;
      camera.fov = fovForAspect(aspect);
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    let raf: number;
    const clock = new THREE.Clock();
    let elapsed = 0;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = clock.getDelta();
      elapsed += dt;

      // transição suave dia ↔ noite
      dnT += (nightTargetRef.current - dnT) * Math.min(1, dt * 1.4);

      uZenith.lerpColors(zenithDay, zenithNight, dnT);
      uHorizon.lerpColors(horizonDay, horizonNight, dnT);
      uNight.value = dnT;
      (scene.background as THREE.Color).lerpColors(bgDay, bgNight, dnT);
      (scene.fog as THREE.FogExp2).color.lerpColors(bgDay, bgNight, dnT);
      ambient.color.lerpColors(ambColDay, ambColNight, dnT);
      ambient.intensity = ambIntDay + (ambIntNight - ambIntDay) * dnT;
      sun.color.lerpColors(sunColDay, sunColNight, dnT);
      sun.intensity = sunIntDay + (sunIntNight - sunIntDay) * dnT;
      fill.color.lerpColors(fillColDay, fillColNight, dnT);
      fill.intensity = fillIntDay + (fillIntNight - fillIntDay) * dnT;
      rim.color.lerpColors(rimColDay, rimColNight, dnT);
      rim.intensity = rimIntDay + (rimIntNight - rimIntDay) * dnT;

      animWater(elapsed, dnT);
      gate.animate(elapsed, dnT);
      animParticles(elapsed);
      animShafts(elapsed);

      // drift lento da câmera — sem interação do utilizador
      camera.position.x = camBase.x + Math.sin(elapsed * 0.07) * 1.4;
      camera.position.y = camBase.y + Math.sin(elapsed * 0.05) * 0.35;
      camera.position.z = camBase.z + Math.cos(elapsed * 0.045) * 1.0;
      camera.lookAt(lookBase);

      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  const toggleDayNight = () => {
    setIsNight(prev => {
      nightTargetRef.current = prev ? 0 : 1;
      return !prev;
    });
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <button
        type="button"
        onClick={toggleDayNight}
        style={{
          position: 'absolute', top: 16, right: 16, zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 13px', borderRadius: 999,
          background: 'rgba(8,20,36,0.55)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.14)',
          color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
        }}
      >
        {isNight ? '☀ Dia' : '🌙 Noite'}
      </button>
    </div>
  );
};
