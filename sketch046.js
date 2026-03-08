// Strange Attractors Particle System
// Visualizing chaotic systems with Three.js

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const params = {
  attractor: 'Lorenz', // Lorenz, Aizawa, Thomas, Dadras, Chen, Rossler
  particleCount: 100000,
  speed: 1.0,
  scale: 1.0,
  cameraDistance: 80,
  opacity: 0.6,
  pointSize: 0.2,
  colorMode: 'Velocity', // Velocity, Position, Rainbow, Single
  baseColor: '#00ffff',
  bgColor: '#000000',
  rotationSpeed: 0.2,
  autoRotate: true,
  autoMorph: false,
  morphSpeed: 0.5,
  exportFrames: 600,
  exportMP4: () => startExportMP4(),
  exportPNG: () => startExportPNG(),
  reset: () => initSystem()
};

let scene, camera, renderer, controls;
let particles, geometry, material;
let positions, colors;
let time = 0;

// アトラクタの状態
let currentAttractor = null;

// 書き出し用変数
let isExporting = false;
let exportMax = 0;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(params.bgColor);

  camera = new THREE.PerspectiveCamera(60, 1920 / 1080, 0.1, 1000);
  camera.position.set(0, 0, 80);

  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(1920, 1080);
  renderer.setPixelRatio(1);
  
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = 'auto';
  renderer.domElement.style.maxHeight = '100vh';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.margin = '0 auto';
  
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = false;

  initSystem();
}

function initSystem() {
  if (particles) {
    scene.remove(particles);
    geometry.dispose();
    material.dispose();
  }

  geometry = new THREE.BufferGeometry();
  positions = new Float32Array(params.particleCount * 3);
  colors = new Float32Array(params.particleCount * 3);

  // 初期配置
  const range = 5.0;
  for (let i = 0; i < params.particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * range;
    positions[i * 3 + 1] = (Math.random() - 0.5) * range;
    positions[i * 3 + 2] = (Math.random() - 0.5) * range;

    colors[i * 3] = 1;
    colors[i * 3 + 1] = 1;
    colors[i * 3 + 2] = 1;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  material = new THREE.PointsMaterial({
    size: params.pointSize,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: params.opacity
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // カメラ位置とスケールの調整
  adjustCameraAndScale();
}

function adjustCameraAndScale() {
  // アトラクタごとに適切なスケールとカメラ位置を設定
  switch (params.attractor) {
    case 'Lorenz':
      params.scale = 1.0;
      params.cameraDistance = 80;
      break;
    case 'Aizawa':
      params.scale = 15.0;
      params.cameraDistance = 60;
      break;
    case 'Thomas':
      params.scale = 5.0;
      params.cameraDistance = 60;
      break;
    case 'Dadras':
      params.scale = 1.5;
      params.cameraDistance = 60;
      break;
    case 'Chen':
      params.scale = 1.0;
      params.cameraDistance = 100;
      break;
    case 'Rossler':
      params.scale = 1.5;
      params.cameraDistance = 60;
      break;
  }
  camera.position.set(0, 0, params.cameraDistance);
  camera.lookAt(0, 0, 0);
  controls.update();
}

function updateParticles(dt) {
  const positions = particles.geometry.attributes.position.array;
  const colors = particles.geometry.attributes.color.array;
  const count = params.particleCount;
  const speed = params.speed * 0.5; // タイムステップ調整
  
  // アトラクタの計算関数を取得
  const attractorFunc = getAttractorFunction(params.attractor);
  const scale = params.scale;

  let minSpeed = Infinity;
  let maxSpeed = -Infinity;
  const speeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    let x = positions[i3] / scale;
    let y = positions[i3 + 1] / scale;
    let z = positions[i3 + 2] / scale;

    const d = attractorFunc(x, y, z);
    
    const dx = d.dx * speed * 0.01;
    const dy = d.dy * speed * 0.01;
    const dz = d.dz * speed * 0.01;

    x += dx;
    y += dy;
    z += dz;

    positions[i3] = x * scale;
    positions[i3 + 1] = y * scale;
    positions[i3 + 2] = z * scale;

    // 速度（変位量）を計算して色付けに使用
    const vSq = dx*dx + dy*dy + dz*dz;
    speeds[i] = vSq;
    if (vSq < minSpeed) minSpeed = vSq;
    if (vSq > maxSpeed) maxSpeed = vSq;
  }

  // 色の更新
  const baseC = new THREE.Color(params.baseColor);
  const tempC = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    
    if (params.colorMode === 'Velocity') {
      // 速度に応じた色
      const n = (speeds[i] - minSpeed) / (maxSpeed - minSpeed + 0.00001);
      tempC.setHSL(n * 0.7 + 0.5, 1.0, 0.6);
      colors[i3] = tempC.r;
      colors[i3+1] = tempC.g;
      colors[i3+2] = tempC.b;
    } else if (params.colorMode === 'Position') {
      // 位置に応じた色
      const x = positions[i3] / (20 * scale);
      const y = positions[i3+1] / (20 * scale);
      const z = positions[i3+2] / (20 * scale);
      colors[i3] = Math.abs(Math.sin(x));
      colors[i3+1] = Math.abs(Math.sin(y));
      colors[i3+2] = Math.abs(Math.sin(z));
    } else if (params.colorMode === 'Rainbow') {
      const hue = (i / count + time * 0.1) % 1;
      tempC.setHSL(hue, 0.8, 0.6);
      colors[i3] = tempC.r;
      colors[i3+1] = tempC.g;
      colors[i3+2] = tempC.b;
    } else {
      // Single Color
      colors[i3] = baseC.r;
      colors[i3+1] = baseC.g;
      colors[i3+2] = baseC.b;
    }
  }

  particles.geometry.attributes.position.needsUpdate = true;
  particles.geometry.attributes.color.needsUpdate = true;
}

function getAttractorFunction(name) {
  const t = params.autoMorph ? time * params.morphSpeed : 0;

  switch (name) {
    case 'Lorenz':
      return (x, y, z) => {
        const sigma = 10, beta = 8/3;
        const rho = 28 + Math.sin(t) * 10;
        return {
          dx: sigma * (y - x),
          dy: x * (rho - z) - y,
          dz: x * y - beta * z
        };
      };
    case 'Aizawa':
      return (x, y, z) => {
        const a = 0.95 + Math.sin(t) * 0.2;
        const b = 0.7, c = 0.6 + Math.cos(t * 0.7) * 0.3;
        const d = 3.5, e = 0.25, f = 0.1;
        return {
          dx: (z - b) * x - d * y,
          dy: d * x + (z - b) * y,
          dz: c + a * z - (z * z * z) / 3 - (x * x + y * y) * (1 + e * z) + f * z * x * x * x
        };
      };
    case 'Thomas':
      return (x, y, z) => {
        const b = 0.2 + Math.sin(t) * 0.1;
        return {
          dx: -b * x + Math.sin(y),
          dy: -b * y + Math.sin(z),
          dz: -b * z + Math.sin(x)
        };
      };
    case 'Dadras':
      return (x, y, z) => {
        const a = 3, b = 2.7, c = 1.7, d = 2;
        const e = 9 + Math.sin(t) * 4;
        return {
          dx: y - a * x + b * y * z,
          dy: c * y - x * z + z,
          dz: d * x * y - e * z
        };
      };
    case 'Chen':
      return (x, y, z) => {
        const a = 35, b = 3;
        const c = 28 + Math.sin(t) * 10;
        return {
          dx: a * (y - x),
          dy: (c - a) * x - x * z + c * y,
          dz: x * y - b * z
        };
      };
    case 'Rossler':
      return (x, y, z) => {
        const a = 0.2, b = 0.2;
        const c = 5.7 + Math.sin(t) * 3;
        return {
          dx: -y - z,
          dy: x + a * y,
          dz: b + z * (x - c)
        };
      };
    default:
      return (x, y, z) => ({ dx: 0, dy: 0, dz: 0 });
  }
}

function animate() {
  if (!isExporting) {
    requestAnimationFrame(animate);
  }

  time += 0.01 * params.speed;
  updateParticles(0.016);

  if (params.autoRotate) {
    particles.rotation.y += 0.005 * params.rotationSpeed;
  }

  controls.update();
  renderer.render(scene, camera);

  if (isExporting || (window.exporter && window.exporter.isExporting)) {
    window.exporter.captureFrame(renderer.domElement);
    if (!window.exporter.isExporting) {
      isExporting = false;
      console.log("Export finished");
      animate();
    } else {
      setTimeout(() => {
        requestAnimationFrame(animate);
      }, 150);
    }
  }
}

window.guiConfig = [
  { folder: 'Simulation', contents: [
    { object: params, variable: 'attractor', options: ['Lorenz', 'Aizawa', 'Thomas', 'Dadras', 'Chen', 'Rossler'], name: 'Type', onChange: initSystem },
    { object: params, variable: 'particleCount', min: 1000, max: 500000, step: 1000, name: 'Count', onFinishChange: initSystem },
    { object: params, variable: 'speed', min: 0.1, max: 5.0, name: 'Speed' },
    { object: params, variable: 'scale', min: 0.1, max: 20.0, name: 'Scale' },
    { object: params, variable: 'cameraDistance', min: 10, max: 300, name: 'Cam Distance', listen: true, onChange: v => { camera.position.setLength(v); controls.update(); } },
    { object: params, variable: 'autoMorph', name: 'Auto Morph' },
    { object: params, variable: 'morphSpeed', min: 0.1, max: 2.0, name: 'Morph Speed' },
    { object: params, variable: 'reset', name: 'Reset System', type: 'function' }
  ]},
  { folder: 'Style', contents: [
    { object: params, variable: 'colorMode', options: ['Velocity', 'Position', 'Rainbow', 'Single'], name: 'Color Mode' },
    { object: params, variable: 'baseColor', type: 'color', name: 'Base Color' },
    { object: params, variable: 'bgColor', type: 'color', name: 'Background', onChange: v => scene.background.set(v) },
    { object: params, variable: 'pointSize', min: 0.01, max: 2.0, name: 'Point Size', onChange: v => material.size = v },
    { object: params, variable: 'opacity', min: 0.1, max: 1.0, name: 'Opacity', onChange: v => material.opacity = v },
    { object: params, variable: 'autoRotate', name: 'Auto Rotate' },
    { object: params, variable: 'rotationSpeed', min: 0, max: 2.0, name: 'Rot Speed' }
  ]},
  { folder: 'Export', contents: [
    { object: params, variable: 'exportFrames', min: 60, max: 1200, step: 1, name: 'Frames' },
    { object: params, variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },
    { object: params, variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }
  ]}
];

async function startExportMP4() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  exportMax = params.exportFrames;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  let suggestedName = `sketch046_${y}${m}${d}_${h}${min}.mp4`;
  await window.exporter.startMP4(1920, 1080, 30, exportMax, suggestedName);
  isExporting = true;
}

async function startExportPNG() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  exportMax = params.exportFrames;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  let prefix = `sketch046_${y}${m}${d}_${h}${min}`;
  await window.exporter.startPNG(30, exportMax, prefix);
  isExporting = true;
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') startExportMP4();
  if (e.key === 'p' || e.key === 'P') startExportPNG();
  if (e.key === 'r' || e.key === 'R') initSystem();
});