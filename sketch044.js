// Utilitarian UI / Industrial Design
// Functional, Grid-based, Monospaced, Technical

const params = {
  cols: 8,
  rows: 6,
  margin: 60,
  gutter: 2, // Tight spacing
  speed: 1.0,
  theme: 'Light', // Light, Dark, Blueprint, Terminal
  accentColor: '#FF3300',
  showGrid: true,
  autoRefresh: true,
  refreshInterval: 240,
  exportFrames: 600,
  exportStart: () => startExport(),
  regenerate: () => generateLayout()
};

let gui;
let modules = [];
let time = 0;
let font;

// Themes
const THEMES = {
  Light: { bg: '#E6E6E6', fg: '#111111', grid: '#CCCCCC' },
  Dark: { bg: '#111111', fg: '#E6E6E6', grid: '#333333' },
  Blueprint: { bg: '#003399', fg: '#FFFFFF', grid: '#0044CC' },
  Terminal: { bg: '#000000', fg: '#00FF33', grid: '#003300' }
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

  // 等幅フォント設定
  textFont('Courier New, monospace');
  textStyle(BOLD);

  generateLayout();
}

function generateLayout() {
  randomSeed(frameCount); // Refresh based on time
  modules = [];
  
  let gridMap = Array(params.cols).fill().map(() => Array(params.rows).fill(false));
  
  // グリッド計算
  let drawW = width - params.margin * 2;
  let drawH = height - params.margin * 2;
  let cellW = (drawW - (params.cols - 1) * params.gutter) / params.cols;
  let cellH = (drawH - (params.rows - 1) * params.gutter) / params.rows;

  for (let y = 0; y < params.rows; y++) {
    for (let x = 0; x < params.cols; x++) {
      if (gridMap[x][y]) continue;

      // モジュールのサイズ決定 (1x1, 2x1, 2x2, 4x2 etc)
      let w = 1;
      let h = 1;
      
      let rand = random();
      if (rand < 0.1 && x + 3 < params.cols && y + 1 < params.rows) { w = 4; h = 2; }
      else if (rand < 0.3 && x + 1 < params.cols && y + 1 < params.rows) { w = 2; h = 2; }
      else if (rand < 0.5 && x + 1 < params.cols) { w = 2; h = 1; }
      
      // 領域チェック
      let fit = true;
      for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
          if (gridMap[x + i][y + j]) fit = false;
        }
      }
      
      if (!fit) { w = 1; h = 1; } // 入らなければ1x1

      // グリッド埋め
      for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
          gridMap[x + i][y + j] = true;
        }
      }

      // 座標計算
      let px = params.margin + x * (cellW + params.gutter);
      let py = params.margin + y * (cellH + params.gutter);
      let pw = w * cellW + (w - 1) * params.gutter;
      let ph = h * cellH + (h - 1) * params.gutter;

      // モジュール生成
      let type = random(['Log', 'Graph', 'Gauge', 'Scope', 'Label', 'Barcode', 'Radar', 'Spectrum', 'Compass', 'Battery', 'Chip', 'Dial', 'Table', 'QR', 'Wave', 'Target']);
      if (w >= 2 && h >= 2) type = random(['Scope', 'Graph', 'Map', 'Table', 'Wave']);
      
      modules.push(new UIModule(px, py, pw, ph, type));
    }
  }
}

function draw() {
  let theme = THEMES[params.theme];
  
  blendMode(BLEND);
  rectMode(CORNER);
  noStroke();
  fill(theme.bg);
  rect(0, 0, width, height);
  
  // 自動更新
  if (params.autoRefresh && frameCount % params.refreshInterval === 0) {
    generateLayout();
  }
  
  time += params.speed * 0.02;

  // 背景グリッド
  if (params.showGrid) {
    stroke(theme.grid);
    strokeWeight(1);
    noFill();
    
    // クロスヘア
    let stepX = (width - params.margin * 2) / params.cols;
    let stepY = (height - params.margin * 2) / params.rows;
    
    for (let x = 0; x <= params.cols; x++) {
      for (let y = 0; y <= params.rows; y++) {
        let px = params.margin + x * stepX; // gutter無視の簡易グリッド
        let py = params.margin + y * stepY;
        line(px - 5, py, px + 5, py);
        line(px, py - 5, px, py + 5);
      }
    }
  }

  // モジュール描画
  for (let m of modules) {
    m.update();
    m.display(theme);
  }

  // メタ情報（画面端）
  drawHUD(theme);

  // 書き出し処理
  if (isExporting) {
    saveCanvas('utilitarian_ui_' + exportSessionID + '_' + nf(exportCount + 1, 3), 'png');
    exportCount++;
    if (exportCount >= exportMax) {
      isExporting = false;
      console.log("Export finished");
    }
  }
}

function drawHUD(theme) {
  fill(theme.fg);
  noStroke();
  textSize(10);
  textAlign(LEFT, TOP);
  text("SYS.STATUS: NORMAL", 10, 10);
  text("FPS: " + nf(frameRate(), 2, 1), 10, 25);
  
  textAlign(RIGHT, BOTTOM);
  text("UTILITARIAN_UI_GEN_V1.0", width - 10, height - 10);
  text(nf(year(), 4) + "." + nf(month(), 2) + "." + nf(day(), 2), width - 10, height - 25);
}

class UIModule {
  constructor(x, y, w, h, type) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.type = type;
    this.id = hex(int(random(65535)), 4);
    
    // 個別データ
    this.data = [];
    if (type === 'Graph' || type === 'Scope' || type === 'Spectrum' || type === 'Wave') {
      for(let i=0; i<20; i++) this.data.push(random());
    }
    this.val = random();
    this.label = random(['CPU', 'MEM', 'NET', 'I/O', 'PWR', 'TMP', 'FAN', 'VOL']);
  }

  update() {
    if (this.type === 'Graph' || this.type === 'Scope' || this.type === 'Spectrum' || this.type === 'Wave') {
      if (frameCount % 5 === 0) {
        this.data.shift();
        this.data.push(noise(time * 5 + this.x) * 0.8 + 0.1);
      }
    }
    this.val = noise(time + this.y);
  }

  display(theme) {
    push();
    translate(this.x, this.y);
    
    // 枠線
    stroke(theme.fg);
    strokeWeight(1);
    noFill();
    rect(0, 0, this.w, this.h);
    
    // ヘッダーライン
    line(0, 15, this.w, 15);
    
    // IDとラベル
    noStroke();
    fill(theme.fg);
    textSize(8);
    textAlign(LEFT, TOP);
    text(this.id + " // " + this.label, 4, 3);

    // コンテンツエリア
    let cw = this.w - 10;
    let ch = this.h - 25;
    translate(5, 20);

    if (this.type === 'Log') {
      this.drawLog(cw, ch, theme);
    } else if (this.type === 'Graph') {
      this.drawGraph(cw, ch, theme);
    } else if (this.type === 'Gauge') {
      this.drawGauge(cw, ch, theme);
    } else if (this.type === 'Scope') {
      this.drawScope(cw, ch, theme);
    } else if (this.type === 'Label') {
      this.drawLabel(cw, ch, theme);
    } else if (this.type === 'Barcode') {
      this.drawBarcode(cw, ch, theme);
    } else if (this.type === 'Map') {
      this.drawMap(cw, ch, theme);
    } else if (this.type === 'Radar') {
      this.drawRadar(cw, ch, theme);
    } else if (this.type === 'Spectrum') {
      this.drawSpectrum(cw, ch, theme);
    } else if (this.type === 'Compass') {
      this.drawCompass(cw, ch, theme);
    } else if (this.type === 'Battery') {
      this.drawBattery(cw, ch, theme);
    } else if (this.type === 'Chip') {
      this.drawChip(cw, ch, theme);
    } else if (this.type === 'Dial') {
      this.drawDial(cw, ch, theme);
    } else if (this.type === 'Table') {
      this.drawTable(cw, ch, theme);
    } else if (this.type === 'QR') {
      this.drawQR(cw, ch, theme);
    } else if (this.type === 'Wave') {
      this.drawWave(cw, ch, theme);
    } else if (this.type === 'Target') {
      this.drawTarget(cw, ch, theme);
    }

    pop();
  }

  drawLog(w, h, theme) {
    let lines = floor(h / 10);
    fill(theme.fg);
    textAlign(LEFT, TOP);
    for (let i = 0; i < lines; i++) {
      if (random() > 0.8) fill(params.accentColor);
      else fill(theme.fg);
      
      let txt = "> " + hex(int(random(255)), 2) + " " + nf(random(100), 1, 2) + " OK";
      text(txt, 0, i * 10);
    }
  }

  drawGraph(w, h, theme) {
    let barW = w / this.data.length;
    noStroke();
    for (let i = 0; i < this.data.length; i++) {
      let val = this.data[i];
      if (val > 0.8) fill(params.accentColor);
      else fill(theme.fg);
      
      let barH = val * h;
      rect(i * barW, h - barH, barW - 1, barH);
    }
  }

  drawGauge(w, h, theme) {
    // 円形ゲージ
    let r = min(w, h) * 0.4;
    let cx = w / 2;
    let cy = h / 2;
    
    noFill();
    stroke(theme.fg);
    strokeWeight(2);
    arc(cx, cy, r*2, r*2, PI, TWO_PI);
    
    strokeWeight(1);
    stroke(theme.grid);
    arc(cx, cy, r*1.6, r*1.6, PI, TWO_PI);
    
    // 針
    let angle = map(this.val, 0, 1, PI, TWO_PI);
    stroke(params.accentColor);
    strokeWeight(2);
    line(cx, cy, cx + cos(angle) * r, cy + sin(angle) * r);
    
    // 数値
    noStroke();
    fill(theme.fg);
    textAlign(CENTER, TOP);
    text(nf(this.val * 100, 3, 0), cx, cy + 5);
  }

  drawScope(w, h, theme) {
    // グリッド
    stroke(theme.grid);
    strokeWeight(1);
    line(0, h/2, w, h/2);
    line(w/2, 0, w/2, h);
    
    // 波形
    noFill();
    stroke(params.accentColor);
    strokeWeight(1.5);
    beginShape();
    for (let i = 0; i < this.data.length; i++) {
      let x = map(i, 0, this.data.length - 1, 0, w);
      let y = map(this.data[i], 0, 1, h, 0);
      vertex(x, y);
    }
    endShape();
  }

  drawLabel(w, h, theme) {
    fill(theme.fg);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(min(w, h) * 0.4);
    text(this.val > 0.5 ? "ON" : "OFF", w/2, h/2);
    
    textSize(8);
    text("STATUS CHECK", w/2, h/2 + min(w, h) * 0.3);
  }

  drawBarcode(w, h, theme) {
    noStroke();
    fill(theme.fg);
    let x = 0;
    while (x < w) {
      let bw = random(1, 4);
      if (x + bw > w) bw = w - x;
      if (random() > 0.5) rect(x, 0, bw, h);
      x += bw + 1;
    }
    
    // 赤いスキャンライン
    stroke(params.accentColor);
    let scanX = (frameCount * 2) % w;
    line(scanX, 0, scanX, h);
  }

  drawMap(w, h, theme) {
    noFill();
    stroke(theme.fg);
    strokeWeight(1);
    
    // 地形っぽい線
    beginShape();
    vertex(0, h*0.5);
    vertex(w*0.2, h*0.5);
    vertex(w*0.4, h*0.2);
    vertex(w*0.6, h*0.2);
    vertex(w*0.8, h*0.7);
    vertex(w, h*0.7);
    endShape();
    
    // ターゲット
    let tx = w * 0.4;
    let ty = h * 0.2;
    stroke(params.accentColor);
    line(tx-5, ty, tx+5, ty);
    line(tx, ty-5, tx, ty+5);
    noStroke();
    fill(params.accentColor);
    text("TRG", tx + 5, ty - 5);
  }

  drawRadar(w, h, theme) {
    let cx = w / 2;
    let cy = h / 2;
    let r = min(w, h) * 0.4;
    
    noFill();
    stroke(theme.grid);
    ellipse(cx, cy, r * 2);
    ellipse(cx, cy, r);
    line(cx - r, cy, cx + r, cy);
    line(cx, cy - r, cx, cy + r);
    
    // Scan line
    let angle = time * 2;
    stroke(params.accentColor);
    line(cx, cy, cx + cos(angle) * r, cy + sin(angle) * r);
    
    // Blip
    if (frameCount % 60 < 10) {
      noStroke();
      fill(params.accentColor);
      ellipse(cx + r * 0.5, cy - r * 0.3, 4, 4);
    }
  }

  drawSpectrum(w, h, theme) {
    let barW = w / this.data.length;
    noStroke();
    fill(theme.fg);
    for(let i=0; i<this.data.length; i++) {
        let val = this.data[i];
        let barH = val * h;
        if (val > 0.7) fill(params.accentColor);
        else fill(theme.fg);
        rect(i * barW, h - barH, barW - 1, barH);
    }
  }

  drawCompass(w, h, theme) {
    let cx = w / 2;
    let cy = h / 2;
    let r = min(w, h) * 0.4;
    
    noFill();
    stroke(theme.fg);
    ellipse(cx, cy, r * 2);
    
    // Ticks
    for(let i=0; i<8; i++) {
      let a = i * TWO_PI / 8;
      let x1 = cx + cos(a) * r;
      let y1 = cy + sin(a) * r;
      let x2 = cx + cos(a) * (r - 5);
      let y2 = cy + sin(a) * (r - 5);
      line(x1, y1, x2, y2);
    }
    
    // Needle
    let angle = noise(time * 0.5) * TWO_PI;
    stroke(params.accentColor);
    line(cx, cy, cx + cos(angle) * r * 0.8, cy + sin(angle) * r * 0.8);
  }

  drawBattery(w, h, theme) {
    let bw = w * 0.6;
    let bh = h * 0.3;
    let bx = (w - bw) / 2;
    let by = (h - bh) / 2;
    
    noFill();
    stroke(theme.fg);
    rect(bx, by, bw, bh);
    rect(bx + bw, by + bh * 0.3, 5, bh * 0.4);
    
    noStroke();
    fill(this.val > 0.2 ? theme.fg : params.accentColor);
    let fillW = (bw - 4) * this.val;
    rect(bx + 2, by + 2, fillW, bh - 4);
  }

  drawChip(w, h, theme) {
    let cw = w * 0.5;
    let ch = h * 0.5;
    let cx = (w - cw) / 2;
    let cy = (h - ch) / 2;
    
    fill(theme.fg);
    noStroke();
    rect(cx, cy, cw, ch);
    
    stroke(theme.grid);
    // Pins
    for(let i=0; i<4; i++) {
      let x = cx + (i+1) * (cw/5);
      line(x, cy, x, cy - 5);
      line(x, cy + ch, x, cy + ch + 5);
      
      let y = cy + (i+1) * (ch/5);
      line(cx, y, cx - 5, y);
      line(cx + cw, y, cx + cw + 5, y);
    }
  }

  drawDial(w, h, theme) {
    let cx = w / 2;
    let cy = h / 2;
    let r = min(w, h) * 0.4;
    
    noFill();
    stroke(theme.grid);
    arc(cx, cy, r*2, r*2, PI, TWO_PI);
    
    let angle = map(this.val, 0, 1, PI, TWO_PI);
    stroke(params.accentColor);
    strokeWeight(2);
    line(cx, cy, cx + cos(angle) * r, cy + sin(angle) * r);
    strokeWeight(1);
  }

  drawTable(w, h, theme) {
    let rows = 4;
    let cols = 3;
    let cellW = w / cols;
    let cellH = h / rows;
    
    stroke(theme.grid);
    noFill();
    for(let i=1; i<cols; i++) line(i*cellW, 0, i*cellW, h);
    for(let i=1; i<rows; i++) line(0, i*cellH, w, i*cellH);
    
    noStroke();
    fill(theme.fg);
    textSize(8);
    textAlign(CENTER, CENTER);
    // データはランダムに明滅
    for(let j=0; j<rows; j++) {
        for(let i=0; i<cols; i++) {
            if (random() > 0.1) text(hex(int(random(255)), 2), i*cellW + cellW/2, j*cellH + cellH/2);
        }
    }
  }

  drawQR(w, h, theme) {
    let size = min(w, h) * 0.8;
    let cx = (w - size) / 2;
    let cy = (h - size) / 2;
    let cells = 8;
    let cs = size / cells;
    
    noStroke();
    fill(theme.fg);
    
    for(let y=0; y<cells; y++) {
      for(let x=0; x<cells; x++) {
        if (random() > 0.5) {
          rect(cx + x*cs, cy + y*cs, cs, cs);
        }
      }
    }
    
    // Markers
    noFill();
    stroke(params.accentColor);
    rect(cx, cy, cs*2, cs*2);
    rect(cx + size - cs*2, cy, cs*2, cs*2);
    rect(cx, cy + size - cs*2, cs*2, cs*2);
  }

  drawWave(w, h, theme) {
    noFill();
    stroke(params.accentColor);
    beginShape();
    for(let i=0; i<this.data.length; i++) {
      let x = map(i, 0, this.data.length-1, 0, w);
      let y = map(this.data[i], 0, 1, h, 0);
      vertex(x, y);
    }
    endShape();
  }

  drawTarget(w, h, theme) {
    let cx = w / 2;
    let cy = h / 2;
    let r = min(w, h) * 0.4;
    
    noFill();
    stroke(theme.fg);
    ellipse(cx, cy, r * 2);
    line(cx - r - 5, cy, cx + r + 5, cy);
    line(cx, cy - r - 5, cx, cy + r + 5);
    
    stroke(params.accentColor);
    let size = r * 0.5;
    line(cx - size, cy - size, cx - size + 5, cy - size);
    line(cx - size, cy - size, cx - size, cy - size + 5);
    
    line(cx + size, cy - size, cx + size - 5, cy - size);
    line(cx + size, cy - size, cx + size, cy - size + 5);
    
    line(cx - size, cy + size, cx - size + 5, cy + size);
    line(cx - size, cy + size, cx - size, cy + size - 5);
    
    line(cx + size, cy + size, cx + size - 5, cy + size);
    line(cx + size, cy + size, cx + size, cy + size - 5);
  }
}

window.guiConfig = [
  { folder: 'Layout', contents: [
    { object: params, variable: 'cols', min: 2, max: 24, step: 1, name: 'Columns', onChange: generateLayout },
    { object: params, variable: 'rows', min: 2, max: 16, step: 1, name: 'Rows', onChange: generateLayout },
    { object: params, variable: 'margin', min: 0, max: 200, name: 'Margin', onChange: generateLayout },
    { object: params, variable: 'gutter', min: 0, max: 20, name: 'Gutter', onChange: generateLayout },
    { object: params, variable: 'regenerate', name: 'Regenerate', type: 'function' }
  ]},
  { folder: 'Style', contents: [
    { object: params, variable: 'theme', options: Object.keys(THEMES), name: 'Theme' },
    { object: params, variable: 'accentColor', type: 'color', name: 'Accent Color' },
    { object: params, variable: 'showGrid', name: 'Show Grid' }
  ]},
  { folder: 'Animation', contents: [
    { object: params, variable: 'speed', min: 0, max: 5.0, name: 'Speed' },
    { object: params, variable: 'autoRefresh', name: 'Auto Refresh' },
    { object: params, variable: 'refreshInterval', min: 60, max: 600, step: 10, name: 'Interval' }
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
  if (key === 'r' || key === 'R') generateLayout();
}