// Wim Crouwel Inspired Sketch
// Grid-based typography, New Alphabet style, Stedelijk Museum aesthetic

const params = {
  gridSize: 40,
  strokeWidth: 4,
  speed: 1.0,
  margin: 40,
  maxMerge: 3,
  mergeProbability: 0.2,
  invertProbability: 0.15, // 反転確率
  solidBlockChance: 0.1, // ベタ塗りブロックの出現率
  decorationDensity: 0.3, // 装飾密度
  decoWeight: 1.5, // 装飾の太さ
  generationMode: 'Noise', // Noise, Text
  textString: 'CROUWEL',
  animMode: 'Random', // Scan, Random, Wave, Signage
  colorMode: 'Mono', // Stedelijk, Mono, Blue, Orange
  showGrid: true,
  fillShapes: true,
  distortion: 0.0,
  autoCamera: true,
  cameraSpeed: 0.05,
  cameraInterval: 180,
  aberrationStrength: 15.0, // 色収差の強さ
  aberrationMode: 'RGB', // RGB, CMY, RG
  lodEnabled: true,
  lodThreshold: 1.5,
  exportFrames: 600,
  exportStart: () => startExport(),
  regenerate: () => initGrid()
};

let gui;
let mainGraphics;
let cells = [];
let cols, rows;

// カメラ状態
let cam = {
  x: 0, y: 0, zoom: 1,
  tx: 0, ty: 0, tZoom: 1,
  timer: 0
};
let time = 0;
let lastCam = { x: 0, y: 0, zoom: 1 };

// カラーパレット
const PALETTES = {
  Stedelijk: { bg: '#EAEAEA', fg: '#E60012', grid: '#CCCCCC' }, // 赤・白・グレー
  Mono: { bg: '#000000', fg: '#FFFFFF', grid: '#333333' },
  Blue: { bg: '#0044CC', fg: '#66CCFF', grid: '#003399' },
  Orange: { bg: '#FF6600', fg: '#111111', grid: '#CC5500' },
  Print: { bg: '#FFFFFF', fg: '#000000', grid: '#E0E0E0' } // 白背景・黒文字
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

  mainGraphics = createGraphics(1980, 1080);

  strokeCap(PROJECT); // 四角い端点
  strokeJoin(MITER);  // 鋭い角
  
  initGrid();
}

function initGrid() {
  cells = [];
  // マージンを考慮したグリッド計算
  let drawWidth = width - params.margin * 2;
  let drawHeight = height - params.margin * 2;
  
  cols = floor(drawWidth / params.gridSize);
  rows = floor(drawHeight / params.gridSize);
  
  // グリッドの中央寄せオフセット
  let offsetX = params.margin + (drawWidth - cols * params.gridSize) / 2;
  let offsetY = params.margin + (drawHeight - rows * params.gridSize) / 2;

  if (params.generationMode === 'Text') {
    // テキストモード: オフスクリーンバッファに文字を描画してグリッド化
    let pg = createGraphics(cols, rows);
    pg.pixelDensity(1);
    pg.background(0);
    pg.fill(255);
    pg.noStroke();
    pg.textAlign(CENTER, CENTER);
    pg.textFont('Arial');
    pg.textStyle(BOLD);
    
    // フォントサイズ計算（枠に収まるように）
    let fontSize = rows * 0.8;
    if (params.textString.length > 0) {
      fontSize = min(fontSize, cols / params.textString.length * 1.8);
    }
    pg.textSize(fontSize);
    pg.text(params.textString.toUpperCase(), cols / 2, rows / 2);
    pg.loadPixels();

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let idx = (x + y * cols) * 4;
        let bright = pg.pixels[idx]; // 赤チャンネルを使用
        // 明るい部分にセルを配置
        let type = (bright > 100) ? floor(random(1, 12)) : 0;
        // 文字がある部分のみ反転の抽選を行う（可読性のため）
        let isInv = (type !== 0) && (random() < params.invertProbability);
        cells.push(new GridCell(x, y, offsetX, offsetY, type, 1, isInv));
      }
    }
    pg.remove();
  } else {
    // ノイズモード
    // グリッドの使用状況を管理
    let gridMap = Array(cols).fill().map(() => Array(rows).fill(false));

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (gridMap[x][y]) continue;

        let mergeSize = 1;
        // ランダムに結合を試みる
        if (random() < params.mergeProbability) {
          let maxPossible = min(params.maxMerge, cols - x, rows - y);
          // 可能な最大サイズからランダムに選択（大きいサイズを優先したければ調整）
          if (maxPossible > 1) {
            let trySize = floor(random(2, maxPossible + 1));
            // 領域が空いているかチェック
            let canFit = true;
            for (let dy = 0; dy < trySize; dy++) {
              for (let dx = 0; dx < trySize; dx++) {
                if (gridMap[x + dx][y + dy]) { canFit = false; break; }
              }
              if (!canFit) break;
            }
            if (canFit) mergeSize = trySize;
          }
        }

        // マップを埋める
        for (let dy = 0; dy < mergeSize; dy++) {
          for (let dx = 0; dx < mergeSize; dx++) {
            gridMap[x + dx][y + dy] = true;
          }
        }

        cells.push(new GridCell(x, y, offsetX, offsetY, -1, mergeSize, random() < params.invertProbability));
      }
    }
  }
}

function draw() {
  let palette = PALETTES[params.colorMode];
  
  // メイングラフィックスのクリア
  mainGraphics.clear();
  // 反転セルなどが背景色を使うため、描画モード設定
  mainGraphics.strokeCap(PROJECT);
  mainGraphics.strokeJoin(MITER);

  time += params.speed * 0.02;

  // カメラワーク更新
  if (params.autoCamera) {
    cam.timer += params.speed;
    if (cam.timer > params.cameraInterval) {
      cam.timer = 0;
      
      if (random() < 0.4) {
        // 全体表示に戻る
        cam.tx = 0;
        cam.ty = 0;
        cam.tZoom = 1.0;
      } else {
        // ランダムな位置にズームイン
        let rangeX = width * 0.3;
        let rangeY = height * 0.3;
        cam.tx = random(-rangeX, rangeX);
        cam.ty = random(-rangeY, rangeY);
        cam.tZoom = random(1.5, 3.5);
      }
    }
  }
  
  // スムーズな移動
  let ease = params.cameraSpeed * params.speed;
  if (ease > 1.0) ease = 1.0;
  cam.x = lerp(cam.x, cam.tx, ease);
  cam.y = lerp(cam.y, cam.ty, ease);
  cam.zoom = lerp(cam.zoom, cam.tZoom, ease);

  mainGraphics.push();
  // 画面中心を基準にズーム・移動
  mainGraphics.translate(width/2, height/2);
  mainGraphics.scale(cam.zoom);
  mainGraphics.translate(-width/2 - cam.x, -height/2 - cam.y);

  // 背景グリッド描画
  if (params.showGrid) {
    mainGraphics.stroke(palette.grid);
    mainGraphics.strokeWeight(1);
    mainGraphics.noFill();
    
    // 縦線
    for (let x = 0; x <= cols; x++) {
      let px = cells[0].offsetX + x * params.gridSize;
      mainGraphics.line(px, cells[0].offsetY, px, cells[cells.length-1].offsetY + params.gridSize);
    }
    // 横線
    for (let y = 0; y <= rows; y++) {
      let py = cells[0].offsetY + y * params.gridSize;
      mainGraphics.line(cells[0].offsetX, py, cells[cells.length-1].offsetX + params.gridSize, py);
    }
  }

  // セル描画
  for (let cell of cells) {
    cell.update();
    cell.display(palette, mainGraphics);
  }

  mainGraphics.pop();

  // --- ポストエフェクト（色収差）と最終描画 ---
  
  // 背景描画
  blendMode(BLEND);
  noStroke();
  fill(palette.bg);
  rectMode(CORNER);
  rect(0, 0, width, height);
  
  // カメラの動きに応じたズレ量を計算
  let dx = (cam.x - lastCam.x) * params.aberrationStrength;
  let dy = (cam.y - lastCam.y) * params.aberrationStrength;
  let dZoom = (cam.zoom - lastCam.zoom) * params.aberrationStrength * 200;
  
  // 背景の明るさに応じて合成モードを変更
  let bgCol = color(palette.bg);
  let isDark = (red(bgCol) + green(bgCol) + blue(bgCol)) / 3 < 128;
  
  if (isDark) blendMode(ADD);
  else blendMode(MULTIPLY);

  // RGBチャンネルをずらして描画
  if (params.aberrationMode === 'RGB') {
    // Red
    tint(255, 0, 0);
    image(mainGraphics, -dx - dZoom, -dy - dZoom);
    // Green
    tint(0, 255, 0);
    image(mainGraphics, 0, 0);
    // Blue
    tint(0, 0, 255);
    image(mainGraphics, dx + dZoom, dy + dZoom);
  } else if (params.aberrationMode === 'CMY') {
    // Cyan
    tint(0, 255, 255);
    image(mainGraphics, -dx - dZoom, -dy - dZoom);
    // Magenta
    tint(255, 0, 255);
    image(mainGraphics, 0, 0);
    // Yellow
    tint(255, 255, 0);
    image(mainGraphics, dx + dZoom, dy + dZoom);
  } else if (params.aberrationMode === 'RG') {
    // Red
    tint(255, 0, 0);
    image(mainGraphics, -dx - dZoom, -dy - dZoom);
    // Cyan
    tint(0, 255, 255);
    image(mainGraphics, dx + dZoom, dy + dZoom);
  }

  blendMode(BLEND);
  noTint();

  lastCam = { x: cam.x, y: cam.y, zoom: cam.zoom };

  // 書き出し処理
  if (isExporting) {
    saveCanvas('crouwel_grid_' + exportSessionID + '_' + nf(exportCount + 1, 3), 'png');
    exportCount++;
    if (exportCount >= exportMax) {
      isExporting = false;
      console.log("Export finished");
    }
  }
}

class GridCell {
  constructor(gx, gy, offX, offY, forcedType = -1, mergeSize = 1, inverted = false) {
    this.gx = gx;
    this.gy = gy;
    this.offsetX = offX;
    this.offsetY = offY;
    this.size = params.gridSize;
    this.mergeSize = mergeSize;
    
    // 装飾用
    this.decoType = floor(random(1, 6)); // 1-5の装飾タイプ
    this.randVal = random();
    
    // グリフの形状タイプ (0: 空白, 1-15: 各種パターン)
    // Wim Crouwelの文字は垂直・水平・45度線で構成される
    this.type = (forcedType !== -1) ? forcedType : this.getTypeFromNoise();
    
    // ベタ塗り（タイプ1）の場合は、白（通常描画）を避けて黒（反転描画）にする
    if (this.type === 1) {
      this.inverted = true;
    } else {
      this.inverted = inverted;
    }

    this.rotation = 0;
    this.active = false;
    
    // スライド用プロパティ
    this.nextType = -1;
    this.slideProgress = 0;
    this.isSliding = false;
    this.slideDir = 0; // 0:Up, 1:Right, 2:Down, 3:Left
  }

  getTypeFromNoise() {
    // パーリンノイズで文字のような塊を作る
    let n = noise(this.gx * 0.1, this.gy * 0.1, 0);
    if (n < 0.3) return 0; // 空白
    
    // ベタ塗り（フルブロック）の確率判定
    if (random() < params.solidBlockChance) return 1;
    
    // ランダムな幾何学パターン
    return floor(random(1, 12));
  }

  update() {
    // スライド進行
    if (this.isSliding) {
      this.slideProgress += 0.05 * params.speed;
      if (this.slideProgress >= 1.0) {
        this.type = this.nextType;
        this.isSliding = false;
        this.slideProgress = 0;
      }
    }

    // アニメーションロジック
    let trigger = 0;
    
    if (params.animMode === 'Scan') {
      // スキャンラインアニメーション
      let scanPos = (time * 5) % (cols + 10);
      let dist = abs(this.gx - scanPos + 5);
      if (dist < 2) this.active = true;
      else this.active = false;
      
    } else if (params.animMode === 'Random') {
      // ランダムスライド
      if (!this.isSliding && random() < 0.02 * params.speed) {
        this.startSlide();
      }
      this.active = true;
      
    } else if (params.animMode === 'Wave') {
      // 波紋
      let d = dist(this.gx, this.gy, cols/2, rows/2);
      let wave = sin(d * 0.2 - time * 2);
      this.active = wave > 0;
      
      // 歪み効果
      if (params.distortion > 0) {
        let n = noise(this.gx * 0.1, this.gy * 0.1, time * 0.5);
        if (n > 0.6) this.type = floor(random(12));
      }
      
    } else if (params.animMode === 'Signage') {
      // デジタルサイネージ風
      this.active = true;
      
      // ランダムに点滅（非アクティブ化）
      if (random() < 0.05 * params.speed) this.active = false;
      
      // 文字の入れ替え（リフレッシュ）
      if (random() < 0.03 * params.speed) {
        this.type = floor(random(12));
        if (random() < 0.1) this.inverted = !this.inverted;
      }
    }
  }

  startSlide() {
    this.nextType = floor(random(12));
    this.slideDir = floor(random(4));
    this.isSliding = true;
    this.slideProgress = 0;
  }

  display(palette, pg) {
    let showDeco = this.randVal < params.decorationDensity;

    // スライド中でなく、かつタイプが0（空白）で、かつ反転もしておらず、装飾もないなら描画しない
    if (!this.isSliding && this.type === 0 && !this.inverted && !showDeco) return;
    // スライド中は、現在か次のどちらかが0以外なら描画する必要がある
    
    // LOD判定: ズームが閾値を超えていて、かつスライド中でない場合
    if (params.lodEnabled && cam.zoom > params.lodThreshold && !this.isSliding) {
      this.drawLOD(palette, pg);
      return;
    }

    let x = this.offsetX + this.gx * this.size;
    let y = this.offsetY + this.gy * this.size;
    let s = this.size * this.mergeSize;

    pg.push();
    pg.translate(x, y);

    // 色の計算（Scanモードなどの透明度対応）
    let alpha = 255;
    if (!this.active) {
      if (params.animMode === 'Scan') alpha = 50;
      else if (params.animMode === 'Signage') alpha = 0;
    }
    
    let fgCol = color(palette.fg);
    fgCol.setAlpha(alpha);
    
    let bgCol = color(palette.bg);
    bgCol.setAlpha(alpha);

    let drawColor = fgCol;

    // 反転描画（背景を前景色で塗り、グリフを背景色で描く）
    if (this.inverted) {
      pg.noStroke();
      pg.fill(fgCol);
      pg.rect(0, 0, s, s);
      drawColor = bgCol;
    }
    
    pg.stroke(drawColor);
    pg.strokeWeight(params.strokeWidth);
    if (params.fillShapes) pg.fill(drawColor);
    else pg.noFill();

    // クリッピングして描画
    pg.drawingContext.save();
    pg.drawingContext.beginPath();
    pg.drawingContext.rect(0, 0, s, s);
    pg.drawingContext.clip();

    // 装飾描画
    if (showDeco) {
      this.drawDecoration(s, palette, pg);
    }

    if (this.isSliding) {
       let t = this.slideProgress;
       // Cubic Easing
       let ease = t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2;
       
       let offX = 0, offY = 0;
       let nextOffX = 0, nextOffY = 0;

       // 0:Up, 1:Right, 2:Down, 3:Left
       if (this.slideDir === 0) { // Up
         offY = -s * ease;
         nextOffY = s * (1 - ease);
       } else if (this.slideDir === 1) { // Right
         offX = s * ease;
         nextOffX = -s * (1 - ease);
       } else if (this.slideDir === 2) { // Down
         offY = s * ease;
         nextOffY = -s * (1 - ease);
       } else if (this.slideDir === 3) { // Left
         offX = -s * ease;
         nextOffX = s * (1 - ease);
       }
       
       if (this.type !== 0) {
         pg.push();
         pg.translate(offX, offY);
         this.drawShape(this.type, s, pg);
         pg.pop();
       }
       
       if (this.nextType !== 0) {
         pg.push();
         pg.translate(nextOffX, nextOffY);
         this.drawShape(this.nextType, s, pg);
         pg.pop();
       }

    } else {
       this.drawShape(this.type, s, pg);
    }

    pg.drawingContext.restore();
    pg.pop();
  }

  drawShape(type, s, pg) {
    // コーナーカットや斜め線を含む幾何学形状
    switch (type) {
      case 1: // フルブロック
        pg.rect(0, 0, s, s);
        break;
      case 2: // 左上三角
        pg.triangle(0, 0, s, 0, 0, s);
        break;
      case 3: // 右下三角
        pg.triangle(s, s, s, 0, 0, s);
        break;
      case 4: // 縦棒
        pg.rect(s*0.25, 0, s*0.5, s);
        break;
      case 5: // 横棒
        pg.rect(0, s*0.25, s, s*0.5);
        break;
      case 6: // L字
        pg.beginShape();
        pg.vertex(0, 0);
        pg.vertex(s*0.4, 0);
        pg.vertex(s*0.4, s*0.6);
        pg.vertex(s, s*0.6);
        pg.vertex(s, s);
        pg.vertex(0, s);
        pg.endShape(CLOSE);
        break;
      case 7: // 逆L字
        pg.beginShape();
        pg.vertex(0, 0);
        pg.vertex(s, 0);
        pg.vertex(s, s);
        pg.vertex(s*0.6, s);
        pg.vertex(s*0.6, s*0.4);
        pg.vertex(0, s*0.4);
        pg.endShape(CLOSE);
        break;
      case 8: // 斜め線（太）
        pg.beginShape();
        pg.vertex(0, s);
        pg.vertex(0, s*0.5);
        pg.vertex(s*0.5, 0);
        pg.vertex(s, 0);
        pg.vertex(s, s*0.5);
        pg.vertex(s*0.5, s);
        pg.endShape(CLOSE);
        break;
      case 9: // 小さい四角
        pg.rect(s*0.25, s*0.25, s*0.5, s*0.5);
        break;
      case 10: // 十字
        pg.rect(s*0.35, 0, s*0.3, s);
        pg.rect(0, s*0.35, s, s*0.3);
        break;
      case 11: // 45度カット（角）
        pg.beginShape();
        pg.vertex(0, 0);
        pg.vertex(s, 0);
        pg.vertex(s, s*0.5);
        pg.vertex(s*0.5, s);
        pg.vertex(0, s);
        pg.endShape(CLOSE);
        break;
    }
  }

  drawDecoration(s, palette, pg) {
    pg.push();
    // 背景色を判定（反転している場合は前景色が背景になる）
    let cellBgColor = this.inverted ? palette.fg : palette.bg;
    let c = color(cellBgColor);
    // 輝度を計算して黒か白か決定
    let brightnessVal = red(c) * 0.299 + green(c) * 0.587 + blue(c) * 0.114;
    let decoCol = (brightnessVal > 128) ? color(0) : color(255);
    
    pg.stroke(decoCol);
    pg.strokeWeight(params.decoWeight);
    pg.noFill();

    let m = s * 0.1; // マージン
    
    switch (this.decoType) {
      case 1: // 四隅のドット
        pg.strokeWeight(params.decoWeight * 2);
        pg.point(m, m);
        pg.point(s-m, m);
        pg.point(m, s-m);
        pg.point(s-m, s-m);
        break;
      case 2: // 中央の十字
        pg.line(s/2 - m, s/2, s/2 + m, s/2);
        pg.line(s/2, s/2 - m, s/2, s/2 + m);
        break;
      case 3: // 斜線
        pg.line(0, 0, s*0.3, s*0.3);
        break;
      case 4: // 小さな矩形
        pg.rect(s/2 - m, s/2 - m, m*2, m*2);
        break;
      case 5: // コーナーライン
        pg.line(0, m, m, 0);
        pg.line(s, s-m, s-m, s);
        break;
    }
    pg.pop();
  }

  drawLOD(palette, pg) {
    let x = this.offsetX + this.gx * this.size;
    let y = this.offsetY + this.gy * this.size;
    let s = this.size * this.mergeSize;
    
    pg.push();
    pg.translate(x, y);
    
    // 色設定
    let alpha = 255;
    if (!this.active) {
      if (params.animMode === 'Scan') alpha = 50;
      else if (params.animMode === 'Signage') alpha = 0;
    }
    
    let fgCol = color(palette.fg);
    fgCol.setAlpha(alpha);
    let bgCol = color(palette.bg);
    bgCol.setAlpha(alpha);
    
    // 親が反転している場合は背景を塗る
    if (this.inverted) {
      pg.noStroke();
      pg.fill(fgCol);
      pg.rect(0, 0, s, s);
    }

    // サブグリッド設定 (2x2)
    let subDiv = 2;
    let subSize = s / subDiv;
    
    for(let dy=0; dy<subDiv; dy++) {
      for(let dx=0; dx<subDiv; dx++) {
        // サブセルのタイプ決定（決定論的に）
        let nx = this.gx * subDiv + dx;
        let ny = this.gy * subDiv + dy;
        let n = noise(nx * 0.2, ny * 0.2, 99); 
        
        let subType = 0;
        if (n > 0.4) subType = floor(n * 120) % 11 + 1;
        
        if (subType !== 0) {
          pg.push();
          pg.translate(dx * subSize, dy * subSize);
          
          // 色: 親が反転ならサブセルは背景色、そうでなければ前景色
          let drawColor = this.inverted ? bgCol : fgCol;
          pg.stroke(drawColor);
          pg.strokeWeight(max(1, params.strokeWidth * 0.6)); // 線を細く
          if (params.fillShapes) pg.fill(drawColor);
          else pg.noFill();
          
          this.drawShape(subType, subSize, pg);
          pg.pop();
        }
      }
    }
    pg.pop();
  }
}

// --- UI & Export Logic ---

window.guiConfig = [
  { folder: 'Grid System', contents: [
    { object: params, variable: 'generationMode', options: ['Noise', 'Text'], name: 'Gen Mode', onChange: initGrid },
    { object: params, variable: 'textString', name: 'Text', onChange: initGrid },
    { object: params, variable: 'gridSize', min: 10, max: 100, step: 5, name: 'Grid Size', onChange: initGrid },
    { object: params, variable: 'maxMerge', min: 1, max: 6, step: 1, name: 'Max Merge', onChange: initGrid },
    { object: params, variable: 'mergeProbability', min: 0, max: 1.0, name: 'Merge Prob', onChange: initGrid },
    { object: params, variable: 'invertProbability', min: 0, max: 1.0, name: 'Invert Prob', onChange: initGrid },
    { object: params, variable: 'solidBlockChance', min: 0, max: 1.0, name: 'Solid Block Prob', onChange: initGrid },
    { object: params, variable: 'decorationDensity', min: 0, max: 1.0, name: 'Deco Density' },
    { object: params, variable: 'decoWeight', min: 0.5, max: 10.0, name: 'Deco Weight' },
    { object: params, variable: 'margin', min: 0, max: 200, step: 10, name: 'Margin', onChange: initGrid },
    { object: params, variable: 'strokeWidth', min: 1, max: 10, name: 'Stroke Width' },
    { object: params, variable: 'regenerate', name: 'Regenerate', type: 'function' }
  ]},
  { folder: 'Animation', contents: [
    { object: params, variable: 'speed', min: 0, max: 5.0, name: 'Speed' },
    { object: params, variable: 'animMode', options: ['Scan', 'Random', 'Wave', 'Signage'], name: 'Mode' },
    { object: params, variable: 'distortion', min: 0, max: 1.0, name: 'Distortion' }
  ]},
  { folder: 'Style', contents: [
    { object: params, variable: 'colorMode', options: Object.keys(PALETTES), name: 'Palette' },
    { object: params, variable: 'showGrid', name: 'Show Grid' },
    { object: params, variable: 'fillShapes', name: 'Fill Shapes' }
  ]},
  { folder: 'Camera', contents: [
    { object: params, variable: 'autoCamera', name: 'Auto Move' },
    { object: params, variable: 'cameraSpeed', min: 0.01, max: 0.2, name: 'Move Speed' },
    { object: params, variable: 'cameraInterval', min: 30, max: 600, step: 10, name: 'Move Interval' },
    { object: params, variable: 'aberrationStrength', min: 0, max: 50.0, name: 'Aberration' },
    { object: params, variable: 'aberrationMode', options: ['RGB', 'CMY', 'RG'], name: 'Aberration Mode' },
    { object: params, variable: 'lodEnabled', name: 'Enable LOD' },
    { object: params, variable: 'lodThreshold', min: 1.0, max: 5.0, name: 'LOD Threshold' }
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
  if (key === 'r' || key === 'R') initGrid();
}