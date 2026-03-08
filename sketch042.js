// カラーパレット定義
const PALETTES = {
  'Vibrant': ['#FF0055', '#0000FF', '#FFFF00', '#00FF00', '#00FFFF'],
  'Pastel': ['#FFB7B2', '#B5EAD7', '#E2F0CB', '#FFDAC1', '#C7CEEA'],
  'Mono': ['#FFFFFF', '#DDDDDD', '#AAAAAA', '#555555', '#222222'],
  'Dark': ['#1A1A1D', '#4E4E50', '#6F2232', '#950740', '#C3073F'],
  'Neon': ['#F72585', '#7209B7', '#3A0CA3', '#4361EE', '#4CC9F0'],
  'Earth': ['#606C38', '#283618', '#FEFAE0', '#DDA15E', '#BC6C25'],
  'Retro': ['#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51'],
  'Pop': ['#FF0099', '#FFCC00', '#00CCFF', '#9900FF', '#FF3300'],
  'Candy': ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF9F1C', '#F7FFF7'],
  'Acid': ['#CCFF00', '#FF00CC', '#00FFFF', '#FFFF00', '#FF3333']
};

const params = {
  gridSize: 12,        // グリッドの分割数
  shapeSize: 0.7,      // セルに対する図形のサイズ比率
  sizeVariation: 0.5,  // 個別のサイズばらつき
  pulseSpeed: 0.05,    // サイズ変化の追従速度
  pulseInterval: 60,   // サイズ変化の間隔（フレーム）
  pulseAmplitude: 0.1, // 脈動の振幅
  shapeType: 'box',    // 図形の種類
  mixShapes: true,     // 図形をランダムに混ぜるか
  maxMerge: 3,         // グリッドの最大結合サイズ
  autoShuffle: true,   // 自動的にレイアウトを変更するか
  switchInterval: 120, // レイアウト変更間隔
  staggerFrames: 40,   // ばらつきのフレーム幅
  smoothness: 0.1,     // 動きの滑らかさ
  scrollSpeed: 0.02,   // スクロール速度
  rotationSpeed: 0.02, // 回転速度
  palette: 'Pop',      // カラーパレット
  bgColor: '#111111',  // 背景色
  isOrtho: true,       // 正投影かどうか
  
  // 書き出し設定
  exportMax: 300,
  exportMP4: () => startExportMP4(),
  exportPNG: () => startExportPNG(),
  regenerate: () => generateGrid()
};

let saveCount = 0;
let isExporting = false;
let exportMaxVal = 0;
let cellAgents = []; // セルエージェントの配列
let switchTimer = 0;
let scrollOffset = 0;
let gridRows = 0;

function setup() {
  // WEBGLモードでキャンバス作成
  let c = createCanvas(1920, 1080, WEBGL);
  pixelDensity(1);
  
  // キャンバスをウィンドウ内に収めるためのCSS設定
  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('display', 'block');

  generateGrid();
  updateCamera();
}

function draw() {
  background(params.bgColor);

  // スクロール更新
  scrollOffset += params.scrollSpeed;

  // 自動更新タイマー
  if (params.autoShuffle) {
    switchTimer++;
    if (switchTimer > params.switchInterval) {
      generateGrid();
      switchTimer = 0;
    }
  }
  
  // ライト設定（立体感を出す）
  ambientLight(100);
  directionalLight(255, 255, 255, 0.5, 1, -0.5);
  pointLight(200, 200, 200, -width/2, -height/2, 500);

  // グリッド計算
  let cellSize = Math.min(width, height) / params.gridSize;
  noStroke();

  // エージェントの更新と描画
  for (let agent of cellAgents) {
    agent.update();
    agent.display(cellSize);
  }

  // 書き出し処理
  handleExport();
}

function forceUpdate() {
  generateGrid();
  switchTimer = 0;
}

function generateGrid() {
  // 新しいレイアウトを計算
  let cols = params.gridSize;
  let rows = params.gridSize;
  if (width > height) {
    cols = Math.floor(params.gridSize * (width / height));
  } else {
    rows = Math.floor(params.gridSize * (height / width));
  }
  gridRows = rows;

  // グリッドの使用状況を管理する2次元配列
  let gridMap = Array(cols).fill().map(() => Array(rows).fill(false));
  let currentPalette = PALETTES[params.palette];
  const types = ['box', 'sphere', 'cone', 'torus', 'cylinder'];

  // グリッドの中心オフセット
  let startX = -((cols - 1) * 1) / 2; // cellSizeは1として正規化座標で計算
  let startY = -((rows - 1) * 1) / 2;

  let newLayouts = [];

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (gridMap[i][j]) continue; // 既に埋まっている場合はスキップ

      // この位置で確保できる最大サイズを決定
      let maxSize = 1;
      let attemptSize = int(random(1, params.maxMerge + 1));

      // 大きいサイズから順に配置可能かチェック
      for (let s = attemptSize; s >= 1; s--) {
        if (canFit(i, j, s, cols, rows, gridMap)) {
          maxSize = s;
          break;
        }
      }

      // グリッドを埋める
      for (let u = 0; u < maxSize; u++) {
        for (let v = 0; v < maxSize; v++) {
          gridMap[i + u][j + v] = true;
        }
      }

      // セル情報を保存
      // 中心座標（正規化）
      let cx = startX + (i + (maxSize - 1) * 0.5);
      let cy = startY + (j + (maxSize - 1) * 0.5);
      let colorIndex = (i + j) % currentPalette.length;

      newLayouts.push({
        x: cx,
        y: cy,
        gridI: i, // 回転オフセット計算用
        gridJ: j,
        size: maxSize,
        scale: random(1.0 - params.sizeVariation, 1.0), // 個別のスケール
        type: params.mixShapes ? random(types) : params.shapeType,
        color: currentPalette[colorIndex]
      });
    }
  }

  // エージェントプールを調整
  while (cellAgents.length < newLayouts.length) {
    cellAgents.push(new CellAgent());
  }

  // ターゲットを割り当て
  for (let i = 0; i < cellAgents.length; i++) {
    if (i < newLayouts.length) {
      cellAgents[i].setTarget(newLayouts[i]);
    } else {
      cellAgents[i].setTarget(null); // 余ったエージェントは非表示へ
    }
  }
}

window.guiConfig = [
  { folder: 'Visuals', contents: [
    { object: params, variable: 'gridSize', min: 4, max: 30, step: 1, name: 'Grid Size', onChange: forceUpdate },
    { object: params, variable: 'shapeSize', min: 0.1, max: 1.5, name: 'Shape Size' },
    { object: params, variable: 'sizeVariation', min: 0, max: 1, name: 'Size Variation', onChange: forceUpdate },
    { object: params, variable: 'pulseSpeed', min: 0.01, max: 0.2, name: 'Pulse Speed' },
    { object: params, variable: 'pulseInterval', min: 10, max: 300, step: 10, name: 'Pulse Interval' },
    { object: params, variable: 'pulseAmplitude', min: 0, max: 0.5, name: 'Pulse Amplitude' },
    { object: params, variable: 'shapeType', options: ['box', 'sphere', 'cone', 'torus', 'cylinder'], name: 'Shape Type', onChange: forceUpdate },
    { object: params, variable: 'mixShapes', name: 'Mix Shapes', onChange: forceUpdate },
    { object: params, variable: 'maxMerge', min: 1, max: 6, step: 1, name: 'Max Merge', onChange: forceUpdate },
    { object: params, variable: 'autoShuffle', name: 'Auto Shuffle' },
    { object: params, variable: 'switchInterval', min: 30, max: 600, step: 10, name: 'Change Interval' },
    { object: params, variable: 'staggerFrames', min: 0, max: 100, step: 1, name: 'Stagger Frames' },
    { object: params, variable: 'smoothness', min: 0.01, max: 0.5, name: 'Smoothness' },
    { object: params, variable: 'scrollSpeed', min: -0.2, max: 0.2, name: 'Scroll Speed' },
    { object: params, variable: 'rotationSpeed', min: 0, max: 0.1, name: 'Rotation Speed' },
    { object: params, variable: 'isOrtho', name: 'Orthographic', onChange: updateCamera },
    { object: params, variable: 'bgColor', type: 'color', name: 'Background' },
    { object: params, variable: 'palette', options: Object.keys(PALETTES), name: 'Palette', onChange: forceUpdate },
    { object: params, variable: 'regenerate', name: 'Regenerate Layout', type: 'function' }
  ]},
  { folder: 'Export', contents: [
    { object: params, variable: 'exportMax', min: 10, max: 600, step: 10, name: 'Max Frames' },
    { object: params, variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },
    { object: params, variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }
  ]}
];

function canFit(x, y, size, cols, rows, map) {
  if (x + size > cols || y + size > rows) return false;
  for (let u = 0; u < size; u++) {
    for (let v = 0; v < size; v++) {
      if (map[x + u][y + v]) return false;
    }
  }
  return true;
}

// --- CellAgent Class ---
class CellAgent {
  constructor() {
    this.pos = createVector(0, 0, 0);
    this.targetPos = createVector(0, 0, 0);
    this.size = 0;
    this.targetSize = 0;
    this.col = color(255);
    this.targetCol = color(255);
    this.type = 'box';
    this.targetType = 'box';
    this.scale = 1.0;
    this.targetScale = 1.0;
    this.gridI = 0;
    this.gridJ = 0;
    
    this.pendingLayout = undefined;
    this.delayTimer = 0;

    this.pulseScale = 1.0;
    this.targetPulseScale = 1.0;
    this.pulseTimer = int(random(100)); // 初期タイミングをずらす
  }

  setTarget(layout) {
    this.pendingLayout = layout;
    this.delayTimer = int(random(params.staggerFrames));
  }

  update() {
    // 遅延処理
    if (this.delayTimer > 0) {
      this.delayTimer--;
    } else if (this.pendingLayout !== undefined) {
      const layout = this.pendingLayout;
      if (layout) {
        this.targetPos.set(layout.x, layout.y, 0);
        this.targetSize = layout.size;
        this.targetType = layout.type;
        this.targetCol = color(layout.color);
        this.targetScale = layout.scale;
        this.gridI = layout.gridI;
        this.gridJ = layout.gridJ;
      } else {
        this.targetSize = 0; // 消える
      }
      this.pendingLayout = undefined;
    }

    this.pos.lerp(this.targetPos, params.smoothness);
    this.size = lerp(this.size, this.targetSize, params.smoothness);
    this.col = lerpColor(this.col, this.targetCol, params.smoothness);
    this.scale = lerp(this.scale, this.targetScale, params.smoothness);
    
    // ランダムなサイズ変化の更新
    this.pulseTimer++;
    if (this.pulseTimer > params.pulseInterval) {
      this.targetPulseScale = 1.0 + random(-params.pulseAmplitude, params.pulseAmplitude);
      // 次の変化までの間隔にも少しランダム性を持たせる
      this.pulseTimer = int(random(-params.pulseInterval * 0.5, params.pulseInterval * 0.5));
    }
    this.pulseScale = lerp(this.pulseScale, this.targetPulseScale, params.pulseSpeed);

    // 形状はターゲットに切り替える
    this.type = this.targetType;
  }

  display(cellSize) {
    if (this.size < 0.01) return;

    let h = gridRows;
    let y = this.pos.y + scrollOffset;
    // yを [-h/2, h/2] の範囲にラップする
    y = ((y + h/2) % h + h) % h - h/2;

    this.drawShape(this.pos.x, y, cellSize);

    // 画面端でのループ処理（継ぎ目をなくすために上下にコピーを描画）
    let margin = 2.0; // 余裕を持って判定
    if (y > h/2 - margin) this.drawShape(this.pos.x, y - h, cellSize);
    if (y < -h/2 + margin) this.drawShape(this.pos.x, y + h, cellSize);
  }

  drawShape(x, y, cellSize) {
    push();
    translate(x * cellSize, y * cellSize, 0);

    // アニメーション用の回転
    let offset = (this.gridI + this.gridJ) * 0.2;
    let angleX = frameCount * params.rotationSpeed + offset;
    let angleY = frameCount * params.rotationSpeed * 0.5 + offset;
    rotateX(angleX);
    rotateY(angleY);

    fill(this.col);
    
    let objSize = cellSize * this.size * params.shapeSize * this.scale * this.pulseScale;
    
    switch (this.type) {
      case 'box': box(objSize); break;
      case 'sphere': sphere(objSize / 1.5); break;
      case 'cone': cone(objSize / 1.5, objSize); break;
      case 'torus': torus(objSize / 2, objSize / 6); break;
      case 'cylinder': cylinder(objSize / 2, objSize); break;
    }
    pop();
  }
}

function updateCamera() {
  if (params.isOrtho) {
    // 正投影（パースなし）
    ortho(-width / 2, width / 2, -height / 2, height / 2, 0, 5000);
  } else {
    // 透視投影（パースあり）
    perspective();
  }
}

function windowResized() {
  // 固定サイズのためリサイズ処理は不要
}

async function startExportMP4() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  exportMaxVal = params.exportMax;
  let suggestedName = `sketch042_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}.mp4`;
  await window.exporter.startMP4(width, height, 30, exportMaxVal, suggestedName);
  
  isExporting = true;
}

async function startExportPNG() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  exportMaxVal = params.exportMax;
  let prefix = `sketch042_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}`;
  await window.exporter.startPNG(30, exportMaxVal, prefix);
  
  isExporting = true;
}

function handleExport() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
      isExporting = false;
      console.log("Export finished");
    }
  }
}

function keyPressed() {
  if (key === 'm' || key === 'M') startExportMP4();
  if (key === 'p' || key === 'P') startExportPNG();
}