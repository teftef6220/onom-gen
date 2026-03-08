// ネオン・サイバーパンク カラーパレット
const PALETTE_NEON = [
  '#FF0055', // ネオンピンク
  '#00FFCC', // ネオンシアン
  '#CCFF00', // ネオンライム
  '#AA00FF', // ネオンパープル
  '#0088FF'  // エレクトリックブルー
];

const PALETTE_MONO = [
  '#FFFFFF', // 白
  '#AAAAAA', // ライトグレー
  '#666666', // グレー
  '#333333'  // ダークグレー
];

var isColorful = true;
var isExporting = false;
var exportMax = 600;
let time = 0; // アニメーションの進行度
let seed = 0; // 乱数シード（パターン固定用）
let noiseSeedVal = 0; // ノイズシード（形状用）
let currentFrame = 0; // アニメーションフレームカウンター

var speed = 0.005;
var noiseAmp = 300;
var noiseScale = 0.01;
var jump = true;
var particle = true;

function setup() {
  let c = createCanvas(1980, 1080);
  pixelDensity(1);

  // CSS設定（ウィンドウに合わせて縮小表示）
  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '80vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');
  c.style('box-shadow', '0 0 20px rgba(0,0,0,0.8)'); // 影をつけて浮き上がらせる

  // noLoop(); // アニメーションさせるため削除
  seed = random(10000); // 初期の乱数シードを決定
  noiseSeedVal = random(10000);
}

function draw() {
  // 60フレームごとにシードを更新してジャンプさせる（書き出し中以外も有効）
  if (currentFrame > 0 && currentFrame % 60 === 0 && jump) {
    // p5.jsのrandom()だと固定シードの影響で毎回同じ値になるため、Math.random()を使う
    noiseSeedVal = Math.random() * 10000; 
  }

  randomSeed(seed); // フレームごとに乱数系列を固定（これでチラつきを防ぐ）
  noiseSeed(noiseSeedVal);

  clear();
  blendMode(BLEND);
//   background(0); // 完全な黒背景
    fill(0);
    rect(0,0,width,height);


  // 発光感を出すために加算合成を使用
  blendMode(ADD);

  let currentPalette = isColorful ? PALETTE_NEON : PALETTE_MONO;

  // 時間を進める（アニメーション速度）
  time += speed;

  // --- 描画ロジック: Neon Flow Fields ---
  drawNeonWaves(currentPalette);

  // --- 書き出し処理 ---
  if (isExporting || (window.exporter && window.exporter.isExporting)) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
      isExporting = false;
      noLoop();
    }
  }

  // フレームカウンターを進める
  currentFrame++;
}

function drawNeonWaves(colors) {
  let numLines = int(350); // 線の数
  let yStep = height / numLines;

  noFill();
  
  // ランダムなシード値で毎回違う波形にする
  let t = time; // 時間経過で滑らかに変化させる

  for (let i = 0; i < numLines; i++) {
    let col = color(random(colors));
    // 透明度をランダムにして奥行き感を出す
    col.setAlpha(random(50, 200));
    stroke(col);
    
    // 線の太さもランダムに
    strokeWeight(random(1, 4));

    beginShape();
    // 画面左から右へ頂点を打っていく
    for (let x = -100; x < width + 100; x += 10) {
      // ノイズを使ってY座標を計算
      // x: 水平位置, i: 線のインデックス, t: 全体のランダムシード
      // x座標にもtimeを反映させて、波が横に流れるようにする（往復感を解消）
      let n = noise(x * noiseScale - t, i * 0.05, t * 0.2);
      
      // サイン波とノイズを組み合わせてうねりを作る
      let yOffset = map(n, 0, 1, -noiseAmp, noiseAmp);
      // サイン波の位相もずらして進行波にする
      let sineWave = sin(x * 0.005 + i * 0.01 - t * 2) * 100;
      
      let y = i * yStep + yOffset + sineWave;
      
      // 画面中央に近づくほど振幅を大きくするなどの工夫も可能
      curveVertex(x, y);
    }
    endShape();
  }

  // アクセントとしてパーティクル（光の粒）を散らす
  if (particle) {
    drawParticles(colors);
  }
}

function drawParticles(colors) {
  let numParticles = int(random(50, 200));
  noStroke();
  
  for (let i = 0; i < numParticles; i++) {
    let col = color(random(colors));
    col.setAlpha(random(100, 255));
    fill(col);
    
    // 基本位置
    let xBase = random(width);
    let yBase = random(height);
    let size = random(2, 8);
    
    // 時間経過でふわふわと漂う動きを加える
    let xOffset = map(noise(i * 0.1, time * 0.2), 0, 1, -50, 50);
    let yOffset = map(noise(i * 0.1 + 100, time * 0.2), 0, 1, -50, 50);
    
    ellipse(xBase + xOffset, yBase + yOffset, size, size);
  }
}

// --- UI & Export Logic (共通機能) ---

var guiConfig = [
  { variable: 'exportMax', min: 10, max: 1000, step: 10, name: '書き出し枚数' },
  { variable: 'isColorful', name: 'カラーモード' },
  { variable: 'speed', min: 0, max: 0.03, step: 0.001, name: '速度' },
  { variable: 'noiseAmp', min: 0, max: 600, step: 10, name: 'ノイズ幅' },
  { variable: 'noiseScale', min: 0.001, max: 0.05, step: 0.001, name: '横ノイズ' },
  { variable: 'jump', name: 'ジャンプ' },
  { variable: 'particle', name: 'パーティクル' },
  { variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },
  { variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }
];

async function startExportMP4() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  let suggestedName = `sketch027_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}.mp4`;
  await window.exporter.startMP4(width, height, 30, exportMax, suggestedName);
  
  isExporting = true;
  currentFrame = 0; // 書き出し開始時にフレームカウントをリセットしてジャンプタイミングを合わせる
  loop();
}

async function startExportPNG() {
  if (isExporting || (window.exporter && window.exporter.isExporting)) return;
  
  let prefix = `sketch027_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}`;
  await window.exporter.startPNG(30, exportMax, prefix);
  
  isExporting = true;
  currentFrame = 0; // 書き出し開始時にフレームカウントをリセットしてジャンプタイミングを合わせる
  loop();
}

function keyPressed() {
  if (key === 'm' || key === 'M') startExportMP4();
  if (key === 'p' || key === 'P') startExportPNG();
  if (key === 'c' || key === 'C') { isColorful = !isColorful; }
}

// キャンバスをクリックしたら新しいパターン（シード）を生成
function mousePressed() {
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    // ここも固定シードの影響を受けないよう Math.random() を使用
    seed = Math.random() * 10000;
    noiseSeedVal = Math.random() * 10000;
  }
}