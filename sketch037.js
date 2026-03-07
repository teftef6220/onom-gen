// --- 設定とグローバル変数 ---
const params = {
  gridSize: 120,
  density: 0.7,
  maxMerge: 3,
  margin: 5,
  scrollX: 0,
  scrollY: 0,
  speed: 1.0,
  bgColor: '#000000',
  theme: 'Bauhaus',
  animMode: 'Random', // Rotate, Flip, Blinds, Scale, Slide, Random
  strokeWidth: 0,
  strokeColor: '#FFFFFF',
  exportFrames: 600,
  exportStart: function() { startExport(); },
  regenerate: function() { initComposition(); }
};

// カラーパレット定義
const THEMES = {
  Bauhaus: ['#D02028', '#00589F', '#F8C300', '#F2F2F2', '#EFECE1'],
  Pop: ['#FF0099', '#00CCFF', '#FFCC00', '#6633FF', '#FFFFFF'],
  Retro: ['#E76F51', '#2A9D8F', '#E9C46A', '#F4A261', '#264653'],
  Mono: ['#FFFFFF', '#CCCCCC', '#888888', '#444444']
};

window.guiConfig = [
  { folder: 'Generator', contents: [
    { object: params, variable: 'gridSize', min: 50, max: 300, step: 10, name: 'Grid Size', onChange: initComposition },
    { object: params, variable: 'density', min: 0.1, max: 1.0, name: 'Density', onChange: initComposition },
    { object: params, variable: 'maxMerge', min: 1, max: 5, step: 1, name: 'Max Merge', onChange: initComposition },
    { object: params, variable: 'margin', min: 0, max: 50, name: 'Margin' },
    { object: params, variable: 'animMode', options: ['Random', 'Rotate', 'Flip', 'Blinds', 'Scale', 'Slide'], name: 'Anim Mode' },
    { object: params, variable: 'scrollX', min: -10, max: 10, name: 'Scroll X' },
    { object: params, variable: 'scrollY', min: -10, max: 10, name: 'Scroll Y' },
    { object: params, variable: 'regenerate', name: 'Regenerate', type: 'function' }
  ]},
  { folder: 'Style', contents: [
    { object: params, variable: 'theme', options: Object.keys(THEMES), name: 'Theme', onChange: initComposition },
    { object: params, variable: 'bgColor', type: 'color', name: 'Background' },
    { object: params, variable: 'strokeWidth', min: 0, max: 10, name: 'Stroke Width' },
    { object: params, variable: 'strokeColor', type: 'color', name: 'Stroke Color' }
  ]},
  { folder: 'Animation', contents: [
    { object: params, variable: 'speed', min: 0, max: 5.0, name: 'Speed' }
  ]},
  { folder: 'Export', contents: [
    { object: params, variable: 'exportFrames', min: 60, max: 1200, step: 1, name: 'Frames' },
    { object: params, variable: 'exportStart', name: 'Start Export', type: 'function' }
  ]}
];

const SHAPES = ['Arc', 'Circle', 'Rect', 'Triangle', 'Stripe', 'Half'];

let gui;
let shapes = [];
let wrapW = 0;
let wrapH = 0;

// 書き出し用変数
let isExporting = false;
let exportCount = 0;
let exportMax = 0;
let exportSessionID = "";

function setup() {
  let c = createCanvas(1920, 1080); // 2Dモード
  pixelDensity(1);

  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '100vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');

  rectMode(CORNER);
  noStroke();

  initComposition();
}

function initComposition() {
  shapes = [];
  // スクロール用に少し広く生成する
  let cols = ceil(width / params.gridSize) + 2;
  let rows = ceil(height / params.gridSize) + 2;
  
  wrapW = cols * params.gridSize;
  wrapH = rows * params.gridSize;
  
  let grid = Array.from({ length: cols }, () => Array(rows).fill(false));
  
  // グリッドベースで図形を配置
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[x][y]) continue;

      if (random() < params.density) {
        // 結合サイズを決定
        let span = 1;
        let r = random();
        if (params.maxMerge >= 3 && r < 0.15) span = 3;
        else if (params.maxMerge >= 2 && r < 0.4) span = 2;
        
        // 配置可能かチェックし、不可ならサイズを縮小
        while (span > 1) {
          let canFit = true;
          if (x + span > cols || y + span > rows) canFit = false;
          else {
            for (let i = 0; i < span; i++) {
              for (let j = 0; j < span; j++) {
                if (grid[x + i][y + j]) { canFit = false; break; }
              }
              if (!canFit) break;
            }
          }
          if (canFit) break;
          span--;
        }

        // グリッドを埋める
        for (let i = 0; i < span; i++) for (let j = 0; j < span; j++) grid[x + i][y + j] = true;

        let s = params.gridSize * span;
        // 画面端の余白を考慮して配置
        // 左上(-gridSize)から開始して画面全体を覆う
        let px = x * params.gridSize - params.gridSize;
        let py = y * params.gridSize - params.gridSize;
        
        shapes.push(new BauhausShape(px, py, s));
      }
    }
  }
}

function draw() {
  blendMode(BLEND);
  noStroke();
  fill(params.bgColor);
  rect(0, 0, width, height);
  
  for (let s of shapes) {
    s.update();
    s.display();
  }

  // 書き出し処理
  if (isExporting) {
    saveCanvas('bauhaus_gen_' + exportSessionID + '_' + nf(exportCount + 1, 3), 'png');
    exportCount++;
    if (exportCount >= exportMax) {
      isExporting = false;
      console.log("Export finished");
    }
  }
}

class BauhausShape {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.type = random(SHAPES);
    
    let colors = THEMES[params.theme];
    this.color = color(random(colors));
    
    // 90度単位の回転
    this.rotation = floor(random(4)) * HALF_PI;
    
    // アニメーション用
    this.targetRotation = this.rotation;
    this.rotateTimer = random(100);
    this.rotateInterval = random(60, 200);
    
    this.state = 'idle'; // idle, rotate, flip, blinds
    this.progress = 0;
  }
  
  update() {
    // スクロール処理
    this.x += params.scrollX;
    this.y += params.scrollY;

    // 画面端でのラップアラウンド（ループ）
    // 右/下にはみ出たら左/上に戻す
    if (this.x > width + params.gridSize) this.x -= wrapW;
    if (this.x < -params.gridSize * 2) this.x += wrapW;
    if (this.y > height + params.gridSize) this.y -= wrapH;
    if (this.y < -params.gridSize * 2) this.y += wrapH;

    this.rotateTimer += params.speed;
    
    // 一定間隔で回転ターゲットを更新
    if (this.state === 'idle' && this.rotateTimer > this.rotateInterval) {
      this.startTransition();
      this.rotateTimer = 0;
      this.rotateInterval = random(60, 200);
    }
    
    // アニメーション進行
    if (this.state !== 'idle') {
      this.progress += 0.02 * params.speed;
      if (this.progress >= 1.0) {
        this.progress = 0;
        this.state = 'idle';
        // 最終状態を確定
        if (this.nextProps) {
          this.type = this.nextProps.type;
          this.color = this.nextProps.color;
          this.rotation = this.nextProps.rotation;
          this.nextProps = null;
        }
      }
    }
  }

  startTransition() {
    let modes = ['Rotate', 'Flip', 'Blinds', 'Scale', 'Slide'];
    let mode = params.animMode;
    if (mode === 'Random') mode = random(modes);

    if (mode === 'Rotate') {
      this.state = 'rotate';
      this.targetRotation = this.rotation + HALF_PI * (random() > 0.5 ? 1 : -1);
      this.nextProps = { 
        type: this.type, 
        color: this.color, 
        rotation: this.targetRotation 
      };
    } else {
      // Flip, Blinds, Scale, Slide (形状と色を変更)
      if (mode === 'Flip') this.state = 'flip';
      else if (mode === 'Blinds') this.state = 'blinds';
      else if (mode === 'Scale') this.state = 'scale';
      else if (mode === 'Slide') this.state = 'slide';
      
      let nextType = random(SHAPES);
      let colors = THEMES[params.theme];
      let nextColor = color(random(colors));
      let nextRotation = floor(random(4)) * HALF_PI;

      this.nextProps = {
        type: nextType,
        color: nextColor,
        rotation: nextRotation
      };
    }
  }
  
  display() {
    let s = this.size - params.margin;
    if (s < 0) s = 0;

    if (this.state === 'idle') {
      this.drawShape(this.x, this.y, s, this.type, this.color, this.rotation);
    } 
    else if (this.state === 'rotate') {
      // 回転アニメーション
      let t = this.progress;
      let eased = t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2;
      let curRot = lerp(this.rotation, this.nextProps.rotation, eased);
      this.drawShape(this.x, this.y, s, this.type, this.color, curRot);
    }
    else if (this.state === 'flip') {
      // 反転アニメーション（Y軸回転のように見せる）
      let t = this.progress;
      let widthScale = cos(t * PI); // 1 -> 0 -> -1 (見た目は 1 -> 0 -> 1)
      
      // 半分過ぎたら次の図形を表示
      let drawType = t < 0.5 ? this.type : this.nextProps.type;
      let drawColor = t < 0.5 ? this.color : this.nextProps.color;
      let drawRot = t < 0.5 ? this.rotation : this.nextProps.rotation;

      push();
      translate(this.x + this.size/2, this.y + this.size/2);
      scale(abs(widthScale), 1);
      translate(-(this.x + this.size/2), -(this.y + this.size/2));
      this.drawShape(this.x, this.y, s, drawType, drawColor, drawRot);
      pop();
    }
    else if (this.state === 'blinds') {
      // シャッター（ブラインド）アニメーション
      let slices = 4;
      let sliceH = s / slices;
      
      for (let i = 0; i < slices; i++) {
        // 各スライスの進行度をずらす
        let t = constrain(this.progress * 1.5 - i * 0.1, 0, 1);
        let widthScale = cos(t * PI);
        
        let drawType = t < 0.5 ? this.type : this.nextProps.type;
        let drawColor = t < 0.5 ? this.color : this.nextProps.color;
        let drawRot = t < 0.5 ? this.rotation : this.nextProps.rotation;

        // クリップして描画
        push();
        // クリップ領域の設定
        drawingContext.save();
        drawingContext.beginPath();
        // マージンを考慮したクリップ領域
        let cx = this.x + (this.size - s)/2;
        let cy = this.y + (this.size - s)/2 + i * sliceH;
        drawingContext.rect(cx, cy, s, sliceH);
        drawingContext.clip();

        // 変形と描画
        translate(this.x + this.size/2, this.y + this.size/2);
        scale(abs(widthScale), 1); // 横幅を伸縮
        translate(-(this.x + this.size/2), -(this.y + this.size/2));
        
        this.drawShape(this.x, this.y, s, drawType, drawColor, drawRot);
        
        drawingContext.restore();
        pop();
      }
    }
    else if (this.state === 'scale') {
      // 拡大縮小アニメーション
      let t = this.progress;
      // 0 -> 0.5: 縮小 (1 -> 0)
      // 0.5 -> 1.0: 拡大 (0 -> 1)
      let sScale = t < 0.5 ? 1 - pow(t * 2, 2) : pow((t - 0.5) * 2, 2);

      let drawType = t < 0.5 ? this.type : this.nextProps.type;
      let drawColor = t < 0.5 ? this.color : this.nextProps.color;
      let drawRot = t < 0.5 ? this.rotation : this.nextProps.rotation;

      push();
      translate(this.x + this.size/2, this.y + this.size/2);
      scale(sScale);
      translate(-(this.x + this.size/2), -(this.y + this.size/2));
      this.drawShape(this.x, this.y, s, drawType, drawColor, drawRot);
      pop();
    }
    else if (this.state === 'slide') {
      // スライドアニメーション
      let t = this.progress;
      let eased = t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2;
      
      push();
      // クリップ領域の設定
      let cx = this.x + this.size/2;
      let cy = this.y + this.size/2;
      drawingContext.save();
      drawingContext.beginPath();
      drawingContext.rect(cx - s/2, cy - s/2, s, s);
      drawingContext.clip();

      let xOffset1 = map(eased, 0, 1, 0, s); // 右へ退出
      this.drawShape(this.x + xOffset1, this.y, s, this.type, this.color, this.rotation);

      let xOffset2 = map(eased, 0, 1, -s, 0); // 左から進入
      this.drawShape(this.x + xOffset2, this.y, s, this.nextProps.type, this.nextProps.color, this.nextProps.rotation);

      drawingContext.restore();
      pop();
    }
  }
  
  drawShape(x, y, s, type, colorVal, rotation) {
    push();
    translate(x + this.size/2, y + this.size/2);
    rotate(rotation);
    translate(-s/2, -s/2);
    
    if (params.strokeWidth > 0) {
      stroke(params.strokeColor);
      strokeWeight(params.strokeWidth);
    } else {
      noStroke();
    }
    fill(colorVal);
    
    if (type === 'Arc') {
      // 扇形
      arc(0, 0, s * 2, s * 2, 0, HALF_PI);
    } else if (type === 'Circle') {
      // 円
      ellipse(s/2, s/2, s, s);
    } else if (type === 'Rect') {
      // 正方形
      rect(0, 0, s, s);
    } else if (type === 'Triangle') {
      // 直角三角形
      triangle(0, 0, s, 0, 0, s);
    } else if (type === 'Stripe') {
      // ストライプ
      let steps = 4;
      let w = s / steps;
      for(let k=0; k<steps; k+=2) {
        rect(k*w, 0, w, s);
      }
    } else if (type === 'Half') {
      // 半分の長方形
      rect(0, 0, s/2, s);
    }
    
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
  if (key === 'r' || key === 'R') initComposition();
}

function windowResized() {
  // 固定サイズのためリサイズ処理は行わない
}