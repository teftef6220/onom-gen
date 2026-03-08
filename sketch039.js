// --- 設定とグローバル変数 ---
const params = {
  slices: 10,
  sliceVariance: 0.0,
  speed: 1.0,
  density: 1.0,
  colorMode: 'Mono', // Mono, Red, Blue
  invert: false,
  glitch: 0.0,
  exportFrames: 600,
  exportMP4: function() { startExportMP4(); },
  exportPNG: function() { startExportPNG(); }
};

// カラーパレット
const PALETTES = {
  Mono: { bg: '#000000', fg: '#FFFFFF', accent: '#888888' },
  Red:  { bg: '#000000', fg: '#FFFFFF', accent: '#FF0000' },
  Blue: { bg: '#000000', fg: '#FFFFFF', accent: '#0000FF' }
};

window.guiConfig = [
  { folder: 'Generator', contents: [
    { object: params, variable: 'slices', min: 1, max: 50, step: 1, name: 'Slices' },
    { object: params, variable: 'sliceVariance', min: 0.0, max: 1.0, name: 'Variance' },
    { object: params, variable: 'speed', min: 0, max: 5.0, name: 'Speed' },
    { object: params, variable: 'density', min: 0.1, max: 2.0, name: 'Density' }
  ]},
  { folder: 'Style', contents: [
    { object: params, variable: 'colorMode', options: Object.keys(PALETTES), name: 'Palette' },
    { object: params, variable: 'invert', name: 'Invert Color' },
    { object: params, variable: 'glitch', min: 0.0, max: 1.0, name: 'Glitch' }
  ]},
  { folder: 'Export', contents: [
    { object: params, variable: 'exportFrames', min: 60, max: 1200, step: 1, name: 'Frames' },
    { object: params, variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },
    { object: params, variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }
  ]}
];

let gui;
let font;
let sliceData = [];

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

  // デジタルな等幅フォント
  textFont('Courier New');
  noSmooth(); // ドット感を出すためにアンチエイリアス無効化
  
  initSlices();
}

function initSlices() {
  sliceData = [];
  for(let i=0; i<50; i++) { // 最大50スライス分確保
    sliceData.push({
      mode: random(['Barcode', 'Binary', 'Noise', 'Radar', 'Waveform', 'Hex']),
      timer: random(100),
      interval: random(10, 60),
      param: random(1),
      weight: random(0.05, 20.0), // 高さの重み
      densityFactor: random(0.5, 3.0), // 密度のばらつき
      scrollSpeed: random(2, 10) * (random() > 0.5 ? 1 : -1),
      scrollPos: 0
    });
  }
}

function draw() {
  let palette = PALETTES[params.colorMode];
  let bg = params.invert ? palette.fg : palette.bg;
  let fg = params.invert ? palette.bg : palette.fg;
  let ac = palette.accent;

  // 背景クリア
  noStroke();
  fill(bg);
  rect(0, 0, width, height);

  // スライスの高さ計算用
  let totalWeight = 0;
  for (let i = 0; i < params.slices; i++) {
    totalWeight += lerp(1.0, sliceData[i].weight, params.sliceVariance);
  }

  // グリッチ（画面全体のズレ）
  let globalX = 0;
  if (random() < params.glitch) {
    globalX = random(-50, 50);
  }

  push();
  translate(globalX, 0);

  let currentY = 0;

  for (let i = 0; i < params.slices; i++) {
    let w = lerp(1.0, sliceData[i].weight, params.sliceVariance);
    let sliceH = (w / totalWeight) * height;
    let y = currentY;
    let data = sliceData[i];
    let d = params.density * data.densityFactor;
    
    // モードの切り替え
    data.scrollPos += data.scrollSpeed * params.speed;
    data.timer += params.speed;
    if (data.timer > data.interval) {
      data.mode = random(['Barcode', 'Binary', 'Noise', 'Radar', 'Waveform', 'Hex']);
      data.timer = 0;
      data.interval = random(5, 30) / params.speed; // 高速切り替え
      data.param = random(1);
    }

    // 描画領域のクリップ
    // (p5.jsのclip()は重いので、各描画関数内でy座標を制限して描画する)
    
    push();
    translate(0, y);
    
    // スライスごとのグリッチ
    if (random() < params.glitch * 0.5) {
      translate(random(-20, 20), 0);
    }

    if (data.mode === 'Barcode') {
      drawBarcode(width, sliceH, fg, ac, data.param, d, data.scrollPos);
    } else if (data.mode === 'Binary') {
      drawBinary(width, sliceH, fg, ac, data.param, d, data.scrollPos);
    } else if (data.mode === 'Noise') {
      drawNoise(width, sliceH, fg, bg, data.param, d, data.scrollPos);
    } else if (data.mode === 'Radar') {
      drawRadar(width, sliceH, fg, ac, data.param, data.scrollPos);
    } else if (data.mode === 'Waveform') {
      drawWaveform(width, sliceH, fg, ac, data.param, d, data.scrollPos);
    } else if (data.mode === 'Hex') {
      drawHex(width, sliceH, fg, ac, data.param, d, data.scrollPos);
    }
    
    // スライスの境界線
    stroke(bg);
    strokeWeight(2);
    line(0, 0, width, 0);
    line(0, sliceH, width, sliceH);
    
    currentY += sliceH;
    
    pop();
  }
  pop();

  // オーバーレイ情報（タイムコードなど）
  drawOverlay(fg);

  // 書き出し処理
  if (isExporting || (window.exporter && window.exporter.isExporting)) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
      isExporting = false;
      console.log("Export finished");
    }
  }
}

// --- 描画モード関数 ---

function drawBarcode(w, h, fg, ac, param, density, scrollPos) {
  noStroke();
  let unit = 4 / density; // 最小単位
  let noiseScale = 0.05 * density;
  
  // スクロールに合わせて描画開始位置をずらす
  let startX = -(scrollPos % unit);
  if (startX > 0) startX -= unit;

  for (let x = startX; x < w; x += unit) {
    let worldX = x + scrollPos;
    let n = noise(worldX * noiseScale, param);
    
    if (n > 0.6) { // 閾値を上げてバーの出現頻度を下げる
      // アクセントカラーの判定
      let n2 = noise(worldX * noiseScale * 2, param + 100);
      fill(n2 > 0.8 ? ac : fg);
      rect(x, 0, unit, h);
    }
  }
}

function drawBinary(w, h, fg, ac, param, density, scrollPos) {
  noStroke();
  fill(fg);
  
  let textSizeVal = 12 / density;
  if (textSizeVal < 8) textSizeVal = 8;
  textSize(textSizeVal);
  textAlign(LEFT, TOP);
  
  let charW = textSizeVal * 0.7;
  let cols = ceil(w / charW) + 2; // 余裕を持って+2にする
  let rows = floor(h / textSizeVal);
  
  let startCol = floor(scrollPos / charW);
  let xOffset = -(scrollPos % charW);
  if (xOffset > 0) xOffset -= charW; // オフセットが正にならないように調整

  for (let y = 0; y < rows; y++) {
    let str = "";
    for (let i = 0; i < cols; i++) {
      let colIndex = startCol + i;
      // 座標ベースの擬似ランダム
      let n = noise(colIndex * 0.5, y * 0.5, param);
      str += n > 0.65 ? (n > 0.9 ? "1" : "0") : " "; // 閾値を上げ、0の代わりにスペースを描画
    }
    text(str, xOffset, y * textSizeVal);
  }
}

function drawNoise(w, h, fg, bg, param, density, scrollPos) {
  noStroke();
  let blockSize = 20 / density;
  let cols = ceil(w / blockSize) + 2; // 余裕を持って+2にする
  let rows = ceil(h / blockSize);
  
  let startCol = floor(scrollPos / blockSize);
  let xOffset = -(scrollPos % blockSize);
  if (xOffset > 0) xOffset -= blockSize; // オフセットが正にならないように調整
  
  for (let y = 0; y < rows; y++) {
    for (let i = 0; i < cols; i++) {
      let colIndex = startCol + i;
      // 高周波ノイズでホワイトノイズ風に
      let n = noise(colIndex * 10.0, y * 10.0, param);
      if (n > 0.7) { // 閾値を上げてノイズの密度を下げる
        fill(fg);
        rect(xOffset + i * blockSize, y * blockSize, blockSize, blockSize);
      }
    }
  }
}

function drawWaveform(w, h, fg, ac, param, density, scrollPos) {
  noFill();
  stroke(fg);
  strokeWeight(max(1, 1.5 / density)); // 線を少し細くする
  beginShape();
  let step = max(2, 5 / density);
  for (let x = 0; x < w; x += step) {
    // スクロール位置を加味したノイズ
    let n = noise((x + scrollPos) * 0.01, param * 100);
    let y = map(n, 0, 1, h * 0.1, h * 0.9);
    vertex(x, y);
  }
  endShape();
}

function drawHex(w, h, fg, ac, param, density, scrollPos) {
  noStroke();
  fill(fg);
  
  let textSizeVal = 12 / density;
  if (textSizeVal < 8) textSizeVal = 8;
  textSize(textSizeVal);
  textAlign(LEFT, TOP);
  
  let charW = textSizeVal * 0.7;
  let cols = ceil(w / charW) + 2; // 余裕を持って+2にする
  let rows = floor(h / textSizeVal);
  
  let startCol = floor(scrollPos / charW);
  let xOffset = -(scrollPos % charW);
  if (xOffset > 0) xOffset -= charW; // オフセットが正にならないように調整

  for (let y = 0; y < rows; y++) {
    let str = "";
    for (let i = 0; i < cols; i++) {
      let colIndex = startCol + i;
      let n = noise(colIndex * 0.2, y * 0.2, param);
      if (n > 0.6) { // 閾値を設けて文字の出現頻度を下げる
        let val = floor(n * 16) % 16;
        str += val.toString(16).toUpperCase();
      } else {
        str += " ";
      }
    }
    text(str, xOffset, y * textSizeVal);
  }
}

function drawRadar(w, h, fg, ac, param, scrollPos) {
  // 走査線
  // スクロール位置に基づいてスキャンラインを移動
  let scanX = (scrollPos + param * w) % w;
  if (scanX < 0) scanX += w;
  
  stroke(fg);
  strokeWeight(1);
  line(0, h/2, w, h/2); // 中心線
  
  // 波形
  noFill();
  stroke(ac);
  beginShape();
  for (let x = 0; x < w; x += 10) {
    let dist = abs(x - scanX);
    let amp = 0;
    if (dist < 100) {
      amp = map(dist, 0, 100, h * 0.25, 0); // 波形の振幅を小さくする
    }
    let y = h/2 + random(-amp, amp);
    vertex(x, y);
  }
  endShape();

  // スキャンバー
  noStroke();
  fill(fg);
  rect(scanX, 0, 2, h);
  
  // 数値
  fill(fg);
  textSize(10);
  text(nf(scanX, 4, 1), scanX + 5, h - 12);
}

function drawOverlay(fg) {
  // 画面四隅のマーカーやタイムコード
  fill(fg);
  noStroke();
  textSize(14);
  textAlign(LEFT, TOP);
  text("SYS.MONITOR_V.14", 20, 20);
  
  textAlign(RIGHT, TOP);
  let ms = nf(millis(), 6, 0);
  text("T: " + ms, width - 20, 20);
  
  textAlign(LEFT, BOTTOM);
  text("FPS: " + nf(frameRate(), 2, 1), 20, height - 20);
  
  // 十字カーソル
  stroke(fg);
  strokeWeight(1);
  let cx = width / 2;
  let cy = height / 2;
  line(cx - 20, cy, cx + 20, cy);
  line(cx, cy - 20, cx, cy + 20);
}

// --- UI & Export Logic ---

async function startExportMP4() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  exportMax = params.exportFrames;
  let suggestedName = `sketch039_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}.mp4`;
  await window.exporter.startMP4(width, height, 30, exportMax, suggestedName);
  
  isExporting = true;
}

async function startExportPNG() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  exportMax = params.exportFrames;
  let prefix = `sketch039_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}`;
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