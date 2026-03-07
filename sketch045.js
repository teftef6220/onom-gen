// Manoloide (Manolo Gamboa Naon) Inspired Sketch
// Geometric, Grid, Vibrant, Texture, Generative

const params = {
  seed: 100,
  gridSize: 80,
  gap: 10,
  margin: 60,
  palette: 'Vibrant', // Vibrant, Pastel, Dark, Mono
  shapeType: 'Mixed', // Mixed, Circles, Rects, Arcs
  density: 0.8,
  motionType: 'Swap', // Rotate, StepRotate, Elastic, Flip, Switch, Swap, None
  noiseGrain: 0.12,
  bgColor: '#1a1a1a',
  animSpeed: 0.5, // Animation speed
  staggerAmount: 0.4, // タイミングのずれ量
  exportFrames: 600,
  exportStart: () => startExport(),
  regenerate: () => generate()
};

let gui;
let shapes = [];
let t = 0;

// カラーパレット
const PALETTES = {
  Vibrant: ['#FF0055', '#0033FF', '#FFCC00', '#00FF66', '#FFFFFF'],
  VibrantDark: ['#FF0055', '#0033FF', '#FFCC00', '#00FF66', '#FFFFFF', '#000000'],
  Pastel: ['#FFB5A7', '#FCD5CE', '#F8EDEB', '#F9DCC4', '#FEC89A'],
  Dark: ['#222222', '#444444', '#666666', '#888888', '#AAAAAA'],
  Mono: ['#FFFFFF', '#000000'],
  Retro: ['#E76F51', '#2A9D8F', '#E9C46A', '#F4A261', '#264653']
};

// 書き出し用変数
let isExporting = false;
let exportCount = 0;
let exportMax = 0;
let exportSessionID = "";

function setup() {
  let c = createCanvas(1980, 1080);
  pixelDensity(1);

  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '100vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');

  rectMode(CENTER);
  ellipseMode(CENTER);
  
  generate();
}

function generate() {
  randomSeed(params.seed);
  shapes = [];
  
  let colors = PALETTES[params.palette];
  let cols = floor((width - params.margin * 2) / params.gridSize);
  let rows = floor((height - params.margin * 2) / params.gridSize);
  
  // Center the grid
  let startX = params.margin + (width - params.margin * 2 - cols * params.gridSize) / 2;
  let startY = params.margin + (height - params.margin * 2 - rows * params.gridSize) / 2;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (random() > params.density) continue;

      let px = startX + x * params.gridSize + params.gridSize/2;
      let py = startY + y * params.gridSize + params.gridSize/2;
      let s = params.gridSize - params.gap;
      if (s < 1) s = 1;
      
      // Determine shape type
      let type = params.shapeType;
      if (type === 'Mixed') {
        type = random(['Circle', 'Rect', 'Arc', 'Cross', 'Triangle', 'Eye']);
      }
      
      let col1 = random(colors);
      let col2 = random(colors.filter(c => c !== col1));
      let col3 = random(colors.filter(c => c !== col1 && c !== col2));
      
      shapes.push({
        x: px, y: py, s: s,
        ox: px, oy: py, // Original position for swapping
        type: type,
        c1: col1, c2: col2, c3: col3,
        rot: floor(random(4)) * HALF_PI,
        phase: random(TWO_PI), // アニメーションの位相
        speedMult: random(0.5, 1.5), // 個別の速度倍率
        sub: random() > 0.7 // Subdivision chance
      });
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
  noStroke();
  
  t += params.animSpeed * 0.05;

  // Swap用のシャッフル配列計算
  let swapMapCurrent = null;
  let swapMapNext = null;
  
  if (params.motionType === 'Swap') {
    let cycle = floor(t);
    // 現在の配置
    randomSeed(params.seed + cycle * 100);
    swapMapCurrent = shuffleArray(shapes.map((_, i) => i));
    // 次の配置
    randomSeed(params.seed + (cycle + 1) * 100);
    swapMapNext = shuffleArray(shapes.map((_, i) => i));
  }

  for (let i = 0; i < shapes.length; i++) {
    let s = shapes[i];
    push();
    
    // モーション適用
    let localT = t * s.speedMult + s.phase;
    let drawType = s.type;
    
    if (params.motionType === 'Rotate') {
      // 滑らかな回転
      rotate(s.rot + localT);
    } else if (params.motionType === 'StepRotate') {
      // 90度ごとの段階的な回転（イージング付き）
      let step = floor(localT);
      let frac = localT % 1;
      // 待機時間を作る（後半の50%で回転）
      let val = 0;
      if (frac > 0.5) {
        let f = (frac - 0.5) * 2.0;
        // EaseInOutCubic
        val = f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
      }
      rotate(s.rot + (step + val) * HALF_PI);
    } else if (params.motionType === 'Elastic') {
      // 弾むような拡大縮小
      rotate(s.rot);
      let pulse = sin(localT * 2);
      // ピーク時だけ鋭く拡大
      let scaleVal = 1.0 + (pulse > 0.7 ? pow((pulse - 0.7) * 3.33, 2) * 0.4 : 0);
      scale(scaleVal);
    } else if (params.motionType === 'Flip') {
      // パタパタと裏返る
      rotate(s.rot);
      let flip = cos(localT);
      scale(flip, 1);
    } else if (params.motionType === 'Switch') {
      // 形状の入れ替え（縮小 -> 変化 -> 拡大）
      rotate(s.rot);
      let cycle = floor(localT);
      let p = localT % 1;
      
      // 0.2-0.8の間で変化させる（前後は待機）
      let scaleVal = 1;
      if (p > 0.2 && p < 0.8) {
        let pp = map(p, 0.2, 0.8, 0, 1);
        if (pp < 0.5) {
          // 縮小 (EaseIn)
          scaleVal = 1 - (pp * 2) * (pp * 2);
        } else {
          // 拡大 (EaseOut)
          let ppp = (pp - 0.5) * 2;
          scaleVal = ppp * ppp;
          
          // 形状を変更（座標とサイクル数に基づく決定論的ランダム）
          let hash = sin(s.x * 12.9898 + s.y * 78.233 + cycle * 43.12) * 43758.5453;
          let typeIdx = floor(abs(hash) * 100) % 6;
          let types = ['Circle', 'Rect', 'Arc', 'Cross', 'Triangle', 'Eye'];
          drawType = types[typeIdx];
        }
      }
      scale(scaleVal);
    } else if (params.motionType === 'Swap') {
      // 位置の入れ替え
      let p = t % 1;
      let moveP = 0;
      
      // タイミングをずらす (0.0 ~ 0.4)
      let stagger = map(sin(s.phase * 3 + s.x), -1, 1, 0, params.staggerAmount);
      let duration = 0.5;
      
      if (p > stagger) {
         let pp = (p - stagger) / duration;
         pp = constrain(pp, 0, 1);
         // EaseInOutQuart
         moveP = pp < 0.5 ? 8 * pp * pp * pp * pp : 1 - pow(-2 * pp + 2, 4) / 2;
      }
      
      // インデックスの遷移
      let idxCurr = swapMapCurrent[i];
      let idxNext = swapMapNext[i];
      
      // ターゲット座標（shapes配列のox, oyを参照）
      let x1 = shapes[idxCurr].ox;
      let y1 = shapes[idxCurr].oy;
      let x2 = shapes[idxNext].ox;
      let y2 = shapes[idxNext].oy;
      
      let drawX = lerp(x1, x2, moveP);
      let drawY = lerp(y1, y2, moveP);
      
      translate(drawX, drawY);
    } else {
      rotate(s.rot);
    }
    
    if (params.motionType !== 'Swap') translate(s.x, s.y);

    drawManoloShape(0, 0, s.s, drawType, s.c1, s.c2, s.c3, s.sub);
    pop();
  }
  
  // Apply Grain
  if (params.noiseGrain > 0) {
    randomSeed(frameCount); // Ensure grain animates
    strokeWeight(1);
    let grainCount = (width * height) * params.noiseGrain * 0.1;
    for(let i=0; i<grainCount; i++) {
        stroke(random(255), random(50));
        point(random(width), random(height));
    }
  }

  // 書き出し処理
  if (isExporting) {
    saveCanvas('manoloide_' + exportSessionID + '_' + nf(exportCount + 1, 3), 'png');
    exportCount++;
    if (exportCount >= exportMax) {
      isExporting = false;
      console.log("Export finished");
    }
  }
}

function drawManoloShape(x, y, s, type, c1, c2, c3, sub) {
  if (sub && s > 40) {
    // Recursive subdivision
    let half = s / 2;
    let offset = s / 4;
    drawManoloShape(x - offset, y - offset, half, type, c1, c2, c3, false);
    drawManoloShape(x + offset, y - offset, half, type, c2, c3, c1, false);
    drawManoloShape(x - offset, y + offset, half, type, c3, c1, c2, false);
    drawManoloShape(x + offset, y + offset, half, type, c1, c3, c2, false);
    return;
  }

  noStroke();
  fill(c1);
  rect(x, y, s, s);
  
  fill(c2);
  if (type === 'Circle') {
    ellipse(x, y, s, s);
    fill(c3);
    ellipse(x, y, s*0.5, s*0.5);
  } else if (type === 'Rect') {
    rect(x, y, s*0.6, s*0.6);
    fill(c3);
    rect(x, y, s*0.3, s*0.3);
  } else if (type === 'Arc') {
    push();
    translate(-s/2, -s/2);
    arc(0, 0, s*2, s*2, 0, HALF_PI);
    fill(c3);
    arc(0, 0, s, s, 0, HALF_PI);
    pop();
  } else if (type === 'Cross') {
    rect(x, y, s*0.3, s);
    rect(x, y, s, s*0.3);
  } else if (type === 'Triangle') {
    triangle(x-s/2, y+s/2, x+s/2, y+s/2, x, y-s/2);
    fill(c3);
    triangle(x-s/4, y+s/2, x+s/4, y+s/2, x, y);
  } else if (type === 'Eye') {
    ellipse(x, y, s, s*0.6);
    fill(c3);
    ellipse(x, y, s*0.4, s*0.4);
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// --- UI & Export Logic ---

window.guiConfig = [
  { folder: 'Generator', contents: [
    { object: params, variable: 'seed', min: 0, max: 1000, step: 1, name: 'Seed', onChange: generate },
    { object: params, variable: 'gridSize', min: 20, max: 200, step: 10, name: 'Grid Size', onChange: generate },
    { object: params, variable: 'gap', min: 0, max: 100, step: 1, name: 'Gap', onChange: generate },
    { object: params, variable: 'margin', min: 0, max: 200, step: 10, name: 'Margin', onChange: generate },
    { object: params, variable: 'density', min: 0.1, max: 1.0, name: 'Density', onChange: generate },
    { object: params, variable: 'shapeType', options: ['Mixed', 'Circle', 'Rect', 'Arc', 'Cross', 'Triangle', 'Eye'], name: 'Shapes', onChange: generate },
    { object: params, variable: 'motionType', options: ['Swap', 'Switch', 'StepRotate', 'Rotate', 'Elastic', 'Flip', 'None'], name: 'Motion' },
    { object: params, variable: 'regenerate', name: 'Regenerate', type: 'function' }
  ]},
  { folder: 'Style', contents: [
    { object: params, variable: 'palette', options: Object.keys(PALETTES), name: 'Palette', onChange: generate },
    { object: params, variable: 'bgColor', type: 'color', name: 'Background' },
    { object: params, variable: 'noiseGrain', min: 0, max: 0.5, name: 'Grain' },
    { object: params, variable: 'animSpeed', min: 0, max: 2.0, name: 'Anim Speed' },
    { object: params, variable: 'staggerAmount', min: 0, max: 0.55, name: 'Stagger' }
  ]},
  { folder: 'Export', contents: [
    { object: params, variable: 'exportFrames', min: 60, max: 1200, step: 1, name: 'Frames' },
    { object: params, variable: 'exportStart', name: 'Start Export', type: 'function' }
  ]}
];

function startExport() {
  if (isExporting) return;
  isExporting = true;
  exportCount = 0;
  exportMax = params.exportFrames;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  exportSessionID = "";
  for (let i = 0; i < 4; i++) exportSessionID += chars.charAt(floor(random(chars.length)));
  console.log(`Export started: ${exportSessionID}`);
}

function keyPressed() {
  if (key === 's' || key === 'S') startExport();
  if (key === 'r' || key === 'R') generate();
}