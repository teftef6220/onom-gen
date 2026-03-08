// Slime Mold Simulation (Physarum)
// Organic transport network formation based on Jeff Jones' algorithm

const params = {
  agentCount: 5000,
  sensorAngle: 45,
  sensorDist: 9,
  turnAngle: 45,
  speed: 1.0,
  decay: 0.95,
  diffuse: 1.0,
  simScale: 2, // Resolution divisor (1 = full res, 2 = half res)
  startMode: 'Circle', // Circle, Random, Inward
  colorMode: 'Toxic', // Toxic, Mono, Heat, Bio
  contrast: 2.0,
  scrollSpeedX: 0.0,
  scrollSpeedY: 0.0,
  noiseStrength: 0.0,
  showAgents: false,
  agentSizeMin: 2.0,
  agentSizeMax: 5.0,
  obstacles: false,
  obstacleMode: 'Random', // Random, Text
  obstacleCount: 10,
  obstacleSize: 30,
  obstacleText: 'SLIME',
  obstacleTextSize: 100,
  obstacleColor: '#646464',
  agentColor: '#FFFFFF',
  agentHitColor: '#FF0000',
  obstacleAvoidForce: 3.0,
  exportFrames: 600,
  exportMP4: () => startExportMP4(),
  exportPNG: () => startExportPNG(),
  reset: () => initSimulation()
};

let agents = [];
let grid; // Float32Array for trail values
let nextGrid;
let obstacleGrid;
let obstacleImg;
let agentGraphics;
let simW, simH;
let imgBuffer;
let gui;
let scrollX = 0;
let scrollY = 0;

// 書き出し用変数
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

  initSimulation();
}

function initSimulation() {
  simW = floor(width / params.simScale);
  simH = floor(height / params.simScale);
  
  // グリッド初期化
  grid = new Float32Array(simW * simH);
  nextGrid = new Float32Array(simW * simH);
  imgBuffer = createImage(simW, simH);
  obstacleGrid = new Float32Array(simW * simH);
  obstacleImg = createImage(simW, simH);
  agentGraphics = createGraphics(simW, simH);
  
  // 障害物の生成
  if (params.obstacles) {
    if (params.obstacleMode === 'Random') {
      for (let i = 0; i < params.obstacleCount; i++) {
        let ox = random(simW);
        let oy = random(simH);
        let or = random(5, params.obstacleSize);
        
        let minX = floor(ox - or);
        let maxX = ceil(ox + or);
        let minY = floor(oy - or);
        let maxY = ceil(oy + or);
        
        for(let y = minY; y <= maxY; y++) {
          for(let x = minX; x <= maxX; x++) {
             if (dist(x, y, ox, oy) < or) {
               let wx = (x + simW) % simW;
               let wy = (y + simH) % simH;
               obstacleGrid[wx + wy * simW] = 1;
             }
          }
        }
      }
    } else if (params.obstacleMode === 'Text') {
      let gr = createGraphics(simW, simH);
      gr.pixelDensity(1);
      gr.background(0);
      gr.fill(255);
      gr.noStroke();
      gr.textAlign(CENTER, CENTER);
      gr.textSize(params.obstacleTextSize);
      gr.textStyle(BOLD);
      gr.text(params.obstacleText, simW / 2, simH / 2);
      gr.loadPixels();
      
      for (let i = 0; i < simW * simH; i++) {
        if (gr.pixels[i * 4] > 100) {
          obstacleGrid[i] = 1;
        }
      }
      gr.remove();
    }
  }

  // 障害物画像の生成（表示用）
  if (params.obstacles) {
    obstacleImg.loadPixels();
    let obsC = color(params.obstacleColor);
    let r = red(obsC);
    let g = green(obsC);
    let b = blue(obsC);
    for (let i = 0; i < obstacleGrid.length; i++) {
      if (obstacleGrid[i] > 0) {
        obstacleImg.pixels[i*4] = r;
        obstacleImg.pixels[i*4+1] = g;
        obstacleImg.pixels[i*4+2] = b;
        obstacleImg.pixels[i*4+3] = 255;
      } else {
        obstacleImg.pixels[i*4+3] = 0;
      }
    }
    obstacleImg.updatePixels();
  }
  
  // エージェント初期化
  scrollX = 0;
  scrollY = 0;
  agents = [];
  let attempts = 0;
  while(agents.length < params.agentCount && attempts < params.agentCount * 2) {
    attempts++;
    let x, y, angle;
    if (params.startMode === 'Random') {
      x = random(simW);
      y = random(simH);
      angle = random(TWO_PI);
    } else if (params.startMode === 'Circle') {
      let r = min(simW, simH) * 0.3;
      let theta = random(TWO_PI);
      x = simW/2 + cos(theta) * r;
      y = simH/2 + sin(theta) * r;
      angle = theta + PI; // 外向き
    } else if (params.startMode === 'Inward') {
      let r = min(simW, simH) * 0.45;
      let theta = random(TWO_PI);
      x = simW/2 + cos(theta) * r;
      y = simH/2 + sin(theta) * r;
      angle = theta + PI; // 内向き（中心へ）
    }
    
    // 障害物の中に生成された場合はスキップ
    let ix = floor(x + simW) % simW;
    let iy = floor(y + simH) % simH;
    if (params.obstacles && obstacleGrid[ix + iy * simW] > 0) continue;

    agents.push({ x, y, angle, sizeFactor: random(), hitObstacle: false });
  }
}

function draw() {
  // 1. エージェントの移動と堆積
  for(let agent of agents) {
    // センサー位置の計算
    let xc = agent.x + cos(agent.angle) * params.sensorDist;
    let yc = agent.y + sin(agent.angle) * params.sensorDist;
    let xl = agent.x + cos(agent.angle - radians(params.sensorAngle)) * params.sensorDist;
    let yl = agent.y + sin(agent.angle - radians(params.sensorAngle)) * params.sensorDist;
    let xr = agent.x + cos(agent.angle + radians(params.sensorAngle)) * params.sensorDist;
    let yr = agent.y + sin(agent.angle + radians(params.sensorAngle)) * params.sensorDist;
    
    // グリッド値の取得
    let vc = getGridValue(xc, yc);
    let vl = getGridValue(xl, yl);
    let vr = getGridValue(xr, yr);
    
    // 方向転換（最も値が高い方へ）
    let currentTurnAngle = params.turnAngle;
    // 前方が障害物（負の値）の場合、旋回力を強める
    if (vc < 0) {
        currentTurnAngle *= params.obstacleAvoidForce;
    }

    if (vc > vl && vc > vr) {
      // そのまま
    } else if (vc < vl && vc < vr) {
      agent.angle += (random() - 0.5) * 2 * radians(currentTurnAngle);
    } else if (vl > vr) {
      agent.angle -= radians(currentTurnAngle);
    } else if (vr > vl) {
      agent.angle += radians(currentTurnAngle);
    }
    
    // ノイズによる揺らぎを追加
    if (params.noiseStrength > 0) {
      let n = noise(agent.x * 0.01, agent.y * 0.01, frameCount * 0.01);
      agent.angle += (n - 0.5) * params.noiseStrength;
    }
    
    // 移動
    agent.x += cos(agent.angle) * params.speed;
    agent.y += sin(agent.angle) * params.speed;
    
    // 画面端のラップ処理
    if (agent.x < 0) agent.x += simW;
    if (agent.x >= simW) agent.x -= simW;
    if (agent.y < 0) agent.y += simH;
    if (agent.y >= simH) agent.y -= simH;
    
    // 痕跡を残す
    let idx = floor(agent.x) + floor(agent.y) * simW;
    if (idx >= 0 && idx < grid.length) {
      grid[idx] = 1.0; 
      
      // 障害物判定（スクロール考慮）
      let shiftX = scrollX / params.simScale;
      let shiftY = scrollY / params.simScale;
      let obsX = floor(agent.x + shiftX);
      let obsY = floor(agent.y + shiftY);
      obsX = (obsX % simW + simW) % simW;
      obsY = (obsY % simH + simH) % simH;
      let obsIdx = obsX + obsY * simW;

      if (params.obstacles && obstacleGrid[obsIdx] > 0) {
        agent.hitObstacle = true;
      } else {
        agent.hitObstacle = false;
      }
    }
  }
  
  // 2. 拡散と減衰 (Diffusion & Decay)
  // 3x3 平均化フィルタ
  for (let y = 0; y < simH; y++) {
    for (let x = 0; x < simW; x++) {
      let idx = x + y * simW;
      let sum = 0;
      
      // 近傍9マス
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          let nx = (x + dx + simW) % simW;
          let ny = (y + dy + simH) % simH;
          sum += grid[nx + ny * simW];
        }
      }
      
      let avg = sum / 9.0;
      nextGrid[idx] = avg * params.decay;
    }
  }
  
  // バッファの入れ替え
  let temp = grid;
  grid = nextGrid;
  nextGrid = temp;
  
  // 3. 描画
  background(0);
  
  let obsC = color(params.obstacleColor);
  let obsR = red(obsC);
  let obsG = green(obsC);
  let obsB = blue(obsC);

  imgBuffer.loadPixels();
  for (let i = 0; i < grid.length; i++) {
    let val = grid[i];

    val = pow(val, params.contrast);
    let r, g, b;
    
    if (params.colorMode === 'Mono') {
      r = g = b = val * 255;
    } else if (params.colorMode === 'Toxic') {
      r = val * 50; g = val * 255; b = val * 100;
    } else if (params.colorMode === 'Heat') {
      r = val * 255; g = val * 100; b = val * 50;
    } else if (params.colorMode === 'Bio') {
      r = val * 50; g = val * 200; b = val * 255;
    }
    
    imgBuffer.pixels[i*4] = r;
    imgBuffer.pixels[i*4+1] = g;
    imgBuffer.pixels[i*4+2] = b;
    imgBuffer.pixels[i*4+3] = 255;
  }
  imgBuffer.updatePixels();
  
  // エージェントの描画（別バッファ）
  if (params.showAgents) {
    agentGraphics.clear();
    agentGraphics.noStroke();
    
    let cNormal = color(params.agentColor);
    cNormal.setAlpha(200);
    let cHit = color(params.agentHitColor);
    cHit.setAlpha(200);

    for(let agent of agents) {
      if (agent.hitObstacle) agentGraphics.fill(cHit);
      else agentGraphics.fill(cNormal);
      
      let s = map(agent.sizeFactor, 0, 1, params.agentSizeMin, params.agentSizeMax);
      agentGraphics.circle(agent.x, agent.y, s);
    }
  }

  // スクロール更新
  scrollX += params.scrollSpeedX;
  scrollY += params.scrollSpeedY;

  // 画面端のラップアラウンド描画（4枚並べてシームレスにする）
  let ox = scrollX % width;
  let oy = scrollY % height;
  if (ox < 0) ox += width;
  if (oy < 0) oy += height;

  image(imgBuffer, ox, oy, width, height);
  image(imgBuffer, ox - width, oy, width, height);
  image(imgBuffer, ox, oy - height, width, height);
  image(imgBuffer, ox - width, oy - height, width, height);

  if (params.showAgents) {
    image(agentGraphics, ox, oy, width, height);
    image(agentGraphics, ox - width, oy, width, height);
    image(agentGraphics, ox, oy - height, width, height);
    image(agentGraphics, ox - width, oy - height, width, height);
  }
  
  // 障害物の描画（固定位置）
  if (params.obstacles) {
    image(obstacleImg, 0, 0, width, height);
  }
  
  // 書き出し処理
  if (isExporting || (window.exporter && window.exporter.isExporting)) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
      isExporting = false;
      console.log("Export finished");
    }
  }
}

function getGridValue(x, y) {
  let ix = floor(x + simW) % simW;
  let iy = floor(y + simH) % simH;
  let idx = ix + iy * simW;
  
  // 障害物判定（スクロール考慮）
  let shiftX = scrollX / params.simScale;
  let shiftY = scrollY / params.simScale;
  let obsX = floor(x + shiftX);
  let obsY = floor(y + shiftY);
  obsX = (obsX % simW + simW) % simW;
  obsY = (obsY % simH + simH) % simH;
  let obsIdx = obsX + obsY * simW;

  if (params.obstacles && obstacleGrid[obsIdx] > 0) {
    return -1.0; 
  }
  return grid[idx];
}

window.guiConfig = [
  { folder: 'Simulation', contents: [
    { object: params, variable: 'agentCount', min: 100, max: 20000, step: 100, name: 'Agents', onFinishChange: initSimulation },
    { object: params, variable: 'simScale', min: 1, max: 10, step: 1, name: 'Scale (Res)', onFinishChange: initSimulation },
    { object: params, variable: 'startMode', options: ['Circle', 'Random', 'Inward'], name: 'Start Mode', onFinishChange: initSimulation },
    { object: params, variable: 'speed', min: 0.1, max: 5.0, name: 'Speed' },
    { object: params, variable: 'sensorAngle', min: 0, max: 180, name: 'Sensor Angle' },
    { object: params, variable: 'sensorDist', min: 1, max: 50, name: 'Sensor Dist' },
    { object: params, variable: 'turnAngle', min: 0, max: 180, name: 'Turn Angle' },
    { object: params, variable: 'noiseStrength', min: 0, max: 2.0, name: 'Noise Force' },
    { object: params, variable: 'decay', min: 0.8, max: 0.999, name: 'Decay Rate' },
    { object: params, variable: 'showAgents', name: 'Show Agents' },
    { object: params, variable: 'agentColor', type: 'color', name: 'Agent Color' },
    { object: params, variable: 'agentHitColor', type: 'color', name: 'Hit Color' },
    { object: params, variable: 'agentSizeMin', min: 0.1, max: 10.0, name: 'Size Min' },
    { object: params, variable: 'agentSizeMax', min: 0.1, max: 10.0, name: 'Size Max' },
    { object: params, variable: 'scrollSpeedX', min: -10.0, max: 10.0, name: 'Scroll X' },
    { object: params, variable: 'scrollSpeedY', min: -10.0, max: 10.0, name: 'Scroll Y' },
    { object: params, variable: 'reset', name: 'Reset', type: 'function' }
  ]},
  { folder: 'Obstacles', contents: [
    { object: params, variable: 'obstacles', name: 'Enable', onFinishChange: initSimulation },
    { object: params, variable: 'obstacleMode', options: ['Random', 'Text'], name: 'Mode', onFinishChange: initSimulation },
    { object: params, variable: 'obstacleCount', min: 1, max: 50, step: 1, name: 'Count', onFinishChange: initSimulation },
    { object: params, variable: 'obstacleSize', min: 5, max: 100, name: 'Size', onFinishChange: initSimulation },
    { object: params, variable: 'obstacleText', name: 'Text', onFinishChange: initSimulation },
    { object: params, variable: 'obstacleTextSize', min: 10, max: 500, name: 'Text Size', onFinishChange: initSimulation },
    { object: params, variable: 'obstacleColor', type: 'color', name: 'Color' },
    { object: params, variable: 'obstacleAvoidForce', min: 1.0, max: 10.0, name: 'Avoid Force' }
  ]},
  { folder: 'Style', contents: [
    { object: params, variable: 'colorMode', options: ['Toxic', 'Mono', 'Heat', 'Bio'], name: 'Color Mode' },
    { object: params, variable: 'contrast', min: 0.1, max: 5.0, name: 'Contrast' }
  ]},
  { folder: 'Export', contents: [
    { object: params, variable: 'exportFrames', min: 60, max: 1200, step: 1, name: 'Frames' },
    { object: params, variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },
    { object: params, variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }
  ]}
];

async function startExportMP4() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  exportMax = params.exportFrames;
  let suggestedName = `sketch043_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}.mp4`;
  await window.exporter.startMP4(width, height, 30, exportMax, suggestedName);
  isExporting = true;
}

async function startExportPNG() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  exportMax = params.exportFrames;
  let prefix = `sketch043_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}`;
  await window.exporter.startPNG(30, exportMax, prefix);
  isExporting = true;
}

function keyPressed() {
  if (key === 'm' || key === 'M') startExportMP4();
  if (key === 'p' || key === 'P') startExportPNG();
  if (key === 'r' || key === 'R') initSimulation();
}