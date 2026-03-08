// ドロネー三角形分割はp5.jsの標準機能ではないため、
// 簡易的に点同士を結ぶ表現で代用します。
var points = [];
var numPoints = 200;
var speed = 1.0;
var scrollSpeedX = 0.5;
var scrollSpeedY = 0.2;
var noiseScale = 0.002;
var connectionDist = 150;
var lifeSpan = 200;
var strokeWeightVal = 2.0;
var strokeColor = '#ffffff';
var isExporting = false;
var exportMax = 600;

var guiConfig = [
  { variable: 'numPoints', min: 10, max: 500, step: 10, name: 'Point Count', onFinishChange: function(){ initPoints(); } },
  { variable: 'speed', min: 0, max: 10.0, name: 'Point Speed' },
  { variable: 'scrollSpeedX', min: -5.0, max: 5.0, name: 'Scroll X' },
  { variable: 'scrollSpeedY', min: -5.0, max: 5.0, name: 'Scroll Y' },
  { variable: 'noiseScale', min: 0.001, max: 0.05, name: 'Noise Scale' },
  { variable: 'connectionDist', min: 50, max: 300, name: 'Connect Dist' },
  { variable: 'lifeSpan', min: 50, max: 1000, name: 'Life Span' },
  { variable: 'strokeWeightVal', min: 0.1, max: 10.0, name: 'Line Width' },
  { variable: 'strokeColor', type: 'color', name: 'Line Color' },
  { variable: 'exportMax', min: 60, max: 1200, step: 1, name: 'Export Frames' },
  { variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },
  { variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }
];

function setup() {
  let c = createCanvas(1920, 1080);
  
  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '100vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');

  initPoints();
  colorMode(HSB);
}

function initPoints() {
  points = [];
  for (let i = 0; i < numPoints; i++) {
    let p = createVector(random(width), random(height));
    p.maxLife = random(lifeSpan * 0.5, lifeSpan * 1.5);
    p.life = random(p.maxLife);
    points.push(p);
  }
}

function draw() {
  blendMode(BLEND);
  noStroke();
  fill(0);
  rect(0, 0, width, height);
  blendMode(ADD);
  strokeWeight(strokeWeightVal);

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      let d = dist(points[i].x, points[i].y, points[j].x, points[j].y);
      if (d < connectionDist) {
        // 距離に応じて明度(Brightness)と透明度を調整
        let br = map(d, 0, connectionDist, 100, 20);
        let alp = map(d, 0, connectionDist, 1.0, 0.1);

        // 寿命によるフェードイン・アウト
        let p1 = points[i];
        let p2 = points[j];
        let fade1 = 1.0;
        let fade2 = 1.0;
        if (p1.life < 50) fade1 = map(p1.life, 0, 50, 0, 1);
        else if (p1.life > p1.maxLife - 50) fade1 = map(p1.life, p1.maxLife - 50, p1.maxLife, 1, 0);
        if (p2.life < 50) fade2 = map(p2.life, 0, 50, 0, 1);
        else if (p2.life > p2.maxLife - 50) fade2 = map(p2.life, p2.maxLife - 50, p2.maxLife, 1, 0);
        alp *= min(fade1, fade2);
        
        let c = color(strokeColor);
        stroke(hue(c), saturation(c), br, alp);
        line(points[i].x, points[i].y, points[j].x, points[j].y);
      }
    }
  }
  
  // 点を動かす（ノイズ＋スクロール）
  for(let p of points) {
      // 寿命更新
      p.life--;
      if (p.life <= 0) {
        p.set(random(width), random(height));
        p.maxLife = random(lifeSpan * 0.5, lifeSpan * 1.5);
        p.life = p.maxLife;
      }

      // ノイズでゆったりとした動きを作る
      let angle = noise(p.x * noiseScale, p.y * noiseScale, frameCount * 0.005) * TWO_PI * 2;
      p.x += cos(angle) * speed + scrollSpeedX;
      p.y += sin(angle) * speed + scrollSpeedY;

      // 画面端のループ処理
      if (p.x < 0) p.x += width;
      if (p.x > width) p.x -= width;
      if (p.y < 0) p.y += height;
      if (p.y > height) p.y -= height;
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
  
  let suggestedName = `sketch009_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}.mp4`;
  await window.exporter.startMP4(width, height, 30, exportMax, suggestedName);
  
  isExporting = true;
}

async function startExportPNG() {
  if (isExporting || window.exporter.isExporting) return;
  
  let prefix = `sketch009_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}`;
  await window.exporter.startPNG(30, exportMax, prefix);
  
  isExporting = true;
}

function keyPressed() {
  if (key === 'm' || key === 'M') startExportMP4();
  if (key === 'p' || key === 'P') startExportPNG();
}

// GUI用関数公開
window.exportMP4 = startExportMP4;
window.exportPNG = startExportPNG;