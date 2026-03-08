// PixiJS Particle Flow
// Image reconstruction with physics

const params = {
  particleCount: 20000,
  pointSize: 2,
  friction: 0.92,
  returnSpeed: 0.08,
  mouseForce: 1500,
  mouseRadius: 120,
  autoRepel: true,
  repelCount: 3,
  gravity: 0.0,
  noiseScale: 0.005,
  noiseStrength: 0.0,
  targetType: 'Text', // Text, Circle, Grid
  textString: 'ELEMOG',
  autoMorph: false,
  morphInterval: 180,
  trail: true,
  trailOpacity: 0.2,
  bloom: true,
  bloomStrength: 1.5,
  bloomThreshold: 0.3,
  bloomBlur: 4,
  colorMode: 'Mono', // Original, Heat, Cool, Mono
  bgColor: '#000000',
  exportFrames: 600,
  exportMP4: () => startExportMP4(),
  exportPNG: () => startExportPNG(),
  regenerate: () => createTarget()
};

let app;
let particles = [];
let repellers = [];
let fadeRect;
let bloomFilter;
let container;
let particleTexture;
let targetPoints = [];
let mouseX = -1000;
let mouseY = -1000;
let time = 0;
let morphTimer = 0;
const targetTypes = ['Text', 'Circle', 'Grid'];

// 書き出し用変数
let isExporting = false;
let exportMax = 0;

function init() {
  app = new PIXI.Application({
    width: 1920,
    height: 1080,
    background: params.bgColor,
    clearBeforeRender: false, // 軌跡のために自動クリアを無効化
    antialias: true,
    preserveDrawingBuffer: true
  });

  app.view.style.width = '100%';
  app.view.style.height = 'auto';
  app.view.style.maxHeight = '100vh';
  app.view.style.display = 'block';
  app.view.style.margin = '0 auto';
  
  document.body.appendChild(app.view);

  // マウスイベント
  app.stage.interactive = true;
  app.stage.hitArea = app.screen;
  app.stage.on('pointermove', (e) => {
    if (!params.autoRepel) {
      mouseX = e.global.x;
      mouseY = e.global.y;
    }
  });

  // 軌跡用のフェード矩形
  fadeRect = new PIXI.Graphics();
  app.stage.addChild(fadeRect);

  // パーティクルコンテナ (高速描画用)
  container = new PIXI.ParticleContainer(params.particleCount, {
    position: true,
    tint: true,
    scale: true
  });
  app.stage.addChild(container);

  // パーティクルテクスチャ生成
  const gr = new PIXI.Graphics();
  gr.beginFill(0xFFFFFF);
  gr.drawCircle(0, 0, 4);
  gr.endFill();
  particleTexture = app.renderer.generateTexture(gr);

  // Bloomフィルターの初期化
  if (PIXI.filters.AdvancedBloomFilter) {
    bloomFilter = new PIXI.filters.AdvancedBloomFilter({
      threshold: params.bloomThreshold,
      bloomScale: params.bloomStrength,
      blur: params.bloomBlur,
    });
  }

  createTarget();
  initRepellers();
  initParticles();

  app.ticker.add((delta) => {
    if (!isExporting && (!window.exporter || !window.exporter.isExporting)) {
      update(delta);
    }
  });
}

function initRepellers() {
  repellers = [];
  for (let i = 0; i < params.repelCount; i++) {
    repellers.push({
      x: app.screen.width / 2,
      y: app.screen.height / 2,
      phaseX: Math.random() * 100,
      phaseY: Math.random() * 100,
      speed: Math.random() * 0.5 + 0.5
    });
  }
}

function createTarget() {
  const width = app.screen.width;
  const height = app.screen.height;
  
  // オフスクリーンキャンバスでターゲット形状を描画してスキャンする
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  if (params.targetType === 'Text') {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 300px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(params.textString, width / 2, height / 2);
  } else if (params.targetType === 'Circle') {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 200, 0, Math.PI * 2);
    ctx.fill();
  } else if (params.targetType === 'Grid') {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 20;
    const step = 100;
    for (let x = 0; x < width; x += step) {
      for (let y = 0; y < height; y += step) {
        if ((x/step + y/step) % 2 === 0) {
            ctx.strokeRect(x + 10, y + 10, step - 20, step - 20);
        }
      }
    }
  }

  // ピクセルデータのスキャン
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  targetPoints = [];

  // 適当な間隔でサンプリング
  const step = 4; 
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      if (data[i] > 128) { // 明るい部分をターゲットにする
        targetPoints.push({ x: x, y: y });
      }
    }
  }
  
  // パーティクルにターゲットを再割り当て
  assignTargets();
}

function initParticles() {
  container.removeChildren();
  particles = [];

  for (let i = 0; i < params.particleCount; i++) {
    const p = new PIXI.Sprite(particleTexture);
    p.anchor.set(0.5);
    p.x = Math.random() * app.screen.width;
    p.y = Math.random() * app.screen.height;
    p.vx = 0;
    p.vy = 0;
    p.tx = p.x; // Target X
    p.ty = p.y; // Target Y
    p.baseScale = Math.random() * 0.5 + 0.5;
    p.scale.set(p.baseScale * params.pointSize * 0.2);
    
    // 初期色
    p.tint = 0xFFFFFF;
    
    container.addChild(p);
    particles.push(p);
  }
  assignTargets();
}

function assignTargets() {
  if (targetPoints.length === 0) return;
  
  // ランダムにターゲットを割り当てる
  for (let i = 0; i < particles.length; i++) {
    const pt = targetPoints[Math.floor(Math.random() * targetPoints.length)];
    particles[i].tx = pt.x;
    particles[i].ty = pt.y;
  }
}

function update(delta) {
  time += 0.01 * delta;
  
  if (params.autoRepel) {
    // 自動的にリペラー（反発点）を動かす
    for (let r of repellers) {
      const t = time * r.speed;
      r.x = (0.5 + 0.35 * Math.sin(t * 0.7 + r.phaseX) + 0.15 * Math.cos(t * 1.7 + r.phaseY)) * app.screen.width;
      r.y = (0.5 + 0.35 * Math.cos(t * 0.9 + r.phaseY) + 0.15 * Math.sin(t * 1.3 + r.phaseX)) * app.screen.height;
    }
  }

  if (params.autoMorph) {
    morphTimer += delta;
    if (morphTimer > params.morphInterval) {
      morphTimer = 0;
      let currentIndex = targetTypes.indexOf(params.targetType);
      let nextIndex = (currentIndex + 1) % targetTypes.length;
      params.targetType = targetTypes[nextIndex];
      createTarget();
    }
  }
  
  const bgColorInt = parseInt(params.bgColor.replace('#', ''), 16);
  // app.renderer.background.color = bgColorInt; // clearBeforeRender: false なので不要

  // 軌跡（フェードアウト）処理
  fadeRect.clear();
  // trailがオフの場合は不透明(1.0)で塗りつぶしてクリア相当にする
  const alpha = params.trail ? params.trailOpacity : 1.0;
  fadeRect.beginFill(bgColorInt, alpha);
  fadeRect.drawRect(0, 0, app.screen.width, app.screen.height);
  fadeRect.endFill();

  // Bloomフィルター適用
  if (params.bloom && bloomFilter) {
    bloomFilter.threshold = params.bloomThreshold;
    bloomFilter.bloomScale = params.bloomStrength;
    bloomFilter.blur = params.bloomBlur;
    app.stage.filters = [bloomFilter];
  } else {
    app.stage.filters = [];
  }

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    
    // 1. ターゲットへの引力 (バネ)
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    p.vx += dx * params.returnSpeed;
    p.vy += dy * params.returnSpeed;
    
    // 2. マウスからの斥力
    if (params.autoRepel) {
      for (let r of repellers) {
        const mdx = p.x - r.x;
        const mdy = p.y - r.y;
        const distSq = mdx * mdx + mdy * mdy;
        const rangeSq = params.mouseRadius * params.mouseRadius;
        
        if (distSq < rangeSq && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const force = (params.mouseRadius - dist) / params.mouseRadius;
          const angle = Math.atan2(mdy, mdx);
          p.vx += Math.cos(angle) * force * params.mouseForce * 0.1;
          p.vy += Math.sin(angle) * force * params.mouseForce * 0.1;
        }
      }
    } else {
      const mdx = p.x - mouseX;
      const mdy = p.y - mouseY;
      const distSq = mdx * mdx + mdy * mdy;
      const rangeSq = params.mouseRadius * params.mouseRadius;
      
      if (distSq < rangeSq && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const force = (params.mouseRadius - dist) / params.mouseRadius;
        const angle = Math.atan2(mdy, mdx);
        p.vx += Math.cos(angle) * force * params.mouseForce * 0.1;
        p.vy += Math.sin(angle) * force * params.mouseForce * 0.1;
      }
    }
    
    // 3. 重力
    p.vy += params.gravity;
    
    // 4. ノイズ
    if (params.noiseStrength > 0) {
      // 簡易ノイズ
      const n = Math.sin(p.x * params.noiseScale + time) * Math.cos(p.y * params.noiseScale + time);
      p.vx += Math.cos(n * Math.PI * 2) * params.noiseStrength;
      p.vy += Math.sin(n * Math.PI * 2) * params.noiseStrength;
    }

    // 物理更新
    p.vx *= params.friction;
    p.vy *= params.friction;
    p.x += p.vx * delta;
    p.y += p.vy * delta;
    
    // 色の更新
    updateColor(p);
    
    // スケール更新
    p.scale.set(p.baseScale * params.pointSize * 0.2);
  }
}

function updateColor(p) {
  if (params.colorMode === 'Original') {
    // 速度に応じた色
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    const r = Math.min(255, 100 + speed * 10);
    const g = Math.min(255, 100 + speed * 5);
    const b = 255;
    p.tint = (r << 16) | (g << 8) | b;
  } else if (params.colorMode === 'Heat') {
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    const val = Math.min(1, speed * 0.1);
    // 赤〜黄
    const r = 255;
    const g = Math.floor(val * 255);
    const b = 0;
    p.tint = (r << 16) | (g << 8) | b;
  } else if (params.colorMode === 'Cool') {
    const dist = Math.abs(p.x - p.tx) + Math.abs(p.y - p.ty);
    const val = Math.min(1, dist * 0.01);
    // 青〜シアン
    const r = 0;
    const g = Math.floor(val * 255);
    const b = 255;
    p.tint = (r << 16) | (g << 8) | b;
  } else {
    p.tint = 0xFFFFFF;
  }
}

window.guiConfig = [
  { folder: 'Generator', contents: [
    { object: params, variable: 'particleCount', min: 1000, max: 100000, step: 1000, name: 'Count', onFinishChange: initParticles },
    { object: params, variable: 'targetType', options: ['Text', 'Circle', 'Grid'], name: 'Target Type', listen: true, onChange: createTarget },
    { object: params, variable: 'textString', name: 'Text', onChange: createTarget },
    { object: params, variable: 'autoMorph', name: 'Auto Morph' },
    { object: params, variable: 'morphInterval', min: 30, max: 600, step: 10, name: 'Morph Interval' },
    { object: params, variable: 'regenerate', name: 'Regenerate', type: 'function' }
  ]},
  { folder: 'Physics', contents: [
    { object: params, variable: 'returnSpeed', min: 0.01, max: 0.5, name: 'Return Speed' },
    { object: params, variable: 'friction', min: 0.5, max: 0.99, name: 'Friction' },
    { object: params, variable: 'autoRepel', name: 'Auto Repel' },
    { object: params, variable: 'repelCount', min: 1, max: 10, step: 1, name: 'Repel Count', onFinishChange: initRepellers },
    { object: params, variable: 'mouseForce', min: 0, max: 5000, name: 'Mouse Force' },
    { object: params, variable: 'mouseRadius', min: 10, max: 500, name: 'Mouse Radius' },
    { object: params, variable: 'gravity', min: -1.0, max: 1.0, name: 'Gravity' },
    { object: params, variable: 'noiseStrength', min: 0, max: 10.0, name: 'Noise Force' }
  ]},
  { folder: 'Style', contents: [
    { object: params, variable: 'pointSize', min: 0.5, max: 10, name: 'Size' },
    { object: params, variable: 'colorMode', options: ['Original', 'Heat', 'Cool', 'Mono'], name: 'Color Mode' },
    { object: params, variable: 'bgColor', type: 'color', name: 'Background' }
  ]},
  { folder: 'Effects', contents: [
    { object: params, variable: 'trail', name: 'Trails' },
    { object: params, variable: 'trailOpacity', min: 0.01, max: 1.0, name: 'Trail Fade' },
    { object: params, variable: 'bloom', name: 'Bloom' },
    { object: params, variable: 'bloomStrength', min: 0, max: 5.0, name: 'Bloom Strength' },
    { object: params, variable: 'bloomThreshold', min: 0, max: 1.0, name: 'Bloom Threshold' },
    { object: params, variable: 'bloomBlur', min: 0, max: 20.0, name: 'Bloom Blur' }
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
  let suggestedName = `sketch022_${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}_${String(new Date().getHours()).padStart(2,'0')}${String(new Date().getMinutes()).padStart(2,'0')}.mp4`;
  // PixiJS canvas size is 1920x1080
  await window.exporter.startMP4(1920, 1080, 30, exportMax, suggestedName);
  
  isExporting = true;
  app.ticker.stop(); // 自動更新停止
  processExportFrame();
}

async function startExportPNG() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  exportMax = params.exportFrames;
  let prefix = `sketch022_${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}_${String(new Date().getHours()).padStart(2,'0')}${String(new Date().getMinutes()).padStart(2,'0')}`;
  await window.exporter.startPNG(30, exportMax, prefix);
  
  isExporting = true;
  app.ticker.stop(); // 自動更新停止
  processExportFrame();
}

function processExportFrame() {
  if (!isExporting && (!window.exporter || !window.exporter.isExporting)) return;
  update(1.0);
  app.renderer.render(app.stage);
  window.exporter.captureFrame(app.view);
  
  if (!window.exporter.isExporting) {
    isExporting = false;
    app.ticker.start();
  } else {
    setTimeout(processExportFrame, 30);
  }
}

function createGUI() {
  gui = new lil.GUI();
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
        if (item.listen) controller.listen();
      }
    });
  };
  if (window.guiConfig) {
    processConfig(window.guiConfig, gui);
  }
}

init();