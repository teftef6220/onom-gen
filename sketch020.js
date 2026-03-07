// Particle System with Attractors
// Interactive, Colorful, Physics-based

const params = {
  particleCount: 1000,
  spawnRate: 10,
  emitterType: 'Ring', // Point, Circle, Ring, Rect, Screen
  emitterText: 'HELLO',
  textSize: 200,
  shapeType: 'Circle', // Circle, Square, Triangle
  colorMode: 'Rainbow', // Rainbow, Fire, Ice, Toxic, White, TwoColors
  color1: '#ff0055',
  color2: '#0055ff',
  baseHue: 200,
  hueRange: 60,
  speed: 1.0,
  initialSpeedMin: 2.0,
  initialSpeedMax: 8.0,
  friction: 0.96,
  gravity: 0.0,
  attractionStrength: 0.8,
  noiseStrength: 0.0,
  noiseScale: 0.01,
  windStrength: 0.0,
  windAngle: 0.0,
  rotationStrength: 0.0,
  movingEmitter: false,
  emitterMoveSpeed: 0.5,
  mouseInteraction: true,
  blendMode: 'ADD', // BLEND, ADD
  trail: true,
  trailStrength: 20,
  connectParticles: false,
  connectionDistance: 100,
  sizePulse: false,
  sizePulseSpeed: 0.1,
  exportFrames: 600,
  exportStart: () => startExport(),
  clear: () => particles = []
};

let particles = [];
let textPoints = [];

window.guiConfig = [
  { folder: 'Generator', contents: [
    { object: params, variable: 'particleCount', min: 100, max: 5000, step: 100, name: 'Max Count' },
    { object: params, variable: 'spawnRate', min: 1, max: 50, step: 1, name: 'Spawn Rate' },
    { object: params, variable: 'emitterType', options: ['Point', 'Circle', 'Ring', 'Rect', 'Screen', 'Text'], name: 'Emitter Shape' },
    { object: params, variable: 'emitterText', name: 'Text String', onChange: updateTextPoints },
    { object: params, variable: 'textSize', min: 50, max: 500, name: 'Text Size', onChange: updateTextPoints },
    { object: params, variable: 'shapeType', options: ['Circle', 'Square', 'Triangle'], name: 'Shape' },
    { object: params, variable: 'movingEmitter', name: 'Move Emitter' },
    { object: params, variable: 'emitterMoveSpeed', min: 0.1, max: 2.0, name: 'Move Speed' },
    { object: params, variable: 'clear', name: 'Clear Particles', type: 'function' }
  ]},
  { folder: 'Physics', contents: [
    { object: params, variable: 'speed', min: 0.1, max: 3.0, name: 'Time Speed' },
    { object: params, variable: 'initialSpeedMin', min: 0, max: 20, name: 'Init Speed Min' },
    { object: params, variable: 'initialSpeedMax', min: 0, max: 20, name: 'Init Speed Max' },
    { object: params, variable: 'friction', min: 0.8, max: 0.99, name: 'Friction' },
    { object: params, variable: 'gravity', min: -0.5, max: 0.5, name: 'Gravity' },
    { object: params, variable: 'noiseStrength', min: 0, max: 2.0, name: 'Noise Strength' },
    { object: params, variable: 'noiseScale', min: 0.001, max: 0.1, name: 'Noise Scale' },
    { object: params, variable: 'windStrength', min: 0, max: 2.0, name: 'Wind Strength' },
    { object: params, variable: 'windAngle', min: 0, max: 6.3, name: 'Wind Angle' },
    { object: params, variable: 'rotationStrength', min: -2.0, max: 2.0, name: 'Rotation Force' },
    { object: params, variable: 'attractionStrength', min: -5.0, max: 5.0, name: 'Attraction' },
    { object: params, variable: 'mouseInteraction', name: 'Mouse Interactive' }
  ]},
  { folder: 'Style', contents: [
    { object: params, variable: 'colorMode', options: ['Rainbow', 'Fire', 'Ice', 'Toxic', 'White', 'TwoColors'], name: 'Color Mode' },
    { object: params, variable: 'color1', type: 'color', name: 'Color 1' },
    { object: params, variable: 'color2', type: 'color', name: 'Color 2' },
    { object: params, variable: 'baseHue', min: 0, max: 360, name: 'Base Hue' },
    { object: params, variable: 'hueRange', min: 0, max: 180, name: 'Hue Range' },
    { object: params, variable: 'blendMode', options: ['BLEND', 'ADD'], name: 'Blend Mode' },
    { object: params, variable: 'trail', name: 'Trails' },
    { object: params, variable: 'trailStrength', min: 0, max: 100, name: 'Trail Fade' },
    { object: params, variable: 'connectParticles', name: 'Connect Lines' },
    { object: params, variable: 'connectionDistance', min: 50, max: 300, name: 'Connect Dist' },
    { object: params, variable: 'sizePulse', name: 'Size Pulse' },
    { object: params, variable: 'sizePulseSpeed', min: 0.01, max: 0.5, name: 'Pulse Speed' }
  ]},
  { folder: 'Export', contents: [
    { object: params, variable: 'exportFrames', min: 60, max: 1200, step: 1, name: 'Frames' },
    { object: params, variable: 'exportStart', name: 'Start Export', type: 'function' }
  ]}
];

// 書き出し用変数
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
  updateTextPoints();
}

function updateTextPoints() {
  let gr = createGraphics(width, height);
  gr.pixelDensity(1);
  gr.background(0);
  gr.fill(255);
  gr.textAlign(CENTER, CENTER);
  gr.textSize(params.textSize);
  gr.textStyle(BOLD);
  gr.text(params.emitterText, width/2, height/2);
  gr.loadPixels();
  
  textPoints = [];
  let step = 4; // 間引き
  for(let y = 0; y < height; y += step) {
    for(let x = 0; x < width; x += step) {
      let index = (x + y * width) * 4;
      if(gr.pixels[index] > 128) {
        textPoints.push(createVector(x, y));
      }
    }
  }
  gr.remove();
}

function draw() {
  blendMode(BLEND);
  rectMode(CORNER);
  noStroke();

  if (params.trail) {
    fill(0, 0, 0, params.trailStrength);
    rect(0, 0, width, height);
  } else {
    fill(0);
    rect(0, 0, width, height);
  }

  if (params.blendMode === 'ADD') {
    blendMode(ADD);
  } else {
    blendMode(BLEND);
  }

  // パーティクル生成
  for (let i = 0; i < params.spawnRate; i++) {
    if (particles.length < params.particleCount) {
      let startX, startY;
      let centerX = width / 2;
      let centerY = height / 2;

      // エミッターが動く場合の中心座標計算
      if (params.movingEmitter) {
        let t = frameCount * 0.01 * params.emitterMoveSpeed;
        centerX = noise(t) * width;
        centerY = noise(t + 100) * height;
      }
      
      if (params.emitterType === 'Point') {
        startX = centerX;
        startY = centerY;
      } else if (params.emitterType === 'Circle') {
        let angle = random(TWO_PI);
        let r = random(0, 300);
        startX = centerX + cos(angle) * r;
        startY = centerY + sin(angle) * r;
      } else if (params.emitterType === 'Ring') {
        let angle = random(TWO_PI);
        let r = random(250, 350);
        startX = centerX + cos(angle) * r;
        startY = centerY + sin(angle) * r;
      } else if (params.emitterType === 'Rect') {
        startX = random(centerX - 400, centerX + 400);
        startY = random(centerY - 200, centerY + 200);
      } else if (params.emitterType === 'Screen') {
        startX = random(width);
        startY = random(height);
      } else if (params.emitterType === 'Text') {
        if (textPoints.length > 0) {
          let pt = random(textPoints);
          let offsetX = centerX - width / 2;
          let offsetY = centerY - height / 2;
          startX = pt.x + offsetX;
          startY = pt.y + offsetY;
        } else {
          startX = centerX;
          startY = centerY;
        }
      }
      
      particles.push(new Particle(startX, startY));
    }
  }

  // マウス位置を引力点とする
  let target = createVector(mouseX, mouseY);
  // マウスがキャンバス外にある場合などは中央をターゲットに
  if (mouseX === 0 && mouseY === 0) {
    target = createVector(width / 2, height / 2);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    
    if (params.mouseInteraction) {
      p.attract(target);
    }
    
    p.update();
    p.display();
    
    if (p.isDead()) {
      particles.splice(i, 1);
    }
  }

  // パーティクル同士を結ぶ線を描画
  if (params.connectParticles) {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        let p1 = particles[i];
        let p2 = particles[j];
        let d = p1.pos.dist(p2.pos);
        if (d < params.connectionDistance) {
          let alpha = map(d, 0, params.connectionDistance, 100, 0);
          stroke(p1.hue, 50, 100, alpha);
          line(p1.pos.x, p1.pos.y, p2.pos.x, p2.pos.y);
        }
      }
    }
  }

  // 書き出し処理
  if (isExporting) {
    saveCanvas('particles_' + exportSessionID + '_' + nf(exportCount + 1, 3), 'png');
    exportCount++;
    if (exportCount >= exportMax) {
      isExporting = false;
      console.log("Export finished");
    }
  }
}

class Particle {
  constructor(x, y) {
    this.pos = createVector(x + random(-10, 10), y + random(-10, 10));
    this.vel = p5.Vector.random2D().mult(random(params.initialSpeedMin, params.initialSpeedMax));
    this.acc = createVector(0, 0);
    this.life = 255.0;
    this.decay = random(0.5, 2.0);
    this.size = random(2, 6);
    this.baseSize = this.size;
    this.pulseOffset = random(100);
    
    this.brightness = 100;
    
    // 色の決定
    let h = params.baseHue + random(-params.hueRange/2, params.hueRange/2);
    if (h < 0) h += 360;
    if (h > 360) h -= 360;
    
    this.saturation = 80;
    
    if (params.colorMode === 'Fire') {
      h = random(0, 50);
    } else if (params.colorMode === 'Ice') {
      h = random(180, 240);
    } else if (params.colorMode === 'Toxic') {
      h = random(90, 150);
    } else if (params.colorMode === 'White') {
      this.saturation = 0;
    } else if (params.colorMode === 'TwoColors') {
      let c1 = color(params.color1);
      let c2 = color(params.color2);
      let c = random() < 0.5 ? c1 : c2;
      h = hue(c);
      this.saturation = saturation(c);
      this.brightness = brightness(c);
    }
    
    this.hue = h;
  }

  attract(target) {
    let force = p5.Vector.sub(target, this.pos);
    let d = force.mag();
    d = constrain(d, 5, 500);
    let strength = (params.attractionStrength * 50) / (d * d); // 引力計算
    force.setMag(strength);
    this.acc.add(force);
  }

  update() {
    this.acc.y += params.gravity;
    
    // ノイズによる揺らぎを追加
    if (params.noiseStrength > 0) {
      let n = noise(this.pos.x * params.noiseScale, this.pos.y * params.noiseScale, frameCount * 0.01);
      let angle = n * TWO_PI * 2;
      let noiseForce = p5.Vector.fromAngle(angle);
      noiseForce.mult(params.noiseStrength);
      this.acc.add(noiseForce);
    }

    // 風の力を追加
    if (params.windStrength > 0) {
      let wind = p5.Vector.fromAngle(params.windAngle);
      wind.mult(params.windStrength);
      this.acc.add(wind);
    }

    // 回転力を追加
    if (params.rotationStrength !== 0) {
      let center = createVector(width / 2, height / 2);
      let dir = p5.Vector.sub(this.pos, center);
      let tangent = createVector(-dir.y, dir.x);
      tangent.normalize();
      tangent.mult(params.rotationStrength);
      this.acc.add(tangent);
    }

    this.vel.add(this.acc);
    this.vel.mult(params.friction);
    this.pos.add(p5.Vector.mult(this.vel, params.speed));
    this.acc.mult(0);
    this.life -= this.decay * params.speed;
  }

  display() {
    noStroke();
    // 寿命に応じて透明度を変える
    let alpha = map(this.life, 0, 255, 0, 100);
    fill(this.hue, this.saturation, this.brightness, alpha);
    
    let s = this.size;
    if (params.sizePulse) {
      // サイン波でサイズを変動させる
      s = this.baseSize * (1 + sin(frameCount * params.sizePulseSpeed + this.pulseOffset) * 0.5);
    }
    
    if (params.shapeType === 'Circle') {
      ellipse(this.pos.x, this.pos.y, s);
    } else if (params.shapeType === 'Square') {
      rectMode(CENTER);
      rect(this.pos.x, this.pos.y, s, s);
    } else if (params.shapeType === 'Triangle') {
      let r = s * 0.6;
      triangle(this.pos.x, this.pos.y - r, this.pos.x - r, this.pos.y + r, this.pos.x + r, this.pos.y + r);
    }
  }

  isDead() {
    return this.life < 0;
  }
}

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
}