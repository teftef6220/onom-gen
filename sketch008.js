var data = [];
var isExporting = false;
var exportMax = 600;

var guiConfig = [
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
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
      isExporting = false;
    }
  }
}

async function startExportMP4() {
  if (isExporting || window.exporter.isExporting) return;
  
  let suggestedName = `sketch008_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}.mp4`;
  await window.exporter.startMP4(width, height, 30, exportMax, suggestedName);
  
  isExporting = true;
}

async function startExportPNG() {
  if (isExporting || window.exporter.isExporting) return;
  
  let prefix = `sketch008_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}`;
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


