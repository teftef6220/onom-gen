var particles = [];
var numParticles = 1000;
var noiseScale = 0.01;
var isExporting = false;
var exportMax = 600;
var autoChangeNoise = false;
var noiseChangeInterval = 60;
var colorPalette = 'Rainbow';
var particleColor = '#00ff00';
var trailStrength = 10;
var baseSize = 2;
var sizeVariance = 0;
var noiseStrength = 2.0;

var guiConfig = [
  { variable: 'numParticles', min: 100, max: 5000, step: 100, name: 'Count', onFinishChange: function(){ initParticles(); } },
  { variable: 'colorPalette', options: ['Rainbow', 'Monochrome', 'Custom'], name: 'Color Mode' },
  { variable: 'particleColor', type: 'color', name: 'Custom Color' },
  { variable: 'trailStrength', min: 0, max: 100, step: 1, name: 'Trail' },
  { variable: 'baseSize', min: 0.5, max: 20, step: 0.1, name: 'Base Size' },
  { variable: 'sizeVariance', min: 0, max: 10, step: 0.1, name: 'Size Variance' },
  { variable: 'noiseScale', min: 0.001, max: 0.02, step: 0.001, name: 'Noise Scale' },
  { variable: 'noiseStrength', min: 0.1, max: 10.0, step: 0.1, name: 'Noise Strength' },
  { variable: 'autoChangeNoise', name: 'Auto Change Noise' },
  { variable: 'noiseChangeInterval', min: 10, max: 300, step: 10, name: 'Change Interval' },
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

  fill(0);
  rect(0, 0, width, height);
  initParticles();
  colorMode(HSB, 360, 100, 100, 100);
}

function initParticles() {
  particles = [];
  for (let i = 0; i < numParticles; i++) {
    let p = createVector(random(width), random(height));
    p.sizeFactor = random(1); // サイズのばらつき用係数
    particles.push(p);
  }
}

function draw() {
  // 背景クリア（残像を残す）
  noStroke();
  fill(0, trailStrength);
  rect(0, 0, width, height);

  if (autoChangeNoise && frameCount % noiseChangeInterval === 0) {
    let r = random();
    noiseScale = map(r * r, 0, 1, 0.001, 0.02);
  }

  for (let i = 0; i < particles.length; i++) {
    let p = particles[i];
    let n = noise(p.x * noiseScale, p.y * noiseScale, frameCount * 0.005);
    let angle = n * TWO_PI * noiseStrength;
    
    // 色の決定
    if (colorPalette === 'Rainbow') {
      let hueVal = (n * 360 + frameCount * 0.5) % 360;
      stroke(hueVal, 80, 100);
    } else if (colorPalette === 'Monochrome') {
      stroke(0, 0, 100);
    } else if (colorPalette === 'Custom') {
      stroke(particleColor);
    }

    // サイズの決定
    let s = baseSize;
    if (sizeVariance > 0) {
      s += (p.sizeFactor || 0) * sizeVariance;
    }
    strokeWeight(s);
    
    p.x += cos(angle) * 2;
    p.y += sin(angle) * 2;
    
    point(p.x, p.y);
    
    // 画面端の処理
    if (!onScreen(p)) {
      p.x = random(width);
      p.y = random(height);
    }
  }

  // 書き出し処理
  if (isExporting) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
      isExporting = false;
    }
  }
}

function onScreen(v) {
  return v.x >= 0 && v.x <= width && v.y >= 0 && v.y <= height;
}

function windowResized() {
  // 固定サイズのためリサイズ処理は行わない
}

async function startExportMP4() {
  if (isExporting || window.exporter.isExporting) return;
  
  let suggestedName = `sketch010_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}.mp4`;
  await window.exporter.startMP4(width, height, 30, exportMax, suggestedName);
  
  isExporting = true;
}

async function startExportPNG() {
  if (isExporting || window.exporter.isExporting) return;
  
  let prefix = `sketch010_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}`;
  await window.exporter.startPNG(30, exportMax, prefix);
  
  isExporting = true;
}

function keyPressed() {
  if (key === 'm' || key === 'M') startExportMP4();
  if (key === 'p' || key === 'P') startExportPNG();
}

// GUIから呼び出すためのダミー関数
window.exportMP4 = startExportMP4;
window.exportPNG = startExportPNG;