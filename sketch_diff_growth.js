// Differential Growth Simulation
// Organic, Coral-like patterns

const params = {
  maxNodes: 10000,
  growthSpeed: 1.0,
  repulsionRadius: 8,
  attractionForce: 0.5,
  repulsionForce: 0.8,
  alignmentForce: 0.1,
  edgeForce: 0.5, // 画面内に留める力
  noiseInfluence: 0.1,
  rotationForce: 0.0,
  colorMode: 'Rainbow', // Rainbow, Heat, Ocean, Mono, BWB
  drawMode: 'Line', // Line, Points
  lineWidth: 2,
  startLines: 5,
  exportFrames: 600,
  exportStart: () => startExport(),
  reset: () => initSimulation()
};

let paths = [];
let isExporting = false;
let exportCount = 0;
let exportMax = 0;
let exportSessionID = "";

function setup() {
  let c = createCanvas(1920, 1080);
  pixelDensity(1);
  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '100vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');

  colorMode(HSB, 360, 100, 100, 100);
  initSimulation();
}

function initSimulation() {
  paths = [];
  for (let j = 0; j < params.startLines; j++) {
    let path = [];
    let r = random(20, 50);
    let cx = random(width * 0.2, width * 0.8);
    let cy = random(height * 0.2, height * 0.8);
    let numStart = 10;
    for (let i = 0; i < numStart; i++) {
      let angle = map(i, 0, numStart, 0, TWO_PI);
      let x = cx + cos(angle) * r;
      let y = cy + sin(angle) * r;
      path.push(new Node(x, y));
    }
    paths.push(path);
  }
}

function draw() {
  blendMode(BLEND);
  rectMode(CORNER);
  noStroke();
  fill(0);
  rect(0, 0, width, height);

  // 空間分割（Spatial Hash）による高速化
  // 斥力計算の対象を近傍のノードに限定する
  let grid = {};
  let cellSize = params.repulsionRadius * 2;
  
  // 全ノードをフラットな配列にまとめる（総数チェックと空間ハッシュ用）
  let allNodes = [];
  for (let path of paths) {
    allNodes.push(...path);
  }
  
  for (let n of allNodes) {
      let key = floor(n.pos.x / cellSize) + ',' + floor(n.pos.y / cellSize);
      if (!grid[key]) grid[key] = [];
      grid[key].push(n);
  }

  // 物理演算更新
  for (let path of paths) {
    for (let i = 0; i < path.length; i++) {
      let n = path[i];
      
      // 1. 隣接ノードへの引力（鎖を維持する力）
      let prev = path[(i - 1 + path.length) % path.length];
      let next = path[(i + 1) % path.length];
      
      let f1 = p5.Vector.sub(prev.pos, n.pos);
      let dist1 = f1.mag();
      f1.normalize();
      // バネのように、理想的な距離（repulsionRadius）に近づこうとする
      f1.mult((dist1 - params.repulsionRadius) * params.attractionForce); 
      n.applyForce(f1);

      let f2 = p5.Vector.sub(next.pos, n.pos);
      let dist2 = f2.mag();
      f2.normalize();
      f2.mult((dist2 - params.repulsionRadius) * params.attractionForce);
      n.applyForce(f2);

      // 2. 他のノードからの斥力（重ならないようにする力）
      let gx = floor(n.pos.x / cellSize);
      let gy = floor(n.pos.y / cellSize);
      
      for (let x = gx - 1; x <= gx + 1; x++) {
          for (let y = gy - 1; y <= gy + 1; y++) {
              let key = x + ',' + y;
              if (grid[key]) {
                  for (let other of grid[key]) {
                      if (other === n) continue;
                      let dir = p5.Vector.sub(n.pos, other.pos);
                      let d = dir.mag();
                      if (d > 0 && d < params.repulsionRadius * 2) {
                          dir.normalize();
                          let force = (params.repulsionRadius * 2 - d) * params.repulsionForce;
                          dir.mult(force);
                          n.applyForce(dir);
                      }
                  }
              }
          }
      }
      
      // 3. 画面中央への引力 / 画面端からの斥力
      let center = createVector(width/2, height/2);
      let distToCenter = p5.Vector.dist(n.pos, center);
      if (distToCenter > height * 0.45) {
          let pushIn = p5.Vector.sub(center, n.pos);
          pushIn.normalize();
          pushIn.mult(params.edgeForce);
          n.applyForce(pushIn);
      }
      
      // 4. ノイズによる揺らぎ
      let noiseVal = noise(n.pos.x * 0.01, n.pos.y * 0.01, frameCount * 0.01);
      let noiseAngle = noiseVal * TWO_PI * 4;
      let noiseForce = p5.Vector.fromAngle(noiseAngle);
      noiseForce.mult(params.noiseInfluence);
      n.applyForce(noiseForce);

      // 5. 全体を回す力
      if (params.rotationForce !== 0) {
        let dir = p5.Vector.sub(n.pos, center);
        let tangent = createVector(-dir.y, dir.x);
        tangent.normalize();
        tangent.mult(params.rotationForce);
        n.applyForce(tangent);
      }
    }
  }

  // 位置更新と成長（ノード挿入）
  for (let n of allNodes) {
    n.update();
  }
  
  // 成長: 隣り合うノードの距離が離れすぎたら、間に新しいノードを挿入
  if (allNodes.length < params.maxNodes) {
      for (let path of paths) {
          for (let i = path.length - 1; i >= 0; i--) {
            let n = path[i];
            let next = path[(i + 1) % path.length];
            let d = p5.Vector.dist(n.pos, next.pos);
            
            if (d > params.repulsionRadius * 1.5) {
                let newPos = p5.Vector.add(n.pos, next.pos).div(2);
                let newNode = new Node(newPos.x, newPos.y);
                path.splice((i + 1) % path.length, 0, newNode);
                allNodes.push(newNode); // カウントチェック用に一時追加
                if (allNodes.length >= params.maxNodes) break;
            }
          }
          if (allNodes.length >= params.maxNodes) break;
      }
  }

  // 描画
  if (params.drawMode === 'Line') {
      noFill();
      strokeWeight(params.lineWidth);
      // グラデーションのために線分ごとに描画
      for (let path of paths) {
        for (let i = 0; i < path.length; i++) {
            let n1 = path[i];
            let n2 = path[(i + 1) % path.length];
            let col = getColor(i, path.length);
            stroke(col);
            line(n1.pos.x, n1.pos.y, n2.pos.x, n2.pos.y);
        }
      }
  } else if (params.drawMode === 'Points') {
      noStroke();
      for (let path of paths) {
        for (let i = 0; i < path.length; i++) {
            let n = path[i];
            let col = getColor(i, path.length);
            fill(col);
            ellipse(n.pos.x, n.pos.y, params.lineWidth * 2);
        }
      }
  }

  // 書き出し処理
  if (isExporting) {
    saveCanvas('diff_growth_' + exportSessionID + '_' + nf(exportCount + 1, 3), 'png');
    exportCount++;
    if (exportCount >= exportMax) {
      isExporting = false;
      console.log("Export finished");
    }
  }
}

function getColor(index, total) {
    let hueVal = 0;
    if (params.colorMode === 'Rainbow') {
        hueVal = (index / total * 360 + frameCount) % 360;
        return color(hueVal, 80, 100);
    } else if (params.colorMode === 'Heat') {
        hueVal = map(sin(index * 0.05 + frameCount * 0.05), -1, 1, 0, 60);
        return color(hueVal, 100, 100);
    } else if (params.colorMode === 'Ocean') {
        hueVal = map(sin(index * 0.05 + frameCount * 0.05), -1, 1, 180, 260);
        return color(hueVal, 80, 100);
    } else if (params.colorMode === 'BWB') {
        let t = (index / total + frameCount * 0.01) % 1;
        let br = (1 - abs(t - 0.5) * 2) * 100;
        return color(0, 0, br);
    } else {
        return color(0, 0, 100);
    }
}

class Node {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.maxSpeed = 2;
  }

  applyForce(force) {
    this.acc.add(force);
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed * params.growthSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);
    this.vel.mult(0.9); // 摩擦
  }
}

window.guiConfig = [
  { folder: 'Simulation', contents: [
    { object: params, variable: 'maxNodes', min: 100, max: 20000, step: 100, name: 'Max Nodes' },
    { object: params, variable: 'startLines', min: 1, max: 20, step: 1, name: 'Start Lines' },
    { object: params, variable: 'growthSpeed', min: 0.1, max: 5.0, name: 'Speed' },
    { object: params, variable: 'repulsionRadius', min: 8, max: 50, name: 'Radius' },
    { object: params, variable: 'attractionForce', min: 0.1, max: 2.0, name: 'Attraction' },
    { object: params, variable: 'repulsionForce', min: 0.1, max: 2.0, name: 'Repulsion' },
    { object: params, variable: 'edgeForce', min: 0.1, max: 2.0, name: 'Edge Force' },
    { object: params, variable: 'noiseInfluence', min: 0, max: 2.0, name: 'Noise' },
    { object: params, variable: 'rotationForce', min: -5.0, max: 5.0, name: 'Rotation' },
    { object: params, variable: 'reset', name: 'Reset', type: 'function' }
  ]},
  { folder: 'Style', contents: [
    { object: params, variable: 'colorMode', options: ['Rainbow', 'Heat', 'Ocean', 'Mono', 'BWB'], name: 'Color' },
    { object: params, variable: 'drawMode', options: ['Line', 'Points'], name: 'Draw Mode' },
    { object: params, variable: 'lineWidth', min: 0.5, max: 10, name: 'Width' }
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
  if (key === 'r' || key === 'R') initSimulation();
}