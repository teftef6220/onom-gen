// Modern Pop Geometry
// Simple, Bold, Kinetic

const params = {
  cols: 12,
  rows: 8,
  margin: 60,
  shapeScale: 0.85,
  speed: 1.0,
  waveSpeed: 0.5,
  rotation: true,
  colorMode: 'Vivid', // Vivid, Bauhaus, Neon, Mono
  bgColor: '#000000',
  dynamicGrid: true,
  gridDepth: 4,
  splitChance: 0.75,
  autoSeed: true,
  seedInterval: 120,
  exportFrames: 600,
  exportMP4: () => startExportMP4(),
  exportPNG: () => startExportPNG()
};

let shapes = [];
let time = 0;

const PALETTES = {
  Vivid: ['#FF0055', '#0033FF', '#FFCC00', '#00FF66', '#FFFFFF'],
  Bauhaus: ['#D02028', '#00589F', '#F8C300', '#F2F2F2', '#EFECE1'],
  Neon: ['#F72585', '#7209B7', '#3A0CA3', '#4361EE', '#4CC9F0'],
  Mono: ['#FFFFFF', '#AAAAAA', '#555555']
};

// Export variables
let isExporting = false;
let exportMax = 0;

function setup() {
  let c = createCanvas(1920, 1080);
  pixelDensity(1);
  
  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '100vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');

  rectMode(CENTER);
  ellipseMode(CENTER);
  strokeCap(ROUND);
  strokeJoin(ROUND);

  initGrid();
}

function initGrid() {
  randomSeed(params.seed);
  shapes = [];
  
  if (params.dynamicGrid) {
    // 再帰的な分割でダイナミックグリッドを生成
    let drawW = width - params.margin * 2;
    let drawH = height - params.margin * 2;
    
    // 再帰関数
    function divide(x, y, w, h, depth) {
      if (depth > 0 && random() < params.splitChance) {
        // 分割
        if (w > h) {
          // 横分割
          divide(x, y, w/2, h, depth - 1);
          divide(x + w/2, y, w/2, h, depth - 1);
        } else {
          // 縦分割
          divide(x, y, w, h/2, depth - 1);
          divide(x, y + h/2, w, h/2, depth - 1);
        }
      } else {
        // 図形生成
        shapes.push(new PopShape(x + w/2, y + h/2, min(w, h)));
      }
    }
    
    divide(params.margin, params.margin, drawW, drawH, params.gridDepth);
  } else {
    // 通常の均等グリッド
    let drawW = width - params.margin * 2;
    let drawH = height - params.margin * 2;
    let cellW = drawW / params.cols;
    let cellH = drawH / params.rows;
    for (let y = 0; y < params.rows; y++) {
      for (let x = 0; x < params.cols; x++) {
        let px = params.margin + x * cellW + cellW / 2;
        let py = params.margin + y * cellH + cellH / 2;
        shapes.push(new PopShape(px, py, min(cellW, cellH)));
      }
    }
  }
}

function draw() {
  blendMode(BLEND);
  rectMode(CORNER);
  noStroke();
  fill(params.bgColor);
  rect(0, 0, width, height);
  
  rectMode(CENTER);
  time += params.speed * 0.02;

  if (params.autoSeed && frameCount % params.seedInterval === 0) {
    params.seed = floor(random(10000));
    initGrid();
  }

  let colors = PALETTES[params.colorMode];

  for (let s of shapes) {
    s.update();
    s.display(colors);
  }

  if (isExporting) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
      isExporting = false;
    }
  }
}

class PopShape {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.baseSize = size;
    this.type = floor(random(9)); // 0:Circle, 1:Rect, 2:Cross, 3:Triangle, 4:Arc, 5:Ring, 6:Diamond, 7:Grid, 8:Stripe
    this.colorIndex = floor(random(5));
    this.angle = floor(random(4)) * HALF_PI;
  }

  update() {
    // Wave
    let wave = sin(time * params.waveSpeed + this.x * 0.005 + this.y * 0.005);
    
    this.currentScale = params.shapeScale * (1 + wave * 0.1);
    
    if (params.rotation) {
      this.currentAngle = this.angle + time;
    } else {
      this.currentAngle = this.angle;
    }
  }

  display(colors) {
    let s = this.baseSize * this.currentScale;
    let col = colors[this.colorIndex % colors.length];
    
    push();
    translate(this.x, this.y);
    rotate(this.currentAngle);
    
    noStroke();
    fill(col);
    
    if (this.type === 0) {
      ellipse(0, 0, s, s);
      fill(params.bgColor);
      ellipse(0, 0, s * 0.4, s * 0.4);
    } else if (this.type === 1) {
      rect(0, 0, s, s, s * 0.1);
    } else if (this.type === 2) {
      rect(0, 0, s, s * 0.3, s * 0.1);
      rect(0, 0, s * 0.3, s, s * 0.1);
    } else if (this.type === 3) {
      triangle(0, -s/2, -s/2, s/2, s/2, s/2);
    } else if (this.type === 4) {
      arc(0, 0, s, s, 0, PI + HALF_PI, PIE);
    } else if (this.type === 5) {
      noFill();
      stroke(col);
      strokeWeight(s * 0.2);
      ellipse(0, 0, s * 0.8, s * 0.8);
    } else if (this.type === 6) {
      push();
      rotate(QUARTER_PI);
      rect(0, 0, s * 0.7, s * 0.7);
      pop();
    } else if (this.type === 7) {
      let step = s / 3;
      for(let i=-s/2 + step/2; i<s/2; i+=step) {
        for(let j=-s/2 + step/2; j<s/2; j+=step) {
          ellipse(i, j, step * 0.6);
        }
      }
    } else if (this.type === 8) {
      let step = s / 4;
      for(let i=-s/2; i<s/2; i+=step) {
        rect(i + step/2, 0, step * 0.5, s);
      }
    }
    
    pop();
  }
}

window.guiConfig = [
  { folder: 'Generator', contents: [
    { object: params, variable: 'cols', min: 2, max: 30, step: 1, name: 'Columns', onChange: initGrid },
    { object: params, variable: 'rows', min: 2, max: 30, step: 1, name: 'Rows', onChange: initGrid },
    { object: params, variable: 'margin', min: 0, max: 200, name: 'Margin', onChange: initGrid },
    { object: params, variable: 'dynamicGrid', name: 'Dynamic Grid', onChange: initGrid },
    { object: params, variable: 'gridDepth', min: 1, max: 8, step: 1, name: 'Grid Depth', onChange: initGrid },
    { object: params, variable: 'splitChance', min: 0.1, max: 1.0, name: 'Split Chance', onChange: initGrid },
    { object: params, variable: 'autoSeed', name: 'Auto Seed' },
    { object: params, variable: 'seedInterval', min: 5, max: 600, step: 10, name: 'Seed Interval' }
  ]},
  { folder: 'Animation', contents: [
    { object: params, variable: 'speed', min: 0, max: 5.0, name: 'Speed' },
    { object: params, variable: 'waveSpeed', min: 0, max: 5.0, name: 'Wave Speed' },
    { object: params, variable: 'rotation', name: 'Rotate' },
    { object: params, variable: 'shapeScale', min: 0.1, max: 1.5, name: 'Scale' }
  ]},
  { folder: 'Style', contents: [
    { object: params, variable: 'colorMode', options: Object.keys(PALETTES), name: 'Palette' },
    { object: params, variable: 'bgColor', type: 'color', name: 'Background' }
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
  let suggestedName = `sketch019_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}.mp4`;
  await window.exporter.startMP4(width, height, 30, exportMax, suggestedName);
  
  isExporting = true;
}

async function startExportPNG() {
  if (isExporting || window.exporter.isExporting) return;
  
  exportMax = params.exportFrames;
  let prefix = `sketch019_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}`;
  await window.exporter.startPNG(30, exportMax, prefix);
  
  isExporting = true;
}

function keyPressed() {
  if (key === 'm' || key === 'M') startExportMP4();
  if (key === 'p' || key === 'P') startExportPNG();
  if (key === 'r' || key === 'R') initGrid();
}