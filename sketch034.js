// --- 設定とグローバル変数 ---
const params = {
  speed: 1.0,
  colorMode: 'Cyan',
  lineWidth: 2.0,
  glitchAmount: 0.0,
  showGrid: true,
  showRings: true,
  showData: true,
  exportFrames: 600,
  exportStart: function() { startExport(); }
};

let gui;
let elements = [];
let font;
let time = 0;

// カラーパレット
const PALETTES = {
  Cyan: ['#00FFFF', '#0088FF', '#003366', '#FFFFFF'],
  Green: ['#00FF00', '#008800', '#003300', '#CCFFCC'],
  Orange: ['#FF8800', '#FF4400', '#661100', '#FFFF00'],
  Purple: ['#AA00FF', '#6600FF', '#220044', '#FF00FF'],
  Red: ['#FF0000', '#880000', '#330000', '#FFFFFF'],
  White: ['#FFFFFF', '#AAAAAA', '#555555', '#DDDDDD']
};

// 書き出し用変数
let isExporting = false;
let exportCount = 0;
let exportMax = 0;
let exportSessionID = "";

function setup() {
  let c = createCanvas(1920, 1080);
  pixelDensity(1);

  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '100vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');

  // フォント設定（システムフォントを使用）
  textFont('Courier New');
  
  initElements();
}

function draw() {
  background(0);
  
  // グリッチ効果のための座標変換
  push();
  if (params.glitchAmount > 0 && random() < params.glitchAmount) {
    translate(random(-10, 10), random(-5, 5));
    if (random() < 0.1) {
      // 色収差的なズレ（簡易版）
      fill(255, 0, 0, 100);
      rect(0, 0, width, height);
    }
  }

  time += params.speed * 0.01;
  let palette = PALETTES[params.colorMode];

  // 背景グリッド
  if (params.showGrid) {
    drawGrid(palette);
  }

  // 各要素の描画
  for (let el of elements) {
    el.update();
    el.display(palette);
  }

  pop();

  // 書き出し処理
  if (isExporting) {
    saveCanvas('cyber_hud_' + exportSessionID + '_' + nf(exportCount + 1, 3), 'png');
    exportCount++;
    if (exportCount >= exportMax) {
      isExporting = false;
      console.log("Export finished");
    }
  }
}

function initElements() {
  elements = [];

  // 1. 中央の回転リング群
  if (params.showRings) {
    for (let i = 0; i < 8; i++) {
      elements.push(new ArcRing(width / 2, height / 2, 150 + i * 40));
    }
  }

  // 2. データストリーム（左右）
  if (params.showData) {
    elements.push(new DataColumn(100, 100, 20));
    elements.push(new DataColumn(width - 150, 100, 20));
    
    // 下部の波形
    elements.push(new Waveform(width / 2, height - 100, 600));
  }
}

function drawGrid(palette) {
  stroke(palette[2]);
  strokeWeight(1);
  noFill();
  
  let step = 100;
  // 透視図法的なグリッド
  push();
  translate(width/2, height/2);
  
  // 放射状の線
  for (let a = 0; a < TWO_PI; a += PI/6) {
    line(0, 0, cos(a) * width, sin(a) * width);
  }
  
  // 同心円
  for (let r = 100; r < width; r += 150) {
    ellipse(0, 0, r*2, r*2);
  }
  pop();

  // 細かいドットグリッド
  fill(palette[2]);
  noStroke();
  for(let x = 0; x < width; x += 50) {
    for(let y = 0; y < height; y += 50) {
      if ((x + y) % 100 === 0) rect(x, y, 2, 2);
    }
  }
}

// --- クラス定義 ---

class ArcRing {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.startAngle = random(TWO_PI);
    this.len = random(PI * 0.1, PI * 1.5);
    this.speed = random(0.01, 0.05) * (random() > 0.5 ? 1 : -1);
    this.weight = random(1, 5);
    this.dashed = random() > 0.7;
  }

  update() {
    this.startAngle += this.speed * params.speed;
  }

  display(palette) {
    noFill();
    stroke(palette[0]);
    strokeWeight(this.weight * (params.lineWidth / 2));
    strokeCap(SQUARE);

    if (this.dashed) {
      // 点線のアーク
      let dashLen = 0.1;
      for (let a = 0; a < this.len; a += dashLen * 2) {
        arc(this.x, this.y, this.r * 2, this.r * 2, this.startAngle + a, this.startAngle + a + dashLen);
      }
    } else {
      // 通常のアーク
      arc(this.x, this.y, this.r * 2, this.r * 2, this.startAngle, this.startAngle + this.len);
    }
    
    // 装飾的なマーカー
    if (random() > 0.95) {
      fill(palette[1]);
      noStroke();
      let mx = this.x + cos(this.startAngle) * this.r;
      let my = this.y + sin(this.startAngle) * this.r;
      ellipse(mx, my, 5, 5);
    }
  }
}

class DataColumn {
  constructor(x, y, rows) {
    this.x = x;
    this.y = y;
    this.rows = rows;
    this.data = [];
    for(let i=0; i<rows; i++) this.generateRow(i);
    this.updateTimer = 0;
  }

  generateRow(index) {
    // ランダムな16進数やバイナリ文字列
    let str = "";
    let type = random();
    if (type < 0.3) {
      str = "0x" + hex(int(random(65535)), 4);
    } else if (type < 0.6) {
      str = nf(random(100), 2, 2);
    } else {
      str = "SYS." + int(random(10, 99));
    }
    this.data[index] = str;
  }

  update() {
    this.updateTimer++;
    if (this.updateTimer > 5 / params.speed) {
      // ランダムな行を更新
      let idx = int(random(this.rows));
      this.generateRow(idx);
      this.updateTimer = 0;
    }
  }

  display(palette) {
    noStroke();
    textSize(14);
    textAlign(LEFT, TOP);
    
    for (let i = 0; i < this.rows; i++) {
      // 色の濃淡をつける
      if (random() > 0.9) fill(palette[3]); // 白（ハイライト）
      else fill(palette[1]); // メインカラー
      
      text(this.data[i], this.x, this.y + i * 20);
      
      // 横にバーを表示
      rect(this.x - 10, this.y + i * 20 + 5, 5, 5);
    }
  }
}

class Waveform {
  constructor(x, y, w) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.values = new Array(50).fill(0);
  }

  update() {
    // 新しい値を追加してシフト
    this.values.shift();
    // ノイズで波形生成
    let n = noise(frameCount * 0.1 * params.speed);
    // たまにスパイクを入れる
    if (random() < 0.05) n = random(1.0);
    this.values.push(n);
  }

  display(palette) {
    push();
    translate(this.x - this.w/2, this.y);
    
    // 枠線
    noFill();
    stroke(palette[2]);
    strokeWeight(1);
    rect(0, -50, this.w, 100);
    
    // 波形
    stroke(palette[0]);
    strokeWeight(2);
    beginShape();
    let step = this.w / this.values.length;
    for(let i=0; i<this.values.length; i++) {
      let val = this.values[i];
      let h = map(val, 0, 1, 0, -40);
      vertex(i * step, h);
      vertex((i+1) * step - 2, h); // デジタルっぽいカクカクした波形
    }
    endShape();
    
    // ラベル
    noStroke();
    fill(palette[1]);
    textSize(10);
    text("AUDIO_IN", 5, -55);
    text("FREQ_MOD", this.w - 60, -55);
    
    pop();
  }
}

// --- UI & Export Logic ---

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

function windowResized() {
  // resizeCanvas(windowWidth, windowHeight);
  // 今回は固定サイズなのでリサイズしない
}

window.guiConfig = [
  { object: params, variable: 'speed', min: 0, max: 5.0, name: 'Speed' },
  { object: params, variable: 'colorMode', options: Object.keys(PALETTES), name: 'Color Palette' },
  { object: params, variable: 'lineWidth', min: 0.5, max: 10.0, name: 'Line Width' },
  { object: params, variable: 'glitchAmount', min: 0.0, max: 0.2, name: 'Glitch' },
  { folder: 'Visibility', contents: [
    { object: params, variable: 'showGrid', name: 'Grid' },
    { object: params, variable: 'showRings', name: 'Rings', onChange: initElements },
    { object: params, variable: 'showData', name: 'Data', onChange: initElements }
  ]},
  { folder: 'Export', contents: [
    { object: params, variable: 'exportFrames', min: 60, max: 1200, step: 1, name: 'Frames' },
    { object: params, variable: 'exportStart', name: 'Start Export', type: 'function' }
  ]}
];