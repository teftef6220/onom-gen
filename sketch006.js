var w = 10;
var cells;
var generation = 0;
var caRules = [0, 1, 0, 1, 1, 0, 1, 0]; // Rule 90
var isExporting = false;
var exportMax = 600;

var guiConfig = [
  { variable: 'w', min: 2, max: 50, step: 1, name: 'Cell Size', onFinishChange: function () { initCA(); } },
  { variable: 'exportMax', min: 60, max: 1200, step: 1, name: 'Export Frames' },
  { variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },
  { variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }
];

function setup() {
  let c = createCanvas(2560, 1440);

  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '100vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');

  initCA();
}

function initCA() {
  cells = Array(floor(width / w));
  for (let i = 0; i < cells.length; i++) {
    cells[i] = 0;
  }
  cells[floor(cells.length / 2)] = 1;
  fill(0);
  rect(0, 0, width, height);
}

function draw() {
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === 1) {
      fill(0, 255, 100); // Neon Green
      noStroke();
      rect(i * w, generation * w, w, w);
    }
  }

  generate();
  generation++;

  // 画面下まで行ったらリセット
  if (generation * w > height) {
    fill(0);
    rect(0, 0, width, height);
    generation = 0;
    cells = Array(floor(width / w)).fill(0);
    cells[floor(cells.length / 2)] = 1;
    // ルールをランダム変更
    for (let i = 0; i < 8; i++) caRules[i] = floor(random(2));
  }

  // 書き出し処理
  if (isExporting) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
      isExporting = false;
    }
  }
}

function generate() {
  let nextgen = Array(cells.length);
  for (let i = 1; i < cells.length - 1; i++) {
    let left = cells[i - 1];
    let me = cells[i];
    let right = cells[i + 1];
    nextgen[i] = rules(left, me, right);
  }
  cells = nextgen;
}

function rules(a, b, c) {
  let s = "" + a + b + c;
  let index = parseInt(s, 2);
  return caRules[7 - index]; // 配列のインデックスとルールのビット順序に注意
}

function windowResized() {
  // 固定サイズのためリサイズ処理は行わない
}

async function startExportMP4() {
  if (isExporting || window.exporter.isExporting) return;
  
  let suggestedName = `cellular_${year()}${nf(month(), 2)}${nf(day(), 2)}_${nf(hour(), 2)}${nf(minute(), 2)}.mp4`;
  await window.exporter.startMP4(width, height, 24, exportMax, suggestedName);
  
  isExporting = true;
}

async function startExportPNG() {
  if (isExporting || window.exporter.isExporting) return;
  
  let prefix = `cellular_${year()}${nf(month(), 2)}${nf(day(), 2)}_${nf(hour(), 2)}${nf(minute(), 2)}`;
  await window.exporter.startPNG(24, exportMax, prefix);
  
  isExporting = true;
}

function keyPressed() {
  if (key === 'm' || key === 'M') startExportMP4();
  if (key === 'p' || key === 'P') startExportPNG();
  if (key === 'r' || key === 'R') initCA();
}

// GUI用関数公開
window.exportMP4 = startExportMP4;
window.exportPNG = startExportPNG;



