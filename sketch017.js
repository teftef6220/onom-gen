// Liquid Motion
// Organic morphing shapes with fluid dynamics feel

const params = {
  blobCount: 8,
  detail: 100,
  baseRadius: 200,
  noiseScale: 0.8,
  timeSpeed: 0.5,
  distortion: 150,
  colorMode: 'Neon', // Neon, Ocean, Magma, Mono
  blendMode: 'ADD', // BLEND, ADD, SCREEN, EXCLUSION
  bgColor: '#000000',
  fill: true,
  stroke: false,
  strokeWeight: 2,
  rotationSpeed: 0.1,
  exportFrames: 600,
  exportMP4: () => startExportMP4(),
  exportPNG: () => startExportPNG(),
  regenerate: () => initBlobs()
};

let blobs = [];
let time = 0;

// Palettes
const PALETTES = {
  Neon: ['#FF0055', '#0033FF', '#FFCC00', '#00FF66', '#CC00FF'],
  Ocean: ['#0077B6', '#00B4D8', '#90E0EF', '#CAF0F8', '#03045E'],
  Magma: ['#6A040F', '#9D0208', '#D00000', '#DC2F02', '#E85D04', '#F48C06', '#FAA307', '#FFBA08'],
  Mono: ['#FFFFFF', '#DDDDDD', '#AAAAAA', '#888888']
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

  initBlobs();
}

function initBlobs() {
  blobs = [];
  for (let i = 0; i < params.blobCount; i++) {
    blobs.push(new Blob(i, params.blobCount));
  }
}

function draw() {
  // 背景描画
  blendMode(BLEND);
  rectMode(CORNER);
  noStroke();
  fill(params.bgColor);
  rect(0, 0, width, height);

  // ブレンドモード設定
  if (params.blendMode === 'ADD') blendMode(ADD);
  else if (params.blendMode === 'SCREEN') blendMode(SCREEN);
  else if (params.blendMode === 'EXCLUSION') blendMode(EXCLUSION);
  else blendMode(BLEND);

  time += params.timeSpeed * 0.01;

  translate(width / 2, height / 2);

  for (let b of blobs) {
    b.update();
    b.display();
  }

  // 書き出し処理
  if (isExporting) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
      isExporting = false;
    }
  }
}

class Blob {
  constructor(index, total) {
    this.index = index;
    this.total = total;
    this.offset = random(1000);
    this.rot = random(TWO_PI);
    this.rotSpeed = random(-0.5, 0.5) * params.rotationSpeed;
    
    // 個別の歪み係数
    this.distMult = random(0.5, 1.5);
    
    // 色の決定
    this.updateColor();
  }
  
  updateColor() {
    let colors = PALETTES[params.colorMode];
    this.color = color(colors[this.index % colors.length]);
    // 透明度を少し下げて重なりを綺麗に見せる
    this.color.setAlpha(150);
  }

  update() {
    this.rot += this.rotSpeed * params.rotationSpeed;
    this.updateColor(); // パレット変更に対応
  }

  display() {
    push();
    rotate(this.rot);
    
    if (params.fill) {
      fill(this.color);
    } else {
      noFill();
    }
    
    if (params.stroke) {
      stroke(255, 100);
      strokeWeight(params.strokeWeight);
    } else {
      noStroke();
    }

    beginShape();
    for (let i = 0; i <= params.detail; i++) {
      let angle = map(i, 0, params.detail, 0, TWO_PI);
      
      // ノイズ空間の座標計算
      // 円環状にノイズを取得することで、始点と終点が繋がるようにする
      let xoff = map(cos(angle), -1, 1, 0, params.noiseScale);
      let yoff = map(sin(angle), -1, 1, 0, params.noiseScale);
      let zoff = time + this.offset * 0.1;
      
      let n = noise(xoff, yoff, zoff);
      
      // 半径の計算
      // ベース半径 + ノイズによる変形 + 脈動
      let r = params.baseRadius + map(n, 0, 1, -params.distortion, params.distortion) * this.distMult;
      
      // 中心位置の浮遊
      let floatX = (noise(time * 0.5 + this.offset) - 0.5) * 200;
      let floatY = (noise(time * 0.5 + this.offset + 100) - 0.5) * 200;
      
      let x = floatX + r * cos(angle);
      let y = floatY + r * sin(angle);
      
      // curveVertexを使って滑らかに
      curveVertex(x, y);
    }
    // 閉じた形状にするために始点付近の点を再度追加
    // curveVertexは最初の点と最後の点が制御点として扱われるため、少し重複させる
    endShape(CLOSE);
    
    pop();
  }
}

window.guiConfig = [
  { folder: 'Generator', contents: [
    { object: params, variable: 'blobCount', min: 1, max: 20, step: 1, name: 'Count', onChange: initBlobs },
    { object: params, variable: 'detail', min: 10, max: 300, step: 1, name: 'Detail' },
    { object: params, variable: 'baseRadius', min: 10, max: 500, name: 'Radius' },
    { object: params, variable: 'regenerate', name: 'Regenerate', type: 'function' }
  ]},
  { folder: 'Animation', contents: [
    { object: params, variable: 'noiseScale', min: 0.1, max: 5.0, name: 'Noise Scale' },
    { object: params, variable: 'distortion', min: 0, max: 400, name: 'Distortion' },
    { object: params, variable: 'timeSpeed', min: 0, max: 2.0, name: 'Flow Speed' },
    { object: params, variable: 'rotationSpeed', min: 0, max: 2.0, name: 'Rotation' }
  ]},
  { folder: 'Style', contents: [
    { object: params, variable: 'colorMode', options: Object.keys(PALETTES), name: 'Palette' },
    { object: params, variable: 'blendMode', options: ['BLEND', 'ADD', 'SCREEN', 'EXCLUSION'], name: 'Blend Mode' },
    { object: params, variable: 'bgColor', type: 'color', name: 'Background' },
    { object: params, variable: 'fill', name: 'Fill' },
    { object: params, variable: 'stroke', name: 'Stroke' },
    { object: params, variable: 'strokeWeight', min: 0.1, max: 10, name: 'Stroke Width' }
  ]},
  { folder: 'Export', contents: [
    { object: params, variable: 'exportFrames', min: 60, max: 1200, step: 1, name: 'Frames' },
    { object: params, variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },
    { object: params, variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }
  ]}
];

async function startExportMP4() {
  if (isExporting || window.exporter.isExporting) return;
  
  exportMax = params.exportFrames;
  let suggestedName = `sketch017_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}.mp4`;
  await window.exporter.startMP4(width, height, 24, exportMax, suggestedName);
  
  isExporting = true;
}

async function startExportPNG() {
  if (isExporting || window.exporter.isExporting) return;
  
  exportMax = params.exportFrames;
  let prefix = `sketch017_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}`;
  await window.exporter.startPNG(24, exportMax, prefix);
  
  isExporting = true;
}

function keyPressed() {
  if (key === 'm' || key === 'M') startExportMP4();
  if (key === 'p' || key === 'P') startExportPNG();
  if (key === 'r' || key === 'R') initBlobs();
}


