// --- 設定とグローバル変数 ---
const params = {
  feed: 0.055,
  kill: 0.062,
  dA: 1.0,
  dB: 0.5,
  dt: 1.0,
  iterations: 10, // 1フレームあたりの計算回数
  simScale: 4,    // シミュレーション解像度の縮小率 (2560/4 = 480)
  colorMode: 'Zebra',
  seedType: 'Circle', // Circle, Random, Rect
  seedText: 'HELLO',
  textSize: 100,
  contrast: 5.0,
  useFeedMap: false,
  feedMapStrength: 0.03,
  threshold: 0.12,
  colorCycle: false,
  cycleSpeed: 1.0,
  zoom: 1.0,
  moveX: 0,
  moveY: 0,
  breathing: false,
  breathSpeed: 0.05,
  breathAmp: 0.1,
  autoDrop: false,
  dropInterval: 60,
  dropSize: 15,
  exportFrames: 600,
  exportMP4: function() { startExportMP4(); },
  exportPNG: function() { startExportPNG(); },
  reset: function() { initSimulation(); },
  presetCells: function() { params.feed = 0.035; params.kill = 0.06; },
  presetCoral: function() { params.feed = 0.0545; params.kill = 0.062; },
  presetMaze: function() { params.feed = 0.029; params.kill = 0.057; },
  presetSpirals: function() { params.feed = 0.018; params.kill = 0.051; },
  presetSpots: function() { params.feed = 0.025; params.kill = 0.060; },
  addRandom: function() { addRandomSeed(); },
  uploadImage: function() { document.getElementById('file-input').click(); }
};

let gui;
let grid = [];
let next = [];
let simWidth, simHeight;
let feedMap; // Feed値のマップ
let buffer; // 描画用バッファ
let accMoveX = 0;
let loadedImage = null;
let accMoveY = 0;

// カラーパレット
const PALETTES = {
  Zebra: { c1: '#000000', c2: '#FFFFFF' },
  Coral: { c1: '#003366', c2: '#FFCC00' },
  Toxic: { c1: '#220033', c2: '#00FF00' },
  Blood: { c1: '#330000', c2: '#FF0000' },
  Heat:  { c1: '#000000', c2: '#FF5500' }
};

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

  // シミュレーション解像度の設定
  simWidth = floor(width / params.simScale);
  simHeight = floor(height / params.simScale);
  
  // バッファの作成
  buffer = createImage(simWidth, simHeight);
  feedMap = new Float32Array(simWidth * simHeight);

  // 画像アップロード用の隠しinput要素を作成
  let fileInput = createFileInput(handleFile);
  fileInput.id('file-input');
  fileInput.style('display', 'none');

  initSimulation();
}

function handleFile(file) {
  if (file.type === 'image') {
    loadImage(file.data, img => {
      loadedImage = img;
      params.seedType = 'Image';
      initSimulation();
    });
  }
}

function initSimulation() {
  grid = [];
  next = [];
  
  // FeedMapの初期化（サイズが変わっている可能性があるため再確保はupdateResolutionで行うが、ここではリセット）
  if (feedMap.length !== simWidth * simHeight) {
    feedMap = new Float32Array(simWidth * simHeight);
  }
  feedMap.fill(0);

  // グリッドの初期化 (A=1, B=0)
  for (let x = 0; x < simWidth; x++) {
    grid[x] = [];
    next[x] = [];
    for (let y = 0; y < simHeight; y++) {
      grid[x][y] = { a: 1, b: 0 };
      next[x][y] = { a: 1, b: 0 };
    }
  }

  // シード（種）を撒く
  if (params.seedType === 'Circle') {
    let r = 20;
    for (let i = 0; i < simWidth; i++) {
      for (let j = 0; j < simHeight; j++) {
        if (dist(i, j, simWidth/2, simHeight/2) < r) {
          grid[i][j].b = 1;
        }
      }
    }
  } else if (params.seedType === 'Random') {
    for (let i = 0; i < simWidth; i++) {
      for (let j = 0; j < simHeight; j++) {
        if (random() < 0.1) {
          grid[i][j].b = 1;
        }
      }
    }
  } else if (params.seedType === 'Rect') {
    for (let i = simWidth/2 - 20; i < simWidth/2 + 20; i++) {
      for (let j = simHeight/2 - 20; j < simHeight/2 + 20; j++) {
        grid[i][j].b = 1;
      }
    }
  } else if (params.seedType === 'Text') {
    let gr = createGraphics(simWidth, simHeight);
    gr.background(0);
    gr.fill(255);
    gr.textAlign(CENTER, CENTER);
    gr.textSize(params.textSize);
    gr.text(params.seedText, simWidth/2, simHeight/2);
    gr.loadPixels();
    for (let x = 0; x < simWidth; x++) {
      for (let y = 0; y < simHeight; y++) {
        let index = (x + y * simWidth) * 4;
        let bright = gr.pixels[index] / 255.0;
        if (bright > 0.5) {
          grid[x][y].b = 1;
        }
        feedMap[x + y * simWidth] = bright;
      }
    }
    gr.remove();
  } else if (params.seedType === 'Image' && loadedImage) {
    let gr = createGraphics(simWidth, simHeight);
    gr.background(0);
    gr.image(loadedImage, 0, 0, simWidth, simHeight);
    gr.loadPixels();
    for (let x = 0; x < simWidth; x++) {
      for (let y = 0; y < simHeight; y++) {
        let index = (x + y * simWidth) * 4;
        let bright = gr.pixels[index] / 255.0;
        if (bright > 0.5) {
          grid[x][y].b = 1;
        }
        feedMap[x + y * simWidth] = bright;
      }
    }
    gr.remove();
  }
}

function addRandomSeed() {
  let cx = floor(random(simWidth));
  let cy = floor(random(simHeight));
  let r = params.dropSize; // 追加するドロップの半径
  
  // 端をまたいで配置できるように修正
  for (let i = -r; i < r; i++) {
    for (let j = -r; j < r; j++) {
      if (i*i + j*j < r*r) {
        let x = (cx + i + simWidth) % simWidth;
        let y = (cy + j + simHeight) % simHeight;
        grid[x][y].b = 1;
      }
    }
  }
}

function draw() {
  let currentDB = params.dB;
  if (params.breathing) {
    // 時間経過でdBを変化させる
    currentDB = params.dB + sin(frameCount * params.breathSpeed) * params.breathAmp;
  }

  // 自動ドロップ
  if (params.autoDrop && frameCount % params.dropInterval === 0) {
    addRandomSeed();
  }

  // パターンの移動（シミュレーションのシフト）
  accMoveX += params.moveX;
  accMoveY += params.moveY;
  let shiftX = floor(accMoveX);
  let shiftY = floor(accMoveY);
  
  if (shiftX !== 0 || shiftY !== 0) {
    shiftSimulation(shiftX, shiftY);
    accMoveX -= shiftX;
    accMoveY -= shiftY;
  }

  // シミュレーション更新
  for (let i = 0; i < params.iterations; i++) {
    updateSimulation(currentDB);
  }

  // 描画
  renderBuffer();
  
  // 画面いっぱいに拡大して描画
  background(0); // ズームアウト時に背景が見えるようにクリア
  push();
  translate(width / 2, height / 2);
  scale(params.zoom);
  translate(-width / 2, -height / 2);
  
  noSmooth(); // ドット感を残す（または smooth() でぼかす）
  image(buffer, 0, 0, width, height);
  pop();

  // 書き出し処理
  if (isExporting || (window.exporter && window.exporter.isExporting)) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
      isExporting = false;
      console.log("Export finished");
    }
  }
}

function updateSimulation(currentDB) {
  for (let x = 0; x < simWidth; x++) {
    for (let y = 0; y < simHeight; y++) {
      let a = grid[x][y].a;
      let b = grid[x][y].b;
      
      // Feed Mapの適用
      let localFeed = params.feed;
      if (params.useFeedMap) {
        localFeed += feedMap[x + y * simWidth] * params.feedMapStrength;
      }

      // ラプラシアン（拡散）の計算
      // 畳み込みカーネル:
      // 0.05  0.2  0.05
      // 0.2  -1.0  0.2
      // 0.05  0.2  0.05
      
      // 端同士を繋げる（ラップアラウンド）ためのインデックス計算
      let xm1 = (x - 1 + simWidth) % simWidth;
      let xp1 = (x + 1) % simWidth;
      let ym1 = (y - 1 + simHeight) % simHeight;
      let yp1 = (y + 1) % simHeight;

      let lapA = 0;
      let lapB = 0;

      lapA += grid[x][y].a * -1;
      lapA += grid[xm1][y].a * 0.2;
      lapA += grid[xp1][y].a * 0.2;
      lapA += grid[x][ym1].a * 0.2;
      lapA += grid[x][yp1].a * 0.2;
      lapA += grid[xm1][ym1].a * 0.05;
      lapA += grid[xp1][ym1].a * 0.05;
      lapA += grid[xm1][yp1].a * 0.05;
      lapA += grid[xp1][yp1].a * 0.05;

      lapB += grid[x][y].b * -1;
      lapB += grid[xm1][y].b * 0.2;
      lapB += grid[xp1][y].b * 0.2;
      lapB += grid[x][ym1].b * 0.2;
      lapB += grid[x][yp1].b * 0.2;
      lapB += grid[xm1][ym1].b * 0.05;
      lapB += grid[xp1][ym1].b * 0.05;
      lapB += grid[xm1][yp1].b * 0.05;
      lapB += grid[xp1][yp1].b * 0.05;

      // Gray-Scott モデルの方程式
      // dA/dt = dA * lapA - A*B^2 + f*(1-A)
      // dB/dt = dB * lapB + A*B^2 - (k+f)*B
      
      let nextA = a + (params.dA * lapA - a * b * b + localFeed * (1 - a)) * params.dt;
      let nextB = b + (currentDB * lapB + a * b * b - (params.kill + localFeed) * b) * params.dt;

      // 値を 0-1 に制限
      next[x][y].a = constrain(nextA, 0, 1);
      next[x][y].b = constrain(nextB, 0, 1);
    }
  }

  // バッファをスワップ
  let temp = grid;
  grid = next;
  next = temp;
}

function shiftSimulation(dx, dy) {
  for (let x = 0; x < simWidth; x++) {
    for (let y = 0; y < simHeight; y++) {
      let srcX = (x - dx) % simWidth;
      if (srcX < 0) srcX += simWidth;
      let srcY = (y - dy) % simHeight;
      if (srcY < 0) srcY += simHeight;
      
      next[x][y].a = grid[srcX][srcY].a;
      next[x][y].b = grid[srcX][srcY].b;
    }
  }
  let temp = grid;
  grid = next;
  next = temp;
}

function renderBuffer() {
  buffer.loadPixels();
  let palette = PALETTES[params.colorMode];
  let c1, c2;

  if (params.colorCycle) {
    push();
    colorMode(HSB, 360, 100, 100);
    let baseC1 = color(palette.c1);
    let baseC2 = color(palette.c2);
    let shift = (frameCount * params.cycleSpeed) % 360;
    c1 = color((hue(baseC1) + shift) % 360, saturation(baseC1), brightness(baseC1));
    c2 = color((hue(baseC2) + shift) % 360, saturation(baseC2), brightness(baseC2));
    pop();
  } else {
    c1 = color(palette.c1);
    c2 = color(palette.c2);
  }

  for (let x = 0; x < simWidth; x++) {
    for (let y = 0; y < simHeight; y++) {
      let index = (x + y * simWidth) * 4;
      let a = grid[x][y].a;
      let b = grid[x][y].b;
      
      // 可視化: A-B の値を色にマッピング
      let val = (a - b - params.threshold) * params.contrast + 0.5;
      val = constrain(val, 0, 1);
      
      // lerpColorで2色間を補間
      let col = lerpColor(c2, c1, val); // c2(背景) -> c1(模様)

      buffer.pixels[index + 0] = red(col);
      buffer.pixels[index + 1] = green(col);
      buffer.pixels[index + 2] = blue(col);
      buffer.pixels[index + 3] = 255;
    }
  }
  buffer.updatePixels();
}

// --- UI & Export Logic ---

function updateResolution() {
  simWidth = floor(width / params.simScale);
  simHeight = floor(height / params.simScale);
  buffer = createImage(simWidth, simHeight);
  feedMap = new Float32Array(simWidth * simHeight);
  initSimulation();
}

async function startExportMP4() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  exportMax = params.exportFrames;
  let suggestedName = `sketch036_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}.mp4`;
  await window.exporter.startMP4(width, height, 24, exportMax, suggestedName);
  
  isExporting = true;
}

async function startExportPNG() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  exportMax = params.exportFrames;
  let prefix = `sketch036_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}`;
  await window.exporter.startPNG(24, exportMax, prefix);
  
  isExporting = true;
}

function keyPressed() {
  if (key === 'm' || key === 'M') startExportMP4();
  if (key === 'p' || key === 'P') startExportPNG();
  if (key === 'r' || key === 'R') initSimulation();
  if (key === ' ') addRandomSeed();
}

function windowResized() {
  // 固定サイズのためリサイズ処理は行わない
}

window.guiConfig = [
  { folder: 'Simulation', contents: [
    { object: params, variable: 'feed', min: 0.01, max: 0.1, name: 'Feed (f)', listen: true },
    { object: params, variable: 'kill', min: 0.01, max: 0.1, name: 'Kill (k)', listen: true },
    { object: params, variable: 'dA', min: 0.1, max: 1.2, name: 'Diff A' },
    { object: params, variable: 'dB', min: 0.1, max: 1.2, name: 'Diff B' },
    { object: params, variable: 'dt', min: 0.1, max: 2.0, name: 'Time Step' },
    { object: params, variable: 'iterations', min: 1, max: 200, step: 1, name: 'Speed' },
    { object: params, variable: 'simScale', min: 1, max: 20, step: 1, name: 'Pixel Scale', onChange: updateResolution },
    { object: params, variable: 'breathing', name: 'Breathing' },
    { object: params, variable: 'breathSpeed', min: 0.01, max: 0.2, name: 'Breath Speed' },
    { object: params, variable: 'breathAmp', min: 0.0, max: 0.3, name: 'Breath Amp' }
  ]},
  { folder: 'Presets', contents: [
    { object: params, variable: 'presetCells', name: 'Cells', type: 'function' },
    { object: params, variable: 'presetCoral', name: 'Coral', type: 'function' },
    { object: params, variable: 'presetMaze', name: 'Maze', type: 'function' },
    { object: params, variable: 'presetSpirals', name: 'Spirals', type: 'function' },
    { object: params, variable: 'presetSpots', name: 'Spots', type: 'function' }
  ]},
  { folder: 'Style', contents: [
    { object: params, variable: 'colorMode', options: Object.keys(PALETTES), name: 'Color Palette' },
    { object: params, variable: 'colorCycle', name: 'Color Cycle' },
    { object: params, variable: 'cycleSpeed', min: 0.1, max: 5.0, name: 'Cycle Speed' },
    { object: params, variable: 'contrast', min: 0.1, max: 5.0, name: 'Contrast' },
    { object: params, variable: 'threshold', min: 0.0, max: 2.0, name: 'Threshold' },
    { object: params, variable: 'zoom', min: 0.1, max: 5.0, name: 'Zoom' },
    { object: params, variable: 'moveX', min: -5.0, max: 5.0, name: 'Move X' },
    { object: params, variable: 'moveY', min: -5.0, max: 5.0, name: 'Move Y' },
    { object: params, variable: 'seedType', options: ['Circle', 'Random', 'Rect', 'Text', 'Image'], name: 'Seed Type', listen: true },
    { object: params, variable: 'seedText', name: 'Seed Text' },
    { object: params, variable: 'textSize', min: 10, max: 500, name: 'Text Size' },
    { object: params, variable: 'uploadImage', name: 'Upload Image', type: 'function' },
    { object: params, variable: 'useFeedMap', name: 'Use Feed Map' },
    { object: params, variable: 'feedMapStrength', min: -0.05, max: 0.05, name: 'Feed Strength' },
    { object: params, variable: 'reset', name: 'Reset / Reseed', type: 'function' }
  ]},
  { folder: 'Auto Drop', contents: [
    { object: params, variable: 'autoDrop', name: 'Enable' },
    { object: params, variable: 'dropInterval', min: 10, max: 600, step: 10, name: 'Interval' },
    { object: params, variable: 'dropSize', min: 1, max: 300, step: 1, name: 'Size' },
    { object: params, variable: 'addRandom', name: 'Add Now', type: 'function' }
  ]},
  { folder: 'Export', contents: [
    { object: params, variable: 'exportFrames', min: 60, max: 1200, step: 1, name: 'Frames' },
    { object: params, variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },
    { object: params, variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }
  ]}
];


