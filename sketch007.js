var x = 0.1;
var y = 0;
var z = 0;

var a = 10;
var b = 28;
var c = 8.0 / 3.0;

var points = [];
var isExporting = false;
var exportCount = 0;
var exportMax = 600;
var exportSessionID = "";

var guiConfig = [
  { variable: 'a', min: 1, max: 20, step: 0.1 },
  { variable: 'b', min: 1, max: 50, step: 0.1 },
  { variable: 'c', min: 0.1, max: 10, step: 0.1 },
  { variable: 'exportMax', min: 60, max: 1200, step: 1, name: 'Export Frames' },
  { variable: 'startExport', name: 'Start Export', type: 'function' }
];

function setup() {
  let c = createCanvas(1920, 1080, WEBGL);
  
  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '100vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');

  colorMode(HSB);
}

function draw() {
  fill(0);
  rect(-width/2, -height/2, width, height); // WEBGLモードなので座標に注意
  
  let dt = 0.01;
  let dx = (a * (y - x)) * dt;
  let dy = (x * (b - z) - y) * dt;
  let dz = (x * y - c * z) * dt;
  x = x + dx;
  y = y + dy;
  z = z + dz;

  points.push(new p5.Vector(x, y, z));

  translate(0, 0, -80);
  let camX = map(mouseX, 0, width, -200, 200);
  let camY = map(mouseY, 0, height, -200, 200);
  camera(camX, camY, (height/2.0) / tan(PI*30.0 / 180.0), 0, 0, 0, 0, 1, 0);
  scale(5);
  stroke(255);
  noFill();

  let hu = 0;
  beginShape();
  for (let v of points) {
    stroke(hu, 255, 255);
    vertex(v.x, v.y, v.z);
    hu += 0.1;
    if (hu > 255) {
      hu = 0;
    }
  }
  endShape();
  
  if(points.length > 3000) points.shift();

  // 書き出し処理
  if (isExporting) {
    saveCanvas('chaos_attractor_' + exportSessionID + '_' + nf(exportCount + 1, 3), 'png');
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