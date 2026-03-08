// --- 設定とグローバル変数 ---
const params = {
  cols: 6,
  rows: 4,
  gap: 15,
  shadowOffset: 8,
  strokeWidth: 4,
  speed: 1.0,
  bgColor: '#FFFAF0', // オフホワイト
  shadowColor: '#000000',
  palette: 'Vivid',
  exportFrames: 600,
  exportMP4: function() { startExportMP4(); },
  exportPNG: function() { startExportPNG(); },
  regenerate: function() { initGrid(); }
};

// ネオ・ブルータリズム カラーパレット
const PALETTES = {
  Vivid: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#F7FFF7'],
  Pastel: ['#FF9AA2', '#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA'],
  Primary: ['#FF0000', '#0000FF', '#FFFF00', '#FFFFFF', '#000000'],
  Dark: ['#2B2D42', '#8D99AE', '#EDF2F4', '#EF233C', '#D90429']
};

window.guiConfig = [
  { folder: 'Generator', contents: [
    { object: params, variable: 'cols', min: 2, max: 20, step: 1, name: 'Columns', onChange: initGrid },
    { object: params, variable: 'rows', min: 2, max: 20, step: 1, name: 'Rows', onChange: initGrid },
    { object: params, variable: 'gap', min: 0, max: 50, name: 'Gap', onChange: initGrid },
    { object: params, variable: 'regenerate', name: 'Regenerate', type: 'function' }
  ]},
  { folder: 'Style', contents: [
    { object: params, variable: 'palette', options: Object.keys(PALETTES), name: 'Palette', onChange: initGrid },
    { object: params, variable: 'bgColor', type: 'color', name: 'Background' },
    { object: params, variable: 'shadowColor', type: 'color', name: 'Shadow Color' },
    { object: params, variable: 'shadowOffset', min: 0, max: 20, name: 'Shadow Offset' },
    { object: params, variable: 'strokeWidth', min: 1, max: 10, name: 'Stroke Width' }
  ]},
  { folder: 'Animation', contents: [
    { object: params, variable: 'speed', min: 0, max: 5.0, name: 'Speed' }
  ]},
  { folder: 'Export', contents: [
    { object: params, variable: 'exportFrames', min: 60, max: 1200, step: 1, name: 'Frames' },
    { object: params, variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },
    { object: params, variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }
  ]}
];

let gui;
let widgets = [];
let time = 0;
let vCursorX = 0;
let vCursorY = 0;

// 書き出し用変数
let isExporting = false;
let exportMax = 0;

function setup() {
  let c = createCanvas(2560, 1440);
  pixelDensity(1);

  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '100vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');

  // ネオ・ブルータリズムらしい太字フォント
  textFont('Arial Black');
  textStyle(BOLD);
  rectMode(CORNER);
  initGrid();
}

function initGrid() {
  widgets = [];
  let cellW = (width - params.gap * (params.cols + 1)) / params.cols;
  let cellH = (height - params.gap * (params.rows + 1)) / params.rows;

  for (let y = 0; y < params.rows; y++) {
    for (let x = 0; x < params.cols; x++) {
      let px = params.gap + x * (cellW + params.gap);
      let py = params.gap + y * (cellH + params.gap);
      
      // ランダムにウィジェットの種類を決定
      let type = random(['Eye', 'Marquee', 'Shape', 'Stripe', 'Button', 'Loading', 'Clock', 'Graph', 'Toggle', 'Battery', 'Smile', 'Dial']);
      widgets.push(new Widget(px, py, cellW, cellH, type));
    }
  }
}

function draw() {
  // 背景クリア
  blendMode(BLEND);
  noStroke();
  fill(params.bgColor);
  rect(0, 0, width, height);

  time += params.speed * 0.05;

  // 仮想カーソルの位置を更新（ノイズでランダムに移動）
  vCursorX = noise(time * 0.5) * width;
  vCursorY = noise(time * 0.5 + 1000) * height;

  for (let w of widgets) {
    w.update();
    w.display();
  }

  // 書き出し処理
  if (isExporting || (window.exporter && window.exporter.isExporting)) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
      isExporting = false;
      console.log("Export finished");
    }
  }
}

class Widget {
  constructor(x, y, w, h, type) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.type = type;
    
    let colors = PALETTES[params.palette];
    this.bgCol = random(colors);
    this.fgCol = random(colors.filter(c => c !== this.bgCol));
    if (random() < 0.3) this.fgCol = '#000000'; // 黒アクセント
    
    // 個別のパラメータ
    this.angle = 0;
    this.scrollX = 0;
    this.blinkTimer = random(100);
    this.text = random(['ERROR', 'HELLO', 'CLICK', '404', 'SYSTEM', 'DATA', 'VOID']);
    
    this.progress = random(100);
    this.graphData = [];
    for(let i=0; i<6; i++) this.graphData.push(random(1));

    this.toggleState = random() > 0.5;
    this.toggleTimer = 0;
    this.batteryLevel = random(100);
    this.dialAngle = random(TWO_PI);
  }

  update() {
    if (this.type === 'Marquee') {
      this.scrollX -= 2 * params.speed;
      if (this.scrollX < -this.w) this.scrollX = 0;
    } else if (this.type === 'Shape') {
      this.angle += 0.05 * params.speed;
    } else if (this.type === 'Button') {
      this.blinkTimer += params.speed;
    } else if (this.type === 'Loading') {
      this.progress += 1.0 * params.speed;
      if (this.progress > 100) this.progress = 0;
    } else if (this.type === 'Graph') {
      if (frameCount % 10 === 0) {
        this.graphData.shift();
        this.graphData.push(random(1));
      }
    } else if (this.type === 'Toggle') {
      this.toggleTimer += params.speed;
      if (this.toggleTimer > 60) {
        this.toggleState = !this.toggleState;
        this.toggleTimer = 0;
      }
    } else if (this.type === 'Battery') {
      this.batteryLevel -= 0.5 * params.speed;
      if (this.batteryLevel < 0) this.batteryLevel = 100;
    } else if (this.type === 'Dial') {
      this.dialAngle += 0.05 * params.speed;
    }
  }

  display() {
    // 影（ハードシャドウ）
    rectMode(CORNER); // 描画モードをリセット
    noStroke();
    fill(params.shadowColor);
    rect(this.x + params.shadowOffset, this.y + params.shadowOffset, this.w, this.h);

    // 本体
    stroke(0);
    strokeWeight(params.strokeWidth);
    fill(this.bgCol);
    rect(this.x, this.y, this.w, this.h);

    // コンテンツ描画
    push();
    // クリップ領域の設定（枠からはみ出さないように）
    // p5.jsでのクリッピングは少し複雑だが、ここでは簡易的に枠内に描画
    translate(this.x, this.y);
    
    if (this.type === 'Eye') {
      this.drawEye();
    } else if (this.type === 'Marquee') {
      this.drawMarquee();
    } else if (this.type === 'Shape') {
      this.drawShape();
    } else if (this.type === 'Stripe') {
      this.drawStripe();
    } else if (this.type === 'Button') {
      this.drawButton();
    } else if (this.type === 'Loading') {
      this.drawLoading();
    } else if (this.type === 'Clock') {
      this.drawClock();
    } else if (this.type === 'Graph') {
      this.drawGraph();
    } else if (this.type === 'Toggle') {
      this.drawToggle();
    } else if (this.type === 'Battery') {
      this.drawBattery();
    } else if (this.type === 'Smile') {
      this.drawSmile();
    } else if (this.type === 'Dial') {
      this.drawDial();
    }
    
    pop();
  }

  drawEye() {
    let cx = this.w / 2;
    let cy = this.h / 2;
    let eyeSize = min(this.w, this.h) * 0.6;
    
    fill(255);
    stroke(0);
    strokeWeight(params.strokeWidth);
    ellipse(cx, cy, eyeSize, eyeSize);
    
    // 瞳孔（仮想カーソルの方を見る）
    let dx = vCursorX - (this.x + cx);
    let dy = vCursorY - (this.y + cy);
    let angle = atan2(dy, dx);
    let distVal = min(dist(vCursorX, vCursorY, this.x + cx, this.y + cy), eyeSize * 0.25);
    
    let px = cx + cos(angle) * distVal;
    let py = cy + sin(angle) * distVal;
    
    fill(0);
    noStroke();
    ellipse(px, py, eyeSize * 0.4, eyeSize * 0.4);
  }

  drawMarquee() {
    fill(this.fgCol);
    noStroke();
    textSize(this.h * 0.4);
    textAlign(LEFT, CENTER);
    
    // テキストを繰り返してスクロール
    let txt = (this.text + "   ").repeat(5);
    text(txt, this.scrollX, this.h / 2);
  }

  drawShape() {
    translate(this.w / 2, this.h / 2);
    rotate(this.angle);
    
    fill(this.fgCol);
    stroke(0);
    strokeWeight(params.strokeWidth);
    
    let s = min(this.w, this.h) * 0.4;
    if (random() < 0.5) {
      rectMode(CENTER);
      rect(0, 0, s, s);
    } else {
      // 星型のようなギザギザ
      beginShape();
      for (let i = 0; i < 8; i++) {
        let r = (i % 2 === 0) ? s : s * 0.5;
        let a = map(i, 0, 8, 0, TWO_PI);
        vertex(cos(a) * r, sin(a) * r);
      }
      endShape(CLOSE);
    }
  }

  drawStripe() {
    stroke(0);
    strokeWeight(params.strokeWidth / 2);
    let step = 10;
    for (let i = -this.h; i < this.w; i += step) {
      line(i, 0, i + this.h, this.h);
    }
    
    // 中央に文字
    noStroke();
    fill(0);
    rectMode(CENTER);
    rect(this.w/2 + 4, this.h/2 + 4, this.w * 0.8, this.h * 0.4); // 影
    fill(255);
    stroke(0);
    strokeWeight(params.strokeWidth);
    rect(this.w/2, this.h/2, this.w * 0.8, this.h * 0.4);
    
    fill(0);
    noStroke();
    textSize(this.h * 0.2);
    textAlign(CENTER, CENTER);
    text("NEO", this.w/2, this.h/2);
  }

  drawButton() {
    let isBlink = sin(this.blinkTimer * 0.2) > 0;
    
    let bx = this.w * 0.1;
    let by = this.h * 0.2;
    let bw = this.w * 0.8;
    let bh = this.h * 0.6;
    
    // ボタンの影
    fill(0);
    noStroke();
    rect(bx + 4, by + 4, bw, bh);
    
    // ボタン本体
    if (isBlink) fill(this.fgCol);
    else fill(255);
    
    stroke(0);
    strokeWeight(params.strokeWidth);
    rect(bx, by, bw, bh);
    
    fill(0);
    noStroke();
    textSize(this.h * 0.2);
    textAlign(CENTER, CENTER);
    text(isBlink ? "ON" : "OFF", this.w/2, this.h/2);
  }

  drawLoading() {
    let barH = this.h * 0.3;
    let barW = this.w * 0.8;
    let bx = (this.w - barW) / 2;
    let by = (this.h - barH) / 2;

    // バーの背景
    fill(255);
    stroke(0);
    strokeWeight(params.strokeWidth);
    rect(bx, by, barW, barH);

    // 進捗バー
    fill(this.fgCol);
    noStroke();
    let progW = map(this.progress, 0, 100, 0, barW);
    // 枠線と重ならないように少し小さく
    if (progW > 0) rect(bx, by, progW, barH);
    
    // 枠線再描画（綺麗に見せるため）
    noFill();
    stroke(0);
    rect(bx, by, barW, barH);

    fill(0);
    noStroke();
    textSize(this.h * 0.15);
    textAlign(CENTER, BOTTOM);
    text("LOADING " + int(this.progress) + "%", this.w/2, by - 5);
  }

  drawClock() {
    let cx = this.w / 2;
    let cy = this.h / 2;
    let r = min(this.w, this.h) * 0.35;

    fill(255);
    stroke(0);
    strokeWeight(params.strokeWidth);
    ellipse(cx, cy, r*2, r*2);

    // 針の動き (time変数ベース)
    let hAngle = time * 0.1;
    let mAngle = time * 1.2;

    strokeWeight(params.strokeWidth);
    line(cx, cy, cx + cos(hAngle) * r * 0.5, cy + sin(hAngle) * r * 0.5); // 短針
    line(cx, cy, cx + cos(mAngle) * r * 0.8, cy + sin(mAngle) * r * 0.8); // 長針
    
    fill(this.fgCol);
    noStroke();
    ellipse(cx, cy, r*0.2, r*0.2);
  }

  drawGraph() {
    let margin = this.w * 0.1;
    let graphW = this.w - margin * 2;
    let graphH = this.h - margin * 2;
    let barW = graphW / this.graphData.length;

    noStroke();
    for (let i = 0; i < this.graphData.length; i++) {
      let val = this.graphData[i];
      let h = val * graphH;
      fill(i % 2 === 0 ? this.fgCol : 0);
      rect(margin + i * barW, this.h - margin - h, barW - 2, h);
    }
    
    // 枠線
    stroke(0);
    strokeWeight(params.strokeWidth);
    noFill();
    rect(margin, margin, graphW, graphH);
  }

  drawToggle() {
    let cx = this.w / 2;
    let cy = this.h / 2;
    let tw = this.w * 0.6;
    let th = this.h * 0.3;
    
    // Track
    fill(this.toggleState ? this.fgCol : 255);
    stroke(0);
    strokeWeight(params.strokeWidth);
    rectMode(CENTER);
    rect(cx, cy, tw, th, th/2);
    
    // Knob
    let knobX = this.toggleState ? cx + tw/4 : cx - tw/4;
    fill(255);
    if (this.toggleState) fill(0);
    ellipse(knobX, cy, th * 1.2, th * 1.2);
    
    rectMode(CORNER);
  }

  drawBattery() {
    let bx = this.w * 0.2;
    let by = this.h * 0.3;
    let bw = this.w * 0.6;
    let bh = this.h * 0.4;
    
    // Body
    fill(255);
    stroke(0);
    strokeWeight(params.strokeWidth);
    rect(bx, by, bw, bh);
    
    // Terminal
    fill(0);
    rect(bx + bw, by + bh * 0.3, this.w * 0.05, bh * 0.4);
    
    // Level
    fill(this.fgCol);
    noStroke();
    let levelW = (bw - 6) * (this.batteryLevel / 100);
    if (levelW > 0) rect(bx + 3, by + 3, levelW, bh - 6);
    
    // Text
    fill(0);
    noStroke();
    textSize(this.h * 0.15);
    textAlign(CENTER, CENTER);
    text(int(this.batteryLevel) + "%", this.w/2, this.h/2);
  }

  drawSmile() {
    let cx = this.w / 2;
    let cy = this.h / 2;
    let s = min(this.w, this.h) * 0.7;
    
    fill(this.fgCol);
    stroke(0);
    strokeWeight(params.strokeWidth);
    ellipse(cx, cy, s, s);
    
    // Eyes
    let eyeOff = s * 0.2;
    let eyeY = cy - s * 0.1;
    fill(0);
    noStroke();
    
    // Blink
    if (sin(this.blinkTimer * 0.5) > 0.9) {
       rectMode(CENTER);
       rect(cx - eyeOff, eyeY, s * 0.1, params.strokeWidth);
       rect(cx + eyeOff, eyeY, s * 0.1, params.strokeWidth);
       rectMode(CORNER);
    } else {
       ellipse(cx - eyeOff, eyeY, s * 0.1, s * 0.1);
       ellipse(cx + eyeOff, eyeY, s * 0.1, s * 0.1);
    }
    
    // Mouth
    noFill();
    stroke(0);
    strokeWeight(params.strokeWidth);
    arc(cx, cy + s * 0.1, s * 0.5, s * 0.3, 0, PI);
  }

  drawDial() {
    let cx = this.w / 2;
    let cy = this.h / 2;
    let r = min(this.w, this.h) * 0.35;
    
    fill(255);
    stroke(0);
    strokeWeight(params.strokeWidth);
    ellipse(cx, cy, r*2, r*2);
    
    // Knob line
    let lx = cx + cos(this.dialAngle) * r * 0.8;
    let ly = cy + sin(this.dialAngle) * r * 0.8;
    line(cx, cy, lx, ly);
    
    fill(0);
    noStroke();
    ellipse(cx, cy, r*0.2, r*0.2);
  }
}

// --- UI & Export Logic ---

async function startExportMP4() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  exportMax = params.exportFrames;
  let suggestedName = `sketch038_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}.mp4`;
  await window.exporter.startMP4(width, height, 24, exportMax, suggestedName);
  
  isExporting = true;
}

async function startExportPNG() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  exportMax = params.exportFrames;
  let prefix = `sketch038_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}`;
  await window.exporter.startPNG(24, exportMax, prefix);
  
  isExporting = true;
}

function keyPressed() {
  if (key === 'm' || key === 'M') startExportMP4();
  if (key === 'p' || key === 'P') startExportPNG();
  if (key === 'r' || key === 'R') initGrid();
}

function windowResized() {
  // 固定サイズのためリサイズ処理は行わない
}


