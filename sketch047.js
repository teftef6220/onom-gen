// Regular Motion Particles
// Grid-based particles with periodic, rhythmic motion

const params = {
  layout: 'Grid', // Grid, Circle, Spiral
  cols: 30,
  rows: 15,
  particleSize: 15,
  speed: 1.0,
  zoom: 1.0,
  waveFreqX: 0.2,
  waveFreqY: 0.2,
  waveAmp: 30,
  rotationSpeed: 0.05,
  shape: 'Rect', // Circle, Rect, Cross, Line
  colorMode: 'Rainbow', // Rainbow, Gradient, Mono
  baseColor: '#00aaff',
  bgColor: '#000000',
  blendMode: 'BLEND', // BLEND, ADD
  exportFrames: 600,
  exportMP4: () => startExportMP4(),
  exportPNG: () => startExportPNG(),
  regenerate: () => initParticles()
};

let particles = [];
let time = 0;

// 書き出し用変数
let isExporting = false;
let exportMax = 0;

function setup() {
  let c = createCanvas(2560, 1280);
  pixelDensity(1);
  
  // 画面に合わせて表示サイズを調整
  c.style('width', '100%');
  c.style('height', '100%');
  c.style('object-fit', 'contain');
  
  rectMode(CENTER);
  ellipseMode(CENTER);
  
  initParticles();
}

function initParticles() {
  particles = [];
  
  if (params.layout === 'Grid') {
    // グリッド生成
    for (let y = 0; y < params.rows; y++) {
      for (let x = 0; x < params.cols; x++) {
        particles.push({
          ix: x,
          iy: y,
          phase: (x * 0.1 + y * 0.1) // 初期位相
        });
      }
    }
  } else if (params.layout === 'Circle') {
    // 同心円生成
    let count = params.cols * params.rows;
    for (let i = 0; i < count; i++) {
      // 中心からの距離と角度を計算
      // iに基づいてリング状に配置する簡易ロジック
      // リング番号
      let ring = floor(sqrt(i));
      let angle = i * 0.5; // 黄金角に近い値で散らすか、単純に回す
      
      particles.push({
        ix: i, // インデックスとして保持
        iy: ring, // リング番号をY的な要素として扱う
        phase: angle
      });
    }
  } else if (params.layout === 'Spiral') {
    // 螺旋生成
    let count = params.cols * params.rows;
    for (let i = 0; i < count; i++) {
      particles.push({
        ix: i,
        iy: i / 20, // 螺旋の広がり
        phase: i * 0.1
      });
    }
  }
}

function draw() {
  // 背景描画
  blendMode(BLEND);
  
  // 背景を確実にクリアするために矩形で描画
  push();
  rectMode(CORNER);
  fill(0); // 固定の黒
  noStroke();
  rect(0, 0, width, height);
  pop();

  // ブレンドモード設定
  if (params.blendMode === 'ADD') blendMode(ADD);
  else blendMode(BLEND);

  noStroke();
  
  let t = time * params.speed;

  push();
  translate(width / 2, height / 2);
  scale(params.zoom);
  translate(-width / 2, -height / 2);

  for (let p of particles) {
    let bx, by;
    
    if (params.layout === 'Grid') {
      // グリッド計算
      let marginX = width * 0.15;
      let marginY = height * 0.15;
      let drawW = width - marginX * 2;
      let drawH = height - marginY * 2;
      let stepX = drawW / max(1, params.cols - 1);
      let stepY = drawH / max(1, params.rows - 1);
      
      bx = marginX + p.ix * stepX;
      by = marginY + p.iy * stepY;
      
    } else if (params.layout === 'Circle') {
      // 同心円配置
      let centerX = width / 2;
      let centerY = height / 2;
      let maxR = min(width, height) * 0.4;
      
      // p.iy (ring) と p.ix を使って位置決定
      // ここでは単純にインデックスから角度と半径を算出するフェルマーの螺旋的な配置を使用
      let angle = p.ix * 2.39996; // 黄金角 (approx)
      let r = params.particleSize * 1.5 * sqrt(p.ix);
      
      // 画面内に収まるようにスケーリング
      if (r > maxR) r = maxR * (r/maxR % 1); 
      
      bx = centerX + cos(angle) * r;
      by = centerY + sin(angle) * r;
      
    } else if (params.layout === 'Spiral') {
      // 螺旋配置
      let centerX = width / 2;
      let centerY = height / 2;
      let angle = p.ix * 0.2 + t * 0.2;
      let r = p.ix * 0.5;
      
      bx = centerX + cos(angle) * r;
      by = centerY + sin(angle) * r;
    }
    
    // 周期的な動き (Lissajous-like motion)
    let waveX = sin(t + p.iy * params.waveFreqY + p.ix * params.waveFreqX) * params.waveAmp;
    let waveY = cos(t + p.ix * params.waveFreqX + p.iy * params.waveFreqY) * params.waveAmp;
    
    // 回転
    let rot = t * params.rotationSpeed * 5 + p.phase;
    
    // 描画位置
    let px = bx + waveX;
    let py = by + waveY;
    
    // 色設定
    let col;
    if (params.colorMode === 'Rainbow') {
      colorMode(HSB, 360, 100, 100);
      let hue = (p.ix * 10 + p.iy * 10 + time * 20) % 360;
      col = color(hue, 80, 100);
    } else if (params.colorMode === 'Gradient') {
      colorMode(HSB, 360, 100, 100);
      let baseHue = hue(color(params.baseColor));
      let hueVar = map(sin(t + p.phase), -1, 1, -40, 40);
      col = color((baseHue + hueVar + 360) % 360, 80, 100);
    } else {
      colorMode(RGB);
      col = color(params.baseColor);
    }
    
    fill(col);
    
    push();
    translate(px, py);
    rotate(rot);
    
    // サイズ変化
    let s = params.particleSize * (1 + 0.5 * sin(t * 2 + p.phase));
    
    if (params.shape === 'Circle') {
      ellipse(0, 0, s, s);
    } else if (params.shape === 'Rect') {
      rect(0, 0, s, s);
    } else if (params.shape === 'Cross') {
      rect(0, 0, s, s * 0.25);
      rect(0, 0, s * 0.25, s);
    } else if (params.shape === 'Line') {
      stroke(col);
      strokeWeight(params.particleSize * 0.1);
      line(-s, 0, s, 0);
      noStroke();
    }
    
    pop();
  }

  pop(); // End zoom
  
  // 色モードを戻す
  colorMode(RGB);

  time += 0.02;

  // 書き出し処理
  if (isExporting || (window.exporter && window.exporter.isExporting)) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
      isExporting = false;
      console.log("Export finished");
    }
  }
}

async function startExportMP4() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  exportMax = params.exportFrames;
  let suggestedName = `sketch047_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}.mp4`;
  await window.exporter.startMP4(width, height, 24, exportMax, suggestedName);
  isExporting = true;
}

async function startExportPNG() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  exportMax = params.exportFrames;
  let prefix = `sketch047_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}`;
  await window.exporter.startPNG(24, exportMax, prefix);
  isExporting = true;
}

function keyPressed() {
  if (key === 'm' || key === 'M') startExportMP4();
  if (key === 'p' || key === 'P') startExportPNG();
}

// GUI設定
window.guiConfig = [
  { folder: 'Grid', contents: [
    { object: params, variable: 'layout', options: ['Grid', 'Circle', 'Spiral'], name: 'Layout', onChange: initParticles },
    { object: params, variable: 'cols', min: 2, max: 100, step: 1, name: 'Columns', onChange: initParticles },
    { object: params, variable: 'rows', min: 2, max: 50, step: 1, name: 'Rows', onChange: initParticles },
    { object: params, variable: 'particleSize', min: 1, max: 100, name: 'Size' },
    { object: params, variable: 'shape', options: ['Circle', 'Rect', 'Cross', 'Line'], name: 'Shape' },
  ]},
  { folder: 'Motion', contents: [
    { object: params, variable: 'speed', min: 0, max: 5.0, name: 'Speed' },
    { object: params, variable: 'zoom', min: 0.1, max: 5.0, name: 'Zoom' },
    { object: params, variable: 'waveFreqX', min: 0, max: 1.0, name: 'Freq X' },
    { object: params, variable: 'waveFreqY', min: 0, max: 1.0, name: 'Freq Y' },
    { object: params, variable: 'waveAmp', min: 0, max: 200, name: 'Amplitude' },
    { object: params, variable: 'rotationSpeed', min: 0, max: 1.0, name: 'Rotation' },
  ]},
  { folder: 'Style', contents: [
    { object: params, variable: 'colorMode', options: ['Rainbow', 'Gradient', 'Mono'], name: 'Color Mode' },
    { object: params, variable: 'baseColor', type: 'color', name: 'Base Color' },
    { object: params, variable: 'blendMode', options: ['BLEND', 'ADD'], name: 'Blend Mode' },
  ]},
  { folder: 'Export', contents: [
    { object: params, variable: 'exportFrames', min: 60, max: 1200, step: 1, name: 'Frames' },
    { object: params, variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },
    { object: params, variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }
  ]}
];


