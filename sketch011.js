var wordList = "KINETIC, TYPE, MOVE, FLOW, GENERATE";
var words = wordList.split(',').map(s => s.trim());
var currentWord = 0;
var fontSize = 100;
var copies = 5;
var amplitude = 100;
var frequency = 0.5;
var speed = 1.0;
var colorPalette = 'Pink';
var isExporting = false;
var exportCount = 0;
var exportMax = 600;
var exportSessionID = "";

const PALETTES = {
  Pink: { main: '#FFFFFF', accent: '#FF0064' },
  Blue: { main: '#FFFFFF', accent: '#0064FF' },
  Green: { main: '#FFFFFF', accent: '#00FF64' },
  Yellow: { main: '#FFFFFF', accent: '#FFFF00' },
  Mono: { main: '#FFFFFF', accent: '#888888' },
  Dark: { main: '#444444', accent: '#FFFFFF' }
};

var guiConfig = [
  { variable: 'wordList', name: 'Word List', onFinishChange: function(){ updateWords(); } },
  { variable: 'fontSize', min: 10, max: 300, name: 'Font Size' },
  { variable: 'copies', min: 1, max: 20, step: 1, name: 'Copies' },
  { variable: 'amplitude', min: 0, max: 500, name: 'Amplitude' },
  { variable: 'frequency', min: 0.01, max: 2.0, name: 'Frequency' },
  { variable: 'speed', min: 0, max: 5.0, name: 'Speed' },
  { variable: 'colorPalette', options: Object.keys(PALETTES), name: 'Color Palette' },
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

  textAlign(CENTER, CENTER);
  textSize(fontSize);
  textStyle(BOLD);
  fill(255);
  noStroke();
}

function updateWords() {
  words = wordList.split(',').map(s => s.trim());
  currentWord = 0;
}

function draw() {
  fill(0);
  rect(0, 0, width, height);
  
  textSize(fontSize);
  
  var str = words[currentWord];
  var time = millis() * 0.002 * speed;
  var palette = PALETTES[colorPalette];
  
  translate(width / 2, height / 2);
  
  for (var i = 0; i < copies; i++) {
    push();
    var yOffset = (i - (copies - 1) / 2) * fontSize * 0.8;
    var xOffset = sin(time + i * frequency) * amplitude;
    translate(xOffset, yOffset);
    
    // 色の変化
    if (i === Math.floor(copies / 2)) fill(palette.accent);
    else fill(palette.main);
    
    text(str, 0, 0);
    pop();
  }
  
  if (frameCount % 120 == 0) {
    currentWord = (currentWord + 1) % words.length;
  }

  // 書き出し処理
  if (isExporting) {
    saveCanvas('kinetic_' + exportSessionID + '_' + nf(exportCount + 1, 3), 'png');
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