
const params = {
  seed: 100,
  autoSeed: false,
  seedInterval: 120,
  autoGrid: false,
  gridInterval: 200,
  bgColor: '#000000', // 黒
  mainColor: '#00AEEF', // シアン
  accentColor: '#EC008C', // マゼンタ
  subColor: '#FFF200', // イエロー
  blackColor: '#FFFFFF', // 白（フォアグラウンド）
  gridSize: 60,
  density: 0.6,
  speed: 1.0,
  glitch: false,
  exportFrames: 600,
  exportStart: () => startExport(),
  regenerate: () => generate()
};

window.guiConfig = [
  { folder: 'Generator', contents: [
    { object: params, variable: 'seed', min: 0, max: 1000, step: 1, name: 'Seed', listen: true, onChange: generate },
    { object: params, variable: 'autoSeed', name: 'Auto Change Seed' },
    { object: params, variable: 'seedInterval', min: 30, max: 600, step: 10, name: 'Seed Interval' },
    { object: params, variable: 'gridSize', min: 20, max: 200, step: 10, name: 'Grid Size', listen: true, onChange: generate },
    { object: params, variable: 'autoGrid', name: 'Auto Change Grid' },
    { object: params, variable: 'gridInterval', min: 30, max: 600, step: 10, name: 'Grid Interval' },
    { object: params, variable: 'density', min: 0.1, max: 1.0, name: 'Density', onChange: generate },
    { object: params, variable: 'speed', min: 0, max: 5.0, name: 'Speed' },
    { object: params, variable: 'glitch', name: 'Glitch Effect' },
    { object: params, variable: 'regenerate', name: 'Regenerate', type: 'function' }
  ]},
  { folder: 'Colors', contents: [
    { object: params, variable: 'bgColor', type: 'color', name: 'Background' },
    { object: params, variable: 'mainColor', type: 'color', name: 'Main (Cyan)' },
    { object: params, variable: 'accentColor', type: 'color', name: 'Accent (Magenta)' },
    { object: params, variable: 'subColor', type: 'color', name: 'Sub (Yellow)' },
    { object: params, variable: 'blackColor', type: 'color', name: 'Foreground' }
  ]},
  { folder: 'Export', contents: [
    { object: params, variable: 'exportFrames', min: 60, max: 1200, step: 1, name: 'Frames' },
    { object: params, variable: 'exportStart', name: 'Start Export', type: 'function' }
  ]}
];

let gui;
let shapes = [];
let noiseLines = [];
let time = 0;

const KATAKANA_WORDS = [
  "システム", "エラー", "デザイン", "サウンド", "データ", 
  "アキハバラ", "フューチャー", "エレモグ", 
  "スピード", "ゾーン", "アクセス", "モード", "レベル"
];

const ENGLISH_WORDS = [
  "SYSTEM", "ERROR", "DESIGN", "DANCE", "DATA", 
  "ELEMOG", "FUTURE", "TOKYO", "SOUND", "MIDI", "VDMX", 
  "AKIHABARA", "ZONE", "ACCESS", "MODE", "LEVEL 01"
];

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

  // フォント設定（太字のサンセリフ）
  textFont("Arial, Helvetica, sans-serif");
  textStyle(BOLD);
  
  generate();
  createGUI();
}

function generate() {
  randomSeed(params.seed);
  shapes = [];
  noiseLines = [];
  
  let cols = ceil(width / params.gridSize);
  let rows = ceil(height / params.gridSize);

  // 1. 背景の大きな図形
  for (let i = 0; i < 5; i++) {
    shapes.push(new BigShape());
  }

  // 2. グリッドベースの要素
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (random() < params.density * 0.1) {
        let px = x * params.gridSize;
        let py = y * params.gridSize;
        shapes.push(new TechElement(px, py, params.gridSize));
      }
    }
  }

  // 3. タイポグラフィ
  for (let i = 0; i < 8; i++) {
    shapes.push(new TypoElement());
  }
  
  // 4. UI/HUD要素
  shapes.push(new HUDElement());

  // 5. デジタルノイズライン（背景用）
  for (let i = 0; i < 40; i++) {
    noiseLines.push(new NoiseLine());
  }
}

function draw() {
  let needsGenerate = false;

  // 自動シード更新
  if (params.autoSeed && frameCount % params.seedInterval === 0) {
    params.seed = floor(random(1000));
    needsGenerate = true;
  }

  // 自動グリッド更新
  if (params.autoGrid && frameCount % params.gridInterval === 0) {
    params.gridSize = floor(random(2, 21)) * 10; // 20 - 200
    needsGenerate = true;
  }

  if (needsGenerate) {
    generate();
  }

  // 背景描画（描画設定をリセット）
  blendMode(BLEND);
  rectMode(CORNER);
  noStroke();
  fill(params.bgColor);
  rect(0, 0, width, height);
  
  time += params.speed * 0.02;

  // ノイズライン描画
  for (let nl of noiseLines) {
    nl.update();
    nl.display();
  }

  // グリッドライン（薄く）
  stroke(255, 40);
  strokeWeight(1);
  for (let x = 0; x < width; x += params.gridSize) line(x, 0, x, height);
  for (let y = 0; y < height; y += params.gridSize) line(0, y, width, y);

  // シェイプ描画
  for (let s of shapes) {
    s.update();
    s.display();
  }

  // グリッチ効果（全体）
  if (params.glitch && random() < 0.1) {
    filter(POSTERIZE, 4);
    let sliceH = random(5, 50);
    let sliceY = random(height);
    let sliceImg = get(0, sliceY, width, sliceH);
    image(sliceImg, random(-10, 10), sliceY);
  }

  // 書き出し処理
  if (isExporting) {
    saveCanvas('tech_style_' + exportSessionID + '_' + nf(exportCount + 1, 3), 'png');
    exportCount++;
    if (exportCount >= exportMax) {
      isExporting = false;
      console.log("Export finished");
    }
  }
}

// --- Classes ---

class BigShape {
  constructor() {
    this.x = random(width);
    this.y = random(height);
    this.targetX = this.x;
    this.targetY = this.y;
    this.size = random(200, 600);
    this.type = random(['Circle', 'Rect', 'Ring', 'Cross']);
    this.color = random([params.mainColor, params.accentColor, params.subColor, params.blackColor]);
    this.rotation = int(random(4)) * HALF_PI;
    this.rotSpeed = random(-0.01, 0.01);
  }

  update() {
    this.rotation += this.rotSpeed * params.speed;
    
    // ゆったりとした浮遊移動
    if (frameCount % 120 === 0 && random() < 0.5) {
      this.targetX = random(width);
      this.targetY = random(height);
    }
    this.x = lerp(this.x, this.targetX, 0.02 * params.speed);
    this.y = lerp(this.y, this.targetY, 0.02 * params.speed);
  }

  display() {
    push();
    translate(this.x, this.y);
    rotate(this.rotation);
    noStroke();
    fill(this.color);

    if (this.type === 'Circle') {
      ellipse(0, 0, this.size, this.size);
    } else if (this.type === 'Rect') {
      rectMode(CENTER);
      rect(0, 0, this.size, this.size * random(0.2, 1.0));
    } else if (this.type === 'Ring') {
      noFill();
      stroke(this.color);
      strokeWeight(this.size * 0.1);
      ellipse(0, 0, this.size, this.size);
      // カットアウト
      noStroke();
      fill(params.bgColor);
      rectMode(CENTER);
      if (random() > 0.5) rect(this.size/2, 0, this.size*0.2, this.size*0.1);
    } else if (this.type === 'Cross') {
      rectMode(CENTER);
      rect(0, 0, this.size, this.size * 0.2);
      rect(0, 0, this.size * 0.2, this.size);
    }
    pop();
  }
}

class TechElement {
  constructor(x, y, s) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.s = s;
    this.type = random(['Barcode', 'Target', 'Dots', 'Stripe']);
    this.color = params.blackColor;
  }

  update() {
    // グリッドに沿った移動
    if (random() < 0.005 * params.speed) {
      let cols = ceil(width / params.gridSize);
      let rows = ceil(height / params.gridSize);
      this.targetX = floor(random(cols)) * params.gridSize;
      this.targetY = floor(random(rows)) * params.gridSize;
    }
    this.x = lerp(this.x, this.targetX, 0.1 * params.speed);
    this.y = lerp(this.y, this.targetY, 0.1 * params.speed);
  }

  display() {
    push();
    translate(this.x, this.y);
    fill(this.color);
    noStroke();

    if (this.type === 'Barcode') {
      let w = this.s;
      let h = this.s * 0.5;
      let x = 0;
      while(x < w) {
        let bw = random(2, 8);
        if (x + bw > w) bw = w - x;
        if (random() > 0.3) rect(x, 0, bw, h);
        x += bw + 2;
      }
    } else if (this.type === 'Target') {
      stroke(this.color);
      strokeWeight(2);
      noFill();
      ellipse(this.s/2, this.s/2, this.s*0.8);
      line(0, this.s/2, this.s, this.s/2);
      line(this.s/2, 0, this.s/2, this.s);
    } else if (this.type === 'Dots') {
      let cols = 4;
      let step = this.s / cols;
      for(let i=0; i<cols; i++) {
        for(let j=0; j<cols; j++) {
          if (random() > 0.5) ellipse(i*step + step/2, j*step + step/2, 4, 4);
        }
      }
    } else if (this.type === 'Stripe') {
      let h = this.s / 5;
      for(let i=0; i<5; i++) {
        if (i%2===0) rect(0, i*h, this.s, h);
      }
    }
    pop();
  }
}

class TypoElement {
  constructor() {
    this.x = random(width);
    this.y = random(height);
    this.targetX = this.x;
    this.targetY = this.y;
    this.isVertical = random() > 0.7;
    this.isJapanese = random() > 0.5;
    this.text = this.isJapanese ? random(KATAKANA_WORDS) : random(ENGLISH_WORDS);
    this.size = random(20, 120);
    this.color = random([params.blackColor, params.mainColor, params.accentColor]);
    this.bg = random() > 0.7; // 背景あり
  }

  update() {
    // 点滅
    if (random() < 0.05) {
      this.color = (this.color === params.bgColor) ? params.blackColor : params.bgColor;
    }
    
    // 素早い移動
    if (random() < 0.01 * params.speed) {
      let cols = ceil(width / params.gridSize);
      let rows = ceil(height / params.gridSize);
      this.targetX = floor(random(cols)) * params.gridSize;
      this.targetY = floor(random(rows)) * params.gridSize;
    }
    this.x = lerp(this.x, this.targetX, 0.15 * params.speed);
    this.y = lerp(this.y, this.targetY, 0.15 * params.speed);
  }

  display() {
    push();
    translate(this.x, this.y);
    if (this.isVertical) rotate(HALF_PI);
    
    textSize(this.size);
    textAlign(LEFT, TOP);
    
    let tw = textWidth(this.text);
    let th = this.size; // 近似値

    if (this.bg) {
      noStroke();
      fill(this.color === params.bgColor ? params.blackColor : this.color);
      rect(-5, -5, tw + 10, th + 10);
      fill(params.bgColor);
    } else {
      fill(this.color);
    }
    
    text(this.text, 0, 0);
    
    // 装飾ライン
    if (random() > 0.5) {
      stroke(this.color);
      strokeWeight(2);
      line(0, th + 5, tw, th + 5);
    }
    pop();
  }
}

class HUDElement {
  constructor() {
    this.margin = 40;
  }
  
  update() {}
  
  display() {
    // 四隅のマーカー
    stroke(params.blackColor);
    strokeWeight(3);
    noFill();
    let m = this.margin;
    let len = 30;
    
    // 左上
    line(m, m, m + len, m);
    line(m, m, m, m + len);
    // 右上
    line(width - m, m, width - m - len, m);
    line(width - m, m, width - m, m + len);
    // 左下
    line(m, height - m, m + len, height - m);
    line(m, height - m, m, height - m - len);
    // 右下
    line(width - m, height - m, width - m - len, height - m);
    line(width - m, height - m, width - m, height - m - len);

    // タイムコード
    noStroke();
    fill(params.blackColor);
    textSize(14);
    textAlign(RIGHT, BOTTOM);
    text("REC " + nf(frameCount, 5), width - m - 10, height - m - 10);
    
    // ランダムな数値列
    textAlign(LEFT, TOP);
    let y = m + 50;
    for(let i=0; i<5; i++) {
      text(nf(random(100), 2, 2) + " / " + nf(random(1000), 4), m, y);
      y += 20;
    }
  }
}

class NoiseLine {
  constructor() {
    this.init(true);
  }

  init(startRandom = false) {
    // グリッドにスナップさせる
    let cols = ceil(width / params.gridSize);
    this.x = floor(random(cols)) * params.gridSize;
    // たまに少しずらす
    if (random() < 0.3) this.x += params.gridSize * 0.5;
    
    this.y = startRandom ? random(height) : -random(200, 1000);
    this.len = random(50, 400);
    this.speed = random(10, 30);
    this.color = color(random([params.mainColor, params.accentColor, params.subColor, '#FFFFFF']));
    this.alpha = random(20, 80);
  }

  update() {
    this.y += this.speed * params.speed;
    if (this.y - this.len > height) {
      this.init();
    }
  }

  display() {
    push();
    strokeWeight(1);
    this.color.setAlpha(this.alpha);
    stroke(this.color);
    
    // デジタルな破線
    let segment = random(5, 15);
    for (let i = 0; i < this.len; i += segment * 2) {
      if (random() > 0.1) {
        line(this.x, this.y - i, this.x, this.y - i - segment);
      }
    }
    
    // 先端の輝き
    noStroke();
    fill(255, this.alpha * 3);
    rect(this.x - 1, this.y, 2, 15);
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
  if (key === 'r' || key === 'R') generate();
}

function createGUI() {
  gui = new lil.GUI();
  const processConfig = (config, parent) => {
    config.forEach(item => {
      if (item.folder) {
        const folder = parent.addFolder(item.folder);
        processConfig(item.contents, folder);
      } else {
        let controller;
        if (item.type === 'color') {
          controller = parent.addColor(item.object, item.variable).name(item.name);
        } else if (item.type === 'function') {
          controller = parent.add(item.object, item.variable).name(item.name);
        } else if (item.options) {
          controller = parent.add(item.object, item.variable, item.options).name(item.name);
        } else {
          controller = parent.add(item.object, item.variable, item.min, item.max, item.step).name(item.name);
        }
        if (item.onChange) controller.onChange(item.onChange);
        if (item.onFinishChange) controller.onFinishChange(item.onFinishChange);
        if (item.listen) controller.listen();
      }
    });
  };
  if (window.guiConfig) {
    processConfig(window.guiConfig, gui);
  }
}