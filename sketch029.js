var isExporting = false;
var exportMax = 600;
var exportCurrent = 0;
var saveCount = 1;
var exportSessionID = "";
var exportInput;

// アニメーション用変数
let time = 0;
let patternType = 0; // 0: Spiral, 1: Concentric, 2: Waves, 3: Rays

// UI Sliders
var speed = 0.05;
var density = 0.5;
var colorSpeed = 1;
var distortion = 0.5;
var isColor = true;
var autoMode = false;
var changePattern = function() { patternType = (patternType + 1) % 4; };

function setup() {
  let c = createCanvas(1980, 1080);
  pixelDensity(1);

  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '80vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');
  c.style('box-shadow', '0 0 20px rgba(255,255,255,0.2)');

  colorMode(HSB, 360, 100, 100, 100);
  noStroke();
}

function draw() {
  noStroke();
  fill(0);
  rect(0, 0, width, height);

  // オートモード: 一定間隔（120フレーム＝約2秒）でパターンをランダム変更
  if (autoMode && frameCount % 120 === 0) {
    patternType = int(random(4));
  }

  time += speed;

  translate(width / 2, height / 2);

  // パターン描画
  if (patternType === 0) {
    drawSpiral(density, colorSpeed, distortion, isColor);
  } else if (patternType === 1) {
    drawConcentric(density, colorSpeed, distortion, isColor);
  } else if (patternType === 2) {
    drawWaves(density, colorSpeed, distortion, isColor);
  } else if (patternType === 3) {
    drawRays(density, colorSpeed, distortion, isColor);
  }

  // --- 書き出し処理 ---
  if (isExporting) {
    saveCanvas('psychedelic_op_' + exportSessionID + '_' + nf(saveCount, 3), 'png');
    saveCount++;
    exportCurrent++;
    if (exportCurrent >= exportMax) {
      isExporting = false;
      noLoop();
      console.log("Export Complete");
    }
  }
}

// --- パターン描画関数 ---

function drawSpiral(density, colSpeed, distortion, isColor) {
  let count = int(map(density, 0, 1, 20, 100));
  let maxR = width * 1.2;
  let step = maxR / count;

  noFill();
  strokeWeight(step * 0.8); // 太めの線で隙間を埋める

  for (let i = 0; i < count; i++) {
    let r = i * step;
    let angleOffset = time * 0.1 + i * distortion * 0.1;
    
    if (isColor) {
      let hueVal = (time * colSpeed * 50 + i * 10) % 360;
      stroke(hueVal, 80, 100);
    } else {
      let b = (sin(i * 0.5 + time * 0.2) > 0) ? 100 : 0;
      stroke(0, 0, b);
    }

    beginShape();
    for (let a = 0; a < TWO_PI * 2; a += 0.1) {
      // 渦巻き状の座標計算
      let rad = r + a * (step / TWO_PI) * 5; 
      let x = cos(a + angleOffset) * rad;
      let y = sin(a + angleOffset) * rad;
      vertex(x, y);
    }
    endShape();
  }
}

function drawConcentric(density, colSpeed, distortion, isColor) {
  let count = int(map(density, 0, 1, 10, 50));
  let maxDist = width * 0.8;
  
  noStroke();

  for (let i = count; i > 0; i--) {
    let size = map(i, 0, count, 0, maxDist * 2);
    
    // 歪み（円を少し変形させる）
    let deform = sin(time * 0.1 + i * 0.2) * distortion * 100;
    
    if (isColor) {
      let hueVal = (time * colSpeed * 50 + i * 15) % 360;
      fill(hueVal, 80, 100);
    } else {
      let b = (i % 2 === 0) ? 0 : 100;
      // 白黒反転アニメーション
      if (sin(time * 0.2) > 0) b = 100 - b;
      fill(0, 0, b);
    }

    ellipse(0, 0, size + deform, size - deform);
  }
}

function drawWaves(density, colSpeed, distortion, isColor) {
  let count = int(map(density, 0, 1, 20, 60));
  let step = height / count;

  noFill();
  strokeWeight(step / 2);

  for (let i = -count; i < count; i++) {
    let yBase = i * step;
    
    if (isColor) {
      let hueVal = (time * colSpeed * 50 + i * 5 + frameCount) % 360;
      stroke(hueVal, 80, 100);
    } else {
      let b = (i % 2 === 0) ? 100 : 0;
      // 波の動きに合わせて明滅
      stroke(0, 0, b);
    }

    beginShape();
    for (let x = -width/2; x < width/2; x += 20) {
      // サイン波によるうねり
      let y = yBase + sin(x * 0.01 + time * 0.1 + i * distortion * 0.1) * 100;
      vertex(x, y);
    }
    endShape();
  }
}

function drawRays(density, colSpeed, distortion, isColor) {
  let rays = int(map(density, 0, 1, 12, 48));
  let angleStep = TWO_PI / rays;

  noStroke();
  
  // 回転アニメーション
  rotate(time * 0.05);

  for (let i = 0; i < rays; i++) {
    if (isColor) {
      let hueVal = (time * colSpeed * 50 + i * (360/rays)) % 360;
      fill(hueVal, 80, 100);
    } else {
      fill(0, 0, (i % 2 === 0) ? 100 : 0);
    }

    // 放射状の三角形（歪みパラメータで先端を曲げる）
    beginShape();
    vertex(0, 0);
    let a1 = i * angleStep;
    let a2 = (i + 1) * angleStep;
    
    // 線の長さにバラツキを持たせる（ノイズで滑らかに変化）
    let r = 0.01;
    
    // 歪み（ツイスト効果）
    let twist = sin(time * 0.1) * distortion;
    
    vertex(cos(a1 + twist) * r, sin(a1 + twist) * r);
    vertex(cos(a2 + twist) * r, sin(a2 + twist) * r);
    endShape(CLOSE);
  }
}

// --- UI & Export Logic ---

var guiConfig = [
  { variable: 'exportMax', min: 10, max: 1000, step: 10, name: '書き出し枚数' },
  { variable: 'changePattern', name: 'パターン切替', type: 'function' },
  { variable: 'speed', min: 0, max: 0.5, step: 0.01, name: '速度' },
  { variable: 'density', min: 0, max: 1, step: 0.01, name: '密度' },
  { variable: 'distortion', min: 0, max: 2, step: 0.01, name: '歪み' },
  { variable: 'colorSpeed', min: 0, max: 5, step: 0.1, name: '色変化' },
  { variable: 'isColor', name: 'カラー' },
  { variable: 'autoMode', name: 'オートモード' },
  { variable: 'startExportSequence', name: '書き出し開始', type: 'function' }
];

function startExportSequence() {
    if (!isExporting) {
      isExporting = true;
      exportCurrent = 0;
      saveCount = 1;
      exportSessionID = "";
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      for (let i = 0; i < 4; i++) exportSessionID += chars.charAt(floor(random(chars.length)));
      loop();
    }
}