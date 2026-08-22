import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const SCROLL_STATE_EVENT = "agent-carry:scroll-state";
const IDLE_FRAME_INTERVAL = 1000 / 60;
const SCROLL_FRAME_INTERVAL = 1000 / 30;

export interface Planet {
  key: string;
  label: string;
  color: string;
}

type OrbitDefinition = {
  radius: number;
  tilt: [number, number, number];
  count: number;
  offset: number;
  speed: number;
  precession: [number, number, number];
  dashed: boolean;
  opacity: number;
};

const ORBITS: OrbitDefinition[] = [
  {
    radius: 1.5,
    tilt: [0.38, 0.08, 0.08],
    count: 2,
    offset: 0.32,
    speed: 0.0009,
    precession: [0.00002, 0.00004, -0.00002],
    dashed: false,
    opacity: 0.31,
  },
  {
    radius: 1.88,
    tilt: [-0.62, 0.24, -0.32],
    count: 2,
    offset: 1.22,
    speed: 0.00072,
    precession: [-0.00003, 0.00002, 0.000025],
    dashed: true,
    opacity: 0.27,
  },
  {
    radius: 2.22,
    tilt: [0.76, -0.38, 0.48],
    count: 2,
    offset: 2.12,
    speed: 0.00056,
    precession: [0.000025, -0.00003, 0.000018],
    dashed: false,
    opacity: 0.22,
  },
  {
    radius: 2.55,
    tilt: [-0.38, -0.66, -0.18],
    count: 2,
    offset: 0.84,
    speed: 0.00043,
    precession: [-0.000018, -0.000022, 0.000026],
    dashed: true,
    opacity: 0.19,
  },
];

function createCoreTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createLinearGradient(72, 70, 190, 196);
  gradient.addColorStop(0, "#bae9ec");
  gradient.addColorStop(0.42, "#83bfea");
  gradient.addColorStop(1, "#7897d8");

  ctx.beginPath();
  ctx.arc(128, 128, 76, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = "rgba(239, 248, 255, 0.88)";
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(128, 128, 72, 0, Math.PI * 2);
  ctx.clip();

  ctx.beginPath();
  ctx.moveTo(65, 104);
  ctx.bezierCurveTo(92, 90, 112, 99, 128, 93);
  ctx.bezierCurveTo(151, 84, 166, 89, 190, 78);
  ctx.lineWidth = 11;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.stroke();
  ctx.restore();

  // 品牌名直接印在球体表面。保留字体自身的字偶距，也不加描边或阴影，
  // 避免球面纹理在字标上下形成一个看似按钮的“伪外框”。
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '600 17px "Space Grotesk", "Segoe UI", sans-serif';
  ctx.fillStyle = "rgba(33, 63, 124, 0.86)";
  ctx.fillText("Agent Carry", 128, 130);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function createPlanetSheenTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.ellipse(128, 119, 56, 17, -0.12, Math.PI * 1.08, Math.PI * 1.82);
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(128, 141, 47, 13, -0.08, 0.08, Math.PI * 0.72);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(220, 252, 255, 0.58)";
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function createSparkleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.beginPath();
  ctx.moveTo(64, 10);
  ctx.lineTo(70, 55);
  ctx.lineTo(112, 64);
  ctx.lineTo(70, 72);
  ctx.lineTo(64, 118);
  ctx.lineTo(58, 72);
  ctx.lineTo(16, 64);
  ctx.lineTo(58, 55);
  ctx.closePath();
  ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(64, 64, 7, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(205, 247, 255, 0.98)";
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function createNodeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.beginPath();
  ctx.arc(64, 64, 29, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fill();

  ctx.lineCap = "round";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.94)";
  ctx.beginPath();
  ctx.arc(64, 64, 37, 0.18, 2.76);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(64, 64, 37, 3.34, 5.94);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(64, 64, 19, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.34)";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(64, 64, 9, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 1)";
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function createOrbitGeometry(radius: number, segments = 192) {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index < segments; index++) {
    const angle = (index / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

type ArcDefinition = {
  radius: number;
  width: number;
  start: number;
  length: number;
  rotation: [number, number, number];
  color: number;
  opacity: number;
  speed: number;
};

const CORE_ARCS: ArcDefinition[] = [
  {
    radius: 1.2,
    width: 0.005,
    start: 1.12,
    length: 3.42,
    rotation: [0.62, 0.14, -0.3],
    color: 0x7fc3d3,
    opacity: 0.17,
    speed: -0.0012,
  },
  {
    radius: 1.38,
    width: 0.004,
    start: 2.06,
    length: 3.86,
    rotation: [-0.48, 0.26, 0.5],
    color: 0xb2c2dd,
    opacity: 0.1,
    speed: 0.0008,
  },
];

const CORE_PLANET_SCALE = 1.71;

function canCreateWebGLContext(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const options: WebGLContextAttributes = {
      alpha: true,
      antialias: true,
      depth: true,
      failIfMajorPerformanceCaveat: false,
    };
    const context = canvas.getContext("webgl2", options) ?? canvas.getContext("webgl", options);
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * 助手核心：四条语义轨道与八个可点击节点。
 * 只负责可视导航；资产状态、动作和路线仍由上层传入并保持原契约。
 */
export default function Core({
  planets,
  onSelect,
  className = "",
}: {
  planets: Planet[];
  onSelect: (key: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || webglFailed) return;
    if (!canCreateWebGLContext()) {
      setWebglFailed(true);
      return;
    }
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motionPreference.matches;
    let isIntersecting = true;
    let scrolling = false;
    let requestRender = () => {};

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-4, 4, 3.1, -3.1, 0.1, 100);
    camera.position.set(0, 0.18, 7);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "default",
      });
    } catch {
      setWebglFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      setWebglFailed(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);

    const resize = () => {
      const width = el.clientWidth || 1;
      const height = el.clientHeight || 1;
      const aspect = width / height;
      const radius = 3.12;
      if (aspect >= 1) {
        camera.left = -radius * aspect;
        camera.right = radius * aspect;
        camera.top = radius;
        camera.bottom = -radius;
      } else {
        camera.left = -radius;
        camera.right = radius;
        camera.top = radius / aspect;
        camera.bottom = -radius / aspect;
      }
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      requestRender();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(el);

    const system = new THREE.Group();
    const BASE_X = -0.08;
    const BASE_Y = 0.06;
    system.rotation.set(BASE_X, BASE_Y, 0);
    system.scale.x = 1.08;
    scene.add(system);

    let disposed = false;
    let coreTexture = createCoreTexture();
    const planetSheenTexture = createPlanetSheenTexture();
    const sparkleTexture = createSparkleTexture();
    const nodeTexture = createNodeTexture();

    const central = new THREE.Group();
    central.position.z = 0.04;
    system.add(central);

    // 同一层几何外壳分前后两次绘制，让星球真正处在壳内，而不是浮在壳的前面。
    const satelliteBlue = planets.find((planet) => planet.key === "memories")?.color ?? "#4f7bff";
    const coreCageBackMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(satelliteBlue),
      wireframe: true,
      transparent: true,
      opacity: 0.4,
      depthTest: false,
      depthWrite: false,
      side: THREE.BackSide,
    });
    const coreCageFrontMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(satelliteBlue),
      wireframe: true,
      transparent: true,
      opacity: 0.26,
      depthTest: false,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    const coreCage = new THREE.Group();
    coreCage.rotation.set(0.18, -0.24, 0.08, "XYZ");
    const coreCageGeometry = new THREE.IcosahedronGeometry(0.832, 1);
    const coreCageBack = new THREE.Mesh(coreCageGeometry, coreCageBackMaterial);
    coreCageBack.renderOrder = 3;
    const coreCageFront = new THREE.Mesh(coreCageGeometry, coreCageFrontMaterial);
    coreCageFront.renderOrder = 7;
    coreCage.add(coreCageBack, coreCageFront);
    central.add(coreCage);

    const arcGroups: THREE.Group[] = [];
    for (const definition of CORE_ARCS) {
      const arcGroup = new THREE.Group();
      arcGroup.rotation.set(...definition.rotation, "XYZ");
      const arc = new THREE.Mesh(
        new THREE.RingGeometry(
          definition.radius - definition.width,
          definition.radius + definition.width,
          128,
          1,
          definition.start,
          definition.length,
        ),
        new THREE.MeshBasicMaterial({
          color: definition.color,
          transparent: true,
          opacity: definition.opacity,
          depthTest: false,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      arc.renderOrder = 2;
      arcGroup.add(arc);

      const markerAngle = definition.start + definition.length * 0.82;
      const marker = new THREE.Mesh(
        new THREE.CircleGeometry(definition.width * 2.2, 18),
        new THREE.MeshBasicMaterial({
          color: definition.color,
          transparent: true,
          opacity: Math.min(definition.opacity + 0.18, 1),
          depthTest: false,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      marker.position.set(
        Math.cos(markerAngle) * definition.radius,
        Math.sin(markerAngle) * definition.radius,
        0.01,
      );
      marker.renderOrder = 3;
      arcGroup.add(marker);

      arcGroups.push(arcGroup);
      central.add(arcGroup);
    }

    let coreMark: THREE.Sprite | null = null;
    let planetSheen: THREE.Sprite | null = null;
    if (coreTexture) {
      coreMark = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: coreTexture,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      coreMark.scale.setScalar(CORE_PLANET_SCALE);
      coreMark.renderOrder = 5;
      central.add(coreMark);
    }

    // Canvas 首帧可能早于本地品牌字体完成加载；字体就绪后只刷新核心纹理，
    // 避免首次打开时退回系统字体而再次出现“字标不贴合”。
    if (coreMark) {
      void document.fonts.load('600 17px "Space Grotesk"').then(() => {
        if (disposed || !coreMark) return;
        const refreshedTexture = createCoreTexture();
        if (!refreshedTexture) return;
        const previousTexture = coreMark.material.map;
        coreMark.material.map = refreshedTexture;
        coreMark.material.needsUpdate = true;
        coreTexture = refreshedTexture;
        if (previousTexture && previousTexture !== refreshedTexture) previousTexture.dispose();
        requestRender();
      }).catch(() => {
        // 字体加载失败时保留已经可用的系统字体纹理，不影响核心与导航。
      });
    }

    if (planetSheenTexture) {
      planetSheen = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: planetSheenTexture,
          transparent: true,
          opacity: 0.32,
          depthTest: false,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      planetSheen.scale.setScalar(CORE_PLANET_SCALE);
      planetSheen.renderOrder = 6;
      central.add(planetSheen);
    }

    let coreSparkle: THREE.Sprite | null = null;
    if (sparkleTexture) {
      coreSparkle = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: sparkleTexture,
          transparent: true,
          opacity: 0.58,
          depthTest: false,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      coreSparkle.position.set(-0.38, 0.4, 0.12);
      coreSparkle.scale.setScalar(0.25);
      coreSparkle.renderOrder = 8;
      central.add(coreSparkle);
    }

    const nearMoonOrbit = new THREE.Group();
    nearMoonOrbit.rotation.set(0.54, 0.12, -0.18, "XYZ");
    if (nodeTexture) {
      const nearMoon = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: nodeTexture,
          color: 0x9ebee8,
          transparent: true,
          opacity: 0.82,
          depthTest: false,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      nearMoon.position.set(1.29, 0, 0.08);
      nearMoon.scale.setScalar(0.21);
      nearMoon.renderOrder = 7;
      nearMoonOrbit.add(nearMoon);
    }
    central.add(nearMoonOrbit);

    const orbitGroups: THREE.Group[] = [];
    const carriers: THREE.Group[] = [];
    const nodeSprites: THREE.Sprite[] = [];
    let planetIndex = 0;

    for (const orbit of ORBITS) {
      const precessionGroup = new THREE.Group();
      const orbitPlane = new THREE.Group();
      orbitPlane.rotation.set(...orbit.tilt, "XYZ");

      const geometry = createOrbitGeometry(orbit.radius);
      const material = orbit.dashed
        ? new THREE.LineDashedMaterial({
            color: 0x87a3cf,
            transparent: true,
            opacity: orbit.opacity,
            dashSize: 0.075,
            gapSize: 0.06,
            depthTest: false,
            depthWrite: false,
          })
        : new THREE.LineBasicMaterial({
            color: 0x87a3cf,
            transparent: true,
            opacity: orbit.opacity,
            depthTest: false,
            depthWrite: false,
          });
      const line = new THREE.LineLoop(geometry, material);
      if (orbit.dashed) line.computeLineDistances();
      line.renderOrder = 0;
      orbitPlane.add(line);

      const carrier = new THREE.Group();
      for (let index = 0; index < orbit.count && planetIndex < planets.length; index++) {
        const angle = orbit.offset + (index / orbit.count) * Math.PI * 2;
        const planet = planets[planetIndex];
        const node = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: nodeTexture,
            color: new THREE.Color(planet.color),
            transparent: true,
            opacity: 0.94,
            depthTest: false,
            depthWrite: false,
            toneMapped: false,
          }),
        );
        node.position.set(Math.cos(angle) * orbit.radius, Math.sin(angle) * orbit.radius, 0.02);
        node.scale.setScalar(0.43);
        node.userData.index = planetIndex;
        node.renderOrder = 4;
        nodeSprites.push(node);
        carrier.add(node);
        planetIndex += 1;
      }

      orbitPlane.add(carrier);
      precessionGroup.add(orbitPlane);
      orbitGroups.push(precessionGroup);
      carriers.push(carrier);
      system.add(precessionGroup);
    }

    // 极少量校准点只提供空间尺度，不承担“星空背景”装饰职责。
    let seed = 0x51f15e5d;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    const pointCount = 42;
    const pointPositions = new Float32Array(pointCount * 3);
    for (let index = 0; index < pointCount; index++) {
      const distance = 2.62 + random() * 0.44;
      const angle = random() * Math.PI * 2;
      pointPositions[index * 3] = Math.cos(angle) * distance;
      pointPositions[index * 3 + 1] = Math.sin(angle) * distance * 0.82;
      pointPositions[index * 3 + 2] = (random() - 0.5) * 0.5;
    }
    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3));
    const calibrationPoints = new THREE.Points(
      pointGeometry,
      new THREE.PointsMaterial({
        color: 0x94acd0,
        size: 0.016,
        transparent: true,
        opacity: 0.2,
        depthTest: false,
        depthWrite: false,
      }),
    );
    calibrationPoints.renderOrder = -1;
    system.add(calibrationPoints);

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const projected = new THREE.Vector3();
    const centerProjected = new THREE.Vector3();
    let hovered: number | null = null;
    let mouseX = 0;
    let mouseY = 0;

    const pick = (event: PointerEvent): number | null => {
      const bounds = el.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return null;
      ndc.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      ndc.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(nodeSprites, false)[0];
      return hit ? ((hit.object as THREE.Sprite).userData.index as number) : null;
    };

    const onPointerDown = (event: PointerEvent) => {
      const index = pick(event);
      if (index != null && planets[index]) onSelect(planets[index].key);
    };
    const onPointerMove = (event: PointerEvent) => {
      const bounds = el.getBoundingClientRect();
      if (bounds.width && bounds.height) {
        mouseX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
        mouseY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      }
      hovered = pick(event);
      el.style.cursor = hovered != null ? "pointer" : "default";
      requestRender();
    };
    const onPointerLeave = () => {
      hovered = null;
      mouseX = 0;
      mouseY = 0;
      el.style.cursor = "default";
      requestRender();
    };
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerleave", onPointerLeave);

    let frame = 0;
    let frameTimer = 0;
    let lastFrameAt = 0;
    let elapsed = 0;
    (window as unknown as { __carryPlanets: unknown }).__carryPlanets = [];

    const scheduleNextFrame = () => {
      if (frame || frameTimer || reduced || document.hidden || !isIntersecting || disposed) return;
      const delay = scrolling ? SCROLL_FRAME_INTERVAL : IDLE_FRAME_INTERVAL;
      frameTimer = window.setTimeout(() => {
        frameTimer = 0;
        if (!frame && !document.hidden && isIntersecting && !disposed) frame = requestAnimationFrame(renderFrame);
      }, delay);
    };

    const renderFrame = (now: number) => {
      frame = 0;
      if (!document.hidden && isIntersecting) {
        if (!reduced) {
          const frameScale = lastFrameAt === 0
            ? 1
            : THREE.MathUtils.clamp((now - lastFrameAt) / IDLE_FRAME_INTERVAL, 0.25, 4);
          lastFrameAt = now;
          elapsed += frameScale;
          for (let index = 0; index < arcGroups.length; index++) {
            arcGroups[index].rotation.z += CORE_ARCS[index].speed * frameScale;
          }
          for (let index = 0; index < orbitGroups.length; index++) {
            carriers[index].rotation.z += ORBITS[index].speed * frameScale;
            orbitGroups[index].rotation.x += ORBITS[index].precession[0] * frameScale;
            orbitGroups[index].rotation.y += ORBITS[index].precession[1] * frameScale;
            orbitGroups[index].rotation.z += ORBITS[index].precession[2] * frameScale;
          }
          const planetPulse = 1 + Math.sin(elapsed * 0.021) * 0.02;
          if (coreMark) coreMark.scale.setScalar(CORE_PLANET_SCALE * planetPulse);
          if (planetSheen) {
            planetSheen.scale.setScalar(CORE_PLANET_SCALE * planetPulse);
            planetSheen.material.rotation -= 0.0024 * frameScale;
            planetSheen.material.opacity = 0.34 + Math.sin(elapsed * 0.018) * 0.08;
          }
          if (coreSparkle) {
            const sparkleWave = Math.pow(0.5 + Math.sin(elapsed * 0.055) * 0.5, 3);
            coreSparkle.material.opacity = 0.34 + sparkleWave * 0.62;
            coreSparkle.scale.setScalar(0.23 + sparkleWave * 0.065);
          }
          coreCage.rotation.x -= 0.00055 * frameScale;
          coreCage.rotation.y += 0.00145 * frameScale;
          const cagePulse = Math.sin(elapsed * 0.015);
          coreCageBackMaterial.opacity = 0.4 + cagePulse * 0.025;
          coreCageFrontMaterial.opacity = 0.26 + cagePulse * 0.02;
          nearMoonOrbit.rotation.z += 0.0042 * frameScale;
          central.position.y = Math.sin(elapsed * 0.013) * 0.018;
          calibrationPoints.rotation.z -= 0.00008 * frameScale;
          system.rotation.x = THREE.MathUtils.lerp(system.rotation.x, BASE_X + mouseY * 0.035, 0.04);
          system.rotation.y = THREE.MathUtils.lerp(system.rotation.y, BASE_Y + mouseX * 0.055, 0.04);
        }

        for (let index = 0; index < nodeSprites.length; index++) {
          const isHovered = index === hovered;
          const targetScale = isHovered ? 0.53 : 0.43;
          const currentScale = nodeSprites[index].scale.x;
          nodeSprites[index].scale.setScalar(THREE.MathUtils.lerp(currentScale, targetScale, 0.18));
          nodeSprites[index].material.opacity = isHovered ? 1 : 0.94;
        }

        renderer.render(scene, camera);

        const width = el.clientWidth;
        const height = el.clientHeight;
        centerProjected.set(0, 0, 0);
        system.localToWorld(centerProjected);
        centerProjected.project(camera);
        const centerX = (centerProjected.x * 0.5 + 0.5) * width;
        const centerY = (-centerProjected.y * 0.5 + 0.5) * height;

        const carryWindow = window as unknown as {
          __carryPlanets?: Array<{ key: string; x: number; y: number }>;
        };
        carryWindow.__carryPlanets = nodeSprites.map((node, index) => {
          node.getWorldPosition(projected);
          projected.project(camera);
          return {
            key: planets[index].key,
            x: (projected.x * 0.5 + 0.5) * width,
            y: (-projected.y * 0.5 + 0.5) * height,
          };
        });

        for (let index = 0; index < nodeSprites.length; index++) {
          const label = labelRefs.current[index];
          if (!label) continue;
          nodeSprites[index].getWorldPosition(projected);
          projected.project(camera);
          const x = (projected.x * 0.5 + 0.5) * width;
          const y = (-projected.y * 0.5 + 0.5) * height;
          const deltaX = x - centerX;
          const deltaY = y - centerY;
          const distance = Math.max(Math.hypot(deltaX, deltaY), 1);
          const labelX = THREE.MathUtils.clamp(x + (deltaX / distance) * 24, 62, width - 62);
          const labelY = THREE.MathUtils.clamp(y + (deltaY / distance) * 24, 18, height - 18);
          label.style.transform = `translate(${labelX}px, ${labelY}px) translate(-50%, -50%)`;
          label.style.opacity = "1";
        }
      }
      scheduleNextFrame();
    };

    requestRender = () => {
      if (frame || document.hidden || !isIntersecting) return;
      if (frameTimer) {
        window.clearTimeout(frameTimer);
        frameTimer = 0;
      }
      frame = requestAnimationFrame(renderFrame);
    };

    const syncRenderLoop = () => {
      reduced = motionPreference.matches;
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      if (frameTimer) {
        window.clearTimeout(frameTimer);
        frameTimer = 0;
      }
      lastFrameAt = 0;
      requestRender();
    };
    const onScrollState = (event: Event) => {
      scrolling = event instanceof CustomEvent && event.detail === true;
      requestRender();
    };
    const onVisibilityChange = () => syncRenderLoop();
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isIntersecting = entry?.isIntersecting ?? true;
        syncRenderLoop();
      },
      { rootMargin: "80px", threshold: 0.01 },
    );
    intersectionObserver.observe(el);
    motionPreference.addEventListener("change", syncRenderLoop);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener(SCROLL_STATE_EVENT, onScrollState);
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(frameTimer);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      motionPreference.removeEventListener("change", syncRenderLoop);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener(SCROLL_STATE_EVENT, onScrollState);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
          object.geometry.dispose();
        }
        if (!("material" in object)) return;
        const materialValue = (object as THREE.Object3D & { material?: THREE.Material | THREE.Material[] }).material;
        if (!materialValue) return;
        const materials = Array.isArray(materialValue) ? materialValue : [materialValue];
        for (const material of materials) material.dispose();
      });
      coreTexture?.dispose();
      planetSheenTexture?.dispose();
      sparkleTexture?.dispose();
      nodeTexture?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
    };
  }, [planets, onSelect, webglFailed]);

  return (
    <div
      ref={ref}
      className={`core-orbit-stage relative ${className}`}
      data-renderer={webglFailed ? "fallback" : "webgl"}
      aria-hidden
    >
      {webglFailed ? (
        <div className="core-orbit-fallback">
          <div className="core-orbit-fallback__system">
            <span className="core-orbit-fallback__ring core-orbit-fallback__ring--one" />
            <span className="core-orbit-fallback__ring core-orbit-fallback__ring--two" />
            <span className="core-orbit-fallback__core">Agent Carry</span>
            {planets.map((planet, index) => (
              <span
                key={planet.key}
                className="core-orbit-fallback__satellite"
                style={{ "--satellite-index": index, "--satellite-color": planet.color } as React.CSSProperties}
              />
            ))}
          </div>
          <p>三维核心暂不可用，可用下方分类继续导航。</p>
        </div>
      ) : planets.map((planet, index) => (
          <div
            key={planet.key}
            ref={(node) => {
              labelRefs.current[index] = node;
            }}
            className="pointer-events-none absolute left-0 top-0 z-10 will-change-transform"
            style={{ color: planet.color }}
          >
            <span className="star-label">{planet.label}</span>
          </div>
        ))}
    </div>
  );
}
