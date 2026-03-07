// Risograph Style Generator
// Layers, Dithering, Misregistration, Multiply Blending

const params = {
  seed: 1234,
  layer1Color: '#FF0055', // Fluorescent Pink
  layer2Color: '#0099FF', // Blue
  layer3Color: '#FFE800', // Yellow
  paperColor: '#000000',
  inkOpacity: 200, // 0-255
  misregistration: 8.0, // Maximum offset in pixels
  shapeCount: 15,
  minSize: 50,
  maxSize: 400,
  animSpeed: 0.5, // Vibration speed
  scrollSpeed: 2.0,
  autoUpdate: false,
  exportFrames: 600,
  exportStart: () => startExport(),
  regenerate: () => generate()
};

let gui;
let layer1, layer2, layer3;
let shapes = [];
let time = 0;

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

  // レイヤー（版）の作成
  layer1 = createGraphics(width, height);
  layer2 = createGraphics(width, height);
  layer3 = createGraphics(width, height);

  generate();
  createGUI();
}

function generate() {
  randomSeed(params.seed);
  shapes = [];
  
  for (let i = 0; i < params.shapeCount; i++) {
    shapes.push(new RisoShape());
  }
  
  // 各レイヤーに描画
  drawLayer(layer1, 0); // Layer 1 (Pink)
  drawLayer(layer2, 1); // Layer 2 (Blue)
  drawLayer(layer3, 2); // Layer 3 (Yellow)
}

function drawLayer(pg, layerIndex) {
  pg.clear();
  pg.noStroke();
  pg.fill(255); // tintで着色するために白で描画する
  
  for (let s of shapes) {
    // シェイプがこのレイヤーに含まれるかランダムに決定
    // 複数のレイヤーに含まれることで混色が起きる
    if (s.layers.includes(layerIndex)) {
      pg.push();
      
      // 個別のズレを適用
      let offX = 0;
      let offY = 0;
      if (s.offsets && s.offsets[layerIndex]) {
          offX = s.offsets[layerIndex].x;
          offY = s.offsets[layerIndex].y;
      }
      pg.translate(s.x + offX, s.y + offY);
      pg.rotate(s.rotation);
      
      if (s.type === 'Circle') {
        pg.ellipse(0, 0, s.w, s.w);
      } else if (s.type === 'Rect') {
        pg.rectMode(CENTER);
        pg.rect(0, 0, s.w, s.h);
      } else if (s.type === 'Triangle') {
        pg.triangle(0, -s.h/2, -s.w/2, s.h/2, s.w/2, s.h/2);
      } else if (s.type === 'Stripe') {
        pg.rectMode(CENTER);
        let count = 5;
        let step = s.w / count;
        for(let i=0; i<count; i++) {
          if (i%2===0) pg.rect(0, (i - count/2) * step, s.w, step/2);
        }
      } else if (s.type === 'Noise') {
        // ノイズテクスチャ
        for(let i=0; i<500; i++) {
          let nx = random(-s.w/2, s.w/2);
          let ny = random(-s.h/2, s.h/2);
          pg.ellipse(nx, ny, random(2, 5));
        }
      } else if (s.type === 'Ring') {
        pg.noFill();
        pg.stroke(255);
        pg.strokeWeight(s.w * 0.15);
        pg.ellipse(0, 0, s.w * 0.7, s.h * 0.7);
      } else if (s.type === 'Cross') {
        pg.rectMode(CENTER);
        pg.rect(0, 0, s.w, s.h * 0.25);
        pg.rect(0, 0, s.w * 0.25, s.h);
      } else if (s.type === 'Grid') {
        pg.stroke(255);
        pg.strokeWeight(s.w * 0.05);
        let step = s.w / 4;
        for(let i = -s.w/2; i <= s.w/2; i+=step) {
          pg.line(i, -s.h/2, i, s.h/2);
        }
        for(let i = -s.h/2; i <= s.h/2; i+=step) {
          pg.line(-s.w/2, i, s.w/2, i);
        }
      } else if (s.type === 'Arc') {
        pg.arc(0, 0, s.w, s.h, 0, PI + HALF_PI, PIE);
      } else if (s.type === 'Star') {
        let npoints = 5;
        let angle = TWO_PI / npoints;
        let halfAngle = angle / 2.0;
        pg.beginShape();
        for (let a = -HALF_PI; a < TWO_PI - HALF_PI; a += angle) {
          let sx = cos(a) * s.w/2;
          let sy = sin(a) * s.h/2;
          pg.vertex(sx, sy);
          sx = cos(a + halfAngle) * s.w/4;
          sy = sin(a + halfAngle) * s.h/4;
          pg.vertex(sx, sy);
        }
        pg.endShape(CLOSE);
      }
      pg.pop();
    }
  }
  
  // 網点（ハーフトーン）効果やノイズを加えることも可能だが、
  // ここではシンプルに描画
}

function draw() {
  // 紙の色でクリア
  blendMode(BLEND);
  rectMode(CORNER);
  noStroke();
  fill(params.paperColor);
  rect(0, 0, width, height);

  // スクロール処理とシェイプ管理
  for (let i = shapes.length - 1; i >= 0; i--) {
    let s = shapes[i];
    s.y -= params.scrollSpeed * s.speedFactor;
    if (s.y < -params.maxSize) {
      shapes.splice(i, 1);
    }
  }
  
  while (shapes.length < params.shapeCount) {
    shapes.push(new RisoShape(height + random(params.maxSize)));
  }

  // レイヤー再描画
  drawLayer(layer1, 0);
  drawLayer(layer2, 1);
  drawLayer(layer3, 2);

  blendMode(ADD); // インクの重なりを表現

  time += params.animSpeed * 0.1;
  
  // 版ズレの計算（アニメーションまたは固定）
  let off1x = noise(time) * params.misregistration;
  let off1y = noise(time + 10) * params.misregistration;
  
  let off2x = noise(time + 20) * params.misregistration;
  let off2y = noise(time + 30) * params.misregistration;
  
  let off3x = noise(time + 40) * params.misregistration;
  let off3y = noise(time + 50) * params.misregistration;

  // レイヤー1描画
  tint(color(params.layer1Color + hex(params.inkOpacity, 2)));
  image(layer1, off1x, off1y);
  
  // レイヤー2描画
  tint(color(params.layer2Color + hex(params.inkOpacity, 2)));
  image(layer2, off2x, off2y);
  
  // レイヤー3描画
  tint(color(params.layer3Color + hex(params.inkOpacity, 2)));
  image(layer3, off3x, off3y);
  
  noTint();
  blendMode(BLEND);

  // 自動更新
  if (params.autoUpdate && frameCount % 120 === 0) {
    params.seed = floor(random(10000));
    generate();
  }
}

class RisoShape {
  constructor(y) {
    this.x = random(width);
    this.y = (y !== undefined) ? y : random(height);
    this.w = random(params.minSize, params.maxSize);
    this.h = random(params.minSize, params.maxSize);
    this.rotation = random(TWO_PI);
    
    // パララックス効果：サイズに基づいて速度を変える
    let avgSize = (this.w + this.h) / 2;
    this.speedFactor = map(avgSize, params.minSize, params.maxSize, 0.5, 2.0);

    this.type = random(['Circle', 'Rect', 'Triangle', 'Stripe', 'Noise', 'Ring', 'Cross', 'Grid', 'Arc', 'Star']);
    
    // 3色すべてを使用
    this.layers = [0, 1, 2];
    
    // レイヤーごとの個別オフセット（ランダムなズレ）
    this.offsets = [];
    for(let i=0; i<3; i++) {
        this.offsets.push({
            x: random(-15, 15),
            y: random(-15, 15)
        });
    }
  }
}

window.guiConfig = [
  { folder: 'Generator', contents: [
    { object: params, variable: 'seed', min: 0, max: 10000, step: 1, name: 'Seed', onChange: generate },
    { object: params, variable: 'shapeCount', min: 1, max: 50, step: 1, name: 'Count', onChange: generate },
    { object: params, variable: 'minSize', min: 10, max: 200, name: 'Min Size', onChange: generate },
    { object: params, variable: 'maxSize', min: 50, max: 800, name: 'Max Size', onChange: generate },
    { object: params, variable: 'autoUpdate', name: 'Auto Update' },
    { object: params, variable: 'regenerate', name: 'Regenerate', type: 'function' }
  ]},
  { folder: 'Ink & Paper', contents: [
    { object: params, variable: 'layer1Color', type: 'color', name: 'Layer 1 (Pink)' },
    { object: params, variable: 'layer2Color', type: 'color', name: 'Layer 2 (Blue)' },
    { object: params, variable: 'layer3Color', type: 'color', name: 'Layer 3 (Yellow)' },
    { object: params, variable: 'paperColor', type: 'color', name: 'Paper' },
    { object: params, variable: 'inkOpacity', min: 0, max: 255, step: 1, name: 'Opacity' },
    { object: params, variable: 'misregistration', min: 0, max: 50, name: 'Misregistration' },
    { object: params, variable: 'animSpeed', min: 0, max: 5.0, name: 'Vibration' },
    { object: params, variable: 'scrollSpeed', min: 0, max: 100.0, name: 'Scroll Speed' }
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
  
  // 自動ループを停止して手動制御に切り替え
  noLoop();
  processExport();
}

function processExport() {
  redraw(); // 1フレーム描画
  saveCanvas('riso_print_' + exportSessionID + '_' + nf(exportCount + 1, 3), 'png');
  
  exportCount++;
  if (exportCount >= exportMax) {
    isExporting = false;
    console.log("Export finished");
    loop(); // ループ再開
  } else {
    // ブラウザのダウンロード負荷を軽減するために少し待機
    setTimeout(processExport, 150);
  }
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