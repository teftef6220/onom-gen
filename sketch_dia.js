// DIA Studio Inspired Kinetic Typography Sketch
// Kinetic, Grid, Repetition, Distortion

const params = {
  textString: "ELEMOG",
  cols: 1,
  rows: 12,
  textSize: 120,
  lineHeight: 1.0,
  speed: 1.0,
  waveSpeed: 1.0,
  frequency: 0.1,
  amplitude: 1.0,
  mode: 'Stretch', // Stretch, Slide, Shear, Wave, Opacity, Chaos, Decoding
  align: 'LEFT', // CENTER, LEFT, RIGHT
  font: 'Helvetica',
  bgMode: 'Solid', // Solid, Technical
  trailStrength: 0.0,
  renderMode: 'FILL', // FILL, OUTLINE, MIXED
  strokeWidth: 2.0,
  scrollSpeed: 0.0,
  style: 'BOLD', // NORMAL, BOLD, ITALIC
  colorMode: 'Dark', // Dark, Light, Blue, Red
  bgColor: '#000000',
  fgColor: '#FFFFFF',
  autoLayout: false,
  layoutInterval: 60,
  exportFrames: 600,
  exportStart: () => startExport()
};

let time = 0;

// カラーパレット
const PALETTES = {
  Dark: { bg: '#000000', fg: '#FFFFFF' },
  Light: { bg: '#F0F0F0', fg: '#000000' },
  Blue: { bg: '#0000FF', fg: '#FFFFFF' },
  Red: { bg: '#FF3300', fg: '#FFFFFF' },
  Neon: { bg: '#111111', fg: '#CCFF00' }
};

// 書き出し用変数
let isExporting = false;
let exportCount = 0;
let exportMax = 0;
let exportSessionID = "";

function setup() {
  let c = createCanvas(1980, 1080);
  pixelDensity(1);

  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '100vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');

}

function draw() {
  // カラー設定更新
  let palette = PALETTES[params.colorMode];
  params.bgColor = palette.bg;
  params.fgColor = palette.fg;

  // 背景描画（描画設定をリセット）
  blendMode(BLEND);
  rectMode(CORNER);
  noStroke();
  
  let bgCol = color(params.bgColor);
  if (params.trailStrength > 0) {
    bgCol.setAlpha(map(params.trailStrength, 0, 100, 255, 10));
  }
  fill(bgCol);
  rect(0, 0, width, height);
  
  if (params.bgMode === 'Technical') {
    drawTechnicalBackground();
  }
  
  if (params.autoLayout && frameCount % params.layoutInterval === 0) {
    params.cols = floor(random(1, 6));
    params.textSize = floor(random(10, 200));
    params.lineHeight = random(0.6, 2.5);
  }
  
  time += params.speed * 0.02;

  // フォント設定
  textFont(params.font);
  if (params.style === 'BOLD') textStyle(BOLD);
  else if (params.style === 'ITALIC') textStyle(ITALIC);
  else textStyle(NORMAL);
  
  textSize(params.textSize);
  
  if (params.align === 'CENTER') textAlign(CENTER, CENTER);
  else if (params.align === 'LEFT') textAlign(LEFT, CENTER);
  else if (params.align === 'RIGHT') textAlign(RIGHT, CENTER);

  // グリッド計算
  let marginX = 100;
  let marginY = 100;
  let drawW = width - marginX * 2;
  let drawH = height - marginY * 2;
  
  let cellW = drawW / params.cols;
  let cellH = (params.textSize * params.lineHeight);
  
  // 全体の高さに基づいて開始Y位置を調整（中央寄せ）
  let totalH = cellH * params.rows;
  let startY = (height - totalH) / 2 + cellH / 2;
  let startX = marginX;

  // テキストを行で分割
  let lines = params.textString.split('\n');

  // スクロールオフセット（行の高さ単位）
  let scrollOffset = time * params.scrollSpeed * 2.0;

  for (let y = 0; y < params.rows; y++) {
    for (let x = 0; x < params.cols; x++) {
      // スクロール計算（ループ）
      let virtualY = y + scrollOffset;
      // 正の剰余を計算してループさせる
      let loopedY = ((virtualY % params.rows) + params.rows) % params.rows;
      
      let posX = startX + x * cellW;
      let posY = startY + loopedY * cellH;
      
      if (params.align === 'CENTER') posX += cellW / 2;
      else if (params.align === 'RIGHT') posX += cellW;

      // 表示するテキスト（行数より多い場合はループ）
      let txt = lines[y % lines.length];
      
      // 波の計算
      let waveInput = (y * params.frequency) + (x * params.frequency * 0.5) - (time * params.waveSpeed);
      let wave = sin(waveInput); // -1 to 1
      let wave01 = (wave + 1) / 2; // 0 to 1

      push();
      translate(posX, posY);

      // 描画モード設定
      let isOutline = false;
      if (params.renderMode === 'OUTLINE') {
        isOutline = true;
      } else if (params.renderMode === 'MIXED') {
        // 市松模様のように混在させる
        isOutline = (x + y) % 2 !== 0;
      }

      if (isOutline) {
        noFill();
        stroke(params.fgColor);
        strokeWeight(params.strokeWidth);
      } else {
        fill(params.fgColor);
        noStroke();
      }

      if (params.mode === 'Stretch') {
        // 横方向への伸縮
        // 中心から伸縮させるために矩形モード変更などは不要だが、scaleの基準点に注意
        let scaleX = map(wave, -1, 1, 0.5, 1.0 + params.amplitude * 2.0);
        scaleX = max(0.1, scaleX); // 負の値防止
        scale(scaleX, 1);
        
      } else if (params.mode === 'Slide') {
        // 横方向へのスライド
        let slideX = wave * params.amplitude * 200;
        translate(slideX, 0);
        
      } else if (params.mode === 'Shear') {
        // 斜体（シアー）効果
        let shearVal = wave * params.amplitude * 1.0;
        shearX(shearVal);
        
      } else if (params.mode === 'Wave') {
        // 縦方向の波
        let waveY = wave * params.amplitude * 50;
        translate(0, waveY);
        
      } else if (params.mode === 'Opacity') {
        // 透明度変化
        let alpha = map(wave, -1, 1, 50, 255);
        if (isOutline) {
          stroke(red(params.fgColor), green(params.fgColor), blue(params.fgColor), alpha);
        } else {
          fill(red(params.fgColor), green(params.fgColor), blue(params.fgColor), alpha);
        }
        
      } else if (params.mode === 'Chaos') {
        // カオスモード: 個別に回転・移動
        let n = noise(x * 0.8, y * 0.8, time * 0.5);
        let angle = map(n, 0, 1, -PI, PI) * params.amplitude;
        rotate(angle);
        
        let driftX = (noise(x + time, y) - 0.5) * params.amplitude * 100;
        let driftY = (noise(x, y + time) - 0.5) * params.amplitude * 100;
        translate(driftX, driftY);
        
      } else if (params.mode === 'Decoding') {
        // デコーディング効果: ランダムな文字に置換
        let decoded = "";
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        for (let i = 0; i < txt.length; i++) {
          if (txt[i] === ' ') decoded += ' ';
          else decoded += chars.charAt(floor(random(chars.length)));
        }
        txt = decoded;
      }

      text(txt, 0, 0);
      pop();
    }
  }

  // 書き出し処理
  if (isExporting) {
    saveCanvas('dia_kinetic_' + exportSessionID + '_' + nf(exportCount + 1, 3), 'png');
    exportCount++;
    if (exportCount >= exportMax) {
      isExporting = false;
      console.log("Export finished");
    }
  }
}

function drawTechnicalBackground() {
  let c = color(params.fgColor);
  let gridSize = 100;

  // Grid
  c.setAlpha(30);
  stroke(c);
  strokeWeight(1);
  for (let x = 0; x < width; x += gridSize) line(x, 0, x, height);
  for (let y = 0; y < height; y += gridSize) line(0, y, width, y);

  // Crosses
  c.setAlpha(150);
  stroke(c);
  strokeWeight(1.5);
  let m = 5;
  for (let x = 0; x <= width; x += gridSize) {
    for (let y = 0; y <= height; y += gridSize) {
      line(x - m, y, x + m, y);
      line(x, y - m, x, y + m);
    }
  }
}

// --- UI & Export Logic ---

window.guiConfig = [
  { folder: 'Content', contents: [
    { object: params, variable: 'textString', name: 'Text' },
    { object: params, variable: 'rows', min: 1, max: 50, step: 1, name: 'Rows' },
    { object: params, variable: 'cols', min: 1, max: 10, step: 1, name: 'Cols', listen: true },
    { object: params, variable: 'textSize', min: 10, max: 300, name: 'Size', listen: true },
    { object: params, variable: 'lineHeight', min: 0.5, max: 3.0, name: 'Line Height', listen: true },
    { object: params, variable: 'align', options: ['CENTER', 'LEFT', 'RIGHT'], name: 'Align' },
    { object: params, variable: 'font', options: ['Arial', 'Helvetica', 'Verdana', 'Courier New', 'Times New Roman'], name: 'Font' },
    { object: params, variable: 'style', options: ['NORMAL', 'BOLD', 'ITALIC'], name: 'Style' },
    { object: params, variable: 'autoLayout', name: 'Auto Layout' },
    { object: params, variable: 'layoutInterval', min: 10, max: 600, step: 10, name: 'Layout Interval' }
  ]},
  { folder: 'Animation', contents: [
    { object: params, variable: 'mode', options: ['Stretch', 'Slide', 'Shear', 'Wave', 'Opacity', 'Chaos', 'Decoding'], name: 'Mode' },
    { object: params, variable: 'speed', min: 0, max: 5.0, name: 'Time Speed' },
    { object: params, variable: 'waveSpeed', min: -5.0, max: 5.0, name: 'Wave Speed' },
    { object: params, variable: 'frequency', min: 0.01, max: 2.0, name: 'Frequency' },
    { object: params, variable: 'amplitude', min: 0, max: 5.0, name: 'Amplitude' },
    { object: params, variable: 'scrollSpeed', min: -5.0, max: 5.0, name: 'Scroll' }
  ]},
  { folder: 'Color', contents: [
    { object: params, variable: 'colorMode', options: Object.keys(PALETTES), name: 'Palette' },
    { object: params, variable: 'bgMode', options: ['Solid', 'Technical'], name: 'Background' },
    { object: params, variable: 'trailStrength', min: 0, max: 100, name: 'Trail' },
    { object: params, variable: 'renderMode', options: ['FILL', 'OUTLINE', 'MIXED'], name: 'Render Mode' },
    { object: params, variable: 'strokeWidth', min: 0.5, max: 10.0, name: 'Outline Width' }
  ]},
  { folder: 'Export', contents: [
    { object: params, variable: 'exportFrames', min: 60, max: 1200, step: 1, name: 'Frames' },
    { object: params, variable: 'exportStart', name: 'Start Export', type: 'function' }
  ]}
];

function startExport() {
  if (isExporting) return;
  isExporting = true;
  exportCount = 0;
  exportMax = params.exportFrames;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  exportSessionID = "";
  for (let i = 0; i < 4; i++) exportSessionID += chars.charAt(floor(random(chars.length)));
  console.log(`Export started: ${exportSessionID}`);
}

function keyPressed() {
  if (key === 's' || key === 'S') startExport();
}