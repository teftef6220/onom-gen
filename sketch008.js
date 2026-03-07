var data = [];
var isExporting = false;
var exportCount = 0;
var exportMax = 600;
var exportSessionID = "";

var guiConfig = [
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

  for (var i = 0; i < 50; i++) {
    data.push(random(10, 100));
  }
  colorMode(HSB);
}

function draw() {
  fill(0);
  rect(0, 0, width, height);
  var w = width / data.length;
  
  for (var i = 0; i < data.length; i++) {
    // データをアニメーションさせる
    data[i] = lerp(data[i], noise(i, frameCount * 0.01) * height, 0.1);
    
    var h = data[i];
    var hueVal = map(h, 0, height, 200, 360);
    
    fill(hueVal, 80, 100);
    noStroke();
    rect(i * w, height - h, w - 2, h);
    
    // 数値表示
    fill(255);
    textSize(10);
    textAlign(CENTER);
    text(floor(h), i * w + w / 2, height - h - 5);
  }

  // 書き出し処理
  if (isExporting) {
    saveCanvas('dataviz_' + exportSessionID + '_' + nf(exportCount + 1, 3), 'png');
    exportCount++;
    if (exportCount >= exportMax) {
      isExporting = false;
      console.log("Export finished");
    }
  }
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