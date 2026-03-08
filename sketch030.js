// ポップで可愛いカラーパレット
const PALETTE_TOY = [
  '#FF4050', // Red
  '#FFD700', // Yellow
  '#76E010', // Green
  '#0099FF', // Blue
  '#9944DD'  // Purple
];

const PALETTE_PASTEL = [
  '#FFB5A7', // Melon
  '#FCD5CE', // Pale Pink
  '#F8EDEB', // White
  '#F9DCC4', // Peach
  '#FEC89A'  // Orange
];

var isExporting = false;
var exportMax = 600;

// アニメーション用変数
let time = 0;
let blocks = [];
let cols = 15;
let rows = 15;
let blockSize = 40;

// UI Sliders
var speed = 0.05;
var maxH = 150;
var waveFreq = 0.5;
var gap = 2;
var noiseAmount = 0;
var gridSize = 15;
var blockSizeVal = 40;
var blockHeight = 30;
var yOffset = 100;
var isPopColor = true;
var outline = false;
var outlineWeight = 2;

function setup() {
  let c = createCanvas(1980, 1080);
  pixelDensity(1);

  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '80vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');
  c.style('box-shadow', '0 0 20px rgba(0,0,0,0.1)');

  noStroke();
  strokeJoin(ROUND);
}

function draw() {
  blendMode(BLEND);
  // 背景色
  fill(0);
  rect(0, 0, width, height);

  blockSize = blockSizeVal;
  cols = gridSize;
  rows = gridSize;
  let currentPalette = isPopColor ? PALETTE_TOY : PALETTE_PASTEL;

  time += speed;

  // 画面中央に配置するためのオフセット計算
  // アイソメトリック座標系でのグリッド全体の幅と高さを考慮
  let gridW = cols * blockSize;
  let gridH = rows * blockSize;
  
  push();
  translate(width / 2, height / 2 + yOffset); // 縦位置を調整

  // グリッド描画（奥から手前へ描画することで重なりを正しくする）
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      
      // ノイズやサイン波で高さを計算
      let d = dist(x, y, cols/2, rows/2);
      
      // 周期（位相）をずらす
      // noiseAmountを使って、各ブロックの位相をランダム（ノイズ）にずらす
      let phaseShift = noise(x * 0.1, y * 0.1) * noiseAmount * TWO_PI * 2;
      let offset = d * waveFreq - time + phaseShift;
      
      // 複数の波を合成して複雑な動きを作る
      let h1 = sin(offset) * 0.5 + 0.5;
      let h2 = sin(x * 0.5 + time + phaseShift) * 0.5 + 0.5;
      let hFactor = (h1 + h2) / 2;
      
      // ブロックの高さ（厚み）は固定
      let h = blockHeight;
      
      // 位置（浮き沈み）を変化させる
      let yOffset = -hFactor * maxH;

      // サイズを伸縮させる
      let currentSize = blockSize * map(hFactor, 0, 1, 0.5, 1.3);

      // 色の決定（座標に基づいてパレットから選択）
      let colIndex = int((x + y) % currentPalette.length);
      // 負の値にならないように補正
      if (colIndex < 0) colIndex = currentPalette.length + colIndex;
      let baseCol = color(currentPalette[colIndex]);

      // アイソメトリック座標変換
      // x_iso = (x - y) * w
      // y_iso = (x + y) * h
      let isoX = (x - y) * (blockSize + gap);
      let isoY = (x + y) * ((blockSize + gap) / 2);

      drawIsoBlock(isoX, isoY + yOffset, currentSize, h, baseCol);
    }
  }
  pop();

  // --- 書き出し処理 ---
  if (isExporting || (window.exporter && window.exporter.isExporting)) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
      isExporting = false;
      noLoop();
    }
  }
}

// アイソメトリックブロックを描画する関数
function drawIsoBlock(x, y, size, h, col) {
  // 3つの面の色（光の当たり方をシミュレート）
  let topCol = col;
  let rightCol = lerpColor(col, color(0), 0.2); // 少し暗く
  let leftCol = lerpColor(col, color(0), 0.4);  // もっと暗く

  if (outline) {
    stroke(0);
    strokeWeight(outlineWeight);
  } else {
    noStroke();
  }

  // 座標調整（中心基準から頂点計算）
  let w = size;
  let halfW = w; // 横幅の半分ではない（p5の座標系に合わせるため調整）
  let halfH = w / 2;

  push();
  translate(x, y);

  // 上面 (Top) - 高さ(h)分だけ上にずらす
  fill(topCol);
  beginShape();
  vertex(0, -h);
  vertex(halfW, -h + halfH);
  vertex(0, -h + w);
  vertex(-halfW, -h + halfH);
  endShape(CLOSE);

  // 右側面 (Right)
  fill(rightCol);
  beginShape();
  vertex(halfW, -h + halfH);
  vertex(halfW, halfH);
  vertex(0, w);
  vertex(0, -h + w);
  endShape(CLOSE);

  // 左側面 (Left)
  fill(leftCol);
  beginShape();
  vertex(0, -h + w);
  vertex(0, w);
  vertex(-halfW, halfH);
  vertex(-halfW, -h + halfH);
  endShape(CLOSE);

  pop();
}

// --- UI & Export Logic ---

var guiConfig = [
  { variable: 'exportMax', min: 10, max: 1000, step: 10, name: '書き出し枚数' },
  { variable: 'speed', min: 0, max: 0.2, step: 0.01, name: '速度' },
  { variable: 'maxH', min: 0, max: 300, step: 10, name: '高さ' },
  { variable: 'waveFreq', min: 0.1, max: 1.0, step: 0.05, name: '波長' },
  { variable: 'gap', min: 0, max: 100, step: 1, name: '隙間' },
  { variable: 'noiseAmount', min: 0, max: 1, step: 0.01, name: '不規則' },
  { variable: 'gridSize', min: 2, max: 50, step: 1, name: 'グリッド' },
  { variable: 'blockSizeVal', min: 5, max: 200, step: 1, name: 'ブロック' },
  { variable: 'blockHeight', min: 1, max: 200, step: 1, name: '厚み' },
  { variable: 'yOffset', min: -1000, max: 1000, step: 10, name: '縦位置' },
  { variable: 'isPopColor', name: 'POPカラー' },
  { variable: 'outline', name: 'アウトライン' },
  { variable: 'outlineWeight', min: 0.5, max: 10, step: 0.5, name: '線の太さ' },
  { variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },
  { variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }
];

async function startExportMP4() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  let suggestedName = `sketch030_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}.mp4`;
  await window.exporter.startMP4(width, height, 30, exportMax, suggestedName);
  
  isExporting = true;
  loop();
}

async function startExportPNG() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  let prefix = `sketch030_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}`;
  await window.exporter.startPNG(30, exportMax, prefix);
  
  isExporting = true;
  loop();
}

function keyPressed() {
  if (key === 'm' || key === 'M') startExportMP4();
  if (key === 'p' || key === 'P') startExportPNG();
}