var grid;
var next;
var dA = 1.0;
var dB = 0.5;
var feed = 0.055;
var k = 0.062;
var isExporting = false;
var exportMax = 600;

var guiConfig = [
  { variable: 'dA', min: 0.1, max: 1.2, step: 0.01 },
  { variable: 'dB', min: 0.1, max: 1.2, step: 0.01 },
  { variable: 'feed', min: 0.01, max: 0.1, step: 0.001 },
  { variable: 'k', min: 0.01, max: 0.1, step: 0.001 },
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

  pixelDensity(1);
  grid = [];
  next = [];
  for (let x = 0; x < width; x++) {
    grid[x] = [];
    next[x] = [];
    for (let y = 0; y < height; y++) {
      grid[x][y] = { a: 1, b: 0 };
      next[x][y] = { a: 1, b: 0 };
    }
  }
  
  // シード
  for (let i = 0; i < 50; i++) {
    let x = floor(random(width));
    let y = floor(random(height));
    for(let xx = x-10; xx < x+10; xx++) {
        for(let yy = y-10; yy < y+10; yy++) {
            if(xx >= 0 && xx < width && yy >= 0 && yy < height)
                grid[xx][yy].b = 1;
        }
    }
  }
}

function draw() {
  fill(0);
  rect(0, 0, width, height);
  
  for (let i = 0; i < 5; i++) { // 高速化
    updateRD();
  }

  loadPixels();
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let pix = (x + y * width) * 4;
      let a = grid[x][y].a;
      let b = grid[x][y].b;
      let c = floor((a - b) * 255);
      c = constrain(c, 0, 255);
      
      // ポップな色付け
      pixels[pix + 0] = c;
      pixels[pix + 1] = 255 - c;
      pixels[pix + 2] = (c + frameCount) % 255;
      pixels[pix + 3] = 255;
    }
  }
  updatePixels();

  // 書き出し処理
  if (isExporting) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
       isExporting = false;
    }
  }
}

function updateRD() {
  for (let x = 1; x < width - 1; x++) {
    for (let y = 1; y < height - 1; y++) {
      let a = grid[x][y].a;
      let b = grid[x][y].b;
      let lapA = laplaceA(x, y);
      let lapB = laplaceB(x, y);
      next[x][y].a = a + (dA * lapA - a * b * b + feed * (1 - a));
      next[x][y].b = b + (dB * lapB + a * b * b - (k + feed) * b);
      next[x][y].a = constrain(next[x][y].a, 0, 1);
      next[x][y].b = constrain(next[x][y].b, 0, 1);
    }
  }
  let temp = grid;
  grid = next;
  next = temp;
}

function laplaceA(x, y) {
  return grid[x][y].a * -1 + grid[x-1][y].a * 0.2 + grid[x+1][y].a * 0.2 + grid[x][y-1].a * 0.2 + grid[x][y+1].a * 0.2 + grid[x-1][y-1].a * 0.05 + grid[x+1][y-1].a * 0.05 + grid[x-1][y+1].a * 0.05 + grid[x+1][y+1].a * 0.05;
}

function laplaceB(x, y) {
    return grid[x][y].b * -1 + grid[x-1][y].b * 0.2 + grid[x+1][y].b * 0.2 + grid[x][y-1].b * 0.2 + grid[x][y+1].b * 0.2 + grid[x-1][y-1].b * 0.05 + grid[x+1][y-1].b * 0.05 + grid[x-1][y+1].b * 0.05 + grid[x+1][y+1].b * 0.05;
}

async function startExportMP4() {
  if (isExporting || window.exporter.isExporting) return;
  
  let suggestedName = `sketch014_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}.mp4`;
  await window.exporter.startMP4(width, height, 30, exportMax, suggestedName);
  
  isExporting = true;
}

async function startExportPNG() {
  if (isExporting || window.exporter.isExporting) return;
  
  let prefix = `sketch014_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}`;
  await window.exporter.startPNG(30, exportMax, prefix);
  
  isExporting = true;
}

function keyPressed() {
  if (key === 'm' || key === 'M') startExportMP4();
  if (key === 'p' || key === 'P') startExportPNG();
}

window.exportMP4 = startExportMP4;
window.exportPNG = startExportPNG;