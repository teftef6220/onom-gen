// Memphis Design Generator
// 80s Postmodernism, Geometric, Pattern, Vibrant

const params = {
  seed: 123,
  bgColor: '#F0F0F0', // Off White
  patternColor: '#000000',
  shapeCount: 20,
  minSize: 50,
  maxSize: 250,
  speed: 0.5,
  scrollSpeed: 2.0,
  bgPattern: 'Squiggle', // Squiggle, Grid, Dot, Triangle
  bgPatternDensity: 40,
  shadowOffset: 10,
  exportFrames: 600,
  exportStart: () => startExport(),
  regenerate: () => generate()
};

let gui;
let shapes = [];
let time = 0;
let scrollY = 0;

// Memphis Color Palette
const COLORS = [
  '#FF0099', // Pink
  '#00CCFF', // Cyan
  '#FFCC00', // Yellow
  '#6633FF', // Purple
  '#00FF66', // Green
  '#000000', // Black
  '#FFFFFF'  // White
];

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

  rectMode(CENTER);
  ellipseMode(CENTER);
  strokeCap(ROUND);
  strokeJoin(ROUND);

  generate();
  createGUI();
}

function generate() {
  randomSeed(params.seed);
  shapes = [];
  
  for (let i = 0; i < params.shapeCount; i++) {
    shapes.push(new MemphisShape());
  }
}

function draw() {
  blendMode(BLEND);
  rectMode(CORNER);
  noStroke();
  fill(params.bgColor);
  rect(0, 0, width, height);
  
  // 背景パターン
  drawBackgroundPattern();
  
  rectMode(CENTER);
  time += params.speed * 0.01;
  scrollY += params.scrollSpeed;

  // シェイプ描画
  for (let i = shapes.length - 1; i >= 0; i--) {
    let s = shapes[i];
    s.update();
    s.display();
    if (s.y < -s.size) {
      shapes.splice(i, 1);
    }
  }
  while (shapes.length < params.shapeCount) {
    shapes.push(new MemphisShape(height + random(params.maxSize)));
  }

  // 書き出し処理
  if (isExporting) {
    saveCanvas('memphis_gen_' + exportSessionID + '_' + nf(exportCount + 1, 3), 'png');
    exportCount++;
    if (exportCount >= exportMax) {
      isExporting = false;
      console.log("Export finished");
    }
  }
}

function drawBackgroundPattern() {
  stroke(params.patternColor);
  strokeWeight(2);
  noFill();
  
  let step = params.bgPatternDensity;
  let animOffset = (time * 20);
  let offX = animOffset % step;
  let offY = (animOffset - scrollY) % step;
  
  if (params.bgPattern === 'Grid') {
    for (let x = offX - step; x < width; x += step) line(x, 0, x, height);
    for (let y = offY - step; y < height; y += step) line(0, y, width, y);
  } else if (params.bgPattern === 'Dot') {
    fill(params.patternColor);
    noStroke();
    for (let x = -step/2 + offX; x < width; x += step) {
      for (let y = -step/2 + offY; y < height; y += step) {
        ellipse(x, y, 4, 4);
      }
    }
  } else if (params.bgPattern === 'Triangle') {
    fill(params.patternColor);
    noStroke();
    for (let x = -step/2 + offX; x < width; x += step) {
      for (let y = -step/2 + offY; y < height; y += step) {
        let s = 8;
        triangle(x, y-s/2, x-s/2, y+s/2, x+s/2, y+s/2);
      }
    }
  } else if (params.bgPattern === 'Squiggle') {
    // バクテリア柄（ランダムな曲線）
    // パフォーマンスのため、固定シードで描画するか、画像化するのが望ましいが
    // ここでは簡易的に描画
    randomSeed(params.seed); // 背景パターンを固定
    noFill();
    strokeWeight(3);
    for (let i = 0; i < 50; i++) {
      let x = random(width);
      let y = random(height);
      let len = random(50, 150);
      beginShape();
      for (let j = 0; j < len; j+=10) {
        let ang = noise(x * 0.01, y * 0.01, j * 0.1 + time) * TWO_PI * 4;
        vertex(x + j, y + sin(j * 0.2 + time * 2) * 10);
      }
      endShape();
    }
    randomSeed(params.seed + frameCount); // メインループ用にシードを戻す（簡易対応）
  }
}

class MemphisShape {
  constructor(y) {
    this.x = random(width);
    this.y = (y !== undefined) ? y : random(height);
    this.size = random(params.minSize, params.maxSize);
    this.type = random(['Circle', 'Rect', 'Triangle', 'Arc', 'Zigzag', 'StripeRect', 'Column', 'Stairs']);
    this.color = random(COLORS);
    this.rotation = random(TWO_PI);
    this.rotSpeed = random(-0.02, 0.02);
    this.xSpeed = random(-0.5, 0.5);
    this.ySpeed = random(-0.5, 0.5);
    
    // パターン用
    this.hasPattern = random() > 0.7;
    this.patternType = random(['Dot', 'Line']);
  }

  update() {
    this.x += this.xSpeed * params.speed * 2;
    this.y -= this.ySpeed * params.speed * 2 + params.scrollSpeed;
    this.rotation += this.rotSpeed * params.speed;
    
    // 画面端ループ
    if (this.x < -this.size) this.x = width + this.size;
    if (this.x > width + this.size) this.x = -this.size;
  }

  display() {
    push();
    translate(this.x, this.y);
    rotate(this.rotation);
    
    // 影（ハードシャドウ）
    fill(0, 50); // 半透明の黒
    noStroke();
    push();
    translate(params.shadowOffset, params.shadowOffset);
    this.drawShape(true);
    pop();
    
    // 本体
    fill(this.color);
    stroke(0);
    strokeWeight(3);
    this.drawShape(false);
    
    // 内部パターン
    if (this.hasPattern) {
      this.drawInnerPattern();
    }
    
    pop();
  }

  drawShape(isShadow) {
    let s = this.size;
    if (this.type === 'Circle') {
      ellipse(0, 0, s, s);
    } else if (this.type === 'Rect' || this.type === 'StripeRect') {
      rect(0, 0, s, s);
    } else if (this.type === 'Triangle') {
      triangle(0, -s/2, -s/2, s/2, s/2, s/2);
    } else if (this.type === 'Arc') {
      arc(0, 0, s, s, 0, PI + HALF_PI, PIE);
    } else if (this.type === 'Zigzag') {
      noFill();
      if (isShadow) stroke(0, 50);
      else stroke(this.color);
      strokeWeight(s * 0.15);
      beginShape();
      let zigW = s * 0.8;
      let zigH = s * 0.3;
      for (let i = -2; i <= 2; i++) {
        vertex(i % 2 === 0 ? -zigW/2 : zigW/2, i * zigH);
      }
      endShape();
    } else if (this.type === 'Column') {
      // Sottsass-style Totem
      let w = s * 0.5;
      let h = s * 0.8;
      
      // Base Rect
      rect(0, h*0.2, w, h*0.6);
      // Top Circle
      ellipse(0, -h*0.4, w*1.2, w*1.2);
      // Bottom Base
      rect(0, h*0.6, w*1.5, h*0.2);
      
      if (!isShadow) {
        line(-w/2, 0, w/2, 0);
        line(-w/2, h*0.2, w/2, h*0.2);
      }
    } else if (this.type === 'Stairs') {
      let steps = 5;
      let sw = s / steps;
      let sh = s / steps;
      
      beginShape();
      vertex(-s/2, s/2); // Bottom Left
      for(let i=0; i<steps; i++) {
         vertex(-s/2 + i*sw, s/2 - i*sh);
         vertex(-s/2 + (i+1)*sw, s/2 - i*sh);
      }
      vertex(s/2, s/2); // Bottom Right
      vertex(s/2, s/2); // Close loop properly
      endShape(CLOSE);
    }
  }
  
  drawInnerPattern() {
    // クリッピングがp5.jsで面倒なので、簡易的に図形の上に描画
    // 本来はmaskを使うべきだが、ここではシンプルな図形内パターンとして実装
    
    fill(0);
    noStroke();
    let s = this.size;
    
    if (this.type === 'Rect' || this.type === 'StripeRect') {
      if (this.patternType === 'Dot') {
        let step = s / 5;
        for(let x = -s/2 + step/2; x < s/2; x+=step) {
          for(let y = -s/2 + step/2; y < s/2; y+=step) {
            ellipse(x, y, s*0.05, s*0.05);
          }
        }
      } else {
        // Stripe
        stroke(0);
        strokeWeight(2);
        let step = s / 6;
        for(let x = -s/2; x < s/2; x+=step) {
          line(x, -s/2, x, s/2);
        }
      }
    } else if (this.type === 'Circle') {
      if (this.patternType === 'Dot') {
        ellipse(0, 0, s*0.2, s*0.2);
      } else {
        stroke(0);
        strokeWeight(2);
        line(-s/2, 0, s/2, 0);
        line(0, -s/2, 0, s/2);
      }
    }
  }
}

window.guiConfig = [
  { folder: 'Generator', contents: [
    { object: params, variable: 'seed', min: 0, max: 1000, step: 1, name: 'Seed', onChange: generate },
    { object: params, variable: 'shapeCount', min: 1, max: 300, step: 1, name: 'Count', onChange: generate },
    { object: params, variable: 'minSize', min: 10, max: 200, name: 'Min Size', onChange: generate },
    { object: params, variable: 'maxSize', min: 50, max: 500, name: 'Max Size', onChange: generate },
    { object: params, variable: 'regenerate', name: 'Regenerate', type: 'function' }
  ]},
  { folder: 'Style', contents: [
    { object: params, variable: 'bgColor', type: 'color', name: 'Background' },
    { object: params, variable: 'patternColor', type: 'color', name: 'Pattern Color' },
    { object: params, variable: 'bgPattern', options: ['Squiggle', 'Grid', 'Dot', 'Triangle', 'None'], name: 'BG Pattern' },
    { object: params, variable: 'bgPatternDensity', min: 10, max: 100, name: 'Pattern Density' },
    { object: params, variable: 'shadowOffset', min: 0, max: 30, name: 'Shadow' }
  ]},
  { folder: 'Animation', contents: [
    { object: params, variable: 'speed', min: 0, max: 5.0, name: 'Anim Speed' },
    { object: params, variable: 'scrollSpeed', min: 0, max: 20.0, name: 'Scroll Speed' }
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