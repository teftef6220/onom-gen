var w = 10;
var cells;
var generation = 0;
var caRules = [0, 1, 0, 1, 1, 0, 1, 0]; // Rule 90
var isExporting = false;
var exportCount = 0;
var exportMax = 600;
var exportSessionID = "";

var guiConfig = [
  { variable: 'w', min: 2, max: 50, step: 1, name: 'Cell Size', onFinishChange: function(){ initCA(); } },
  { variable: 'exportMax', min: 60, max: 1200, step: 1, name: 'Export Frames' },
  { variable: 'startExport', name: 'Start Export', type: 'function' }
];

function setup() {
  let c = createCanvas(1920, 1080);
  
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
      for(let i=0; i<8; i++) caRules[i] = floor(random(2));
  }

  // 書き出し処理
  if (isExporting) {
    saveCanvas('cellular_automata_' + exportSessionID + '_' + nf(exportCount + 1, 3), 'png');
    exportCount++;
    if (exportCount >= exportMax) {
      isExporting = false;
      console.log("Export finished");
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

function startExport() {
  if (isExporting) return;
  isExporting = true;
  exportCount = 0;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  exportSessionID = "";
  for (let i = 0; i < 4; i++) exportSessionID += chars.charAt(floor(random(chars.length)));
  console.log(`Export started: ${exportSessionID}`);
}

window.startExport = startExport;