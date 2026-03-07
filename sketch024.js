var boids = [];
var numBoids = 200;
var perceptionRadius = 50;
var maxSpeed = 4;
var separationForce = 1.5;
var boidSize = 4;
var colorModeVal = 'Rainbow';
var boidColor = '#00ff00';
var showPerception = false;
var isExporting = false;
var exportCount = 0;
var exportMax = 600;
var exportSessionID = "";

window.guiConfig = [
  { variable: 'numBoids', min: 10, max: 500, step: 10, name: 'Count', onFinishChange: initBoids },
  { variable: 'boidSize', min: 1, max: 20, step: 0.5, name: 'Size' },
  { variable: 'colorModeVal', options: ['Rainbow', 'Single'], name: 'Color Mode' },
  { variable: 'boidColor', type: 'color', name: 'Color' },
  { variable: 'perceptionRadius', min: 10, max: 200, step: 10, name: 'Perception' },
  { variable: 'separationForce', min: 0, max: 5.0, step: 0.1, name: 'Repulsion' },
  { variable: 'showPerception', name: 'Show Perception' },
  { variable: 'maxSpeed', min: 1, max: 10, step: 0.1, name: 'Max Speed' },
  { variable: 'exportMax', min: 60, max: 1200, step: 1, name: 'Export Frames' },
  { variable: 'startExport', name: 'Start Export', type: 'function' }
];

function setup() {
  let c = createCanvas(1920, 1080);
  
  c.style('width', '100%');
  c.style('height', 'auto');
  c.style('max-height', '100vh');
  c.style('display', 'block');
  c.style('margin', '0 auto');

  initBoids();
  colorMode(HSB);
}

function initBoids() {
  boids = [];
  for (var i = 0; i < numBoids; i++) {
    boids.push(new Boid());
  }
}

function draw() {
  noStroke();
  fill(0);
  rect(0, 0, width, height);
  for (var boid of boids) {
    boid.edges();
    boid.flock(boids);
    boid.update();
    boid.show();
  }

  // 書き出し処理
  if (isExporting) {
    saveCanvas('agent_' + exportSessionID + '_' + nf(exportCount + 1, 3), 'png');
    exportCount++;
    if (exportCount >= exportMax) {
      isExporting = false;
      console.log("Export finished");
    }
  }
}

class Boid {
  constructor() {
    this.position = createVector(random(width), random(height));
    this.velocity = p5.Vector.random2D();
    this.velocity.setMag(random(2, 4));
    this.acceleration = createVector();
    this.maxForce = 0.2;
    this.maxSpeed = 4;
    this.hue = random(360);
    this.mass = random(0.5, 2.0);
  }

  edges() {
    if (this.position.x > width) this.position.x = 0;
    else if (this.position.x < 0) this.position.x = width;
    if (this.position.y > height) this.position.y = 0;
    else if (this.position.y < 0) this.position.y = height;
  }

  align(boids) {
    var steering = createVector();
    var total = 0;
    for (var other of boids) {
      var d = dist(this.position.x, this.position.y, other.position.x, other.position.y);
      if (other != this && d < perceptionRadius) {
        steering.add(p5.Vector.mult(other.velocity, other.mass));
        total += other.mass;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.setMag(maxSpeed);
      steering.sub(this.velocity);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  separation(boids) {
    var steering = createVector();
    var total = 0;
    // 視界より少し狭い範囲を「近づきすぎ」と判定
    var separationRadius = perceptionRadius * 0.6;
    for (var other of boids) {
      var d = dist(this.position.x, this.position.y, other.position.x, other.position.y);
      if (other != this && d < separationRadius) {
        var diff = p5.Vector.sub(this.position, other.position);
        diff.div(d * d); // 距離が近いほど強く反発
        diff.mult(other.mass); // 相手が大きいほど強く反発
        steering.add(diff);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.setMag(this.maxSpeed);
      steering.sub(this.velocity);
      steering.limit(this.maxForce * separationForce); // 反発力を適用
    }
    return steering;
  }

  flock(boids) {
    var alignment = this.align(boids);
    var separation = this.separation(boids);
    this.acceleration.add(alignment);
    this.acceleration.add(separation);
  }

  update() {
    this.position.add(this.velocity);
    this.velocity.add(this.acceleration);
    this.velocity.limit(maxSpeed);
    this.acceleration.mult(0);
  }

  show() {
    strokeWeight(boidSize * this.mass);
    if (colorModeVal === 'Rainbow') {
      stroke(this.hue, 80, 100);
    } else {
      stroke(boidColor);
    }
    point(this.position.x, this.position.y);

    if (showPerception) {
      strokeWeight(1);
      noFill();
      if (colorModeVal === 'Rainbow') {
        stroke(this.hue, 80, 100, 0.3);
      } else {
        let c = color(boidColor);
        stroke(hue(c), saturation(c), brightness(c), 0.3);
      }
      ellipse(this.position.x, this.position.y, perceptionRadius * 2);
    }
  }
}

function startExport() {
  if (isExporting) return;
  isExporting = true;
  exportCount = 0;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  exportSessionID = "";
  for (let i = 0; i < 4; i++) exportSessionID += chars.charAt(floor(random(chars.length)));
  console.log(`Export started: ${exportSessionID}`);
}

window.startExport = startExport;