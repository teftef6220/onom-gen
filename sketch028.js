// Neo-Memphis Pop カラーパレット
const PALETTE_POP = [
  '#FF0099', // ビビッドピンク
  '#00CCFF', // シアン
  '#FFCC00', // イエロー
  '#6633FF', // パープル
  '#000000', // ブラック
  '#FFFFFF'  // ホワイト
];

var isColorful = true;
var saveCount = 1;
var isExporting = false;
var exportMax = 600;
var exportCurrent = 0;
var exportSessionID = "";
var exportInput;

// アニメーション用変数
let shapes = [];
let bgType = 0; // 0: Pink, 1: Yellow, 2: Blue, 3: Black

// UI Sliders
var speed = 2;
var count = 30;
var size = 200;
var physics = true;
var boundary = false;
var screenBounce = false;
var changeBg = function() { bgType = (bgType + 1) % 4; };

function setup() {
  let c = createCanvas(1980, 1080);
  pixelDensity(1);

  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '80vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');
  c.style('box-shadow', '0 0 20px rgba(0,0,0,0.2)');

  rectMode(CENTER);
  ellipseMode(CENTER);
  strokeCap(ROUND);
  noFill();
  
  initShapes();
}

function draw() {
  blendMode(BLEND);
  
  // 背景色の設定
  let bgColors = ['#FFDEE9', '#FFF200', '#D4FC79', '#1a1a1a'];
    // fill(bgColors[bgType]);
    fill(0);
  rect(width/2,height/2,width,height);

  // グリッドドット背景を描画（ポップ感を出すため）
  drawBackgroundPattern();

  // 円形境界の描画
  if (boundary) {
    noFill();
    stroke(255, 50);
    strokeWeight(2);
    ellipse(width / 2, height / 2, height - 100, height - 100);
  }

  // シェイプの数を調整
  if (shapes.length < count) {
    shapes.push(new PopShape(size));
  } else if (shapes.length > count) {
    shapes.pop();
  }

  // 各シェイプの更新と描画
  for (let i = shapes.length - 1; i >= 0; i--) {
    let s = shapes[i];
    s.update(speed);
    s.display();

    // 画面外に出たら削除して、新しいシェイプが生成されるようにする
    if (!boundary && !screenBounce && s.isOffScreen()) {
      shapes.splice(i, 1);
    }
  }

  if (physics) {
    checkCollisions();
  }

  // --- 書き出し処理 ---
  if (isExporting) {
    saveCanvas('pop_memphis_' + exportSessionID + '_' + nf(saveCount, 3), 'png');
    saveCount++;
    exportCurrent++;
    if (exportCurrent >= exportMax) {
      isExporting = false;
      noLoop();
      console.log("Export Complete");
    }
  }
}

function initShapes() {
  shapes = [];
  for (let i = 0; i < 20; i++) {
    shapes.push(new PopShape(200));
  }
}

function checkCollisions() {
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      let s1 = shapes[i];
      let s2 = shapes[j];
      
      let d = p5.Vector.dist(s1.pos, s2.pos);
      let minDist = (s1.size + s2.size) / 2;
      
      if (d < minDist) {
        // 衝突応答
        let angle = p5.Vector.sub(s2.pos, s1.pos).heading();
        let overlap = minDist - d;
        
        // 位置補正（めり込み防止）
        let separation = p5.Vector.fromAngle(angle).mult(overlap * 0.5);
        s2.pos.add(separation);
        s1.pos.sub(separation);
        
        // 速度ベクトルの反射（簡易的な弾性衝突）
        let n = p5.Vector.sub(s2.pos, s1.pos).normalize();

        let vRel = p5.Vector.sub(s1.vel, s2.vel);
        let impulse = p5.Vector.dot(vRel, n);
        
        if (impulse > 0) {
          let J = n.copy().mult(impulse);
          s1.vel.sub(J);
          s2.vel.add(J);
          s1.vel.normalize(); // 速度を一定に保つ
          s2.vel.normalize();
        }
      }
    }
  }
}

function drawBackgroundPattern() {
  fill(0, 10); // 薄い黒
  noStroke();
  let step = 40;
  for (let x = 0; x < width; x += step) {
    for (let y = 0; y < height; y += step) {
      if ((x + y) % (step * 2) === 0) ellipse(x, y, 2, 2);
    }
  }
}

class PopShape {
  constructor(maxSize) {
    this.init(maxSize);
    // 最初から画面内にランダム配置
    this.pos = createVector(random(width), random(height));
  }

  init(maxSize) {
    this.pos = createVector(random(width), random(height));
    this.vel = p5.Vector.random2D(); // ランダムな方向
    this.type = int(random(5)); // 0:Circle, 1:Rect, 2:Triangle, 3:Cross, 4:Squiggle
    this.col = color(random(PALETTE_POP));
    
    // サイズをスライダーで動的に変えられるようにスケール係数を保持
    this.scaleFactor = random(0.3, 1.0);
    this.size = (maxSize || 200) * this.scaleFactor;

    this.rot = random(TWO_PI);
    this.rotSpeed = random(-0.05, 0.05);
    this.isFilled = random() > 0.5; // 塗りつぶしか線画か
    this.strokeW = random(2, 8);
  }

  update(speed) {
    // スライダーの値に基づいてサイズを更新
    let currentBaseSize = size;
    this.size = currentBaseSize * this.scaleFactor;

    this.pos.add(p5.Vector.mult(this.vel, speed));
    this.rot += this.rotSpeed * speed;

    if (boundary) {
      // 円形境界処理
      let center = createVector(width / 2, height / 2);
      let boundaryRadius = (height - 100) / 2;
      let d = p5.Vector.dist(this.pos, center);
      
      // 図形の端が境界を超えたら跳ね返す
      if (d + this.size / 2 > boundaryRadius) {
        let normal = p5.Vector.sub(center, this.pos).normalize(); // 中心に向かうベクトル
        
        // 位置を境界内に戻す
        this.pos = p5.Vector.sub(center, p5.Vector.mult(normal, boundaryRadius - this.size / 2));
        
        // 速度ベクトルを反射させる（壁の法線は中心から外向き）
        let wallNormal = p5.Vector.mult(normal, -1);
        let vDot = this.vel.dot(wallNormal);
        this.vel.sub(p5.Vector.mult(wallNormal, 2 * vDot));
      }
    } else if (screenBounce) {
      // 画面端での反射処理
      let r = this.size / 2;
      if (this.pos.x < r) {
        this.pos.x = r;
        this.vel.x *= -1;
      } else if (this.pos.x > width - r) {
        this.pos.x = width - r;
        this.vel.x *= -1;
      }
      if (this.pos.y < r) {
        this.pos.y = r;
        this.vel.y *= -1;
      } else if (this.pos.y > height - r) {
        this.pos.y = height - r;
        this.vel.y *= -1;
      }
    } else {
      // ラップアラウンドせず、そのまま画面外へ
    }
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.rot);

    if (this.isFilled) {
      fill(this.col);
      noStroke();
    } else {
      noFill();
      stroke(this.col);
      strokeWeight(this.strokeW);
    }

    // 影（ドロップシャドウ）を少しずらして描画してポップ感を出す
    if (this.isFilled) {
      fill(0, 50);
      this.drawShape(10, 10); // 影
      fill(this.col);
      this.drawShape(0, 0); // 本体
    } else {
      stroke(0, 50);
      this.drawShape(10, 10); // 影
      stroke(this.col);
      this.drawShape(0, 0); // 本体
    }

    pop();
  }

  drawShape(offsetX, offsetY) {
    push();
    translate(offsetX, offsetY);
    if (this.type === 0) {
      ellipse(0, 0, this.size, this.size);
    } else if (this.type === 1) {
      rect(0, 0, this.size, this.size);
    } else if (this.type === 2) {
      triangle(0, -this.size/2, -this.size/2, this.size/2, this.size/2, this.size/2);
    } else if (this.type === 3) {
      // 十字
      rect(0, 0, this.size, this.size/3);
      rect(0, 0, this.size/3, this.size);
    } else if (this.type === 4) {
      // 波線（スクイグル）
      noFill();
      strokeWeight(this.strokeW > 0 ? this.strokeW : 5);
      if (this.isFilled) stroke(this.col); // 塗りつぶしモードでも線で描く
      beginShape();
      for (let x = -this.size/2; x <= this.size/2; x += 10) {
        vertex(x, sin(x * 0.1) * this.size * 0.2);
      }
      endShape();
    }
    pop();
  }

  isOffScreen() {
    return (this.pos.x < -this.size || this.pos.x > width + this.size ||
            this.pos.y < -this.size || this.pos.y > height + this.size);
  }
}

// --- UI & Export Logic ---

var guiConfig = [
  { variable: 'exportMax', min: 10, max: 1000, step: 10, name: '書き出し枚数' },
  { variable: 'changeBg', name: '背景色変更', type: 'function' },
  { variable: 'speed', min: 0, max: 10, step: 0.1, name: '速度' },
  { variable: 'count', min: 5, max: 800, step: 1, name: '個数' },
  { variable: 'size', min: 50, max: 500, step: 10, name: 'サイズ' },
  { variable: 'physics', name: '物理演算' },
  { variable: 'boundary', name: '円形境界' },
  { variable: 'screenBounce', name: '画面端反射' },
  { variable: 'startExportSequence', name: '書き出し開始', type: 'function' }
];

function startExportSequence() {
  if (!isExporting) {
    isExporting = true;
    exportCurrent = 0;
    saveCount = 1;
    exportSessionID = "";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let i = 0; i < 4; i++) exportSessionID += chars.charAt(floor(random(chars.length)));
    loop();
  }
}

function keyPressed() {
  if (key === 's' || key === 'S') startExportSequence();
}