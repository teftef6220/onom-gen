var cols, rows;
var sclX = 20;
var sclY = 20;
var w, h;
var terrain = [];
var isExporting = false;
var exportMax = 600;
var meshSizeX = 1000;
var meshSizeY = 800;
var densityX = 20;
var densityY = 20;
var noiseScale = 0.2;
var speed = 0.01;
var angleX = Math.PI / 3;
var angleY = 0;
var angleZ = 0;
var posY = 0;
var terrainHeight = 100;
var cameraNear = 300;
var cameraFar = 10000;
var useIsometric = false;
var fillMesh = false;
var colorScheme = 'Rainbow';
var strokeColor = '#00ffc8';
var strokeWeightVal = 1;
var offsetA = {x: 0, y: 0};
var offsetB = {x: 1000, y: 1000};
var lerpAmt = 0;
var noiseMode = 'Morphing';
var flowOffsetX = 0;
var flowOffsetY = 0;
var flowSpeedX = 0;
var flowSpeedY = 0.02;

var guiConfig = [
  { variable: 'meshSizeX', min: 500, max: 3000, step: 100, name: 'Size X', onFinishChange: function(){ setup(); } },
  { variable: 'meshSizeY', min: 500, max: 3000, step: 100, name: 'Size Y', onFinishChange: function(){ setup(); } },
  { variable: 'densityX', min: 10, max: 100, step: 5, name: 'Density X', onFinishChange: function(){ setup(); } },
  { variable: 'densityY', min: 10, max: 100, step: 5, name: 'Density Y', onFinishChange: function(){ setup(); } },
  { variable: 'noiseScale', min: 0.01, max: 0.5, step: 0.01, name: 'Noise Scale' },
  { variable: 'noiseMode', options: ['Morphing', 'Flowing'], name: 'Noise Mode' },
  { variable: 'speed', min: 0.001, max: 0.1, step: 0.001, name: 'Transition Speed' },
  { variable: 'flowSpeedX', min: -0.2, max: 0.2, step: 0.001, name: 'Flow Speed X' },
  { variable: 'flowSpeedY', min: -0.2, max: 0.2, step: 0.001, name: 'Flow Speed Y' },
  { variable: 'terrainHeight', min: 0, max: 500, step: 10, name: 'Height' },
  { variable: 'angleX', min: 0, max: 1.5, step: 0.01, name: 'Angle X' },
  { variable: 'angleY', min: -3.14, max: 3.14, step: 0.01, name: 'Angle Y' },
  { variable: 'angleZ', min: -3.14, max: 3.14, step: 0.01, name: 'Angle Z' },
  { variable: 'posY', min: -500, max: 500, step: 10, name: 'Camera Y' },
  { variable: 'cameraNear', min: 0.1, max: 2000, step: 10, name: 'Cam Near' },
  { variable: 'cameraFar', min: 100, max: 10000, step: 100, name: 'Cam Far' },
  { variable: 'useIsometric', name: 'Isometric' },
  { variable: 'fillMesh', name: 'Fill Mesh' },
  { variable: 'colorScheme', options: ['Rainbow', 'Grayscale', 'Single', 'Ocean', 'Fire', 'Forest'], name: 'Color Scheme' },
  { variable: 'strokeColor', type: 'color', name: 'Color' },
  { variable: 'strokeWeightVal', min: 0.1, max: 10, step: 0.1, name: 'Stroke Weight' },
  { variable: 'exportMax', min: 60, max: 1200, step: 1, name: 'Export Frames' },
  { variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },
  { variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }
];

function setup() {
  let c = createCanvas(1920, 1080, WEBGL);
  
  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '100vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');

  colorMode(HSB);
  w = meshSizeX;
  h = meshSizeY;
  sclX = densityX;
  sclY = densityY;
  cols = w / sclX;
  rows = h / sclY;
  
  offsetA = {x: random(10000), y: random(10000)};
  offsetB = {x: random(10000), y: random(10000)};
  
  for (var x = 0; x < cols; x++) {
    terrain[x] = [];
    for (var y = 0; y < rows; y++) {
      terrain[x][y] = 0;
    }
  }
}

function draw() {
  if (noiseMode === 'Morphing') {
    lerpAmt += speed;
    if (lerpAmt >= 1.0) {
      lerpAmt = 0;
      offsetA = offsetB;
      offsetB = {x: random(10000), y: random(10000)};
    }
  } else {
    flowOffsetX += flowSpeedX;
    flowOffsetY += flowSpeedY;
  }
  
  // イージング (EaseInOutCubic)
  let t = lerpAmt < 0.5 ? 4 * lerpAmt * lerpAmt * lerpAmt : 1 - Math.pow(-2 * lerpAmt + 2, 3) / 2;

  for (var y = 0; y < rows; y++) {
    for (var x = 0; x < cols; x++) {
      let n;
      if (noiseMode === 'Morphing') {
        let n1 = noise(x * noiseScale + offsetA.x, y * noiseScale + offsetA.y);
        let n2 = noise(x * noiseScale + offsetB.x, y * noiseScale + offsetB.y);
        n = lerp(n1, n2, t);
      } else {
        n = noise(x * noiseScale + flowOffsetX, y * noiseScale + flowOffsetY);
      }
      terrain[x][y] = map(n, 0, 1, -terrainHeight, terrainHeight);
    }
  }

  // 背景描画用にカメラ設定をリセット（クリッピングを防ぐため）
  perspective();
  camera();

  fill(0);
  noStroke();
  rect(-width/2, -height/2, width, height); // WEBGLモードなので座標に注意

  // ユーザー設定のカメラ範囲を適用
  if (useIsometric) {
    ortho(-width / 2, width / 2, height / 2, -height / 2, -5000, 5000);
  } else {
    perspective(PI / 3.0, width / height, cameraNear, cameraFar);
  }

  if (fillMesh) {
    fill(0);
  } else {
    noFill();
  }

  translate(0, posY);
  rotateX(angleX);
  rotateY(angleY);
  rotateZ(angleZ);
  translate(-w / 2, -h / 2);
  
  let hRange = terrainHeight > 0 ? terrainHeight : 1;
  strokeWeight(strokeWeightVal);
  
  // Single Color用の色成分を事前に取得
  let sc = color(strokeColor);
  let sh = hue(sc);
  let ss = saturation(sc);
  let sb = brightness(sc);

  for (var y = 0; y < rows - 1; y++) {
    beginShape(TRIANGLE_STRIP);
    for (var x = 0; x < cols; x++) {
      if (colorScheme === 'Rainbow') {
        let hu = map(terrain[x][y], -hRange, hRange, 0, 360);
        stroke(hu, 80, 100);
      } else if (colorScheme === 'Grayscale') {
        let br = map(terrain[x][y], -hRange * 0.5, hRange * 0.5, 0, 100);
        stroke(0, 0, constrain(br, 0, 100));
      } else if (colorScheme === 'Single') {
        stroke(sh, ss, sb);
      } else if (colorScheme === 'Ocean') {
        let hu = map(terrain[x][y], -hRange, hRange, 160, 240);
        let br = map(terrain[x][y], -hRange, hRange, 50, 100);
        stroke(hu, 80, br);
      } else if (colorScheme === 'Fire') {
        let hu = map(terrain[x][y], -hRange, hRange, 0, 60);
        let br = map(terrain[x][y], -hRange, hRange, 40, 100);
        stroke(hu, 100, br);
      } else if (colorScheme === 'Forest') {
        let hu = map(terrain[x][y], -hRange, hRange, 90, 150);
        let br = map(terrain[x][y], -hRange, hRange, 30, 90);
        stroke(hu, 60, br);
      }
      vertex(x * sclX, y * sclY, terrain[x][y]);
      if (colorScheme === 'Rainbow') {
        let hu2 = map(terrain[x][y+1], -hRange, hRange, 0, 360);
        stroke(hu2, 80, 100);
      } else if (colorScheme === 'Grayscale') {
        let br2 = map(terrain[x][y+1], -hRange * 0.5, hRange * 0.5, 0, 100);
        stroke(0, 0, constrain(br2, 0, 100));
      } else if (colorScheme === 'Single') {
        stroke(sh, ss, sb);
      } else if (colorScheme === 'Ocean') {
        let hu2 = map(terrain[x][y+1], -hRange, hRange, 160, 240);
        let br2 = map(terrain[x][y+1], -hRange, hRange, 50, 100);
        stroke(hu2, 80, br2);
      } else if (colorScheme === 'Fire') {
        let hu2 = map(terrain[x][y+1], -hRange, hRange, 0, 60);
        let br2 = map(terrain[x][y+1], -hRange, hRange, 40, 200);
        stroke(hu2, 100, br2);
      } else if (colorScheme === 'Forest') {
        let hu2 = map(terrain[x][y+1], -hRange, hRange, 90, 150);
        let br2 = map(terrain[x][y+1], -hRange, hRange, 30, 90);
        stroke(hu2, 60, br2);
      }
      vertex(x * sclX, (y + 1) * sclY, terrain[x][y + 1]);
    }
    endShape();
  }

  // 書き出し処理
  if (isExporting) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
       isExporting = false;
    }
  }
}

async function startExportMP4() {
  if (isExporting || window.exporter.isExporting) return;
  
  let suggestedName = `sketch012_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}.mp4`;
  await window.exporter.startMP4(width, height, 30, exportMax, suggestedName);
  
  isExporting = true;
}

async function startExportPNG() {
  if (isExporting || window.exporter.isExporting) return;
  
  let prefix = `sketch012_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}`;
  await window.exporter.startPNG(30, exportMax, prefix);
  
  isExporting = true;
}

function keyPressed() {
  if (key === 'm' || key === 'M') startExportMP4();
  if (key === 'p' || key === 'P') startExportPNG();
}

window.exportMP4 = startExportMP4;
window.exportPNG = startExportPNG;