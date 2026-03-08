// --- 設定とグローバル変数 ---
const params = {
  cols: 30,
  rows: 15,
  speed: 1.5,
  zoom: 1.0,
  frequency: 0.15, // 波の細かさ
  amplitude: 1.0,  // 動きの大きさ
  waveType: 'Sine',
  rotation: 0,     // グリッドの回転
  skewX: 0,        // X軸の傾斜
  skewY: 0,        // Y軸の傾斜
  organicAmp: 0,   // 有機的な歪みの強さ
  organicSpeed: 1.0, // 有機的な歪みの速さ
  blinkAmount: 0.0, // 点滅の量
  blinkSpeed: 1.0,  // 点滅の速さ
  gap: 0,          // 要素の間隔
  mode: 'Typography', // Typography, Bars, Halftone
  textString: 'ELEMOG',
  outline: false,
  outlineWidth: 2.0,
  colorMode: 'Mono',
  bgColor: '#000000',
  exportFrames: 600,
  exportMP4: function() { startExportMP4(); },
  exportPNG: function() { startExportPNG(); }
};

// カラーパレット
const PALETTES = {
  Swiss: { bg: '#E60012', fg: '#FFFFFF' }, // 赤背景・白文字
  Mono: { bg: '#000000', fg: '#FFFFFF' },  // 黒背景・白文字
  Invert: { bg: '#FFFFFF', fg: '#000000' }, // 白背景・黒文字
  Cyber: { bg: '#000000', fg: '#00FFFF' }, // 黒背景・シアン文字
  Warning: { bg: '#FFCC00', fg: '#000000' }, // 黄背景・黒文字
  Navy: { bg: '#001F3F', fg: '#7FDBFF' }   // 紺背景・水色文字
};

let gui;
let time = 0;
let organicTime = 0;
let font;

// 書き出し用変数
let isExporting = false;
let exportMax = 0;

function setup() {
  let c = createCanvas(1920, 1080);
  pixelDensity(1);

  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '100vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');

  // スタイリッシュなサンセリフフォントを使用
  textFont("'Helvetica Neue', 'Helvetica', 'Arial', sans-serif");
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  rectMode(CENTER);
  
}

function draw() {
  // 背景のクリア（rectで塗りつぶし）
  let palette = PALETTES[params.colorMode];
  noStroke();
  fill(palette.bg);
  rect(width / 2, height / 2, width, height);

  time += params.speed * 0.02;
  organicTime += params.organicSpeed * 0.02;

  push();
  translate(width / 2, height / 2);
  scale(params.zoom);
  rotate(radians(params.rotation));
  shearX(radians(params.skewX));
  shearY(radians(params.skewY));
  translate(-width / 2, -height / 2);

  // グリッド計算
  let marginX = 100;
  let marginY = 100;
  let gridW = width - marginX * 2;
  let gridH = height - marginY * 2;
  let cellW = gridW / params.cols;
  let cellH = gridH / params.rows;

  fill(palette.fg);
  stroke(palette.fg);

  for (let y = 0; y < params.rows; y++) {
    for (let x = 0; x < params.cols; x++) {
      let posX = marginX + x * cellW + cellW / 2;
      let posY = marginY + y * cellH + cellH / 2;

      // 有機的な動き（ノイズによる位置ズレ）
      if (params.organicAmp > 0) {
        // ノイズの座標を時間でずらすことで、往復ではなく流れるようなスムーズな動きにする
        let nX = noise(x * 0.02 + organicTime, y * 0.02);
        let nY = noise(x * 0.02, y * 0.02 + organicTime);
        posX += map(nX, 0, 1, -params.organicAmp, params.organicAmp);
        posY += map(nY, 0, 1, -params.organicAmp, params.organicAmp);
      }

      // Blink エフェクト（ランダム点滅）
      if (params.blinkAmount > 0) {
        // ノイズを使ってランダムに点滅させる
        // 座標係数を大きくして隣り合うセルと非同期にする
        let blinkVal = noise(x * 13.5, y * 13.5, time * params.blinkSpeed);
        if (blinkVal < params.blinkAmount) continue; // 描画をスキップ
      }

      // 波の計算（中心からの距離 + 時間）
      let d = dist(posX, posY, width / 2, height / 2);
      let angle = d * params.frequency * 0.01 - time;
      
      let normWave;
      if (params.waveType === 'Sine') {
        normWave = (sin(angle) + 1) / 2;
      } else if (params.waveType === 'Square') {
        normWave = sin(angle) > 0 ? 1 : 0;
      } else if (params.waveType === 'Triangle') {
        normWave = (asin(sin(angle)) / HALF_PI + 1) / 2;
      } else if (params.waveType === 'Noise') {
        normWave = noise(angle * 3.0 + 1000);
      }
      
      // 動きの強度を適用
      let factor = normWave * params.amplitude;

      // ギャップを考慮した描画サイズ
      let drawW = Math.max(0, cellW - params.gap);
      let drawH = Math.max(0, cellH - params.gap);

      push();
      translate(posX, posY);

      if (params.mode === 'Typography') {
        drawTypography(x, y, drawW, drawH, factor);
      } else if (params.mode === 'Bars') {
        drawBars(drawW, drawH, factor);
      } else if (params.mode === 'Halftone') {
        drawHalftone(drawW, factor);
      } else if (params.mode === 'Matrix') {
        drawMatrix(x, y, drawW, drawH, factor);
      } else if (params.mode === 'Cross') {
        drawCross(drawW, drawH, factor);
      }
      
      pop();
    }
  }
  pop();

  // 書き出し処理
  if (isExporting || (window.exporter && window.exporter.isExporting)) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
      isExporting = false;
      console.log("Export finished");
    }
  }
}

// --- 描画モード ---

function drawTypography(x, y, w, h, factor) {
  if (params.outline) {
    noFill();
    stroke(PALETTES[params.colorMode].fg);
    strokeWeight(params.outlineWidth);
  } else {
    noStroke();
    fill(PALETTES[params.colorMode].fg);
  }
  
  // 文字列から1文字を選択
  let charIndex = (x + y) % params.textString.length;
  let char = params.textString.charAt(charIndex);
  
  // 波に合わせてサイズと太さを変化させる
  let size = h * (0.5 + factor * 0.8);
  textSize(size);
  
  // 回転
  let rot = map(factor, 0, 1, -PI/4, PI/4);
  rotate(rot);
  
  text(char, 0, 0);
}

function drawBars(w, h, factor) {
  if (params.outline) {
    noFill();
    stroke(PALETTES[params.colorMode].fg);
    strokeWeight(params.outlineWidth);
  } else {
    noStroke();
    fill(PALETTES[params.colorMode].fg);
  }
  
  // 回転するバー
  let rot = map(factor, 0, 1, 0, PI);
  rotate(rot);
  
  // 長さと太さが変化
  let barW = w * 0.8;
  let barH = h * (0.1 + factor * 0.4);
  
  rect(0, 0, barW, barH);
}

function drawHalftone(w, factor) {
  if (params.outline) {
    noFill();
    stroke(PALETTES[params.colorMode].fg);
    strokeWeight(params.outlineWidth);
  } else {
    noStroke();
    fill(PALETTES[params.colorMode].fg);
  }
  
  // 円のサイズが変化（ハーフトーン効果）
  let size = w * (0.1 + factor * 0.9);
  ellipse(0, 0, size, size);
}

function drawMatrix(x, y, w, h, factor) {
  if (params.outline) {
    noFill();
    stroke(PALETTES[params.colorMode].fg);
    strokeWeight(params.outlineWidth);
  } else {
    noStroke();
    fill(PALETTES[params.colorMode].fg);
  }
  
  // 時間と位置に基づいてランダムに文字を変化させる
  let n = noise(x * 0.1, y * 0.1, time * 5.0);
  let charIndex = floor(n * 100) % params.textString.length;
  let char = params.textString.charAt(charIndex);
  
  // 波に合わせてサイズを変化
  let size = h * (0.4 + factor * 0.6);
  textSize(size);
  
  // 透明度で明滅感を出す
  drawingContext.globalAlpha = map(factor, 0, 1, 0.3, 1.0);
  text(char, 0, 0);
  drawingContext.globalAlpha = 1.0;
}

function drawCross(w, h, factor) {
  if (params.outline) {
    noFill();
    stroke(PALETTES[params.colorMode].fg);
    strokeWeight(params.outlineWidth);
  } else {
    noStroke();
    fill(PALETTES[params.colorMode].fg);
  }
  
  let rot = map(factor, 0, 1, 0, HALF_PI);
  rotate(rot);
  
  let size = Math.min(w, h) * (0.3 + factor * 0.7);
  let thickness = Math.min(w, h) * 0.15;
  
  rect(0, 0, size, thickness);
  rect(0, 0, thickness, size);
}

// --- UI & Export Logic ---

async function startExportMP4() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  exportMax = params.exportFrames;
  let suggestedName = `sketch035_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}.mp4`;
  await window.exporter.startMP4(width, height, 30, exportMax, suggestedName);
  
  isExporting = true;
}

async function startExportPNG() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  exportMax = params.exportFrames;
  let prefix = `sketch035_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}`;
  await window.exporter.startPNG(30, exportMax, prefix);
  
  isExporting = true;
}

function keyPressed() {
  if (key === 'm' || key === 'M') startExportMP4();
  if (key === 'p' || key === 'P') startExportPNG();
}

function windowResized() {
  // 固定サイズのためリサイズ処理は行わない
}

window.guiConfig = [
  { folder: 'Animation', contents: [
    { object: params, variable: 'speed', min: 0, max: 5.0, name: 'Speed' },
    { object: params, variable: 'zoom', min: 0.1, max: 5.0, name: 'Zoom' },
    { object: params, variable: 'waveType', options: ['Sine', 'Square', 'Triangle', 'Noise'], name: 'Wave Shape' },
    { object: params, variable: 'frequency', min: 0.01, max: 5.0, name: 'Frequency' },
    { object: params, variable: 'amplitude', min: 0, max: 2.0, name: 'Amplitude' },
    { object: params, variable: 'organicAmp', min: 0, max: 200, name: 'Organic Dist' },
    { object: params, variable: 'organicSpeed', min: 0, max: 5.0, name: 'Organic Speed' },
    { object: params, variable: 'blinkAmount', min: 0, max: 0.8, name: 'Blink Amount' },
    { object: params, variable: 'blinkSpeed', min: 0, max: 10.0, name: 'Blink Speed' }
  ]},
  { folder: 'Transform', contents: [
    { object: params, variable: 'rotation', min: -180, max: 180, name: 'Rotation' },
    { object: params, variable: 'skewX', min: -60, max: 60, name: 'Skew X' },
    { object: params, variable: 'skewY', min: -60, max: 60, name: 'Skew Y' }
  ]},
  { folder: 'Grid', contents: [
    { object: params, variable: 'cols', min: 5, max: 100, step: 1, name: 'Columns' },
    { object: params, variable: 'rows', min: 5, max: 50, step: 1, name: 'Rows' },
    { object: params, variable: 'gap', min: 0, max: 50, name: 'Gap' }
  ]},
  { folder: 'Style', contents: [
    { object: params, variable: 'mode', options: ['Typography', 'Bars', 'Halftone', 'Matrix', 'Cross'], name: 'Mode' },
    { object: params, variable: 'textString', name: 'Text' },
    { object: params, variable: 'outline', name: 'Outline' },
    { object: params, variable: 'outlineWidth', min: 0.5, max: 10.0, name: 'Outline Width' },
    { object: params, variable: 'colorMode', options: Object.keys(PALETTES), name: 'Color Palette' }
  ]},
  { folder: 'Export', contents: [
    { object: params, variable: 'exportFrames', min: 60, max: 1200, step: 1, name: 'Frames' },
    { object: params, variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },
    { object: params, variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }
  ]}
];