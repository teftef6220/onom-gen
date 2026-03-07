import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- 設定とグローバル変数 ---
const params = {
  speed: 0.8,
  zoom: 1.0,
  rotationSpeed: 0.2,
  floatingCount: 30,
  bgColor: '#000000',
  outlineColor: '#000000',
  ambientLightIntensity: 1.0,
  directionalLightIntensity: 1.5,
  autoCamera: true,
  autoCameraInterval: 2.0,
  exportFrames: 600,
  exportStart: function() { startExport(); }
};

window.guiConfig = [
  { folder: 'Animation', contents: [
    { object: params, variable: 'speed', min: 0, max: 2.0, name: 'Speed' },
    { object: params, variable: 'zoom', min: 0.1, max: 3.0, name: 'Base Zoom', listen: true, onChange: v => { if(camera) { camera.zoom = v; camera.updateProjectionMatrix(); } } },
    { object: params, variable: 'rotationSpeed', min: 0, max: 1.0, name: 'Rotation' },
    { object: params, variable: 'autoCamera', name: 'Auto Camera' },
    { object: params, variable: 'autoCameraInterval', min: 0.1, max: 5.0, name: 'Cam Interval' },
    { object: params, variable: 'floatingCount', min: 0, max: 100, step: 1, name: 'Floating Count', onChange: updateFloatingElements }
  ]},
  { folder: 'Environment', contents: [
    { object: params, variable: 'bgColor', type: 'color', name: 'Background', onChange: v => { if(scene) scene.background.set(v); } },
    { object: params, variable: 'ambientLightIntensity', min: 0, max: 3.0, name: 'Ambient Light', onChange: v => { if(ambientLight) ambientLight.intensity = v; } },
    { object: params, variable: 'directionalLightIntensity', min: 0, max: 20.0, name: 'Dir Light', onChange: v => { if(dirLight) dirLight.intensity = v; } },
    { object: params, variable: 'outlineColor', type: 'color', name: 'Outline', onChange: v => {
      if(mainGroup) mainGroup.children.forEach(mesh => {
        if(mesh.children.length > 0) mesh.children[0].material.color.set(v);
      });
    }}
  ]},
  { folder: 'Export', contents: [
    { object: params, variable: 'exportFrames', min: 60, max: 1200, step: 1, name: 'Frames' },
    { object: params, variable: 'exportStart', name: 'Start Export', type: 'function' }
  ]}
];

let scene, camera, renderer, controls;
let mainGroup, floatingGroup, ambientLight, dirLight;
let time = 0;
let cameraTargetPos, cameraStartPos;
let cameraTargetZoomFactor = 1.0, cameraStartZoomFactor = 1.0, currentZoomFactor = 1.0;
let lastCameraSwitchTime = 0;

// 書き出し用変数
let isExporting = false;
let exportCount = 0;
let exportMax = 0;
let exportSessionID = "";

init();
animate();

function init() {
  // 1. シーン
  scene = new THREE.Scene();
  scene.background = new THREE.Color(params.bgColor);

  // 2. カメラ (Orthographic for 2D look)
  // 平行投影を使うことで、遠近感をなくし、2Dグラフィックのような見た目にする
  const aspect = 1920 / 1080;
  const d = 12;
  camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
  camera.position.set(20, 20, 20); // アイソメトリック（等角投影）的な視点
  camera.lookAt(0, 0, 0);

  cameraTargetPos = new THREE.Vector3().copy(camera.position);
  cameraStartPos = new THREE.Vector3().copy(camera.position);
  cameraTargetZoomFactor = 1.0;
  cameraStartZoomFactor = 1.0;
  currentZoomFactor = 1.0;
  lastCameraSwitchTime = 0;

  // 3. レンダラー
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(1920, 1080);
  renderer.setPixelRatio(1); // 書き出し用にピクセル比を1に固定
  renderer.shadowMap.enabled = true; // 影を有効化して立体感を出す
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  // CSS styling
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = 'auto';
  renderer.domElement.style.maxHeight = '100vh';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.margin = '0 auto';
  
  document.body.appendChild(renderer.domElement);

  // 4. コントロール
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = false;

  // 5. ライティング
  ambientLight = new THREE.AmbientLight(0xffffff, params.ambientLightIntensity);
  scene.add(ambientLight);

  dirLight = new THREE.DirectionalLight(0xffffff, params.directionalLightIntensity);
  dirLight.position.set(10, 20, 10);
  dirLight.castShadow = true;
  // 影の解像度と範囲設定
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -20;
  dirLight.shadow.camera.right = 20;
  dirLight.shadow.camera.top = 20;
  dirLight.shadow.camera.bottom = -20;
  scene.add(dirLight);

  // 6. オブジェクト生成 (Toon Pop Style)
  createSceneObjects();
}

function createSceneObjects() {
  mainGroup = new THREE.Group();
  scene.add(mainGroup);

  floatingGroup = new THREE.Group();
  scene.add(floatingGroup);

  // トゥーンシェーディング用のグラデーションマップを作成
  // 3段階の階調（影、中間、ハイライト）を作ることでアニメ塗りのような質感にする
  const gradientMap = new THREE.DataTexture(new Uint8Array([200, 128, 50]), 3, 1, THREE.RedFormat);
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;

  // ポップなカラーパレット
  const colors = [0xFF0099, 0x00CCFF, 0xFFCC00, 0x6633FF, 0xFFFFFF];
  const geometries = [
    new THREE.TorusGeometry(1.5, 0.5, 16, 100),
    new THREE.ConeGeometry(1, 2, 32),
    new THREE.BoxGeometry(1.5, 1.5, 1.5),
    new THREE.SphereGeometry(1.2, 32, 32),
    new THREE.CylinderGeometry(0.5, 0.5, 2, 32)
  ];

  // ランダムな形状のクラスターを作成
  for (let i = 0; i < 15; i++) {
    const geom = geometries[Math.floor(Math.random() * geometries.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const material = new THREE.MeshToonMaterial({
      color: color,
      gradientMap: gradientMap, // グラデーションマップを適用
    });

    const mesh = new THREE.Mesh(geom, material);
    mesh.position.set(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    mesh.scale.setScalar(Math.random() * 0.5 + 0.5);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // アウトライン（輪郭線）を追加して2Dイラスト感を強調
    const edges = new THREE.EdgesGeometry(geom);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: params.outlineColor }));
    mesh.add(line);

    mainGroup.add(mesh);
  }

  updateFloatingElements();
}

function updateFloatingElements() {
  // 既存の要素をクリア
  while(floatingGroup.children.length > 0){ 
    const mesh = floatingGroup.children[0];
    floatingGroup.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) mesh.material.dispose();
  }

  const colors = [0xFF0099, 0x00CCFF, 0xFFCC00, 0x6633FF, 0xFFFFFF];
  const particleGeomPlane = new THREE.PlaneGeometry(0.8, 0.8);
  const particleGeomCircle = new THREE.CircleGeometry(0.4, 32);

  for (let i = 0; i < params.floatingCount; i++) {
    const mat = new THREE.MeshBasicMaterial({ 
      color: colors[Math.floor(Math.random() * colors.length)],
      side: THREE.DoubleSide
    });
    const geom = Math.random() > 0.5 ? particleGeomPlane : particleGeomCircle;
    const mesh = new THREE.Mesh(geom, mat);
    
    // ランダム配置
    mesh.position.set(
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 18
    );
    
    // 回転速度を保存
    mesh.userData = {
      rotSpeed: {
        x: (Math.random() - 0.5) * 0.05,
        y: (Math.random() - 0.5) * 0.05
      }
    };

    floatingGroup.add(mesh);
  }
}

function animate() {
  // 書き出し中はブラウザの描画ループに任せず、制御下で進める
  if (!isExporting) {
    requestAnimationFrame(animate);
    render();
  }
}

function render() {
  time += params.speed * 0.01;
  
  // 全体の回転
  mainGroup.rotation.y = time * params.rotationSpeed;
  mainGroup.rotation.z = time * (params.rotationSpeed * 0.5);

  // 個別のオブジェクトのアニメーション（ふわふわ動く）
  mainGroup.children.forEach((mesh, i) => {
    mesh.position.y += Math.sin(time * 2 + i) * 0.01 * params.speed;
    mesh.rotation.x += 0.01 * params.speed;
  });
  
  // 浮遊エレメントのアニメーション
  floatingGroup.children.forEach(mesh => {
    mesh.rotation.x += mesh.userData.rotSpeed.x * params.speed * 5;
    mesh.rotation.y += mesh.userData.rotSpeed.y * params.speed * 5;
  });

  if (params.autoCamera) {
    // 一定スパンでランダムな角度へ移動
    if (time - lastCameraSwitchTime > params.autoCameraInterval) {
      lastCameraSwitchTime = time;
      cameraStartPos.copy(camera.position);
      cameraStartZoomFactor = currentZoomFactor;
      
      // ランダムな位置を決定（上半分）
      const radius = 35;
      const x = (Math.random() - 0.5) * 2;
      const y = Math.random() * 0.8 + 0.2; // Yはプラス方向（上から見下ろす）
      const z = (Math.random() - 0.5) * 2;
      cameraTargetPos.set(x, y, z).normalize().multiplyScalar(radius);

      // ランダムなズーム係数 (0.7 ~ 1.3)
      cameraTargetZoomFactor = 0.7 + Math.random() * 0.6;
    }

    const progress = (time - lastCameraSwitchTime) / params.autoCameraInterval;
    const t = Math.min(1, Math.max(0, progress));
    // EaseInOutCubic
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    
    camera.position.lerpVectors(cameraStartPos, cameraTargetPos, ease);
    
    // 基本倍率(params.zoom) × アニメーション係数(currentZoomFactor)
    currentZoomFactor = cameraStartZoomFactor + (cameraTargetZoomFactor - cameraStartZoomFactor) * ease;
    camera.zoom = params.zoom * currentZoomFactor;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);
  } else {
    controls.update();
    // 手動操作時は現在のズーム値をパラメータに反映（スライダーと同期）
    params.zoom = camera.zoom;
  }
  
  renderer.render(scene, camera);

  // 書き出し処理
  if (isExporting) {
    saveFrame();
    exportCount++;
    if (exportCount >= exportMax) {
      finishExport();
    } else {
      // ブラウザのダウンロード制限を回避するために少し待機（150ms）
      // これにより「複数ファイルのダウンロード」ブロックを回避しやすくなります
      setTimeout(() => {
        requestAnimationFrame(render);
      }, 150);
    }
  }
}

// --- 書き出し機能 ---

function startExport() {
  if (isExporting) return;
  
  isExporting = true;
  exportCount = 0;
  exportMax = params.exportFrames;
  
  // ランダムなセッションID生成
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  exportSessionID = "";
  for (let i = 0; i < 4; i++) exportSessionID += chars.charAt(Math.floor(Math.random() * chars.length));
  
  console.log(`Export started: ${exportSessionID}, Total frames: ${exportMax}`);
  
  // ループを開始（animate関数内ではなく、ここで明示的にrenderを回す）
  render();
}

function saveFrame() {
  // dataURLを取得してダウンロードリンクを作成・クリック
  const dataURL = renderer.domElement.toDataURL('image/png');
  const link = document.createElement('a');
  
  // ファイル名: liquid_chrome_ID_001.png
  const numStr = String(exportCount + 1).padStart(3, '0');
  link.download = `liquid_chrome_${exportSessionID}_${numStr}.png`;
  link.href = dataURL;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function finishExport() {
  isExporting = false;
  console.log("Export finished");
  // 通常のアニメーションループに戻る
  animate();
}

// キーボードショートカット
window.addEventListener('keydown', (e) => {
  if (e.key === 's' || e.key === 'S') {
    startExport();
  }
});