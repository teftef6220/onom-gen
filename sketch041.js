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

const params = {
  isColorful: true,
  switchInterval: 120, // ターゲット切り替え間隔（フレーム）
  smoothness: 0.1,     // 動きの滑らかさ (0.01〜1.0)
  gridDynamic: true,   // グリッドを動かすか
  gridMaxRotate: 0.5,  // 最大回転量 (PI単位)
  gridZoomRange: 0.5,  // ズーム変動幅
  exportMax: 600,
  startExport: () => startExportSequence(),
  regenerate: () => setNewTargets()
};

let saveCount = 0;
let isExporting = false;
let exportCurrent = 0;
let exportSessionID = "";

// 状態管理用オブジェクト配列
let shapeAgents = [];
let textAgents = [];
let metaAgents = [];
let gridAgent;
let switchTimer = 0;

function setup() {
  let c = createCanvas(1920, 1080);
  pixelDensity(1); // 高解像度ディスプレイでも1倍で描画して負荷を下げる
  // キャンバスをウィンドウ内に収めるためのCSS設定
  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '80vh'); // 縦幅もウィンドウに収まるように制限
  c.style('display', 'block');
  c.style('margin', '0 auto'); // 中央寄せ

  rectMode(CORNER); // グリッドに合わせやすいよう左上基準に変更

  // オブジェクトの初期化
  gridAgent = new GridAgent();
  for(let i=0; i<8; i++) shapeAgents.push(new ShapeAgent());
  for(let i=0; i<6; i++) textAgents.push(new TextAgent());
  for(let i=0; i<10; i++) metaAgents.push(new MetaAgent());

  setNewTargets();
}

function draw() {
  // 一定間隔でターゲットを更新
  switchTimer++;
  if (switchTimer > params.switchInterval) {
    setNewTargets();
    switchTimer = 0;
  }

  // 背景
  fill(0);
  rect(0,0,width,height);

  // 1. グリッドシステム更新・描画
  gridAgent.update();
  gridAgent.display();

  // 2. メイン図形更新・描画
  blendMode(DIFFERENCE);
  for (let s of shapeAgents) {
    s.update();
    s.display();
  }
  blendMode(BLEND);

  // 3. テキスト要素更新・描画
  for (let t of textAgents) {
    t.update();
    t.display();
  }
  
  // 4. メタデータ更新・描画
  for (let m of metaAgents) {
    m.update();
    m.display();
  }
  
  // 5. 全体にザラつき（ノイズ）を加える
  applyGrain();

  // 連続書き出し処理
  if (isExporting) {
    saveCanvas('brutalist_design_' + exportSessionID + '_' + nf(saveCount, 3), 'png');
    saveCount++;
    exportCurrent++;
    if (exportCurrent >= params.exportMax) {
      isExporting = false;
    }
  }
}

// ウィンドウサイズが変更されたらキャンバスもリサイズ
function windowResized() {
  // resizeCanvas(windowWidth, windowHeight);
}

// クリックでターゲット即時変更
function mousePressed() {
  // クリックでの変更を無効化
}

// マウス移動での再生成は無効化
function mouseMoved() {
  // 何もしない
}

// 's'キーで画像を保存
function keyPressed() {
  if (key === 's' || key === 'S') {
    startExportSequence();
  }
  if (key === 'c' || key === 'C') {
    params.isColorful = !params.isColorful;
  }
}

function startExportSequence() {
  if (!isExporting) {
    isExporting = true;
    exportCurrent = 0;
    saveCount = 1; // 001から開始
    // 4桁のランダム英数字を生成してファイル名に付与（重複防止）
    exportSessionID = "";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let i = 0; i < 4; i++) {
      exportSessionID += chars.charAt(floor(random(chars.length)));
    }
    loop(); // ループを開始して連続保存
  }
}

function setNewTargets() {
  let currentPalette = params.isColorful ? PALETTE_COLOR : PALETTE_MONO;
  // 黒を除外
  let colors = currentPalette.filter(c => c !== '#000000');
  
  // グリッドのターゲット更新
  gridAgent.setTarget(colors);
  let cellSize = width / gridAgent.targetGridCount;

  // 図形のターゲット更新
  for (let s of shapeAgents) {
    s.setTarget(cellSize, colors);
  }
  // テキストのターゲット更新
  for (let t of textAgents) {
    t.setTarget(cellSize, colors);
  }
  // メタデータのターゲット更新
  for (let m of metaAgents) {
    m.setTarget(cellSize, colors);
  }
}

// --- クラス定義 ---

class GridAgent {
  constructor() {
    this.gridCount = 10;
    this.targetGridCount = 10;
    this.col = color(255);
    this.targetCol = color(255);
    this.angle = 0;
    this.targetAngle = 0;
    this.scale = 1.0;
    this.targetScale = 1.0;
  }
  
  setTarget(colors) {
    this.targetGridCount = int(random(8, 20));
    this.targetCol = color(random(colors));

    if (params.gridDynamic) {
      // 回転ターゲット設定 (45度単位でキリよく回転させる)
      let rotStep = QUARTER_PI; 
      let maxSteps = floor((params.gridMaxRotate * PI) / rotStep);
      this.targetAngle = int(random(-maxSteps, maxSteps + 1)) * rotStep;

      // ズームターゲット設定
      this.targetScale = 1.0 + random(-params.gridZoomRange, params.gridZoomRange);
      // 極端に小さくなりすぎないように制限
      if (this.targetScale < 0.2) this.targetScale = 0.2;
    } else {
      this.targetAngle = 0;
      this.targetScale = 1.0;
    }
  }
  
  update() {
    this.gridCount = lerp(this.gridCount, this.targetGridCount, params.smoothness);
    this.col = lerpColor(this.col, this.targetCol, params.smoothness);
    this.angle = lerp(this.angle, this.targetAngle, params.smoothness);
    this.scale = lerp(this.scale, this.targetScale, params.smoothness);
  }
  
  display() {
    let cellSize = width / this.gridCount;
    
    push();
    translate(width / 2, height / 2);
    rotate(this.angle);
    scale(this.scale);

    stroke(this.col);
    strokeWeight(0.5);
    
    // 画面全体をカバーするために十分な範囲を描画
    // 対角線長さをカバーする範囲
    let range = dist(0, 0, width, height);
    
    // 中心から外側へ線を引く
    for (let x = 0; x <= range; x += cellSize) {
      if (x % (cellSize * 2) < 1) {
        // 縦線 (右側と左側)
        line(x, -range, x, range);
        if (x !== 0) line(-x, -range, -x, range);
        // 横線 (下側と上側)
        line(-range, x, range, x);
        if (x !== 0) line(-range, -x, range, -x);
      }
    }

    // 交点マーカー
    strokeWeight(1.5);
    let markerSize = cellSize * 0.15;
    // 間引いて描画
    for (let x = 0; x <= range; x += cellSize * 2) {
      for (let y = 0; y <= range; y += cellSize * 2) {
        // 第1象限
        drawMarker(x, y, markerSize);
        // 他の象限
        if (x !== 0) drawMarker(-x, y, markerSize);
        if (y !== 0) drawMarker(x, -y, markerSize);
        if (x !== 0 && y !== 0) drawMarker(-x, -y, markerSize);
      }
    }
    pop();
  }
}

// マーカー描画ヘルパー
function drawMarker(x, y, s) {
  line(x - s, y, x + s, y);
  line(x, y - s, x, y + s);
}

class ShapeAgent {
  constructor() {
    this.pos = createVector(width/2, height/2);
    this.targetPos = createVector(width/2, height/2);
    this.size = createVector(0, 0);
    this.targetSize = createVector(0, 0);
    this.col = color(255);
    this.targetCol = color(255);
    this.angle = 0;
    this.targetAngle = 0;
    this.type = 0; // 0:rect, 1:circle
    this.active = false;
  }

  setTarget(cellSize, colors) {
    this.active = random() > 0.3; // 70%の確率で表示
    if (!this.active) {
      this.targetSize.set(0, 0);
      return;
    }

    let x = int(random(width / cellSize)) * cellSize;
    let y = int(random(height / cellSize)) * cellSize;
    this.targetPos.set(x, y);
    
    let w = int(random(1, 5)) * cellSize;
    let h = int(random(1, 5)) * cellSize;
    this.targetSize.set(w, h);
    
    this.targetCol = color(random(colors));
    this.type = random() > 0.5 ? 0 : 1;

    // 回転ターゲットを更新（90度単位でランダムに回転）
    this.targetAngle += int(random(-2, 3)) * HALF_PI;
  }

  update() {
    this.pos.lerp(this.targetPos, params.smoothness);
    this.size.lerp(this.targetSize, params.smoothness);
    this.col = lerpColor(this.col, this.targetCol, params.smoothness);
    this.angle = lerp(this.angle, this.targetAngle, params.smoothness);
  }

  display() {
    if (this.size.x < 1) return;
    push();
    translate(this.pos.x + this.size.x / 2, this.pos.y + this.size.y / 2);
    rotate(this.angle);
    fill(this.col);
    noStroke();
    if (this.type === 0) {
      rectMode(CENTER);
      rect(0, 0, this.size.x, this.size.y);
    } else {
      ellipseMode(CENTER);
      ellipse(0, 0, this.size.x, this.size.x);
    }
    pop();
  }
}

class TextAgent {
  constructor() {
    this.words = ["ERROR", "RAW", "BRUTAL", "404", "SYSTEM", "NULL", "UNDEFINED"];
    this.text = "";
    this.pos = createVector(0, 0);
    this.targetPos = createVector(0, 0);
    this.textSize = 10;
    this.targetTextSize = 10;
    this.col = color(255);
    this.targetCol = color(255);
    this.angle = 0;
    this.targetAngle = 0;
    this.active = false;
  }

  setTarget(cellSize, colors) {
    this.active = random() > 0.4;
    if (!this.active) {
      this.targetTextSize = 0;
      return;
    }
    this.text = random(this.words);
    this.targetTextSize = cellSize * int(random(1, 4)) * 0.8;
    
    let x = int(random(width / cellSize)) * cellSize;
    let y = int(random(height / cellSize)) * cellSize + this.targetTextSize;
    this.targetPos.set(x, y);
    this.targetCol = color(random(colors));

    // 回転ターゲットを更新（90度単位でランダムに回転）
    this.targetAngle += int(random(-1, 2)) * HALF_PI;
  }

  update() {
    this.pos.lerp(this.targetPos, params.smoothness);
    this.textSize = lerp(this.textSize, this.targetTextSize, params.smoothness);
    this.col = lerpColor(this.col, this.targetCol, params.smoothness);
    this.angle = lerp(this.angle, this.targetAngle, params.smoothness);
  }

  display() {
    if (this.textSize < 1) return;
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    fill(this.col);
    noStroke();
    textFont('Helvetica');
    textStyle(BOLD);
    textSize(this.textSize);
    text(this.text, 0, 0);
    pop();
  }
}

class MetaAgent {
  constructor() {
    this.pos = createVector(0, 0);
    this.targetPos = createVector(0, 0);
    this.col = color(255);
    this.targetCol = color(255);
    this.id = int(random(10000, 99999));
  }
  
  setTarget(cellSize, colors) {
    let x = int(random(width / cellSize)) * cellSize;
    let y = int(random(height / cellSize)) * cellSize;
    this.targetPos.set(x, y);
    this.targetCol = color(random(colors));
  }

  update() {
    this.pos.lerp(this.targetPos, params.smoothness);
    this.col = lerpColor(this.col, this.targetCol, params.smoothness);
  }

  display() {
    fill(this.col);
    noStroke();
    textFont('Helvetica');
    textSize(10);
    textStyle(NORMAL);
    text(`POS [${int(this.pos.x)}, ${int(this.pos.y)}]`, this.pos.x + 4, this.pos.y + 12);
    text(`ID.${this.id}`, this.pos.x + 4, this.pos.y + 24);
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

window.guiConfig = [
  { object: params, variable: 'isColorful', name: 'Color Mode' },
  { object: params, variable: 'switchInterval', min: 30, max: 300, step: 10, name: 'Change Interval' },
  { object: params, variable: 'smoothness', min: 0.01, max: 0.5, name: 'Smoothness' },
  { object: params, variable: 'regenerate', name: 'Change Now', type: 'function' },
  { folder: 'Grid Settings', contents: [
    { object: params, variable: 'gridDynamic', name: 'Dynamic Grid' },
    { object: params, variable: 'gridMaxRotate', min: 0, max: 2.0, name: 'Max Rotation' },
    { object: params, variable: 'gridZoomRange', min: 0, max: 2.0, name: 'Zoom Range' }
  ]},
  { folder: 'Export', contents: [
    { object: params, variable: 'exportMax', min: 10, max: 1000, step: 10, name: 'Max Frames' },
    { object: params, variable: 'startExport', name: 'Start Export', type: 'function' }
  ]}
];