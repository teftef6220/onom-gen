// EVA UI - Inspired by Neon Genesis Evangelion
// NERV / MAGI System Interface Style

const params = {
  seed: 100,
  depth: 6,
  gridCols: 8,
  gridRows: 6,
  minSize: 1,
  gap: 4,
  cornerRadius: 0, // Sharp edges for EVA style
  speed: 1.0,
  bgColor: '#000000',
  palette: 'MAGI', // MAGI, NERV, EVA-01, EVA-00, EMERGENCY
  autoUpdate: true,
  updateInterval: 20,
  scanline: true,
  exportFrames: 600,
  exportStart: () => startExport(),
  regenerate: () => generateBento(true)
};

let boxes = [];
let time = 0;

// カラーパレット
const PALETTES = {
  MAGI: ['#000000', '#FF9900', '#FFCC00', '#331100'], // Amber/Orange
  NERV: ['#000000', '#CC0000', '#FF3300', '#330000'], // Red
  EVA01: ['#000000', '#6633CC', '#00FF66', '#FFFFFF'], // Purple/Green
  EVA00: ['#000000', '#0099FF', '#FFFFFF', '#003366'], // Blue
  EMERGENCY: ['#000000', '#FF0000', '#FFFFFF', '#FFFF00'] // Red/White/Yellow
};

// 書き出し用変数
let isExporting = false;
let exportCount = 0;
let exportMax = 0;
let exportSessionID = "";

function setup() {
  let c = createCanvas(2560, 1440);
  pixelDensity(1);
  
  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '100vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');

  rectMode(CORNER);
  ellipseMode(CENTER);
  strokeCap(SQUARE);
  strokeJoin(MITER);
  
  // 極太フォント設定
  textFont('Impact, Arial Black, sans-serif');
  textStyle(BOLD);

  generateBento();
}

function generateBento(forceReset = false) {
  if (forceReset) {
    params.seed = floor(random(10000));
    boxes = [];
  }
  randomSeed(params.seed);
  
  let layouts = [];
  
  // グリッドベースの分割
  divideGrid(0, 0, params.gridCols, params.gridRows, params.depth, layouts);

  // ピクセル座標変換
  const margin = 40;
  const drawW = width - margin * 2;
  const drawH = height - margin * 2;
  const cellW = (drawW - (params.gridCols - 1) * params.gap) / params.gridCols;
  const cellH = (drawH - (params.gridRows - 1) * params.gap) / params.gridRows;

  layouts.forEach(l => {
    l.x = margin + l.gx * (cellW + params.gap);
    l.y = margin + l.gy * (cellH + params.gap);
    l.w = l.gw * cellW + (l.gw - 1) * params.gap;
    l.h = l.gh * cellH + (l.gh - 1) * params.gap;
  });

  // ボックス調整
  if (boxes.length < layouts.length) {
    let numToAdd = layouts.length - boxes.length;
    let visibleBoxes = boxes.filter(b => b.w > 10 && b.h > 10);
    
    for (let i = 0; i < numToAdd; i++) {
      let parent = visibleBoxes.length > 0 ? random(visibleBoxes) : null;
      let newBox;
      if (parent) {
        newBox = new BentoBox(parent.x, parent.y, parent.w, parent.h);
        newBox.bgCol = parent.bgCol;
        newBox.fgCol = parent.fgCol;
      } else {
        newBox = new BentoBox(width / 2, height / 2, 0, 0);
      }
      boxes.push(newBox);
    }
  }

  // ターゲット割り当て
  let availableLayouts = layouts.map((l, i) => ({ ...l, id: i, used: false }));
  
  for (let i = 0; i < boxes.length; i++) {
    let box = boxes[i];
    let bestDist = Infinity;
    let bestLayoutIndex = -1;

    for (let j = 0; j < availableLayouts.length; j++) {
      if (!availableLayouts[j].used) {
        let d = dist(box.x, box.y, availableLayouts[j].x, availableLayouts[j].y);
        if (d < bestDist) {
          bestDist = d;
          bestLayoutIndex = j;
        }
      }
    }

    if (bestLayoutIndex !== -1) {
      availableLayouts[bestLayoutIndex].used = true;
      box.setTarget(availableLayouts[bestLayoutIndex]);
    } else {
      box.setTarget({ x: box.x, y: box.y, w: 0, h: 0 });
      box.isAbsorbed = true;
    }
  }
}

function divideGrid(gx, gy, gw, gh, depth, layouts) {
  const canSplitX = gw >= params.minSize * 2;
  const canSplitY = gh >= params.minSize * 2;

  if (depth <= 0 || (!canSplitX && !canSplitY) || random() < 0.1) {
    layouts.push({ gx, gy, gw, gh });
    return;
  }

  let splitVertical = canSplitX;
  if (canSplitX && canSplitY) {
    splitVertical = gw > gh ? random() < 0.8 : random() < 0.2;
  } else if (canSplitY) {
    splitVertical = false;
  }

  if (splitVertical) {
    let splitW = floor(random(params.minSize, gw - params.minSize + 1));
    divideGrid(gx, gy, splitW, gh, depth - 1, layouts);
    divideGrid(gx + splitW, gy, gw - splitW, gh, depth - 1, layouts);
  } else {
    let splitH = floor(random(params.minSize, gh - params.minSize + 1));
    divideGrid(gx, gy, gw, splitH, depth - 1, layouts);
    divideGrid(gx, gy + splitH, gw, gh - splitH, depth - 1, layouts);
  }
}

function updateLayout() {
  let activeBoxes = boxes.filter(b => !b.isDead && b.tw > 0);
  
  let splitProb = 0.5;
  if (activeBoxes.length < 5) splitProb = 0.9;
  if (activeBoxes.length > 20) splitProb = 0.1;
  
  if (random() < splitProb) {
    splitBox(activeBoxes);
  } else {
    mergeBoxes(activeBoxes);
  }
}

function splitBox(activeBoxes) {
  let candidates = activeBoxes.filter(b => b.tgw >= params.minSize * 2 || b.tgh >= params.minSize * 2);
  if (candidates.length === 0) return;
  
  let target = random(candidates);
  
  const canSplitX = target.tgw >= params.minSize * 2;
  const canSplitY = target.tgh >= params.minSize * 2;
  
  let splitVertical = canSplitX;
  if (canSplitX && canSplitY) {
    splitVertical = target.tgw > target.tgh ? random() < 0.8 : random() < 0.2;
  } else if (canSplitY) {
    splitVertical = false;
  }

  const margin = 40;
  const drawW = width - margin * 2;
  const drawH = height - margin * 2;
  const cellW = (drawW - (params.gridCols - 1) * params.gap) / params.gridCols;
  const cellH = (drawH - (params.gridRows - 1) * params.gap) / params.gridRows;
  
  let l1, l2;
  
  if (splitVertical) {
    let splitW = floor(random(params.minSize, target.tgw - params.minSize + 1));
    let w1 = splitW * cellW + (splitW - 1) * params.gap;
    let w2 = (target.tgw - splitW) * cellW + (target.tgw - splitW - 1) * params.gap;
    
    l1 = { gx: target.tgx, gy: target.tgy, gw: splitW, gh: target.tgh, x: target.tx, y: target.ty, w: w1, h: target.th };
    l2 = { gx: target.tgx + splitW, gy: target.tgy, gw: target.tgw - splitW, gh: target.tgh, x: target.tx + w1 + params.gap, y: target.ty, w: w2, h: target.th };
  } else {
    let splitH = floor(random(params.minSize, target.tgh - params.minSize + 1));
    let h1 = splitH * cellH + (splitH - 1) * params.gap;
    let h2 = (target.tgh - splitH) * cellH + (target.tgh - splitH - 1) * params.gap;
    
    l1 = { gx: target.tgx, gy: target.tgy, gw: target.tgw, gh: splitH, x: target.tx, y: target.ty, w: target.tw, h: h1 };
    l2 = { gx: target.tgx, gy: target.tgy + splitH, gw: target.tgw, gh: target.tgh - splitH, x: target.tx, y: target.ty + h1 + params.gap, w: target.tw, h: h2 };
  }
  
  target.setTarget(l1);
  
  let newBox = new BentoBox(target.x, target.y, target.w, target.h);
  newBox.bgCol = target.bgCol;
  newBox.fgCol = target.fgCol;
  newBox.setTarget(l2);
  boxes.push(newBox);
}

function mergeBoxes(activeBoxes) {
  let candidates = [];
  
  for (let i = 0; i < activeBoxes.length; i++) {
    for (let j = i + 1; j < activeBoxes.length; j++) {
      let b1 = activeBoxes[i];
      let b2 = activeBoxes[j];
      
      if (b1.tgy === b2.tgy && b1.tgh === b2.tgh && (b1.tgx + b1.tgw === b2.tgx || b2.tgx + b2.tgw === b1.tgx)) {
        candidates.push({ b1, b2, type: 'horz' });
      }
      else if (b1.tgx === b2.tgx && b1.tgw === b2.tgw && (b1.tgy + b1.tgh === b2.tgy || b2.tgy + b2.tgh === b1.tgy)) {
        candidates.push({ b1, b2, type: 'vert' });
      }
    }
  }
  
  if (candidates.length === 0) return;
  
  let pair = random(candidates);
  let b1 = pair.b1;
  let b2 = pair.b2;
  
  const margin = 40;
  const drawW = width - margin * 2;
  const drawH = height - margin * 2;
  const cellW = (drawW - (params.gridCols - 1) * params.gap) / params.gridCols;
  const cellH = (drawH - (params.gridRows - 1) * params.gap) / params.gridRows;

  let newLayout;
  if (pair.type === 'horz') {
    let left = b1.tgx < b2.tgx ? b1 : b2;
    let gw = b1.tgw + b2.tgw;
    let w = gw * cellW + (gw - 1) * params.gap;
    newLayout = { gx: left.tgx, gy: left.tgy, gw: gw, gh: left.tgh, x: left.tx, y: left.ty, w: w, h: left.th };
  } else {
    let top = b1.tgy < b2.tgy ? b1 : b2;
    let gh = b1.tgh + b2.tgh;
    let h = gh * cellH + (gh - 1) * params.gap;
    newLayout = { gx: top.tgx, gy: top.tgy, gw: top.tgw, gh: gh, x: top.tx, y: top.ty, w: top.tw, h: h };
  }
  
  b1.setTarget(newLayout);
  
  b2.setTarget({ 
    x: b2.x, 
    y: b2.y, 
    w: b2.w, 
    h: b2.h 
  });
  b2.isAbsorbed = true;

  const b1Index = boxes.indexOf(b1);
  if (b1Index > -1) {
    boxes.splice(b1Index, 1);
    boxes.push(b1);
  }
}

function draw() {
  blendMode(BLEND);
  rectMode(CORNER);
  noStroke();
  fill(params.bgColor);
  rect(0, 0, width, height);
  
  if (params.autoUpdate) {
    if (random(params.updateInterval) < 1) {
      updateLayout();
    }
  }
  
  time += params.speed * 0.02;

  for (let box of boxes) {
    box.update();
    box.display();
  }
  
  boxes = boxes.filter(b => !b.isDead);

  // スキャンライン効果
  if (params.scanline) {
    noStroke();
    fill(0, 50);
    for(let y=0; y<height; y+=4) {
      rect(0, y, width, 2);
    }
  }

  if (isExporting) {
    saveCanvas('eva_ui_' + exportSessionID + '_' + nf(exportCount + 1, 3), 'png');
    exportCount++;
    if (exportCount >= exportMax) {
      isExporting = false;
      console.log("Export finished");
    }
  }
}

class BentoBox {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.isDead = false;
    this.isAbsorbed = false;
    this.absorbedTimer = 0;
    
    this.tx = x; this.ty = y; this.tw = w; this.th = h;
    this.tgx = 0; this.tgy = 0; this.tgw = 0; this.tgh = 0;
    this.gx = 0; this.gy = 0; this.gw = 0; this.gh = 0;
    
    let colors = PALETTES[params.palette];
    this.bgCol = color(0, 0, 0, 200); // 半透明黒
    this.fgCol = color(random(colors.filter(c => c !== '#000000')));
    this.tFgCol = this.fgCol;

    this.type = random(['SoundOnly', 'HexGrid', 'SyncGraph', 'Target', 'Timer', 'Text', 'DNA', 'Radar', 'Emergency', 'MAGI', 'Approval', 'Waveform', 'Code', 'Status']);
    this.initTypeData();
  }

  initTypeData() {
    this.data = [];
    if (this.type === 'Text') {
      this.data = [random(['PATTERN BLUE', 'BLOOD TYPE: BLUE', 'UNIDENTIFIED', 'A.T. FIELD', 'ANALYSIS', 'MAGI SYSTEM', 'INTERNAL', 'EXTERNAL', 'LIMIT'])];
    } else if (this.type === 'SyncGraph') {
      for(let i=0; i<20; i++) this.data.push(random());
    } else if (this.type === 'DNA') {
      this.data = Array(10).fill(0).map(() => random());
    } else if (this.type === 'MAGI') {
      this.data = [0.33, 0.33, 0.34]; // MELCHIOR, BALTHASAR, CASPER
      this.magiColors = [
        color('#00FF00'), // MELCHIOR (Green)
        color('#FF9900'), // BALTHASAR (Orange)
        color('#FF0000')  // CASPER (Red)
      ];
    } else if (this.type === 'Approval') {
      this.approvalState = 0; // 0:Idle, 1:Voting, 2:Result
      this.approvalTimer = 0;
      this.votes = [false, false, false];
      this.result = false;
    } else if (this.type === 'Waveform') {
      this.data = Array(16).fill(0).map(() => random());
    } else if (this.type === 'Code') {
      this.data = [];
      for(let i=0; i<8; i++) this.data.push(this.generateHex());
    } else if (this.type === 'Status') {
      this.data = [random(), random(), random()];
    }
  }

  setTarget(layout) {
    this.tx = layout.x;
    this.ty = layout.y;
    this.tw = layout.w;
    this.th = layout.h;
    this.tgx = layout.gx;
    this.tgy = layout.gy;
    this.tgw = layout.gw;
    this.tgh = layout.gh;

    if (layout.w > 0) {
      let colors = PALETTES[params.palette];
      this.tFgCol = color(random(colors.filter(c => c !== '#000000')));
      this.type = random(['SoundOnly', 'HexGrid', 'SyncGraph', 'Target', 'Timer', 'Text', 'DNA', 'Radar', 'Emergency', 'MAGI', 'Approval', 'Waveform', 'Code', 'Status']);
      this.initTypeData();
    }
  }

  generateHex() {
    let s = "";
    for(let i=0; i<4; i++) s += floor(random(16)).toString(16).toUpperCase();
    return s;
  }

  update() {
    let ease = 0.1;
    this.x = lerp(this.x, this.tx, ease);
    this.y = lerp(this.y, this.ty, ease);
    this.w = lerp(this.w, this.tw, ease);
    this.h = lerp(this.h, this.th, ease);
    this.gx = this.tgx;
    this.gy = this.tgy;
    this.gw = this.tgw;
    this.gh = this.tgh;
    
    this.fgCol = lerpColor(this.fgCol, this.tFgCol, ease);
    
    if (this.tw === 0 && this.th === 0 && this.w < 1 && this.h < 1) {
      this.isDead = true;
    }
    if (this.isAbsorbed) {
      this.absorbedTimer++;
      if (this.absorbedTimer > 30) this.isDead = true;
    }
    
    if (this.type === 'SyncGraph') {
      if (frameCount % 5 === 0) {
        this.data.shift();
        this.data.push(noise(time + this.x) > 0.4 ? random() : 0.1);
      }
    } else if (this.type === 'MAGI') {
      // 3つの意見のせめぎ合い（ノイズで変動）
      let t = time * 2 + this.x * 0.01;
      let v1 = noise(t) * 0.8 + 0.1;
      let v2 = noise(t + 100) * 0.8 + 0.1;
      let v3 = noise(t + 200) * 0.8 + 0.1;
      
      // 正規化して合計を1.0にする
      let total = v1 + v2 + v3;
      this.data[0] = v1 / total;
      this.data[1] = v2 / total;
      this.data[2] = v3 / total;
    } else if (this.type === 'Approval') {
      this.approvalTimer++;
      if (this.approvalState === 0) { // Idle
        if (this.approvalTimer > 60) {
          this.approvalState = 1;
          this.approvalTimer = 0;
          // 投票結果を決定（ランダム）
          if (random() < 0.4) {
             this.votes = [true, true, false]; // 否決パターン（CASPERが拒否など）
          } else {
             this.votes = [true, true, true]; // 可決パターン
          }
        }
      } else if (this.approvalState === 1) { // Voting
        // 順番に投票を開示
        if (this.approvalTimer > 90) {
          this.approvalState = 2;
          this.approvalTimer = 0;
          let agreeCount = this.votes.filter(v => v).length;
          this.result = agreeCount >= 3; // 全会一致のみGRANTED
        }
      } else if (this.approvalState === 2) { // Result
        if (this.approvalTimer > 120) {
          this.approvalState = 0;
          this.approvalTimer = 0;
        }
      }
    } else if (this.type === 'Waveform') {
      if (frameCount % 2 === 0) {
        this.data.shift();
        this.data.push(noise(time * 10 + this.x) * 0.8 + 0.1);
      }
    } else if (this.type === 'Code') {
      if (frameCount % 5 === 0) {
        this.data.shift();
        this.data.push(this.generateHex());
      }
    } else if (this.type === 'Status') {
      for(let i=0; i<3; i++) {
        this.data[i] = noise(time + i * 100 + this.x) * 0.8 + 0.1;
      }
    }
  }

  display() {
    if (this.w < 1 || this.h < 1) return;

    // 枠描画
    stroke(this.fgCol);
    strokeWeight(2);
    fill(this.bgCol);
    rect(this.x, this.y, this.w, this.h);

    // コンテンツ
    push();
    translate(this.x, this.y);
    
    // クリップ
    let cx = this.w / 2;
    let cy = this.h / 2;
    let s = min(this.w, this.h);
    
    fill(this.fgCol);
    stroke(this.fgCol);

    if (this.type === 'SoundOnly') this.drawSoundOnly(cx, cy, s);
    else if (this.type === 'HexGrid') this.drawHexGrid(this.w, this.h, s);
    else if (this.type === 'SyncGraph') this.drawSyncGraph(this.w, this.h);
    else if (this.type === 'Target') this.drawTarget(cx, cy, s);
    else if (this.type === 'Timer') this.drawTimer(cx, cy, s);
    else if (this.type === 'Text') this.drawText(cx, cy, s);
    else if (this.type === 'DNA') this.drawDNA(this.w, this.h);
    else if (this.type === 'Radar') this.drawRadar(cx, cy, s);
    else if (this.type === 'Emergency') this.drawEmergency(this.w, this.h);
    else if (this.type === 'MAGI') this.drawMAGI(this.w, this.h);
    else if (this.type === 'Approval') this.drawApproval(this.w, this.h);
    else if (this.type === 'Waveform') this.drawWaveform(this.w, this.h);
    else if (this.type === 'Code') this.drawCode(this.w, this.h);
    else if (this.type === 'Status') this.drawStatus(this.w, this.h);

    pop();
  }

  drawSoundOnly(cx, cy, s) {
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(s * 0.15);
    text("SOUND", cx, cy - s*0.1);
    text("ONLY", cx, cy + s*0.1);
    
    // モノリス風の枠
    noFill();
    stroke(this.fgCol);
    strokeWeight(2);
    rectMode(CENTER);
    rect(cx, cy, s*0.8, s*0.5);
    rectMode(CORNER);
  }

  drawHexGrid(w, h, s) {
    noFill();
    stroke(this.fgCol);
    strokeWeight(1);
    
    let hexSize = 20;
    let dx = hexSize * 1.5;
    let dy = hexSize * sqrt(3);
    
    for(let y = 0; y < h + dy; y += dy/2) {
      for(let x = 0; x < w + dx; x += dx) {
        let xPos = x;
        if (Math.floor(y / (dy/2)) % 2 === 1) xPos += dx/2;
        
        // 六角形描画
        beginShape();
        for(let i=0; i<6; i++) {
          let angle = PI/3 * i;
          vertex(xPos + cos(angle)*hexSize*0.5, y + sin(angle)*hexSize*0.5);
        }
        endShape(CLOSE);
        
        // ランダムに塗りつぶし
        if (noise(x, y, time) > 0.7) {
          fill(this.fgCol);
          beginShape();
          for(let i=0; i<6; i++) {
            let angle = PI/3 * i;
            vertex(xPos + cos(angle)*hexSize*0.4, y + sin(angle)*hexSize*0.4);
          }
          endShape(CLOSE);
          noFill();
        }
      }
    }
  }

  drawSyncGraph(w, h) {
    noFill();
    stroke(this.fgCol);
    strokeWeight(2);
    
    beginShape();
    let step = w / (this.data.length - 1);
    for(let i=0; i<this.data.length; i++) {
      let val = this.data[i];
      let x = i * step;
      let y = h/2 + (val - 0.5) * h * 0.8;
      vertex(x, y);
    }
    endShape();
    
    // テキスト
    noStroke();
    fill(this.fgCol);
    textSize(10);
    textAlign(LEFT, TOP);
    text("HARMONICS", 5, 5);
    text("NORMAL", 5, h/2 - 15);
  }

  drawTarget(cx, cy, s) {
    noFill();
    stroke(this.fgCol);
    strokeWeight(1);
    
    ellipse(cx, cy, s*0.8);
    ellipse(cx, cy, s*0.4);
    
    line(cx - s*0.5, cy, cx + s*0.5, cy);
    line(cx, cy - s*0.5, cx, cy + s*0.5);
    
    // 回転する十字
    push();
    translate(cx, cy);
    rotate(time * 2);
    line(-s*0.2, 0, s*0.2, 0);
    line(0, -s*0.2, 0, s*0.2);
    pop();
    
    noStroke();
    fill(this.fgCol);
    textSize(8);
    text("LOCK ON", cx + 5, cy + 5);
  }

  drawTimer(cx, cy, s) {
    noStroke();
    fill(this.fgCol);
    textAlign(CENTER, CENTER);
    textSize(s * 0.3);
    
    let t = 600 - floor(time * 10) % 600;
    let sec = floor(t / 10);
    let ms = t % 10;
    text(nf(sec, 2) + ":" + nf(ms, 2), cx, cy);
    
    textSize(s * 0.1);
    text("TIME LIMIT", cx, cy - s*0.25);
  }

  drawText(cx, cy, s) {
    noStroke();
    fill(this.fgCol);
    textAlign(CENTER, CENTER);
    textSize(s * 0.15);
    
    // 点滅
    if (frameCount % 30 < 15) {
      text(this.data[0], cx, cy);
    }
    
    // 飾り枠
    noFill();
    stroke(this.fgCol);
    strokeWeight(2);
    rectMode(CENTER);
    rect(cx, cy, s*0.9, s*0.3);
    rectMode(CORNER);
  }

  drawDNA(w, h) {
    let barH = h / this.data.length;
    noStroke();
    
    for(let i=0; i<this.data.length; i++) {
      let val = this.data[i];
      let y = i * barH;
      
      fill(this.fgCol);
      rect(0, y, w * val, barH - 2);
      
      fill(this.fgCol);
      rect(w * (1-val), y, w * val, barH - 2);
      
      // 中央の文字
      fill(0);
      textSize(8);
      textAlign(CENTER, CENTER);
      text(["A","T","G","C"][i%4], w/2, y + barH/2);
    }
  }

  drawRadar(cx, cy, s) {
    noFill();
    stroke(this.fgCol);
    strokeWeight(1);
    
    // 扇形
    arc(cx, cy, s*0.8, s*0.8, PI, TWO_PI);
    line(cx - s*0.4, cy, cx + s*0.4, cy);
    line(cx, cy, cx, cy - s*0.4);
    
    // スキャン
    let angle = PI + abs(sin(time)) * PI;
    line(cx, cy, cx + cos(angle)*s*0.4, cy + sin(angle)*s*0.4);
  }

  drawEmergency(w, h) {
    // 六角形の連続パターン
    let hexW = 30;
    let hexH = 26;
    noStroke();
    
    for(let y=0; y<h; y+=hexH) {
      for(let x=0; x<w; x+=hexW) {
        let offset = (Math.floor(y/hexH)%2) * (hexW/2);
        
        // 赤と黒の点滅
        if ((Math.floor(x/hexW) + Math.floor(y/hexH) + floor(time*5)) % 2 === 0) {
          fill(this.fgCol);
        } else {
          fill(this.bgCol);
        }
        
        // 簡易六角形（菱形）
        push();
        translate(x + offset, y);
        beginShape();
        vertex(0, -hexH/2);
        vertex(hexW/2, 0);
        vertex(0, hexH/2);
        vertex(-hexW/2, 0);
        endShape(CLOSE);
        pop();
      }
    }
    
    // 中央に文字
    fill(255);
    stroke(0);
    strokeWeight(4);
    textSize(min(w, h) * 0.2);
    textAlign(CENTER, CENTER);
    text("EMERGENCY", w/2, h/2);
  }

  drawMAGI(w, h) {
    // 背景クリア
    noStroke();
    fill(0);
    rect(0, 0, w, h);
    
    let labels = ["MELCHIOR", "BALTHASAR", "CASPER"];
    let currentY = 0;
    
    for(let i=0; i<3; i++) {
      let barH = this.data[i] * h;
      
      // バー描画
      fill(this.magiColors[i]);
      // 境界線のために少し隙間を空ける
      rect(0, currentY, w, barH - 1);
      
      // ラベル描画
      fill(0);
      textSize(min(w, h) * 0.1);
      textAlign(LEFT, CENTER);
      text(labels[i], 5, currentY + barH/2);
      
      // 数値描画
      textAlign(RIGHT, CENTER);
      text(nf(this.data[i] * 100, 2, 1) + "%", w - 5, currentY + barH/2);
      
      currentY += barH;
    }
    
    // 否定（CASPER/Red）が過半数を超えた場合のアラート
    if (this.data[2] > 0.5 && frameCount % 20 < 10) {
      noFill();
      stroke(255, 0, 0);
      strokeWeight(4);
      rect(0, 0, w, h);
      
      // 中央にREJECTED表示
      fill(255, 0, 0);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(min(w, h) * 0.25);
      text("REJECTED", w/2, h/2);
    }
  }

  drawApproval(w, h) {
    noStroke();
    fill(0);
    rect(0, 0, w, h);
    
    let names = ["MELCHIOR", "BALTHASAR", "CASPER"];
    let stepH = h / 3;
    
    for(let i=0; i<3; i++) {
      let y = i * stepH;
      
      // 枠線
      stroke(this.fgCol);
      strokeWeight(1);
      noFill();
      rect(0, y, w, stepH);
      
      // 状態に応じた表示
      if (this.approvalState === 1) {
        // 投票中
        if (this.approvalTimer > i * 20 + 10) {
           // 投票済み
           if (this.votes[i]) fill(0, 255, 0); // Green
           else fill(255, 0, 0); // Red
           rect(0, y, w, stepH);
           
           fill(0);
           noStroke();
           textAlign(CENTER, CENTER);
           textSize(min(w, stepH) * 0.4);
           text(this.votes[i] ? "AGREE" : "DISAGREE", w/2, y + stepH/2);
        } else {
           // 投票待ち
           fill(this.fgCol);
           noStroke();
           textAlign(LEFT, CENTER);
           textSize(min(w, stepH) * 0.3);
           text(names[i], 10, y + stepH/2);
        }
      } else if (this.approvalState === 2) {
        // 結果表示中（全て開示）
         if (this.votes[i]) fill(0, 255, 0);
         else fill(255, 0, 0);
         rect(0, y, w, stepH);
         
         fill(0);
         noStroke();
         textAlign(CENTER, CENTER);
         textSize(min(w, stepH) * 0.4);
         text(names[i], w/2, y + stepH/2);
      } else {
        // Idle
        fill(this.fgCol);
        noStroke();
        textAlign(LEFT, CENTER);
        textSize(min(w, stepH) * 0.3);
        text(names[i], 10, y + stepH/2);
      }
    }
    
    // 最終結果オーバーレイ
    if (this.approvalState === 2 && frameCount % 10 < 5) {
      fill(this.result ? color(0, 255, 0) : color(255, 0, 0));
      textAlign(CENTER, CENTER);
      textSize(min(w, h) * 0.25);
      text(this.result ? "GRANTED" : "DENIED", w/2, h/2);
    }
  }

  drawWaveform(w, h) {
    noStroke();
    fill(this.fgCol);
    let barW = w / this.data.length;
    for(let i=0; i<this.data.length; i++) {
      let val = this.data[i];
      let barH = val * h * 0.8;
      rect(i * barW, h/2 - barH/2, barW - 1, barH);
    }
  }

  drawCode(w, h) {
    noStroke();
    fill(this.fgCol);
    textSize(min(w, h) * 0.15);
    textAlign(LEFT, TOP);
    let lh = h / this.data.length;
    for(let i=0; i<this.data.length; i++) {
      text(this.data[i] + " " + this.data[i], 5, i * lh);
    }
  }

  drawStatus(w, h) {
    let labels = ["SYNC", "FUEL", "TEMP"];
    let barH = h / 3;
    noStroke();
    textSize(min(w, h) * 0.15);
    textAlign(LEFT, CENTER);
    
    for(let i=0; i<3; i++) {
      let y = i * barH;
      let val = this.data[i];
      
      fill(this.fgCol);
      text(labels[i], 5, y + barH/2);
      
      // Bar bg
      fill(red(this.fgCol), green(this.fgCol), blue(this.fgCol), 50);
      let barX = w * 0.3;
      let barW = w * 0.65;
      rect(barX, y + 5, barW, barH - 10);
      
      // Bar fill
      fill(this.fgCol);
      rect(barX, y + 5, barW * val, barH - 10);
    }
  }
}

window.guiConfig = [
  { folder: 'System', contents: [
    { object: params, variable: 'seed', min: 0, max: 10000, step: 1, name: 'Seed', listen: true, onChange: () => generateBento(true) },
    { object: params, variable: 'depth', min: 1, max: 8, step: 1, name: 'Depth', onChange: () => generateBento(true) },
    { object: params, variable: 'gridCols', min: 1, max: 20, step: 1, name: 'Cols', onChange: () => generateBento(true) },
    { object: params, variable: 'gridRows', min: 1, max: 20, step: 1, name: 'Rows', onChange: () => generateBento(true) },
    { object: params, variable: 'gap', min: 0, max: 20, name: 'Gap', onChange: () => generateBento(true) },
    { object: params, variable: 'regenerate', name: 'Re-Initialize', type: 'function' }
  ]},
  { folder: 'Display', contents: [
    { object: params, variable: 'palette', options: Object.keys(PALETTES), name: 'Mode', onChange: () => generateBento(false) },
    { object: params, variable: 'bgColor', type: 'color', name: 'Background' },
    { object: params, variable: 'speed', min: 0, max: 5.0, name: 'Anim Speed' },
    { object: params, variable: 'scanline', name: 'Scanlines' },
    { object: params, variable: 'autoUpdate', name: 'Auto Update' },
    { object: params, variable: 'updateInterval', min: 1, max: 120, step: 1, name: 'Update Interval' }
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
  if (key === 'r' || key === 'R') generateBento(true);
}


