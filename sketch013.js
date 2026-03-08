var bodies = [];
var numBodies = 20;
var minSize = 10;
var maxSize = 10;
var gravity;
var gravityStrength = 3.0;
var initialForceX = 20.0;
var restitution = 0.9;
var showTrails = true;
var trailLength = 50;
var colorPalette = 'White';
var enableCollision = true;
var isExporting = false;
var exportMax = 600;

const PALETTES = {
  Rainbow: [],
  Fire: ['#ff0000', '#ff7f00', '#ffff00', '#ff3300'],
  Ice: ['#00ffff', '#0000ff', '#0088ff', '#ffffff'],
  Toxic: ['#ccff00', '#00ff00', '#003300', '#99ff00'],
  Pastel: ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff'],
  White: ['#ffffff']
};

window.guiConfig = [
  { variable: 'numBodies', min: 10, max: 300, step: 10, name: 'Ball Count', onFinishChange: initBodies },
  { variable: 'minSize', min: 5, max: 50, name: 'Min Size', onFinishChange: initBodies },
  { variable: 'maxSize', min: 5, max: 100, name: 'Max Size', onFinishChange: initBodies },
  { variable: 'gravityStrength', min: 0, max: 3.0, step: 0.01, name: 'Gravity', onChange: function(v){ gravity = createVector(0, v); } },
  { variable: 'initialForceX', min: 0, max: 20.0, name: 'Init Force X' },
  { variable: 'restitution', min: 0.1, max: 1.5, step: 0.01, name: 'Bounciness' },
  { variable: 'enableCollision', name: 'Collision' },
  { variable: 'showTrails', name: 'Show Trails' },
  { variable: 'trailLength', min: 5, max: 200, step: 1, name: 'Trail Length' },
  { variable: 'colorPalette', options: Object.keys(PALETTES), name: 'Color Palette', onChange: updateColors },
  { variable: 'exportMax', min: 60, max: 1200, step: 1, name: 'Export Frames' },
  { variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },
  { variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }
];

function setup() {
  let c = createCanvas(1920, 1080);
  
  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '100vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');

  gravity = createVector(0, gravityStrength);
  colorMode(HSB);
  initBodies();
}

function initBodies() {
  bodies = [];
  for (var i = 0; i < numBodies; i++) {
    bodies.push(new Body(random(width), random(height / 2), random(minSize, maxSize)));
  }
}

function draw() {
  fill(0);
  rect(0, 0, width, height);
  noStroke();

  // 1. 更新と壁の判定
  for (var i = 0; i < bodies.length; i++) {
    var b = bodies[i];
    b.applyForce(gravity);
    b.update();
    b.checkEdges();
  }

  // 2. ボール同士の衝突判定
  if (enableCollision) {
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        let b1 = bodies[i];
        let b2 = bodies[j];
        let diff = p5.Vector.sub(b2.pos, b1.pos);
        let d = diff.mag();
        let minDist = b1.mass + b2.mass;

        if (d < minDist) {
          let normal = diff.copy().normalize();
          let relativeVelocity = p5.Vector.sub(b1.vel, b2.vel);
          let velocityAlongNormal = p5.Vector.dot(relativeVelocity, normal);

          if (velocityAlongNormal > 0) {
            let e = restitution; // 反発係数
            let jVal = -(1 + e) * velocityAlongNormal;
            jVal /= (1 / b1.mass + 1 / b2.mass);
            let impulse = p5.Vector.mult(normal, jVal);
            b1.vel.add(p5.Vector.div(impulse, b1.mass));
            b2.vel.sub(p5.Vector.div(impulse, b2.mass));
          }

          // 位置補正（めり込み解消）
          let correction = p5.Vector.mult(normal, (minDist - d) / (1/b1.mass + 1/b2.mass) * 0.5);
          b1.pos.sub(p5.Vector.mult(correction, 1/b1.mass));
          b2.pos.add(p5.Vector.mult(correction, 1/b2.mass));
        }
      }
    }
  }

  // 3. 描画
  for (var i = 0; i < bodies.length; i++) {
    bodies[i].display();
  }

  // 書き出し処理
  if (isExporting) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
       isExporting = false;
    }
  }
}

function updateColors() {
  for (let b of bodies) {
    b.setColor();
  }
}

class Body {
  constructor(x, y, m) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-initialForceX, initialForceX), random(-2, 2));
    this.acc = createVector(0, 0);
    this.mass = m;
    this.bounceCount = 0;
    this.history = [];
    this.setColor();
  }

  setColor() {
    if (colorPalette === 'Rainbow') {
      this.color = color(random(360), 80, 100);
    } else {
      let colors = PALETTES[colorPalette];
      let c = colors[floor(random(colors.length))];
      this.color = color(c);
    }
  }

  applyForce(force) {
    var f = p5.Vector.div(force, this.mass);
    this.acc.add(f);
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0);

    this.history.push(this.pos.copy());
    while (this.history.length > trailLength) {
      this.history.shift();
    }
  }

  display() {
    if (showTrails) {
      noFill();
      stroke(this.color);
      strokeWeight(this.mass * 0.2);
      beginShape();
      for (let v of this.history) {
        vertex(v.x, v.y);
      }
      vertex(this.pos.x, this.pos.y);
      endShape();
    }
    noStroke();
    fill(this.color);
    ellipse(this.pos.x, this.pos.y, this.mass * 2);
  }

  checkEdges() {
    if (this.pos.y > height - this.mass) {
      this.vel.y *= -restitution;
      this.pos.y = height - this.mass;
      this.bounceCount++;
      if (this.bounceCount >= 5) {
        this.respawn();
      }
    }
    if (this.pos.x > width - this.mass) {
      this.vel.x *= -restitution;
      this.pos.x = width - this.mass;
    } else if (this.pos.x < this.mass) {
      this.vel.x *= -restitution;
      this.pos.x = this.mass;
    }
  }

  respawn() {
    this.pos.set(random(width), -this.mass * 2);
    this.vel.set(random(-initialForceX, initialForceX), random(1, 3));
    this.mass = random(minSize, maxSize);
    this.bounceCount = 0;
    this.history = [];
    this.setColor();
  }
}

async function startExportMP4() {
  if (isExporting || window.exporter.isExporting) return;
  
  let suggestedName = `sketch013_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}.mp4`;
  await window.exporter.startMP4(width, height, 30, exportMax, suggestedName);
  
  isExporting = true;
}

async function startExportPNG() {
  if (isExporting || window.exporter.isExporting) return;
  
  let prefix = `sketch013_${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}`;
  await window.exporter.startPNG(30, exportMax, prefix);
  
  isExporting = true;
}

function keyPressed() {
  if (key === 'm' || key === 'M') startExportMP4();
  if (key === 'p' || key === 'P') startExportPNG();
}

window.exportMP4 = startExportMP4;
window.exportPNG = startExportPNG;