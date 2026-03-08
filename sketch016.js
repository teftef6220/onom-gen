// Non-overlapping Random Lines Sketch

const params = {
  targetCount: 500,
  minLength: 20,
  maxLength: 150,
  strokeWidth: 2.0,
  widthVariance: 0.5,
  speed: 5, // 1フレームに追加する試行回数
  maxAttempts: 200, // 配置場所を探す最大試行回数
  bgColor: '#000000',
  animSpeed: 0.01,
  segmentRatio: 0.3,
  horizontalOnly: false,
  stagger: 1.0, // タイミングのずれ具合 (0.0: 同期 ~ 1.0: ランダム)
  scrollSpeed: 0.5, // スクロール速度
  exportFrames: 600,
  exportMP4: () => startExportMP4(),
  exportPNG: () => startExportPNG(),
  reset: () => resetLines()
};

let gui;
let lines = [];
let time = 0;
let scrollOffset = 0;

// 書き出し用変数
let isExporting = false;
let exportMax = 0;

function setup() {
  let c = createCanvas(1980, 1080);
  pixelDensity(1);

  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '100vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');

  resetLines();
}

function resetLines() {
  lines = [];
  time = 0;
  scrollOffset = 0;
  background(params.bgColor);
}

function draw() {
  // 背景描画（毎回クリアして全線分を描画し直す）
  blendMode(BLEND);
  rectMode(CORNER);
  noStroke();
  fill(params.bgColor);
  rect(0, 0, width, height);

  time += params.animSpeed;
  scrollOffset += params.scrollSpeed;
  let cycleLen = 1.0 + 2 * params.segmentRatio;

  // 新しい線分を追加（目標数に達するまで）
  if (lines.length < params.targetCount) {
    for (let i = 0; i < params.speed; i++) {
      addLine();
    }
  }

  // 線分の描画
  strokeCap(ROUND);
  
  for (let l of lines) {
    // アニメーション更新（グローバル時間と個別の位相を使用）
    let t = (time + l.phase * params.stagger * cycleLen) % cycleLen;
    let progress = t - params.segmentRatio;

    // 線分の一部（スライディングする白い線）を描画
    let tStart = constrain(progress, 0, 1);
    let tEnd = constrain(progress + params.segmentRatio, 0, 1);

    if (tStart < tEnd) {
      // スクロール座標計算（ループ処理）
      let dy = l.y2 - l.y1;
      let y1 = (l.y1 + scrollOffset) % height;
      if (y1 < 0) y1 += height;
      let y2 = y1 + dy;
      
      const drawSegment = (offsetY) => {
        let ly1 = y1 + offsetY;
        let ly2 = y2 + offsetY;
        let lx1 = lerp(l.x1, l.x2, tStart);
        let lY1 = lerp(ly1, ly2, tStart);
        let lx2 = lerp(l.x1, l.x2, tEnd);
        let lY2 = lerp(ly1, ly2, tEnd);
        
        let w = params.strokeWidth;
        if (params.widthVariance > 0) w *= (1 + (l.widthRand - 0.5) * params.widthVariance * 2);
        strokeWeight(max(0.1, w));
        stroke(255);
        line(lx1, lY1, lx2, lY2);
      };

      drawSegment(0);
      if (max(y1, y2) > height) drawSegment(-height);
      if (min(y1, y2) < 0) drawSegment(height);
    }
  }

  // 書き出し処理
  if (isExporting) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
       isExporting = false;
    }
  }
}

function addLine() {
  // 配置場所を探す
  for (let i = 0; i < params.maxAttempts; i++) {
    let x1 = random(width);
    let y1 = random(height);
    let len = random(params.minLength, params.maxLength);
    let angle;
    if (params.horizontalOnly) {
      angle = random([0, PI]);
    } else {
      angle = random(TWO_PI);
    }
    let x2 = x1 + cos(angle) * len;
    let y2 = y1 + sin(angle) * len;

    // 画面外チェック
    if (x2 < 0 || x2 > width || y2 < 0 || y2 > height) continue;

    // 交差判定
    let intersects = false;
    for (let other of lines) {
      if (checkIntersection(x1, y1, x2, y2, other.x1, other.y1, other.x2, other.y2)) {
        intersects = true;
        break;
      }
    }

    if (!intersects) {
      lines.push({
        x1, y1, x2, y2,
        phase: random(1.0), // アニメーションの位相 (0.0 ~ 1.0)
        widthRand: random(1.0)
      });
      return; // 追加成功したら終了
    }
  }
}

// 線分同士の交差判定 (x1,y1)-(x2,y2) と (x3,y3)-(x4,y4)
function checkIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
  let den = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  
  // 平行な場合
  if (den === 0) return false;

  let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / den;
  let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / den;

  // 両方のパラメータが 0以上1以下なら交差している
  // 端点での接触も「重なり」とみなして除外する場合は <=, >= を使用
  return (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1);
}

// --- UI & Export Logic ---

window.guiConfig = [
  { folder: 'Generator', contents: [
    { object: params, variable: 'targetCount', min: 10, max: 2000, step: 10, name: 'Target Count' },
    { object: params, variable: 'speed', min: 1, max: 50, step: 1, name: 'Gen Speed' },
    { object: params, variable: 'minLength', min: 5, max: 200, name: 'Min Length' },
    { object: params, variable: 'maxLength', min: 5, max: 500, name: 'Max Length' },
    { object: params, variable: 'horizontalOnly', name: 'Horizontal Only', onChange: resetLines },
    { object: params, variable: 'reset', name: 'Regenerate', type: 'function' }
  ]},
  { folder: 'Style', contents: [
    { object: params, variable: 'bgColor', type: 'color', name: 'Background' },
    { object: params, variable: 'strokeWidth', min: 0.5, max: 10, name: 'Width' },
    { object: params, variable: 'widthVariance', min: 0, max: 1.0, name: 'Width Variance' },
    { object: params, variable: 'animSpeed', min: 0.001, max: 0.05, name: 'Anim Speed' },
    { object: params, variable: 'segmentRatio', min: 0.05, max: 1.0, name: 'Line Length' },
    { object: params, variable: 'stagger', min: 0, max: 1.0, name: 'Stagger' },
    { object: params, variable: 'scrollSpeed', min: -5.0, max: 5.0, name: 'Scroll Speed' }
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
  let suggestedName = `sketch016_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}.mp4`;
  await window.exporter.startMP4(width, height, 30, exportMax, suggestedName);
  
  isExporting = true;
}

async function startExportPNG() {
  if (isExporting || window.exporter.isExporting) return;
  
  exportMax = params.exportFrames;
  let prefix = `sketch016_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}`;
  await window.exporter.startPNG(30, exportMax, prefix);
  
  isExporting = true;
}

function keyPressed() {
  if (key === 'm' || key === 'M') startExportMP4();
  if (key === 'p' || key === 'P') startExportPNG();
  if (key === 'r' || key === 'R') resetLines();
}