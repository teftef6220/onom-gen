// --- 設定とグローバル変数 ---
const params = {
  layerCount: 20,
  baseRadius: 100,
  radiusStep: 40,
  noiseScale: 0.5,
  distortion: 100,
  speed: 1.0,
  smoothness: true,
  fill: true,
  stroke: true,
  strokeWidth: 2,
  colorMode: 'Iridescent',
  bgColor: '#111111',
  blendMode: 'normal', // normal, multiply, screen, overlay
  exportFrames: 600,
  exportMP4: function() { startExportMP4(); },
  exportPNG: function() { startExportPNG(); }
};

// カラーパレット
const PALETTES = {
  Iridescent: ['#00FFFF', '#0088FF', '#FF00FF', '#FF0088', '#8800FF'],
  Magma: ['#FF0000', '#FF4400', '#FF8800', '#FFCC00', '#FFFF00'],
  Forest: ['#003300', '#006600', '#009900', '#00CC00', '#00FF00'],
  Mono: ['#FFFFFF', '#DDDDDD', '#AAAAAA', '#888888', '#555555'],
  Midnight: ['#03045E', '#0077B6', '#00B4D8', '#90E0EF', '#CAF0F8']
};

window.guiConfig = [
  { folder: 'Generator', contents: [
    { object: params, variable: 'layerCount', min: 1, max: 50, step: 1, name: 'Layers', onFinishChange: initLayers },
    { object: params, variable: 'baseRadius', min: 10, max: 500, name: 'Base Radius', onFinishChange: initLayers },
    { object: params, variable: 'radiusStep', min: 5, max: 100, name: 'Step', onFinishChange: initLayers },
    { object: params, variable: 'noiseScale', min: 0.1, max: 5.0, name: 'Noise Scale' },
    { object: params, variable: 'distortion', min: 0, max: 300, name: 'Distortion' },
    { object: params, variable: 'speed', min: 0, max: 5.0, name: 'Speed' },
    { object: params, variable: 'smoothness', name: 'Smooth' }
  ]},
  { folder: 'Style', contents: [
    { object: params, variable: 'colorMode', options: Object.keys(PALETTES), name: 'Palette', onChange: initLayers },
    { object: params, variable: 'bgColor', type: 'color', name: 'Background' },
    { object: params, variable: 'blendMode', options: ['normal', 'multiply', 'screen', 'overlay', 'difference'], name: 'Blend Mode', onChange: initLayers },
    { object: params, variable: 'fill', name: 'Fill', onChange: initLayers },
    { object: params, variable: 'stroke', name: 'Stroke', onChange: initLayers },
    { object: params, variable: 'strokeWidth', min: 0.1, max: 10, name: 'Stroke Width', onChange: initLayers }
  ]},
  { folder: 'Export', contents: [
    { object: params, variable: 'exportFrames', min: 60, max: 1200, step: 1, name: 'Frames' },
    { object: params, variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },
    { object: params, variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }
  ]}
];

let simplex = new SimplexNoise();
let layers = [];
let time = 0;

// 書き出し用変数
let isExporting = false;
let exportMax = 0;

window.onload = function() {
  // Canvas設定
  const canvas = document.getElementById('myCanvas');
  // 解像度を固定 (2560x1440)
  canvas.width = 2560;
  canvas.height = 1440;
  
  // CSSでウィンドウに合わせる
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  canvas.style.maxHeight = '100vh';
  canvas.style.display = 'block';
  canvas.style.margin = '0 auto';

  // Paper.jsのセットアップ
  paper.setup(canvas);
  
  initLayers();

  // アニメーションループ
  paper.view.onFrame = function(event) {
    if (!isExporting && (!window.exporter || !window.exporter.isExporting)) {
      update(event.delta);
    }
  };
};

function initLayers() {
  // 既存のレイヤーを削除
  paper.project.activeLayer.removeChildren();
  layers = [];

  // 背景
  const bg = new paper.Path.Rectangle(paper.view.bounds);
  bg.fillColor = params.bgColor;
  bg.sendToBack();

  const center = paper.view.center;
  const colors = PALETTES[params.colorMode];

  for (let i = 0; i < params.layerCount; i++) {
    // 外側から内側へ、またはその逆
    // ここでは大きい順に描画して重ねる（奥から手前）
    let r = params.baseRadius + (params.layerCount - 1 - i) * params.radiusStep;
    
    // 円を作成
    let path = new paper.Path.Circle(center, r);
    
    // 頂点数を増やす（滑らかな変形のため）
    // 半径に応じて頂点数を調整
    let segmentCount = Math.floor(r / 5); 
    if (segmentCount < 20) segmentCount = 20;
    if (segmentCount > 100) segmentCount = 100;
    
    // 一旦リセットして頂点を再配置
    path.removeSegments();
    for (let j = 0; j < segmentCount; j++) {
      let angle = (j / segmentCount) * Math.PI * 2;
      let x = center.x + Math.cos(angle) * r;
      let y = center.y + Math.sin(angle) * r;
      path.add(new paper.Point(x, y));
    }
    path.closed = true;

    // スタイル設定
    let col = colors[i % colors.length];
    if (params.fill) {
      path.fillColor = col;
    } else {
      path.fillColor = null;
    }
    
    if (params.stroke) {
      path.strokeColor = params.fill ? new paper.Color(0, 0, 0, 0.2) : col;
      path.strokeWidth = params.strokeWidth;
    } else {
      path.strokeColor = null;
    }

    path.blendMode = params.blendMode;

    // カスタムプロパティ
    path.data = {
      baseRadius: r,
      index: i,
      noiseOffset: Math.random() * 1000
    };

    layers.push(path);
  }
}

function update(delta) {
  time += params.speed * delta;

  const center = paper.view.center;

  // 背景色の更新（GUI変更対応）
  if (paper.project.activeLayer.children[0]) {
    paper.project.activeLayer.children[0].fillColor = params.bgColor;
  }

  layers.forEach(path => {
    const segments = path.segments;
    const baseR = path.data.baseRadius;
    const idx = path.data.index;
    const offset = path.data.noiseOffset;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // 元の円周上の位置を計算（簡易的）
      // 厳密には初期位置を保存すべきだが、ここでは角度から再計算
      const vector = segment.point.subtract(center);
      const angle = Math.atan2(vector.y, vector.x);
      
      // ノイズ計算
      // 3Dノイズ (cos(angle), sin(angle), time) でシームレスなループを作る
      // noiseScaleでノイズの細かさ、distortionで変形の大きさ
      const ns = params.noiseScale * 0.01; // スケール調整
      
      // 円環状のノイズ空間をサンプリング
      const nx = Math.cos(angle) * baseR * ns;
      const ny = Math.sin(angle) * baseR * ns;
      const nz = time * 0.5 + idx * 0.1; // レイヤーごとに時間をずらす

      const noiseVal = simplex.noise3D(nx, ny, nz);
      
      // 半径の変化
      const r = baseR + noiseVal * params.distortion;
      
      // 新しい位置
      segment.point.x = center.x + Math.cos(angle) * r;
      segment.point.y = center.y + Math.sin(angle) * r;
    }

    // パスを滑らかにする
    if (params.smoothness) {
      path.smooth({ type: 'continuous' });
    }
  });

  // 書き出し処理
  if (isExporting || (window.exporter && window.exporter.isExporting)) {
    window.exporter.captureFrame(document.getElementById('myCanvas'));
    
    if (!window.exporter.isExporting) {
      isExporting = false;
    } else {
      setTimeout(() => {
        update(1.0 / 30.0); // 30fps想定の固定デルタで次フレームを進める
      }, 30); // export_module側のエンコード処理を待つための余白
    }
  }
}

// --- 書き出し機能 ---

async function startExportMP4() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  exportMax = params.exportFrames;
  let suggestedName = `sketch015_${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}_${String(new Date().getHours()).padStart(2,'0')}${String(new Date().getMinutes()).padStart(2,'0')}.mp4`;
  // Paper.js canvas size is 2560x1440
  await window.exporter.startMP4(2560, 1440, 24, exportMax, suggestedName);
  
  isExporting = true;
  update(1.0/30.0); // start the first frame
}

async function startExportPNG() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  exportMax = params.exportFrames;
  let prefix = `sketch015_${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}_${String(new Date().getHours()).padStart(2,'0')}${String(new Date().getMinutes()).padStart(2,'0')}`;
  await window.exporter.startPNG(24, exportMax, prefix);
  
  isExporting = true;
  update(1.0/30.0); // start the first frame
}


