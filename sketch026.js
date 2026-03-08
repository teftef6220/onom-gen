// ブルータリズム的なカラーパレット
const PALETTE_COLOR = [
  '#000000', // 黒
  '#FF00FF', // マゼンタ
  '#00FFFF', // シアン
  '#FFFF00', // イエロー
  '#00FF00', // ライム
  '#FF4500'  // オレンジ
];

const PALETTE_MONO = [
  '#000000', // 黒
  '#FFFFFF', // 白
  '#333333', // 濃いグレー
  '#808080', // グレー
  '#E0E0E0'  // 薄いグレー
];

let saveCount = 0;
let isExporting = false;
let exportCurrent = 0;
let exportSessionID = "";

const config = {
  isColorful: true,
  exportMax: 600,
  exportMP4: async () => await startExportMP4(),
  exportPNG: async () => await startExportPNG()
};

function setup() {
  let c = createCanvas(2560, 1440);
  pixelDensity(1); // 高解像度ディスプレイでも1倍で描画して負荷を下げる
  // キャンバスをウィンドウ内に収めるためのCSS設定
  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '80vh'); // 縦幅もウィンドウに収まるように制限
  c.style('display', 'block');
  c.style('margin', '0 auto'); // 中央寄せ

  noLoop(); // アニメーションさせず、静止画として生成
  rectMode(CORNER); // グリッドに合わせやすいよう左上基準に変更
}

function draw() {

  // 背景色をランダムに決定
  let currentPalette = config.isColorful ? PALETTE_COLOR : PALETTE_MONO;
  let bgCol = '#000000'; // 黒背景で固定
  // background(bgCol);
  fill(0);
  rect(0,0,width,height);

  // 背景と対照的な色を選ぶためのフィルタリング
  let contentColors = currentPalette.filter(c => c !== bgCol);

  // グリッド設定: 画面を分割する単位を決定
  let gridCount = int(random(8, 20));
  let cellSize = width / gridCount;

  // 1. グリッドシステム（ガイド線やマーカー）を描画
  drawGridSystem(cellSize, contentColors);

  // 2. メインの幾何学図形を描画（グリッドにスナップ）
  drawShapes(cellSize, contentColors);

  // 3. テキスト要素を描画（グリッドにスナップ）
  drawTypography(cellSize, contentColors);
  
  // 4. メタデータ（詳細情報）を描画して密度を上げる
  drawMetadata(cellSize, contentColors);
  
  // 5. 全体にザラつき（ノイズ）を加える
  applyGrain();

  // 連続書き出し処理
  if (isExporting || (window.exporter && window.exporter.isExporting)) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    exportCurrent++;
    
    if (!window.exporter.isExporting) {
      isExporting = false;
      noLoop();
    }
  }
}

// ウィンドウサイズが変更されたらキャンバスもリサイズ
function windowResized() {
  // resizeCanvas(windowWidth, windowHeight);
  redraw();
}

// クリックで再生成
function mousePressed() {
  redraw();
}

// マウス移動で再生成
function mouseMoved() {
  redraw();
}

// 's'キー等での操作
function keyPressed() {
  if (key === 'm' || key === 'M') {
    startExportMP4();
  }
  if (key === 'p' || key === 'P') {
    startExportPNG();
  }
  if (key === 'c' || key === 'C') {
    config.isColorful = !config.isColorful;
    redraw();
  }
}

// --- UI & Export Logic ---

var guiConfig = [
  { object: config, variable: 'exportMax', min: 10, max: 1000, step: 10, name: 'Frames' },
  { object: config, variable: 'isColorful', name: 'Color Mode', listen: true, onChange: () => redraw() },
  { object: config, variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },
  { object: config, variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }
];

async function startExportMP4() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  let suggestedName = `sketch026_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}.mp4`;
  await window.exporter.startMP4(width, height, 24, config.exportMax, suggestedName);
  
  isExporting = true;
  exportCurrent = 0;
  loop(); // ループを開始して連続保存
}

async function startExportPNG() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  let prefix = `sketch026_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}`;
  await window.exporter.startPNG(24, config.exportMax, prefix);
  
  isExporting = true;
  exportCurrent = 0;
  loop(); // ループを開始して連続保存
}

// --- 描画用ヘルパー関数 ---

function drawGridSystem(cellSize, colors) {
  let col = random(colors);
  stroke(col);
  strokeWeight(0.5);
  
  // 薄いグリッド線を描画
  if (random() > 0.3) {
    for (let x = 0; x < width; x += cellSize) {
      line(x, 0, x, height);
    }
  }
  if (random() > 0.3) {
    for (let y = 0; y < height; y += cellSize) {
      line(0, y, width, y);
    }
  }

  // グリッドの交点に「＋」マークを描画してテクニカル感を出す
  strokeWeight(1.5);
  let markerSize = cellSize * 0.15;
  for (let x = 0; x < width; x += cellSize) {
    for (let y = 0; y < height; y += cellSize) {
      if (random() > 0.9) { // 一部の交点のみ
        line(x - markerSize, y, x + markerSize, y);
        line(x, y - markerSize, x, y + markerSize);
      }
    }
  }
}

function drawShapes(cellSize, colors) {
  let numShapes = int(random(3, 8)); // 数を絞ってインパクトを出す
  
  // ブレンドモードを「差の絶対値」に設定
  // これにより、図形が重なった部分の色が反転し、洗練された印象になります
  blendMode(DIFFERENCE);
  
  for (let i = 0; i < numShapes; i++) {
    let col;
    if (config.isColorful) {
      col = random(colors); // カラフルモード
    } else {
      col = color(255); // モードが白（モノクロ）の時は白固定で反転効果を狙う
    }
    
    // グリッドにスナップした位置とサイズ
    let x = int(random(width / cellSize)) * cellSize;
    let y = int(random(height / cellSize)) * cellSize;
    let w = int(random(1, 5)) * cellSize;
    let h = int(random(1, 5)) * cellSize;
    
    fill(col);
    noStroke();

    // 図形の種類をランダムに決定（矩形、円、円弧）
    let shapeType = random();
    if (shapeType < 0.6) {
      rect(x, y, w, h);
    } else if (shapeType < 0.8) {
      ellipseMode(CORNER); // グリッドに合わせるため左上基準
      ellipse(x, y, w, w);
    } else {
      ellipseMode(CORNER);
      // 90度ごとのランダムな円弧
      let startAng = int(random(4)) * HALF_PI;
      arc(x, y, w * 2, h * 2, startAng, startAng + HALF_PI);
    }
  }
  
  // ブレンドモードを通常に戻す
  blendMode(BLEND);
}

function drawTypography(cellSize, colors) {
  let words = ["ERROR", "RAW", "BRUTAL", "404", "SYSTEM", "NULL", "UNDEFINED"];
  let numText = int(random(2, 6));
  
  textFont('Helvetica'); // 洗練されたフォント
  textStyle(BOLD);
  
  for (let i = 0; i < numText; i++) {
    let col = random(colors);
    fill(col);
    noStroke();
    
    let txt = random(words);
    // フォントサイズもグリッドに関連付ける
    let textSizeVal = cellSize * int(random(1, 4)) * 0.8;
    textSize(textSizeVal);
    
    let x = int(random(width / cellSize)) * cellSize;
    let y = int(random(height / cellSize)) * cellSize + textSizeVal; // ベースライン調整
    
    push();
    translate(x, y);
    // たまに90度回転させる
    if (random() > 0.7) rotate(HALF_PI);
    text(txt, 0, 0);
    pop();
  }
}

function drawMetadata(cellSize, colors) {
  // 設計図のような細かい文字情報を追加
  let numData = int(random(5, 12));
  textFont('Helvetica');
  textSize(10);
  textStyle(NORMAL);
  noStroke();
  
  for (let i = 0; i < numData; i++) {
    let col = random(colors);
    fill(col);
    
    let x = int(random(width / cellSize)) * cellSize;
    let y = int(random(height / cellSize)) * cellSize;
    
    // 座標やランダムなIDを表示
    text(`POS [${x}, ${y}]`, x + 4, y + 12);
    text(`ID.${int(random(10000, 99999))}`, x + 4, y + 24);
  }
}

function applyGrain() {
  // loadPixels(); // point()を使う場合は不要なので削除して軽量化
  // 簡易的なノイズ処理（ピクセル操作）
  // パフォーマンスのため、密度を少し下げて処理しても良いが、
  // ここではシンプルにランダムなドットを打つ方式を採用
  
  strokeWeight(1);
  for (let i = 0; i < width * height * 0.05; i++) { // 全体の5%程度にノイズ
    let x = random(width);
    let y = random(height);
    stroke(random(255), 50); // 半透明の白黒ノイズ
    point(x, y);
  }
}



