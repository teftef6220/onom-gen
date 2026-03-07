// 3D Particle System with Three.js

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { createNoise3D } from 'simplex-noise';

const params = {
  particleCount: 10000,
  spread: 200,
  speed: 1.0,
  noiseScale: 0.02,
  noiseStrength: 1.0,
  pointSize: 1.5,
  attractionType: 'Sphere', // Center, Sphere
  sphereRadius: 300,
  colorMode: 'White', // Rainbow, Fire, Ice, White
  blending: 'Additive',
  autoRotate: true,
  rotationSpeed: 0.2,
  autoChangeRotation: false,
  connectParticles: false,
  connectionDistance: 150,
  maxConnections: 300, // 線を結ぶ計算対象のパーティクル最大数
  connectionColor: '#ffffff',
  connectionOpacity: 0.3,
  connectionWidth: 1.0,
  exportFrames: 600,
  exportStart: () => startExport(),
};

let scene, camera, renderer, controls;
let mainGroup;
let linesMesh, linesGeometry, linesMaterial;
let particles, geometry, material;
let positions, colors, velocities;
let noise3D;
let time = 0;
let gui;

// 書き出し用変数
let isExporting = false;
let exportCount = 0;
let exportMax = 0;
let exportSessionID = "";

window.guiConfig = [
  { folder: 'Generator', contents: [
    { object: params, variable: 'particleCount', min: 1000, max: 50000, step: 1000, name: 'Count', onFinishChange: initParticles },
    { object: params, variable: 'spread', min: 50, max: 500, step: 10, name: 'Spread', onFinishChange: initParticles }
  ]},
  { folder: 'Physics', contents: [
    { object: params, variable: 'speed', min: 0.1, max: 5.0, name: 'Time Speed' },
    { object: params, variable: 'noiseScale', min: 0.001, max: 0.05, name: 'Noise Scale' },
    { object: params, variable: 'noiseStrength', min: 0, max: 100, name: 'Noise Strength' },
    { object: params, variable: 'attractionType', options: ['Center', 'Sphere', 'Crawl'], name: 'Attraction' },
    { object: params, variable: 'sphereRadius', min: 50, max: 800, name: 'Sphere Radius' },
    { object: params, variable: 'rotationSpeed', min: 0, max: 2.0, name: 'Rotation' },
    { object: params, variable: 'autoChangeRotation', name: 'Random Rotate' },
    { object: params, variable: 'autoRotate', name: 'Auto Rotate' }
  ]},
  { folder: 'Style', contents: [
    { object: params, variable: 'colorMode', options: ['Rainbow', 'Fire', 'Ice', 'White'], name: 'Color Mode' },
    { object: params, variable: 'blending', options: ['Additive', 'Normal'], name: 'Blending', onChange: updateBlending },
    { object: params, variable: 'pointSize', min: 0.1, max: 10, name: 'Point Size' }
  ]},
  { folder: 'Connections', contents: [
    { object: params, variable: 'connectParticles', name: 'Enable' },
    { object: params, variable: 'connectionDistance', min: 10, max: 500, name: 'Distance' },
    { object: params, variable: 'maxConnections', min: 10, max: 2000, name: 'Max Points' },
    { object: params, variable: 'connectionColor', type: 'color', name: 'Color', onChange: v => linesMaterial.color.set(v) },
    { object: params, variable: 'connectionOpacity', min: 0, max: 1, name: 'Opacity', onChange: v => linesMaterial.opacity = v },
    { object: params, variable: 'connectionWidth', min: 0.1, max: 10, name: 'Width', onChange: v => linesMaterial.linewidth = v }
  ]},
  { folder: 'Export', contents: [
    { object: params, variable: 'exportFrames', min: 60, max: 1200, step: 1, name: 'Frames' },
    { object: params, variable: 'exportStart', name: 'Start Export', type: 'function' }
  ]}
];

init();
animate();

function init() {
  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(75, 1920 / 1080, 0.1, 1000);
  camera.position.z = 200;

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

  // Group setup
  mainGroup = new THREE.Group();
  scene.add(mainGroup);

  // Lines setup
  linesGeometry = new THREE.BufferGeometry();
  linesMaterial = new THREE.LineBasicMaterial({
    color: params.connectionColor,
    transparent: true,
    opacity: params.connectionOpacity,
    linewidth: params.connectionWidth,
    blending: params.blending === 'Additive' ? THREE.AdditiveBlending : THREE.NormalBlending
  });
  linesMesh = new THREE.LineSegments(linesGeometry, linesMaterial);
  mainGroup.add(linesMesh);

  noise3D = createNoise3D();

  initParticles();
  createGUI();
}

function initParticles() {
  if (particles) {
    mainGroup.remove(particles);
    geometry.dispose();
    material.dispose();
  }

  geometry = new THREE.BufferGeometry();
  positions = new Float32Array(params.particleCount * 3);
  colors = new Float32Array(params.particleCount * 3);
  velocities = [];

  const color = new THREE.Color();

  for (let i = 0; i < params.particleCount; i++) {
    const x = (Math.random() - 0.5) * params.spread * 2;
    const y = (Math.random() - 0.5) * params.spread * 2;
    const z = (Math.random() - 0.5) * params.spread * 2;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    velocities.push({
      x: 0, y: 0, z: 0,
      baseX: x, baseY: y, baseZ: z
    });

    // Initial color
    color.setHSL(Math.random(), 1.0, 0.5);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  material = new THREE.PointsMaterial({
    size: params.pointSize,
    vertexColors: true,
    blending: params.blending === 'Additive' ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.8
  });

  particles = new THREE.Points(geometry, material);
  mainGroup.add(particles);
}

function updateBlending() {
  const blending = params.blending === 'Additive' ? THREE.AdditiveBlending : THREE.NormalBlending;
  if (material) {
    material.blending = blending;
    material.needsUpdate = true;
  }
  if (linesMaterial) {
    linesMaterial.blending = blending;
    linesMaterial.needsUpdate = true;
  }
}

function updateParticles(time) {
  const positions = particles.geometry.attributes.position.array;
  const colors = particles.geometry.attributes.color.array;
  const color = new THREE.Color();

  for (let i = 0; i < params.particleCount; i++) {
    const i3 = i * 3;
    const v = velocities[i];

    // Noise field
    const n1 = noise3D(v.baseX * params.noiseScale, v.baseY * params.noiseScale, time * 0.1);
    const n2 = noise3D(v.baseY * params.noiseScale, v.baseZ * params.noiseScale, time * 0.1 + 100);
    
    // Velocity update based on noise
    const angleX = n1 * Math.PI * 2;
    const angleY = n2 * Math.PI * 2;
    
    v.x += Math.cos(angleX) * params.noiseStrength * 0.01 * params.speed;
    v.y += Math.sin(angleX) * params.noiseStrength * 0.01 * params.speed;
    v.z += Math.sin(angleY) * params.noiseStrength * 0.01 * params.speed;
    
    // Attraction
    if (params.attractionType === 'Center') {
      v.x += (0 - positions[i3]) * 0.001 * params.speed;
      v.y += (0 - positions[i3+1]) * 0.001 * params.speed;
      v.z += (0 - positions[i3+2]) * 0.001 * params.speed;
    } else if (params.attractionType === 'Sphere') {
      const d = Math.sqrt(positions[i3]**2 + positions[i3+1]**2 + positions[i3+2]**2);
      if (d > 0.001) {
        const factor = (params.sphereRadius - d) * 0.001 * params.speed;
        v.x += (positions[i3] / d) * factor;
        v.y += (positions[i3+1] / d) * factor;
        v.z += (positions[i3+2] / d) * factor;
      }
    } else if (params.attractionType === 'Crawl') {
      const d = Math.sqrt(positions[i3]**2 + positions[i3+1]**2 + positions[i3+2]**2);
      if (d > 0.001) {
        const factor = (params.sphereRadius - d) * 0.1 * params.speed;
        v.x += (positions[i3] / d) * factor;
        v.y += (positions[i3+1] / d) * factor;
        v.z += (positions[i3+2] / d) * factor;
      }
    }

    v.x *= 0.95;
    v.y *= 0.95;
    v.z *= 0.95;

    positions[i3] += v.x;
    positions[i3 + 1] += v.y;
    positions[i3 + 2] += v.z;

    if (params.attractionType === 'Crawl') {
      const d = Math.sqrt(positions[i3]**2 + positions[i3+1]**2 + positions[i3+2]**2);
      if (d > 0.001) {
        const f = params.sphereRadius / d;
        positions[i3] *= f;
        positions[i3+1] *= f;
        positions[i3+2] *= f;
      }
    }

    // Color update
    if (params.colorMode === 'Rainbow') {
      const h = (time * 0.1 + (positions[i3] + positions[i3+1]) * 0.002) % 1;
      color.setHSL(h, 0.8, 0.6);
    } else if (params.colorMode === 'Fire') {
      const d = Math.sqrt(positions[i3]**2 + positions[i3+1]**2 + positions[i3+2]**2);
      const h = Math.max(0, 0.15 - d * 0.0005);
      color.setHSL(h, 1.0, 0.5);
    } else if (params.colorMode === 'Ice') {
      const d = Math.sqrt(positions[i3]**2 + positions[i3+1]**2 + positions[i3+2]**2);
      const h = 0.5 + d * 0.0005;
      color.setHSL(h, 0.8, 0.7);
    } else if (params.colorMode === 'White') {
      color.setHex(0xffffff);
    }

    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
  }

  particles.geometry.attributes.position.needsUpdate = true;
  particles.geometry.attributes.color.needsUpdate = true;
  
  if (material.size !== params.pointSize) {
    material.size = params.pointSize;
  }
}

function updateLines() {
  if (!params.connectParticles) {
    linesMesh.visible = false;
    return;
  }
  linesMesh.visible = true;

  const positions = particles.geometry.attributes.position.array;
  const linePositions = [];
  
  // パフォーマンスのため、先頭の一部のみ計算
  const limit = Math.min(params.particleCount, params.maxConnections);
  const connectDistSq = params.connectionDistance * params.connectionDistance;

  for (let i = 0; i < limit; i++) {
    for (let j = i + 1; j < limit; j++) {
      const i3 = i * 3;
      const j3 = j * 3;
      
      const dx = positions[i3] - positions[j3];
      const dy = positions[i3+1] - positions[j3+1];
      const dz = positions[i3+2] - positions[j3+2];
      
      const distSq = dx*dx + dy*dy + dz*dz;

      if (distSq < connectDistSq) {
        linePositions.push(
          positions[i3], positions[i3+1], positions[i3+2],
          positions[j3], positions[j3+1], positions[j3+2]
        );
      }
    }
  }

  linesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
}

function animate() {
  if (!isExporting) {
    requestAnimationFrame(animate);
  }

  time += 0.01 * params.speed;

  updateParticles(time);
  updateLines();

  if (params.autoRotate) {
    if (params.autoChangeRotation) {
      // ノイズを使って回転方向をランダムに変化させる
      const nTime = time * 0.2;
      const dt = 0.01 * params.speed;
      mainGroup.rotation.x += noise3D(nTime, 10, 10) * params.rotationSpeed * dt;
      mainGroup.rotation.y += noise3D(20, nTime, 20) * params.rotationSpeed * dt;
      mainGroup.rotation.z += noise3D(30, 30, nTime) * params.rotationSpeed * dt;
    } else {
      mainGroup.rotation.y += 0.005 * params.speed * params.rotationSpeed;
    }
  }

  controls.update();
  renderer.render(scene, camera);

  if (isExporting) {
    saveFrame();
    exportCount++;
    if (exportCount >= exportMax) {
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

function startExport() {
  if (isExporting) return;
  isExporting = true;
  exportCount = 0;
  exportMax = params.exportFrames;
  
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  exportSessionID = "";
  for (let i = 0; i < 4; i++) exportSessionID += chars.charAt(Math.floor(Math.random() * chars.length));
  
  console.log(`Export started: ${exportSessionID}`);
}

function saveFrame() {
  const dataURL = renderer.domElement.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `particles3d_${exportSessionID}_${String(exportCount + 1).padStart(3, '0')}.png`;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function createGUI() {
  gui = new GUI();
  const processConfig = (config, parent) => {
    config.forEach(item => {
      if (item.folder) {
        const folder = parent.addFolder(item.folder);
        processConfig(item.contents, folder);
      } else {
        let controller;
        if (item.type === 'color') {
          controller = parent.addColor(item.object, item.variable).name(item.name);
        } else if (item.type === 'function') {
          controller = parent.add(item.object, item.variable).name(item.name);
        } else if (item.options) {
          controller = parent.add(item.object, item.variable, item.options).name(item.name);
        } else {
          controller = parent.add(item.object, item.variable, item.min, item.max, item.step).name(item.name);
        }
        if (item.onChange) controller.onChange(item.onChange);
        if (item.onFinishChange) controller.onFinishChange(item.onFinishChange);
      }
    });
  };
  if (window.guiConfig) {
    processConfig(window.guiConfig, gui);
  }
}