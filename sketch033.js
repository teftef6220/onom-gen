// --- 設定とグローバル変数 ---
const params = {
  particleCount: 5000,
  speed: 1.0,
  scrollX: 0.0,
  scrollY: 0.0,
  noiseScale1: 0.002,
  noiseScale2: 0.01,
  noiseStrength1: 1.0,
  noiseStrength2: 0.5,
  colorMode: 'Vivid',
  trail: false, // 残像効果（Pixiでは重くなるため擬似的に実装するか、今回はオフ推奨）
  baseSize: 0.5,
  sizeRandomness: 1.0,
  globalAlpha: 1.0,
  pulseInterval: 120,
  pulseStrength: 20.0,
  drawLines: false,
  lineDistance: 150,
  lineThickness: 1.0,
  pulseMode: 'Center', // Center, Random
  attraction: false, // お互いに引き合う
  attractionStrength: 1.0,
  attractionRange: 100,
  boundaryMode: 'Wrap', // Wrap (ループ), Flow (流れる)
  exportFrames: 600,
  exportMP4: function() { startExportMP4(); },
  exportPNG: function() { startExportPNG(); }
};

// カラーパレット定義
const PALETTES = {
  Vaporwave: [0xFF71CE, 0x01CDFE, 0x05FFA1, 0xB967FF, 0xFFFB96],
  Acid: [0xCCFF00, 0xFF0099, 0x00FF00, 0x6600FF],
  Warmth: [0xFF5733, 0xFFC300, 0xDAF7A6, 0x900C3F],
  Cool: [0x00B4D8, 0x90E0EF, 0x03045E, 0xCAF0F8],
  Mono: [0xFFFFFF, 0xAAAAAA, 0x555555, 0x222222],
  Pastel: [0xFFB3BA, 0xFFDFBA, 0xFFFFBA, 0xBAFFC9, 0xBAE1FF],
  Galaxy: [0xFF00CC, 0x6600CC, 0x9900FF, 0xFFFFFF, 0xCC99FF],
  Vivid: [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0x00FFFF, 0xFF00FF],
  Cyber: [0xFF0099, 0x00FFCC, 0xCCFF00, 0x9900FF],
  Hot: [0xFF0000, 0xFF4D00, 0xFFD700, 0xFFFF00],
  Cold: [0x00FFFF, 0x0080FF, 0x0000FF, 0x8000FF],
  Acid: [0xBFFF00, 0xFF00FF, 0x00FF00, 0x00FFFF],
  Pop: [0xFF0055, 0x0055FF, 0xFFFF00, 0x00FF55],
  Monochrome: [0xFFFFFF, 0xAAAAAA, 0x666666, 0x333333],
  White: [0xFFFFFF]
};

window.guiConfig = [
  { object: params, variable: 'particleCount', min: 1000, max: 20000, step: 100, name: 'Count', onFinishChange: () => createParticles(particleContainer.children[0].texture) },
  { object: params, variable: 'speed', min: 0, max: 5.0, name: 'Flow Speed' },
  { object: params, variable: 'scrollX', min: -10.0, max: 10.0, name: 'Scroll X' },
  { object: params, variable: 'scrollY', min: -10.0, max: 10.0, name: 'Scroll Y' },
  { object: params, variable: 'noiseScale1', min: 0.0001, max: 0.01, name: 'Scale 1' },
  { object: params, variable: 'noiseScale2', min: 0.001, max: 0.1, name: 'Scale 2' },
  { object: params, variable: 'noiseStrength1', min: 0, max: 2.0, name: 'Strength 1' },
  { object: params, variable: 'noiseStrength2', min: 0, max: 2.0, name: 'Strength 2' },
  { object: params, variable: 'baseSize', min: 0.1, max: 2.0, name: 'Particle Size' },
  { object: params, variable: 'sizeRandomness', min: 0, max: 5.0, name: 'Size Variance' },
  { object: params, variable: 'globalAlpha', min: 0, max: 10.0, name: 'Opacity' },
  { folder: 'Pulse', contents: [
    { object: params, variable: 'pulseInterval', min: 10, max: 600, step: 10, name: 'Interval' },
    { object: params, variable: 'pulseStrength', min: 0, max: 100, name: 'Strength' },
    { object: params, variable: 'pulseMode', options: ['Center', 'Random'], name: 'Mode' }
  ]},
  { folder: 'Attraction', contents: [
    { object: params, variable: 'attraction', name: 'Enable' },
    { object: params, variable: 'attractionStrength', min: 0.1, max: 5.0, name: 'Strength' },
    { object: params, variable: 'attractionRange', min: 50, max: 300, name: 'Range' }
  ]},
  { folder: 'Network & Boundary', contents: [
    { object: params, variable: 'drawLines', name: 'Draw Lines' },
    { object: params, variable: 'lineDistance', min: 50, max: 500, name: 'Line Dist' },
    { object: params, variable: 'lineThickness', min: 0.1, max: 5.0, name: 'Line Thick' },
    { object: params, variable: 'boundaryMode', options: ['Wrap', 'Flow'], name: 'Boundary' }
  ]},
  { object: params, variable: 'colorMode', options: Object.keys(PALETTES), name: 'Color Palette', onChange: val => {
      const palette = PALETTES[val];
      particles.forEach(p => { p.tint = palette[Math.floor(Math.random() * palette.length)]; });
  }},
  { folder: 'Export', contents: [
    { object: params, variable: 'exportFrames', min: 60, max: 1200, step: 1, name: 'Frames' },
    { object: params, variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },
    { object: params, variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }
  ]}
];

let app;
let particles = [];
let particleContainer;
let linesGraphics;
let simplex = new SimplexNoise();
let time = 0;
let pulseTimer = 0;

// 書き出し用変数
let isExporting = false;
let exportMax = 0;

init();

function init() {
  // 1. Pixi Applicationの作成
  app = new PIXI.Application({
    width: 1920,
    height: 1080,
    backgroundColor: 0x000000,
    antialias: true,
    preserveDrawingBuffer: true // 書き出しのために必要
  });

  // CSSでウィンドウサイズに合わせて縮小表示
  app.view.style.width = '100%';
  app.view.style.height = 'auto';
  app.view.style.maxHeight = '100vh';
  app.view.style.display = 'block';
  app.view.style.margin = '0 auto';
  
  document.body.appendChild(app.view);

  // 線描画用のGraphics（パーティクルの後ろに配置）
  linesGraphics = new PIXI.Graphics();
  linesGraphics.blendMode = PIXI.BLEND_MODES.ADD;
  app.stage.addChild(linesGraphics);

  // 2. パーティクルコンテナの作成
  // 高速描画のためにParticleContainerを使用
  // 位置、回転、UV(テクスチャ)、色(tint)、アルファの変化を許可
  particleContainer = new PIXI.ParticleContainer(10000, {
    position: true,
    rotation: true,
    uvs: true,
    tint: true,
    alpha: true // アルファも許可
  });
  app.stage.addChild(particleContainer);

  // 3. パーティクル用テクスチャの生成
  const texture = createParticleTexture();

  // 4. パーティクルの初期化
  createParticles(texture);

  // 6. アニメーションループ
  app.ticker.add((delta) => {
    if (!isExporting && (!window.exporter || !window.exporter.isExporting)) {
      update(delta);
    }
  });
}

function createParticleTexture() {
  // Graphicsを使って動的にテクスチャを生成
  const gr = new PIXI.Graphics();
  gr.beginFill(0xFFFFFF);
  // 少し細長い形状にして、進行方向に向けるとかっこいい
  gr.drawCircle(0, 0, 8); 
  gr.endFill();
  
  // ぼかし効果（グロー）をテクスチャに焼き付ける
  // PixiのBlurFilterは重いので、テクスチャ生成時に適用してしまうのがコツ
  // ここではシンプルに円を描画
  return app.renderer.generateTexture(gr);
}

function createParticles(texture) {
  // 既存のパーティクルを削除
  particleContainer.removeChildren();
  particles = [];

  for (let i = 0; i < params.particleCount; i++) {
    const p = new PIXI.Sprite(texture);
    
    // 初期位置
    p.x = Math.random() * app.screen.width;
    p.y = Math.random() * app.screen.height;
    
    // 中心基準
    p.anchor.set(0.5);
    
    // 個別のプロパティ
    p.vx = 0;
    p.vy = 0;
    p.life = Math.random() * 100;
    p.sizeRand = Math.random(); // サイズのばらつき用
    p.alpha = Math.random() * 0.5 + 0.5;
    
    // 色の初期化
    const palette = PALETTES[params.colorMode];
    p.tint = palette[Math.floor(Math.random() * palette.length)];

    particleContainer.addChild(p);
    particles.push(p);
  }
}

function update(delta) {
  time += params.speed * 0.005 * delta;
  pulseTimer += delta;

  const width = app.screen.width;
  const height = app.screen.height;
  const scale1 = params.noiseScale1;
  const scale2 = params.noiseScale2;
  const centerX = width / 2;
  const centerY = height / 2;

  // --- 相互引力（凝集）の計算 ---
  // 高速化のため、グリッドベースで重心を計算して引き寄せる
  let grid = null;
  let cols, rows, range;

  if (params.attraction) {
    range = params.attractionRange;
    cols = Math.ceil(width / range);
    rows = Math.ceil(height / range);
    grid = new Float32Array(cols * rows * 3); // x合計, y合計, 個数

    // Pass 1: 各グリッドセルの重心を計算
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const gx = Math.floor(p.x / range);
      const gy = Math.floor(p.y / range);
      if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
        const idx = (gy * cols + gx) * 3;
        grid[idx] += p.x;
        grid[idx + 1] += p.y;
        grid[idx + 2] += 1;
      }
    }
  }

  // 定期的な拡散（パルス）
  let pulse = false;
  if (pulseTimer > params.pulseInterval) {
    pulse = true;
    pulseTimer = 0;
  }

  // ネットワーク（線）の描画
  linesGraphics.clear();
  if (params.drawLines) {
    linesGraphics.lineStyle(params.lineThickness, 0xFFFFFF, 0.3);
    
    // 全パーティクルで計算すると重すぎるため、先頭の一部（最大300個）のみを対象にする
    const limit = Math.min(particles.length, 300);
    const minDistSq = params.lineDistance * params.lineDistance;

    for (let i = 0; i < limit; i++) {
      const p1 = particles[i];
      for (let j = i + 1; j < limit; j++) {
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < minDistSq) {
          linesGraphics.moveTo(p1.x, p1.y);
          linesGraphics.lineTo(p2.x, p2.y);
        }
      }
    }
  }

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    // ノイズフィールドによる速度計算
    // 2種類のノイズを合成して複雑な動きを作る
    const n1 = simplex.noise3D(p.x * scale1, p.y * scale1, time);
    const n2 = simplex.noise3D(p.x * scale2, p.y * scale2, time);
    const angle = (n1 * params.noiseStrength1 + n2 * params.noiseStrength2) * Math.PI * 2;
    
    // 速度ベクトル
    const speed = 2 * params.speed;
    p.vx += Math.cos(angle) * 0.1 * speed; // 加速
    p.vy += Math.sin(angle) * 0.1 * speed;
    
    // 相互引力（グリッド重心への引き寄せ）
    if (params.attraction && grid) {
      const gx = Math.floor(p.x / range);
      const gy = Math.floor(p.y / range);
      if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
        const idx = (gy * cols + gx) * 3;
        const count = grid[idx + 2];
        if (count > 1) { // 自分以外にもパーティクルがいる場合
          const avgX = grid[idx] / count;
          const avgY = grid[idx + 1] / count;
          // 重心に向かって加速
          p.vx += (avgX - p.x) * 0.001 * params.attractionStrength;
          p.vy += (avgY - p.y) * 0.001 * params.attractionStrength;
        }
      }
    }

    // パルス拡散
    if (pulse) {
      if (params.pulseMode === 'Center') {
        // 中心から外側へ拡散
        const dx = p.x - centerX;
        const dy = p.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
        p.vx += (dx / dist) * params.pulseStrength;
        p.vy += (dy / dist) * params.pulseStrength;
      } else {
        // ランダムな位置へ引き寄せられる
        const tx = Math.random() * width;
        const ty = Math.random() * height;
        p.vx += (tx - p.x) * 0.01 * params.pulseStrength;
        p.vy += (ty - p.y) * 0.01 * params.pulseStrength;
      }
    }

    // 摩擦（減速）
    p.vx *= 0.95;
    p.vy *= 0.95;

    // 位置更新
    p.x += (p.vx + params.scrollX) * delta;
    p.y += (p.vy + params.scrollY) * delta;

    // 画面端のラップアラウンド処理
    if (params.boundaryMode === 'Wrap') {
      if (p.x < 0) p.x += width;
      if (p.x > width) p.x -= width;
      if (p.y < 0) p.y += height;
      if (p.y > height) p.y -= height;
    } else {
      // Flowモード: 画面外へ流れていき、十分離れたら反対側に戻る
      const margin = 100;
      if (p.x < -margin) p.x = width + margin;
      if (p.x > width + margin) p.x = -margin;
      if (p.y < -margin) p.y = height + margin;
      if (p.y > height + margin) p.y = -margin;
    }

    // 回転（進行方向に向ける）
    p.rotation = Math.atan2(p.vy, p.vx);

    // 明滅アニメーション
    p.life += 0.1 * delta;
    let baseAlpha = 0.3 + Math.sin(p.life) * 0.2 + (Math.abs(p.vx) + Math.abs(p.vy)) * 0.1;
    p.alpha = Math.min(1.0, baseAlpha * params.globalAlpha);
    
    // サイズ調整
    let sizeVar = 1.0 + (p.sizeRand - 0.5) * params.sizeRandomness;
    if (sizeVar < 0.1) sizeVar = 0.1;
    p.scale.set(sizeVar * params.baseSize * (1 + Math.sin(p.life * 0.5) * 0.2));
  }
}

// --- 書き出し機能 ---

async function startExportMP4() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  exportMax = params.exportFrames;
  let suggestedName = `sketch033_${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}_${String(new Date().getHours()).padStart(2,'0')}${String(new Date().getMinutes()).padStart(2,'0')}.mp4`;
  await window.exporter.startMP4(1920, 1080, 30, exportMax, suggestedName);
  
  isExporting = true;
  app.ticker.stop();
  processExportFrame();
}

async function startExportPNG() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  exportMax = params.exportFrames;
  let prefix = `sketch033_${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}_${String(new Date().getHours()).padStart(2,'0')}${String(new Date().getMinutes()).padStart(2,'0')}`;
  await window.exporter.startPNG(30, exportMax, prefix);
  
  isExporting = true;
  app.ticker.stop();
  processExportFrame();
}

function processExportFrame() {
  if (!isExporting && (!window.exporter || !window.exporter.isExporting)) return;

  // 1フレーム進める (delta = 1.0 と仮定)
  update(1.0);
  
  // レンダリング
  app.renderer.render(app.stage);

  // 保存
  window.exporter.captureFrame(app.view);

  if (!window.exporter.isExporting) {
    isExporting = false;
    app.ticker.start();
  } else {
    // 少し待機してから次へ
    setTimeout(processExportFrame, 30);
  }
}