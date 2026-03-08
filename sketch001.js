// Bento Grid Pop
// Recursive grid layout with playful widgets

const params = {
  seed: 12345,
  depth: 8,
  gridCols: 6,
  gridRows: 4,
  minSize: 1, // 最小グリッド数
  gap: 8,
  cornerRadius: 16,
  speed: 1.0,
  bgColor: '#000000',
  palette: 'Red', // Red, Blue, Yellow, Green, Magenta
  autoUpdate: true,
  updateInterval: 20,
  fuiDecoration: true,
  exportFrames: 600,
  exportMP4: () => startExportMP4(),
  exportPNG: () => startExportPNG(),
  regenerate: () => generateBento(true)
};

let boxes = [];
let time = 0;

// カラーパレット
const PALETTES = {
  Red: ['#000000', '#000000', '#FFFFFF', '#FF0000'],
  Blue: ['#000000', '#FFFFFF', '#0000FF'],
  Yellow: ['#000000', '#FFFFFF', '#FFFF00'],
  Green: ['#000000', '#FFFFFF', '#00FF00'],
  Magenta: ['#000000', '#FFFFFF', '#FF00FF']
};

// 書き出し用変数
let isExporting = false;
// let exportCount = 0;
let exportMax = 0;
// let exportSessionID = "";

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
  strokeCap(ROUND);
  strokeJoin(ROUND);

  // フォント設定
  textFont('Arial, Helvetica, sans-serif');
  textStyle(BOLD);

  generateBento();
}

function generateBento(forceReset = false) {
  if (forceReset) {
    params.seed = floor(random(10000));
    boxes = []; // 強制リセット時はクリア
  }
  randomSeed(params.seed);

  let layouts = [];

  // グリッドベースの分割
  divideGrid(0, 0, params.gridCols, params.gridRows, params.depth, layouts);

  // グリッド座標をピクセル座標に変換
  const margin = 40;
  const drawW = width - margin * 2;
  const drawH = height - margin * 2;
  const cellW = (drawW - (params.gridCols - 1) * params.gap) / params.gridCols;
  const cellH = (drawH - (params.gridRows - 1) * params.gap) / params.gridRows;

  // layoutsにピクセル情報を付加
  layouts.forEach(l => {
    l.x = margin + l.gx * (cellW + params.gap);
    l.y = margin + l.gy * (cellH + params.gap);
    l.w = l.gw * cellW + (l.gw - 1) * params.gap;
    l.h = l.gh * cellH + (l.gh - 1) * params.gap;
  });

  // 1. ボックスの数を調整（足りなければ分裂させて追加）
  if (boxes.length < layouts.length) {
    let numToAdd = layouts.length - boxes.length;
    // 表示されているボックスから親候補を選ぶ
    let visibleBoxes = boxes.filter(b => b.w > 10 && b.h > 10);

    for (let i = 0; i < numToAdd; i++) {
      let parent = visibleBoxes.length > 0 ? random(visibleBoxes) : null;
      let newBox;
      if (parent) {
        // 親の位置・サイズ・色を継承して生成（分裂表現）
        newBox = new BentoBox(parent.x, parent.y, parent.w, parent.h);
        newBox.bgCol = parent.bgCol;
        newBox.fgCol = parent.fgCol;
      } else {
        // 親がいない場合は画面中央から
        newBox = new BentoBox(width / 2, height / 2, 0, 0);
      }
      boxes.push(newBox);
    }
  }

  // 2. ターゲットの割り当て（距離が近い順にグリーディ法で割り当て）
  // layoutsのコピーを作成（割り当て済み管理用）
  let availableLayouts = layouts.map((l, i) => ({ ...l, id: i, used: false }));

  for (let i = 0; i < boxes.length; i++) {
    let box = boxes[i];
    let bestDist = Infinity;
    let bestLayoutIndex = -1;

    // 最も近い未使用レイアウトを探す
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
      // 割り当て成功
      availableLayouts[bestLayoutIndex].used = true;
      box.setTarget(availableLayouts[bestLayoutIndex]);
    } else {
      // 割り当てられなかったボックス（余剰分）は統合（消滅）させる
      // 最も近い「有効なレイアウト」の中心に向かって縮小させる
      let closestValidLayout = null;
      let minD = Infinity;

      for (let l of layouts) {
        let d = dist(box.x, box.y, l.x, l.y);
        if (d < minD) {
          minD = d;
          closestValidLayout = l;
        }
      }

      if (closestValidLayout) {
        box.setTarget({
          x: closestValidLayout.x + closestValidLayout.w / 2,
          y: closestValidLayout.y + closestValidLayout.h / 2,
          w: 0, h: 0
        });
      } else {
        box.setTarget({ x: box.x, y: box.y, w: 0, h: 0 });
      }
    }
  }
}

function divideGrid(gx, gy, gw, gh, depth, layouts) {
  // 終了条件: 深さが0、または最小サイズ以下、またはランダム停止
  // 分割するには少なくとも minSize * 2 の幅が必要
  const canSplitX = gw >= params.minSize * 2;
  const canSplitY = gh >= params.minSize * 2;

  if (depth <= 0 || (!canSplitX && !canSplitY) || random() < 0.1) {
    layouts.push({ gx, gy, gw, gh });
    return;
  }

  // 分割方向の決定
  let splitVertical = canSplitX;
  if (canSplitX && canSplitY) {
    // どちらも可能なら、長い方を優先しつつランダム性を持たせる
    splitVertical = gw > gh ? random() < 0.8 : random() < 0.2;
  } else if (canSplitY) {
    splitVertical = false;
  }

  if (splitVertical) {
    // 横幅を分割 (gw を splitW と gw - splitW に分ける)
    // 分割点は minSize 以上残るように選ぶ
    let splitW = floor(random(params.minSize, gw - params.minSize + 1));
    divideGrid(gx, gy, splitW, gh, depth - 1, layouts);
    divideGrid(gx + splitW, gy, gw - splitW, gh, depth - 1, layouts);
  } else {
    // 縦幅を分割
    let splitH = floor(random(params.minSize, gh - params.minSize + 1));
    divideGrid(gx, gy, gw, splitH, depth - 1, layouts);
    divideGrid(gx, gy + splitH, gw, gh - splitH, depth - 1, layouts);
  }
}

function updateLayout() {
  // 生きているボックスのみ対象
  let activeBoxes = boxes.filter(b => !b.isDead && b.tw > 0);

  // ボックス数に応じて分割/統合の確率を変える
  // 少ないときは分割優先、多いときは統合優先
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
  // 分割可能なボックス（最小サイズより大きい）を探す
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

  // ピクセル計算用
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

  // ターゲットを更新（自分自身をl1に変形）
  target.setTarget(l1);

  // 新しいボックスを追加（l2）
  // 親の位置から発生させる
  let newBox = new BentoBox(target.x, target.y, target.w, target.h);
  newBox.bgCol = target.bgCol; // 色を継承
  newBox.fgCol = target.fgCol;
  newBox.setTarget(l2);
  boxes.push(newBox);
}

function mergeBoxes(activeBoxes) {
  // 統合可能なペアを探す
  // 隣接していて、統合後に矩形になるペア
  let candidates = [];

  for (let i = 0; i < activeBoxes.length; i++) {
    for (let j = i + 1; j < activeBoxes.length; j++) {
      let b1 = activeBoxes[i];
      let b2 = activeBoxes[j];

      // 横に隣接 (同じY, 同じ高さ, Xが連続)
      if (b1.tgy === b2.tgy && b1.tgh === b2.tgh && (b1.tgx + b1.tgw === b2.tgx || b2.tgx + b2.tgw === b1.tgx)) {
        candidates.push({ b1, b2, type: 'horz' });
      }
      // 縦に隣接 (同じX, 同じ幅, Yが連続)
      else if (b1.tgx === b2.tgx && b1.tgw === b2.tgw && (b1.tgy + b1.tgh === b2.tgy || b2.tgy + b2.tgh === b1.tgy)) {
        candidates.push({ b1, b2, type: 'vert' });
      }
    }
  }

  if (candidates.length === 0) return;

  let pair = random(candidates);
  let b1 = pair.b1;
  let b2 = pair.b2;

  // ピクセル計算用
  const margin = 40;
  const drawW = width - margin * 2;
  const drawH = height - margin * 2;
  const cellW = (drawW - (params.gridCols - 1) * params.gap) / params.gridCols;
  const cellH = (drawH - (params.gridRows - 1) * params.gap) / params.gridRows;

  // 新しいレイアウト
  let newLayout;
  if (pair.type === 'horz') {
    // 左側をベースにする
    let left = b1.tgx < b2.tgx ? b1 : b2;
    let gw = b1.tgw + b2.tgw;
    let w = gw * cellW + (gw - 1) * params.gap;
    newLayout = { gx: left.tgx, gy: left.tgy, gw: gw, gh: left.tgh, x: left.tx, y: left.ty, w: w, h: left.th };
  } else {
    // 上側をベースにする
    let top = b1.tgy < b2.tgy ? b1 : b2;
    let gh = b1.tgh + b2.tgh;
    let h = gh * cellH + (gh - 1) * params.gap;
    newLayout = { gx: top.tgx, gy: top.tgy, gw: top.tgw, gh: gh, x: top.tx, y: top.ty, w: top.tw, h: h };
  }

  // b1を拡大
  b1.setTarget(newLayout);

  // b2を消滅（サイズはそのままでフェードアウト）
  b2.setTarget({
    x: b2.x,
    y: b2.y,
    w: b2.w,
    h: b2.h
  });
  b2.isAbsorbed = true;

  // 飲み込む側(b1)を描画順の最前面（配列の末尾）に移動
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

  // 自動更新
  if (params.autoUpdate) {
    // 確率的に実行してタイミングを分散させる
    if (random(params.updateInterval) < 1) {
      updateLayout();
    }
  }

  time += params.speed * 0.02;

  for (let box of boxes) {
    box.update();
    box.display();
  }

  // 消滅したボックスを配列から削除
  boxes = boxes.filter(b => !b.isDead);

  // 書き出し処理 (MP4 shared module)
  if (isExporting) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
      isExporting = false; // エクスポーター側の終了に合わせてこちらも終了
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
    this.alpha = 255;

    // ターゲット値（モーフィング用）
    this.tx = x; this.ty = y; this.tw = w; this.th = h;
    // グリッド座標（初期値は0にしておく、setTargetで更新される）
    this.tgx = 0; this.tgy = 0; this.tgw = 0; this.tgh = 0;
    this.gx = 0; this.gy = 0; this.gw = 0; this.gh = 0;

    let colors = PALETTES[params.palette];
    let c1 = random(colors);
    this.bgCol = color(c1);
    this.tBgCol = this.bgCol;

    this.fgCol = color(random(colors.filter(c => c !== c1)));
    // コントラスト確保のため、白か黒を混ぜる
    this.adjustFgColor();
    this.tFgCol = this.fgCol;

    this.type = random(['Clock', 'Wave', 'Switch', 'Orbit', 'Typography', 'Grid', 'Graph', 'Code', 'Radar', 'System', 'Target', 'Pattern', 'Scanner', 'NoiseBar']);

    // 個別パラメータ
    this.angle = random(TWO_PI);
    this.toggleState = random() > 0.5;
    this.data = [];
    this.initTypeData();
  }

  adjustFgColor() {
    // パレットの色を使用するため、強制的な白黒設定は行わない
  }

  initTypeData() {
    this.data = [];
    if (this.type === 'Graph') {
      for (let i = 0; i < 20; i++) this.data.push(random());
    } else if (this.type === 'Code') {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/{}[]";
      for (let i = 0; i < 8; i++) {
        let str = "";
        let len = floor(random(5, 15));
        for (let j = 0; j < len; j++) str += chars.charAt(floor(random(chars.length)));
        this.data.push(str);
      }
    } else if (this.type === 'Typography') {
      this.data = [random(['SYSTEM', 'ONLINE', 'WARNING', 'CAUTION', 'ANALYZING', 'DATA', 'TARGET', 'LOCKED', 'SCANNING', '404', 'ERROR', 'BOOTING'])];
      this.typewriterIndex = 0;
    } else if (this.type === 'System') {
      this.data = Array(5).fill(0).map(() => random());
    } else if (this.type === 'Target') {
      this.data = [random(100, 999), random(100, 999)]; // 座標データ用
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

    // 新しい色とタイプを決定
    if (layout.w > 0) {
      let colors = PALETTES[params.palette];
      let c1 = random(colors);
      this.tBgCol = color(c1);
      this.tFgCol = color(random(colors.filter(c => c !== c1)));

      // 一時的にfgColを更新して調整ロジックを通す
      let tempFg = this.fgCol;
      this.fgCol = this.tFgCol;
      this.adjustFgColor();
      this.tFgCol = this.fgCol;
      this.fgCol = tempFg;

      this.type = random(['Clock', 'Wave', 'Switch', 'Orbit', 'Typography', 'Grid', 'Graph', 'Code', 'Radar', 'System', 'Target', 'Pattern', 'Scanner', 'NoiseBar']);
      this.initTypeData();
    }
  }

  update() {
    // スムーズな補間
    let ease = 0.1;
    this.x = lerp(this.x, this.tx, ease);
    this.y = lerp(this.y, this.ty, ease);
    this.w = lerp(this.w, this.tw, ease);
    this.h = lerp(this.h, this.th, ease);
    this.gx = this.tgx;
    this.gy = this.tgy;
    this.gw = this.tgw;
    this.gh = this.tgh;

    this.bgCol = lerpColor(this.bgCol, this.tBgCol, ease);
    this.fgCol = lerpColor(this.fgCol, this.tFgCol, ease);

    // サイズがほぼ0になったら死亡フラグ
    if (this.tw === 0 && this.th === 0 && this.w < 1 && this.h < 1) {
      this.isDead = true;
    }

    // 吸収された場合はフェードアウトして消滅
    if (this.isAbsorbed) {
      // フェードアウト表現は廃止。一定時間後に消滅させる
      this.absorbedTimer++;
      if (this.absorbedTimer > 40) this.isDead = true;
    }

    this.angle += 0.05 * params.speed;

    if (this.type === 'Graph') {
      if (frameCount % 5 === 0) {
        this.data.shift();
        this.data.push(noise(time + this.x) > 0.5 ? random() : noise(time * 2));
      }
    } else if (this.type === 'System') {
      if (frameCount % 10 === 0) {
        let idx = floor(random(this.data.length));
        this.data[idx] = random();
      }
    } else if (this.type === 'Target') {
      if (frameCount % 30 === 0) {
        this.data = [floor(random(100, 999)), floor(random(100, 999))];
      }
    } else if (this.type === 'Typography') {
      // タイプライターアニメーションの進行
      if (this.typewriterIndex < this.data[0].length) {
        this.typewriterIndex += 0.3 * params.speed;
      } else {
        // 完了後、たまにリセットして再入力
        if (random() < 0.01 * params.speed) this.typewriterIndex = 0;
      }
    }
  }

  display() {
    if (this.w < 1 || this.h < 1) return;

    // 本体
    fill(this.bgCol);
    rect(this.x, this.y, this.w, this.h, 2); // 角丸を小さくしてシャープに

    // コンテンツ描画（クリッピング領域内）
    push();
    // クリップ（簡易的に矩形内描画）
    translate(this.x, this.y);

    // コンテンツ
    let fg = color(this.fgCol);

    fill(fg);
    stroke(fg);
    // 以降の描画関数で this.fgCol を使う場合も alpha が適用されるように、一時的に描画コンテキストの色を設定

    let cx = this.w / 2;
    let cy = this.h / 2;
    let s = min(this.w, this.h);

    if (this.type === 'Clock') {
      this.drawClock(cx, cy, s);
    } else if (this.type === 'Wave') {
      this.drawWave(cx, cy, this.w, this.h);
    } else if (this.type === 'Switch') {
      this.drawSwitch(cx, cy, s);
    } else if (this.type === 'Orbit') {
      this.drawOrbit(cx, cy, s);
    } else if (this.type === 'Typography') {
      this.drawTypography(cx, cy, s);
    } else if (this.type === 'Grid') {
      this.drawGridPattern(this.w, this.h, s);
    } else if (this.type === 'Graph') {
      this.drawGraph(this.w, this.h);
    } else if (this.type === 'Code') {
      this.drawCode(this.w, this.h);
    } else if (this.type === 'Pattern') {
      this.drawPattern(this.w, this.h);
    } else if (this.type === 'Radar') {
      this.drawRadar(cx, cy, s);
    } else if (this.type === 'System') {
      this.drawSystem(cx, cy, s);
    } else if (this.type === 'Target') {
      this.drawTarget(cx, cy, s);
    } else if (this.type === 'Scanner') {
      this.drawScanner(this.w, this.h);
    } else if (this.type === 'NoiseBar') {
      this.drawNoiseBar(this.w, this.h);
    }

    if (params.fuiDecoration) {
      this.drawFuiDecorations(this.w, this.h);
    }

    pop();
  }

  drawClock(cx, cy, s) {
    noFill();
    noStroke();

    let c = color(this.fgCol);
    fill(c);

    textAlign(CENTER, CENTER);
    textSize(s * 0.25);
    let h = nf(hour(), 2);
    let m = nf(minute(), 2);
    let sec = nf(second(), 2);
    let ms = nf(floor(millis() % 1000 / 10), 2);
    text(h + ":" + m, cx, cy - s * 0.05);
    textSize(s * 0.12);
    text(sec + ":" + ms, cx, cy + s * 0.15);

    // 円周のインジケータ
    noFill();
    stroke(c);
    strokeWeight(s * 0.02);
    let secAngle = map(second(), 0, 60, -HALF_PI, TWO_PI - HALF_PI);
    arc(cx, cy, s * 0.7, s * 0.7, -HALF_PI, secAngle);

    // 装飾リング
    strokeWeight(1);
    stroke(red(c), green(c), blue(c), 100);
    ellipse(cx, cy, s * 0.85);

    // 目盛り
    for (let i = 0; i < 12; i++) {
      let a = i * TWO_PI / 12;
      let r1 = s * 0.35;
      let r2 = s * 0.4;
      line(cx + cos(a) * r1, cy + sin(a) * r1, cx + cos(a) * r2, cy + sin(a) * r2);
    }
  }

  drawWave(cx, cy, w, h) {
    noFill();
    let c = color(this.fgCol);
    stroke(c);
    strokeWeight(min(w, h) * 0.02);

    let count = 3;
    for (let i = 0; i < count; i++) {
      beginShape();
      for (let x = 0; x <= w; x += 5) {
        let ang = x * 0.05 + time * 5 + i;
        let y = cy + sin(ang) * h * 0.2;
        vertex(x, y);
      }
      endShape();
    }
  }

  drawSwitch(cx, cy, s) {
    // 複数のトグルスイッチ風
    let count = 3;
    let swH = s * 0.2;
    let swW = s * 0.6;
    let gap = s * 0.1;
    let startY = cy - (count * swH + (count - 1) * gap) / 2 + swH / 2;

    let c = color(this.fgCol);

    for (let i = 0; i < count; i++) {
      let y = startY + i * (swH + gap);
      let state = (this.toggleState && i % 2 == 0) || (!this.toggleState && i % 2 != 0);

      noFill();
      stroke(c);
      strokeWeight(1);
      rectMode(CENTER);
      rect(cx, y, swW, swH);

      fill(state ? c : color(0, 0, 0, 0));
      let knobX = state ? cx + swW * 0.25 : cx - swW * 0.25;
      rect(knobX, y, swW * 0.4, swH * 0.8);
    }
    rectMode(CORNER);
  }

  drawOrbit(cx, cy, s) {
    let c = color(this.fgCol);

    noFill();
    stroke(c);
    strokeWeight(s * 0.01);
    ellipse(cx, cy, s * 0.5);
    ellipse(cx, cy, s * 0.8);

    // 十字線
    line(cx - s * 0.45, cy, cx + s * 0.45, cy);
    line(cx, cy - s * 0.45, cx, cy + s * 0.45);

    noStroke();
    fill(c);

    let r1 = s * 0.25;
    let r2 = s * 0.4;

    let x1 = cx + cos(this.angle) * r1;
    let y1 = cy + sin(this.angle) * r1;
    ellipse(x1, y1, s * 0.08);

    let x2 = cx + cos(this.angle * 0.5 + 1) * r2;
    let y2 = cy + sin(this.angle * 0.5 + 1) * r2;
    ellipse(x2, y2, s * 0.06);
  }

  drawTypography(cx, cy, s) {
    let c = color(this.fgCol);
    fill(c);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(s * 0.25);

    let txt = this.data[0];
    let len = floor(this.typewriterIndex);
    len = constrain(len, 0, txt.length);

    let displayTxt = txt.substring(0, len);

    // カーソルと入力中のグリッチ
    if (len < txt.length) {
      if (frameCount % 10 < 5) displayTxt += "_"; // 点滅カーソル

      // 入力中の文字化け演出
      if (random() < 0.3 && len > 0) {
        let glitchChar = String.fromCharCode(floor(random(33, 126)));
        displayTxt = displayTxt.substring(0, len - 1) + glitchChar;
      }
    }

    // 完了後もたまに全体がグリッチする
    if (len === txt.length && random() < 0.05) {
      fill(red(c), green(c), blue(c), 150);
      let glitchTxt = "";
      for (let i = 0; i < txt.length; i++) glitchTxt += String.fromCharCode(floor(random(33, 126)));
      text(glitchTxt, cx, cy);
    } else {
      text(displayTxt, cx, cy);
    }
  }

  drawGridPattern(w, h, s) {
    let c = color(this.fgCol);
    fill(c);
    noStroke();
    let step = 20;
    let size = 1.5;
    for (let x = step / 2; x < w; x += step) {
      for (let y = step / 2; y < h; y += step) {
        if (random() > 0.1) {
          rect(x, y, size, size);
        }
      }
    }
  }

  drawGraph(w, h) {
    let c = color(this.fgCol);

    noFill();
    stroke(c);
    strokeWeight(1.5);

    // 背景グリッド
    stroke(red(c), green(c), blue(c), 50);
    strokeWeight(0.5);
    for (let i = 0; i < 5; i++) {
      let ly = h * (0.2 + i * 0.15);
      line(0, ly, w, ly);
    }

    stroke(c);
    strokeWeight(1.5);

    beginShape();
    let step = w / (this.data.length - 1);
    for (let i = 0; i < this.data.length; i++) {
      let val = this.data[i];
      let x = i * step;
      let y = h - (val * h * 0.8) - h * 0.1;
      vertex(x, y);
    }
    endShape();

    // 塗りつぶしエリア
    fill(red(c), green(c), blue(c), 30);
    noStroke();
    beginShape();
    vertex(0, h);
    for (let i = 0; i < this.data.length; i++) {
      let val = this.data[i];
      let x = i * step;
      let y = h - (val * h * 0.8) - h * 0.1;
      vertex(x, y);
    }
    vertex(w, h);
    endShape(CLOSE);

    // 最新値の表示
    fill(c);
    textSize(10);
    text(nf(this.data[this.data.length - 1], 1, 2), w - 30, 15);
  }

  drawCode(w, h) {
    let c = color(this.fgCol);
    fill(c);
    noStroke();
    textAlign(LEFT, TOP);
    textSize(10);
    let lh = 14;
    let startY = (h - this.data.length * lh) / 2;

    for (let i = 0; i < this.data.length; i++) {
      let txt = this.data[i];
      // ランダムに文字化けさせる
      if (random() < 0.05) {
        txt = txt.split('').map(char => random() < 0.5 ? char : String.fromCharCode(floor(random(33, 126)))).join('');
        fill(red(c), green(c), blue(c), 180);
      } else {
        fill(c);
      }
      text(txt, 10, startY + i * lh);
    }
  }

  drawRadar(cx, cy, s) {
    let c = color(this.fgCol);

    noFill();
    stroke(red(c), green(c), blue(c), 150);
    strokeWeight(1);
    ellipse(cx, cy, s * 0.3);
    ellipse(cx, cy, s * 0.6);
    ellipse(cx, cy, s * 0.9);

    line(cx - s * 0.45, cy, cx + s * 0.45, cy);
    line(cx, cy - s * 0.45, cx, cy + s * 0.45);

    // スキャンライン
    let angle = frameCount * 0.05;
    stroke(c);
    strokeWeight(2);
    line(cx, cy, cx + cos(angle) * s * 0.45, cy + sin(angle) * s * 0.45);

    // 輝点
    fill(c);
    noStroke();
    if (frameCount % 60 < 10) {
      let bx = cx + cos(angle - 0.5) * s * 0.3;
      let by = cy + sin(angle - 0.5) * s * 0.3;
      ellipse(bx, by, 4, 4);
    }
  }

  drawSystem(cx, cy, s) {
    let bars = 5;
    let h = s / bars * 0.5;
    let w = s * 0.8;
    let startY = cy - (bars * h * 1.5) / 2;

    let c = color(this.fgCol);

    noStroke();
    textAlign(RIGHT, CENTER);
    textSize(8);

    for (let i = 0; i < bars; i++) {
      let val = this.data[i];
      let y = startY + i * h * 1.5;

      // ラベル
      fill(c);
      text("SYS." + i, cx - w / 2 - 5, y + h / 2);

      // バー背景
      fill(red(c), green(c), blue(c), 50);
      rect(cx - w / 2, y, w, h);

      // バー本体
      fill(c);
      rect(cx - w / 2, y, w * val, h);
    }
  }

  drawTarget(cx, cy, s) {
    let c = color(this.fgCol);

    noFill();
    stroke(c);
    strokeWeight(1);

    // コーナー
    let len = s * 0.2;
    let r = s * 0.4;
    line(cx - r, cy - r, cx - r + len, cy - r);
    line(cx - r, cy - r, cx - r, cy - r + len);

    line(cx + r, cy + r, cx + r - len, cy + r);
    line(cx + r, cy + r, cx + r, cy + r - len);

    // 座標値
    noStroke();
    fill(c);
    textSize(10);
    textAlign(CENTER, CENTER);
    text(`X:${this.data[0]} Y:${this.data[1]}`, cx, cy);

    // 点滅するドット
    if (frameCount % 20 < 10) {
      fill(255, 0, 0);
      ellipse(cx, cy - 15, 4, 4);
    }
  }

  drawScanner(w, h) {
    let c = color(this.fgCol);
    c.setAlpha(this.alpha);
    stroke(c);
    strokeWeight(2);

    let scanX = (frameCount * 2 * params.speed) % w;
    line(scanX, 0, scanX, h);

    // 残像
    noStroke();
    fill(red(c), green(c), blue(c), this.alpha * 0.2);
    rect(0, 0, scanX, h);
  }

  drawNoiseBar(w, h) {
    let c = color(this.fgCol);
    c.setAlpha(this.alpha);
    fill(c);
    noStroke();

    let barCount = 10;
    let barW = w / barCount;

    for (let i = 0; i < barCount; i++) {
      let n = noise(i * 0.5, time * 2 + this.x);
      let barH = h * n;
      rect(i * barW, h - barH, barW - 2, barH);
    }
  }

  drawPattern(w, h) {
    let c = color(this.fgCol);
    c.setAlpha(this.alpha);
    fill(c);
    noStroke();

    let cellSize = 10;
    let cols = floor(w / cellSize);
    let rows = floor(h / cellSize);

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        // ノイズベースのパターン生成
        let n = noise(i * 0.2, j * 0.2, time * 0.2 + this.x * 0.01);

        if (n > 0.45 && n < 0.55) {
          let size = cellSize * 0.8;
          if (random() < 0.05) size = cellSize; // グリッチ的にサイズ変化
          rect(i * cellSize, j * cellSize, size, size);
        } else if (n > 0.7) {
          rect(i * cellSize + 3, j * cellSize + 3, cellSize - 6, cellSize - 6);
        }
      }
    }
  }

  drawFuiDecorations(w, h) {
    let c = color(this.fgCol);

    noFill();
    stroke(c);
    strokeWeight(1);

    // コーナーブラケット
    let len = min(w, h) * 0.1;
    if (len < 5) len = 5;

    // 左上
    line(0, 0, len, 0);
    line(0, 0, 0, len);
    // 右上
    line(w, 0, w - len, 0);
    line(w, 0, w, len);
    // 右下
    line(w, h, w - len, h);
    line(w, h, w, h - len);
    // 左下
    line(0, h, len, h);
    line(0, h, 0, h - len);

    // 装飾的なラインや矩形
    if (w > 60) {
      stroke(red(c), green(c), blue(c), 100);
      line(w * 0.3, 0, w * 0.7, 0);
      line(w * 0.3, h, w * 0.7, h);

      rectMode(CENTER);
      noStroke();
      fill(c);
      rect(w / 2, 0, 4, 4);
      rect(w / 2, h, 4, 4);
      rectMode(CORNER);
    }
  }
}

window.guiConfig = [
  {
    folder: 'Generator', contents: [
      { object: params, variable: 'seed', min: 0, max: 10000, step: 1, name: 'Seed', listen: true, onChange: () => generateBento(true) },
      { object: params, variable: 'depth', min: 1, max: 8, step: 1, name: 'Depth', onChange: () => generateBento(true) },
      { object: params, variable: 'gridCols', min: 1, max: 32, step: 1, name: 'Grid Cols', onChange: () => generateBento(true) },
      { object: params, variable: 'gridRows', min: 1, max: 18, step: 1, name: 'Grid Rows', onChange: () => generateBento(true) },
      { object: params, variable: 'minSize', min: 1, max: 5, step: 1, name: 'Min Grid Span', onChange: () => generateBento(true) },
      { object: params, variable: 'gap', min: 0, max: 50, name: 'Gap', onChange: () => generateBento(true) },
      { object: params, variable: 'regenerate', name: 'Regenerate', type: 'function' }
    ]
  },
  {
    folder: 'Style', contents: [
      { object: params, variable: 'palette', options: Object.keys(PALETTES), name: 'Palette', onChange: () => generateBento(false) },
      { object: params, variable: 'bgColor', type: 'color', name: 'Background' },
      { object: params, variable: 'cornerRadius', min: 0, max: 100, name: 'Corner Radius' },
      { object: params, variable: 'speed', min: 0, max: 5.0, name: 'Anim Speed' },
      { object: params, variable: 'autoUpdate', name: 'Auto Update' },
      { object: params, variable: 'updateInterval', min: 1, max: 120, step: 1, name: 'Update Interval' },
      { object: params, variable: 'fuiDecoration', name: 'FUI Deco' }
    ]
  },
  {
    folder: 'Export', contents: [
      { object: params, variable: 'exportFrames', min: 60, max: 1200, step: 1, name: 'Frames' },
      { object: params, variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },
      { object: params, variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }
    ]
  }
];

async function startExportMP4() {
  if (isExporting || window.exporter.isExporting) return;

  exportMax = params.exportFrames;
  let suggestedName = `Sketxh_001_${year()}${nf(month(), 2)}${nf(day(), 2)}_${nf(hour(), 2)}${nf(minute(), 2)}.mp4`;
  // startMP4(width, height, fps, totalFrames, suggestedName)
  await window.exporter.startMP4(width, height, 24, exportMax, suggestedName);

  isExporting = true;
}

async function startExportPNG() {
  if (isExporting || window.exporter.isExporting) return;

  exportMax = params.exportFrames;
  let prefix = `Sketxh_001_${year()}${nf(month(), 2)}${nf(day(), 2)}_${nf(hour(), 2)}${nf(minute(), 2)}`;
  // startPNG(fps, totalFrames, prefix)
  await window.exporter.startPNG(24, exportMax, prefix);

  isExporting = true;
}

function keyPressed() {
  if (key === 'm' || key === 'M') startExportMP4();
  if (key === 'p' || key === 'P') startExportPNG();
  if (key === 'r' || key === 'R') initGrid();
}


