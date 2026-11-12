// Hero visual: the Teckono logo in 3D, a drone patrolling above it and a robot lying below it.
// Both the drone and the robot's flashlight carry real pink spotlights, so they throw moving
// highlights across the logo. If WebGL or loading fails, the flat images inside #hero-logo stay visible.
import * as THREE from '../../vendor/three.module.min.js';
import { SVGLoader } from '../../vendor/SVGLoader.js';
import { RoomEnvironment } from '../../vendor/RoomEnvironment.js';

const host = document.getElementById('hero-logo');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    const gl = window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'));
    // release the probe context right away, so the page holds only the one the scene uses
    const lose = gl && gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return !!gl;
  } catch (e) {
    return false;
  }
}

const MAGENTA = 0xf822f6;
const PINK = 0xff8af9;

// Soft volumetric light cone: bright at the source, fading along its length and toward its edges.
// The geometry's apex sits at the origin and the cone extends along -y for `len` units.
function beamCone(radius, len, color, strength) {
  const geo = new THREE.ConeGeometry(radius, len, 48, 1, true);
  geo.translate(0, -len / 2, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uLen: { value: len }, uStrength: { value: strength } },
    vertexShader: `
      uniform float uLen;
      varying float vT; varying vec3 vN; varying vec3 vV;
      void main() {
        vT = clamp(-position.y / uLen, 0.0, 1.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uStrength;
      varying float vT; varying vec3 vN; varying vec3 vV;
      void main() {
        float edge = pow(abs(dot(normalize(vN), normalize(vV))), 2.2);
        float fall = pow(1.0 - vT, 1.5) * smoothstep(0.0, 0.06, vT);
        float a = edge * fall * uStrength;
        gl_FragColor = vec4(uColor * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(geo, mat);
}

// Round soft glow for sprites (lens flare, eyes, LEDs)
let glowTexture;
function glowSprite(color, opacity) {
  if (!glowTexture) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    glowTexture = new THREE.CanvasTexture(c);
  }
  return new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
}

function buildDrone() {
  const shell = new THREE.MeshPhysicalMaterial({ color: 0xf7f2fa, roughness: 0.3, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.15 });
  const shellPink = new THREE.MeshPhysicalMaterial({ color: 0xf5d9f6, roughness: 0.3, metalness: 0.1, clearcoat: 1 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd9d2e2, roughness: 0.18, metalness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1222, roughness: 0.45, metalness: 0.4 });
  const glow = new THREE.MeshStandardMaterial({ color: MAGENTA, emissive: MAGENTA, emissiveIntensity: 2.4 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffc2fb, roughness: 0.05, transmission: 0.6, thickness: 0.5, clearcoat: 1, emissive: MAGENTA, emissiveIntensity: 0.35 });
  const blur = new THREE.MeshBasicMaterial({ color: MAGENTA, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

  const mesh = (geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    return m;
  };

  const drone = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.55, 32, 20), shell);
  body.scale.set(1.5, 0.6, 1);
  drone.add(body);
  const canopy = mesh(new THREE.SphereGeometry(0.42, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), glass, 0.15, 0.18, 0);
  canopy.scale.set(1.3, 0.8, 0.9);
  drone.add(canopy);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.025, 10, 64), glow);
  stripe.rotation.x = Math.PI / 2;
  stripe.scale.set(1.45, 1, 1);
  drone.add(stripe);
  drone.add(mesh(new THREE.SphereGeometry(0.18, 20, 12), dark, 0.55, -0.3, 0));
  drone.add(mesh(new THREE.CircleGeometry(0.09, 20), glow, 0.62, -0.3, 0.14));

  const rotors = [];
  for (const [x, z] of [[1.15, 0.8], [1.15, -0.8], [-1.15, 0.8], [-1.15, -0.8]]) {
    const arm = mesh(new THREE.BoxGeometry(Math.hypot(x, z), 0.08, 0.12), shellPink, x / 2, 0, z / 2);
    arm.rotation.y = -Math.atan2(z, x);
    drone.add(arm);
    drone.add(mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.22, 20), chrome, x, 0.06, z));
    drone.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), glow, x, -0.08, z));
    const rotor = new THREE.Group();
    rotor.position.set(x, 0.2, z);
    for (let k = 0; k < 2; k++) {
      const blade = mesh(new THREE.BoxGeometry(1.05, 0.015, 0.09), dark);
      blade.rotation.y = k * Math.PI / 2;
      rotor.add(blade);
    }
    const disc = mesh(new THREE.CircleGeometry(0.55, 40), blur);
    disc.rotation.x = -Math.PI / 2;
    rotor.add(disc);
    drone.add(rotor);
    rotors.push(rotor);
  }
  for (const z of [0.3, -0.3]) {
    const skid = mesh(new THREE.CapsuleGeometry(0.03, 0.9, 4, 8), chrome, 0, -0.5, z);
    skid.rotation.z = Math.PI / 2;
    drone.add(skid);
    drone.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 8), chrome, 0.25, -0.36, z));
    drone.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 8), chrome, -0.25, -0.36, z));
  }

  // Light cone under the drone
  const cone = beamCone(1.5, 3.8, MAGENTA, 1.0);
  cone.position.y = -0.32;
  drone.add(cone);

  return { drone, rotors, cone };
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      resolve(tex);
    }, undefined, reject);
  });
}

// The robot is Lion's render, cut into three layers (body, forearm with flashlight, head)
// so the forearm and head can move a little around their joints. Each eye also has a small
// cut-out (with a soft edge) used only while it blinks.
// Pixel coordinates below refer to the 1250 x 530 layer images.
const ROBOT_PX = { w: 1250, h: 530, visibleW: 1212 };
const ARM_PIVOT = [725, 310];   // elbow
const HEAD_PIVOT = [990, 298];  // neck
const LENS = [582, 50];         // flashlight lens
const EYES = [                  // eye cut-outs: crop box in the head layer
  { file: 'robot-eye-near.png', box: [1000, 180, 1078, 242] },
  { file: 'robot-eye-far.png', box: [950, 156, 992, 200] },
];
const BLINK = 0.2;              // seconds for one close and open
const BEAM_DIR = new THREE.Vector3(-0.848, 0.53, -0.1).normalize(); // out of the flashlight, aimed up at the logo

async function init() {
  const robotDir = host.dataset.robot;
  const [data, texBody, texArm, texHead, ...texEyes] = await Promise.all([
    new SVGLoader().loadAsync(host.dataset.svg),
    loadTexture(robotDir + 'robot-body.webp'),
    loadTexture(robotDir + 'robot-arm.webp'),
    loadTexture(robotDir + 'robot-head.webp'),
    ...EYES.map((e) => loadTexture(robotDir + e.file)),
  ]);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(28, 1, 1, 5000);

  // ---------- logo ----------
  const faceMat = new THREE.MeshPhysicalMaterial({ color: MAGENTA, metalness: 0.35, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.25 });
  const sideMat = new THREE.MeshPhysicalMaterial({ color: 0x7a0c79, metalness: 1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.6 });
  const logo = new THREE.Group();
  const extrude = { depth: 9, bevelEnabled: true, bevelThickness: 1.4, bevelSize: 0.55, bevelSegments: 5, curveSegments: 32 };
  for (const path of data.paths) {
    logo.add(new THREE.Mesh(new THREE.ExtrudeGeometry(SVGLoader.createShapes(path), extrude), [faceMat, sideMat]));
  }
  const box = new THREE.Box3().setFromObject(logo);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  logo.children.forEach((m) => m.position.sub(center));
  logo.scale.y = -1;
  const pivot = new THREE.Group();
  pivot.add(logo);
  scene.add(pivot);
  const W = size.x; // every placement below is in logo widths

  // ---------- drone ----------
  const { drone, rotors, cone } = buildDrone();
  drone.scale.setScalar(W / 11.5);
  scene.add(drone);
  const droneSpot = new THREE.SpotLight(0xff9cfb, 900000, W * 2, Math.PI / 7, 0.6, 2);
  scene.add(droneSpot, droneSpot.target);

  // ---------- robot (half the logo's width, lying under it) ----------
  const pu = (0.5 * W) / ROBOT_PX.visibleW; // world units per image pixel
  const px = (x, y) => new THREE.Vector3((x - ROBOT_PX.w / 2) * pu, (ROBOT_PX.h / 2 - y) * pu, 0);
  const robot = new THREE.Group();
  robot.position.set(0.12 * W, -0.36 * W, 0.07 * W);
  scene.add(robot);
  // breathing scales from the floor line
  const breath = new THREE.Group();
  breath.position.y = -ROBOT_PX.h / 2 * pu;
  robot.add(breath);
  const content = new THREE.Group();
  content.position.y = ROBOT_PX.h / 2 * pu;
  breath.add(content);

  const planeGeo = new THREE.PlaneGeometry(ROBOT_PX.w * pu, ROBOT_PX.h * pu);
  const layer = (tex, order) => {
    const m = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    m.renderOrder = order;
    return m;
  };
  content.add(layer(texBody, 1));

  const arm = new THREE.Group();
  arm.position.copy(px(...ARM_PIVOT));
  content.add(arm);
  const armMesh = layer(texArm, 2);
  armMesh.position.copy(px(...ARM_PIVOT)).negate();
  arm.add(armMesh);

  const head = new THREE.Group();
  head.position.copy(px(...HEAD_PIVOT));
  content.add(head);
  const headMesh = layer(texHead, 3);
  headMesh.position.copy(px(...HEAD_PIVOT)).negate();
  head.add(headMesh);

  // Blinking: while an eye blinks, a dark patch the shape of the eye hides the eye painted in the
  // head layer, and the cut-out on top of it squashes shut and opens again.
  const lids = EYES.map((e, i) => {
    const [x0, y0, x1, y1] = e.box;
    const geo = new THREE.PlaneGeometry((x1 - x0) * pu, (y1 - y0) * pu);
    const at = px((x0 + x1) / 2, (y0 + y1) / 2).sub(px(...HEAD_PIVOT));
    const patch = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texEyes[i], color: 0x0a020c, transparent: true, depthWrite: false, toneMapped: false }));
    const eye = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texEyes[i], transparent: true, depthWrite: false, toneMapped: false }));
    patch.position.copy(at);
    eye.position.copy(at).setZ(at.z + 0.001);
    patch.renderOrder = 3.1;
    eye.renderOrder = 3.2;
    patch.visible = eye.visible = false;
    head.add(patch, eye);
    return { patch, eye };
  });
  let blinkAt = 2.5 + Math.random() * 3;
  let secondBlink = false;

  // Eye and chest LED glows
  const eyes = glowSprite(MAGENTA, 0.35);
  eyes.position.copy(px(1005, 195)).sub(px(...HEAD_PIVOT));
  eyes.scale.setScalar(170 * pu);
  eyes.renderOrder = 4;
  head.add(eyes);
  const led = glowSprite(MAGENTA, 0.5);
  led.position.copy(px(898, 343));
  led.scale.setScalar(70 * pu);
  led.renderOrder = 4;
  content.add(led);

  // Flashlight: lens flare, a wide soft beam, a brighter core and a real spotlight on the logo
  const lens = new THREE.Group();
  lens.position.copy(px(...LENS)).sub(px(...ARM_PIVOT));
  arm.add(lens);
  const flare = glowSprite(0xffb8fd, 0.95);
  flare.scale.setScalar(150 * pu);
  flare.renderOrder = 6;
  lens.add(flare);
  const beamAxis = new THREE.Group();
  beamAxis.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), BEAM_DIR);
  lens.add(beamAxis);
  const beamWide = beamCone(0.12 * W, 0.5 * W, MAGENTA, 1.0); // same width and strength as the drone's beam
  const beamCore = beamCone(0.035 * W, 0.4 * W, 0xffc4fd, 0.45);
  beamWide.renderOrder = beamCore.renderOrder = 5;
  beamAxis.add(beamWide, beamCore);
  const torch = new THREE.SpotLight(0xff7ffb, 900000, W * 1.5, 0.32, 0.7, 2);
  scene.add(torch, torch.target);

  // ---------- lights ----------
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-120, 160, 220);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0xffe6ff, 0.25));
  const sweep = new THREE.PointLight(0xffffff, 70000, 0, 2); // periodic light sweep across the logo
  scene.add(sweep);

  host.appendChild(renderer.domElement);

  // Frame: drone airspace on top, logo in the middle, robot at the bottom
  const FRAME = { w: 1.22 * W, top: 0.4 * W, bottom: -0.49 * W };
  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const frameH = FRAME.top - FRAME.bottom;
    const cy = (FRAME.top + FRAME.bottom) / 2;
    const dist = Math.max((FRAME.w / 2) / Math.tan(hFov / 2), (frameH / 2) / Math.tan(vFov / 2));
    camera.position.set(0, cy, dist);
    camera.lookAt(0, cy, 0);
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(host);

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.tx = e.clientX / window.innerWidth - 0.5;
    pointer.ty = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  const easeOut = (t) => 1 - Math.pow(1 - t, 4);
  const INTRO = 2.2;
  const prev = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const dir = new THREE.Vector3();
  let heading = 0;

  function dronePos(t, out) {
    // Patrols above the logo's left half, passing a little in front of and behind it.
    const s = t * 0.38;
    out.set(
      -0.14 * W + Math.sin(s) * 0.2 * W + pointer.x * 0.05 * W,
      0.29 * W + Math.sin(s * 2) * 0.02 * W + Math.sin(t * 1.7) * 0.008 * W,
      Math.cos(s) * 0.1 * W,
    );
    return out;
  }

  function frame(t, dt) {
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2.5);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2.5);

    // Logo: turns in once, then floats and sways gently toward the pointer.
    const intro = t < INTRO ? easeOut(t / INTRO) : 1;
    pivot.rotation.y = -Math.PI * 1.2 * (1 - intro) + Math.sin(t * 0.5) * 0.18 + pointer.x * 0.3;
    pivot.rotation.x = -0.04 + pointer.y * 0.14 + Math.sin(t * 0.7) * 0.03;
    pivot.position.y = Math.sin(t * 0.9) * W * 0.008;

    // Drone: flies in from the left during the intro, then patrols.
    dronePos(t, pos);
    if (t < INTRO) pos.x -= (1 - intro) * W * 0.9;
    const vel = tmp.copy(pos).sub(prev);
    prev.copy(pos);
    drone.position.copy(pos);
    if (vel.lengthSq() > 1e-6) {
      const target = Math.atan2(-vel.z, vel.x);
      let d = target - heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      heading += d * Math.min(1, dt * 3);
    }
    drone.rotation.set(0, heading, 0);
    drone.rotateZ(THREE.MathUtils.clamp(-vel.y * 0.05, -0.25, 0.25) - 0.1);
    drone.rotateX(THREE.MathUtils.clamp(vel.z * 0.03, -0.2, 0.2));
    rotors.forEach((r, i) => { r.rotation.y = t * (i % 2 ? 30 : -30); });
    cone.material.uniforms.uStrength.value = 1.0 + Math.sin(t * 1.1) * 0.12;
    droneSpot.position.copy(pos);
    droneSpot.target.position.set(pos.x, pivot.position.y, 0);

    // Robot: barely moves. Breathing, a slow head tilt, the flashlight hand drifting.
    breath.scale.y = 1 + Math.sin(t * 1.4) * 0.004;
    head.rotation.z = Math.sin(t * 0.8) * 0.02 + Math.sin(t * 0.33) * 0.01;
    arm.rotation.z = -0.1 + Math.sin(t * 0.55 + 1) * 0.03;
    // Now and then the eyes blink, sometimes twice in a row.
    let closed = 0;
    const since = t - blinkAt;
    const blinking = since >= 0 && since < BLINK;
    if (blinking) {
      const u = since / BLINK;
      closed = u < 0.4 ? u / 0.4 : 1 - (u - 0.4) / 0.6;
      closed = closed * closed * (3 - 2 * closed);
    } else if (since >= BLINK) {
      secondBlink = !secondBlink && Math.random() < 0.3;
      blinkAt = t + (secondBlink ? 0.12 : 2.8 + Math.random() * 3.5);
    }
    lids.forEach(({ patch, eye }) => {
      patch.visible = eye.visible = blinking;
      eye.scale.y = 1 - 0.9 * closed;
    });
    eyes.material.opacity = (0.28 + Math.sin(t * 0.5) * 0.12) * (1 - 0.8 * closed);
    led.material.opacity = 0.35 + (Math.sin(t * 0.8) * 0.5 + 0.5) * 0.35;
    const flicker = 1 + Math.sin(t * 2.4) * 0.18; // visible, smooth pulse of the flashlight
    beamWide.material.uniforms.uStrength.value = 1.0 * flicker;
    beamCore.material.uniforms.uStrength.value = 0.45 * flicker;
    flare.material.opacity = Math.min(1, 0.85 * flicker);
    flare.scale.setScalar(170 * pu * flicker);

    // Torch spotlight follows the beam
    robot.updateMatrixWorld(true);
    lens.getWorldPosition(torch.position);
    dir.copy(BEAM_DIR).applyQuaternion(lens.getWorldQuaternion(new THREE.Quaternion()));
    torch.target.position.copy(torch.position).addScaledVector(dir, W);
    torch.intensity = 1000000 * flicker;

    // A white light sweeps across the logo every 6 seconds
    const k = (t % 6) / 6;
    sweep.position.set((k * 2 - 1) * W * 0.9, size.y * 0.4, size.y * 1.6);
    sweep.intensity = Math.sin(Math.PI * k) * 90000;

    renderer.render(scene, camera);
  }

  host.classList.add('is-3d');

  if (reduceMotion) {
    prev.copy(dronePos(9.5, pos));
    frame(10, 0);
    new ResizeObserver(() => frame(10, 0)).observe(host);
    return;
  }

  let visible = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0 }).observe(host);
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible || document.hidden || host.closest('.is-covered')) return;
    frame(clock.elapsedTime, dt);
  });
}

// Start once every constant above is defined.
if (host && webglAvailable()) {
  init().catch((err) => console.warn('3D logo disabled:', err));
}
