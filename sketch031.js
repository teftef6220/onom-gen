// フラット・ポップ カラーパレット
const PALETTE_POP = [
  '#FF4D4D', // Red
  '#4D4DFF', // Blue
  '#FFEA00', // Yellow
  '#000000', // Black
  '#FFFFFF'  // White
];

var isExporting = false;
var exportMax = 600;

let tiles = [];
let cols = 12;
let rows = 8;
let tileSize;

// UI Sliders
var speed = 0.5;
var gridSize = 12;
var shapeScale = 0.9;
var margin = 2;

function setup() {
  let c = createCanvas(2560, 1440);
  pixelDensity(1);

  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '80vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');
  c.style('box-shadow', '0 0 20px rgba(0,0,0,0.1)');

  noStroke();
  rectMode(CENTER);
  ellipseMode(CENTER);
  
  initTiles();
}

function draw() {
  blendMode(BLEND);
  noStroke();
  fill(0);
  rect(width / 2, height / 2, width, height);
  
  // グリッドサイズが変更されたら再生成
  if (gridSize !== cols) {
    cols = gridSize;
    initTiles();
  }

  for (let t of tiles) {
    t.update(speed);
    t.display(shapeScale, margin);
  }

  // --- 書き出し処理 ---
  if (isExporting || (window.exporter && window.exporter.isExporting)) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
      isExporting = false;
      noLoop();
    }
  }
}

function initTiles() {
  tiles = [];
  tileSize = width / cols;
  rows = ceil(height / tileSize);
  
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      tiles.push(new Tile(x * tileSize, y * tileSize, tileSize));
    }
  }
}

class Tile {
  constructor(x, y, s) {
    this.x = x;
    this.y = y;
    this.s = s;
    this.type = int(random(5)); 
    // 0: Quarter Circle, 1: Half Circle, 2: Circle, 3: Triangle, 4: Cross
    
    // 片方を必ず黒にする
    let otherColor = random(PALETTE_POP.filter(c => c !== '#000000'));
    if (random() > 0.5) {
      this.c1 = '#000000';
      this.c2 = otherColor;
    } else {
      this.c1 = otherColor;
      this.c2 = '#000000';
    }
    
    this.angle = int(random(4)) * HALF_PI;
    this.targetAngle = this.angle;
    this.isRotating = false;
    this.rotateProgress = 0;
  }

  update(speed) {
    // ランダムに回転を開始
    if (!this.isRotating && random() < 0.005 * speed * 10) {
      this.isRotating = true;
      this.targetAngle += HALF_PI * (random() > 0.5 ? 1 : -1);
      this.rotateProgress = 0;
    }

    if (this.isRotating) {
      this.rotateProgress += 0.05 * speed * 5; // アニメーション速度
      if (this.rotateProgress >= 1) {
        this.rotateProgress = 0;
        this.isRotating = false;
        this.angle = this.targetAngle;
      }
    }
  }

  display(scaleFactor, margin) {
    let currentAngle = this.angle;
    if (this.isRotating) {
      // イージング関数で滑らかに回転
      let t = this.rotateProgress;
      // よりキビキビ動くようにイージングを変更 (EaseInOutQuart)
      let eased = t < 0.5 ? 8 * t * t * t * t : 1 - pow(-2 * t + 2, 4) / 2;
      currentAngle = lerp(this.angle, this.targetAngle, eased);
    }

    let drawSize = this.s - margin;
    if (drawSize < 0) drawSize = 0;

    push();
    translate(this.x + this.s/2, this.y + this.s/2);
    
    // タイルの背景
    fill(this.c1);
    rect(0, 0, drawSize, drawSize);
    
    rotate(currentAngle);
    
    // 図形の描画
    fill(this.c2);
    let size = drawSize * scaleFactor;
    
    if (this.type === 0) {
      // Quarter Circle (扇形)
      push();
      translate(-drawSize/2, -drawSize/2);
      arc(0, 0, size*2, size*2, 0, HALF_PI);
      pop();
    } else if (this.type === 1) {
      // Half Circle (半円)
      arc(0, 0, size, size, 0, PI);
    } else if (this.type === 2) {
      // Circle (円)
      ellipse(0, 0, size, size);
    } else if (this.type === 3) {
      // Triangle (三角形)
      triangle(-size/2, size/2, size/2, size/2, -size/2, -size/2);
    } else if (this.type === 4) {
      // Stripe / Cross (十字)
      rect(0, 0, size, size/3);
      rect(0, 0, size/3, size);
    }
    
    pop();
  }
}

// --- UI & Export Logic ---

var guiConfig = [
  { variable: 'exportMax', min: 10, max: 1000, step: 10, name: '書き出し枚数' },
  { variable: 'initTiles', name: 'ランダム生成', type: 'function' },
  { variable: 'speed', min: 0, max: 2, step: 0.1, name: '速度' },
  { variable: 'gridSize', min: 2, max: 30, step: 1, name: 'グリッド' },
  { variable: 'margin', min: 0, max: 50, step: 1, name: 'マージン' },
  { variable: 'shapeScale', min: 0.1, max: 1.0, step: 0.05, name: 'サイズ' },
  { variable: 'startExportMP4', name: 'Start MP4 Export', type: 'function' },
  { variable: 'startExportPNG', name: 'Start PNG Sequence', type: 'function' }
];

async function startExportMP4() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  let suggestedName = `sketch031_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}.mp4`;
  await window.exporter.startMP4(width, height, 24, exportMax, suggestedName);
  
  isExporting = true;
  loop();
}

async function startExportPNG() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  let prefix = `sketch031_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}`;
  await window.exporter.startPNG(24, exportMax, prefix);
  
  isExporting = true;
  loop();
}

function keyPressed() {
  if (key === 'm' || key === 'M') startExportMP4();
  if (key === 'p' || key === 'P') startExportPNG();
}


