import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export type WheelKind = 'first' | 'second' | 'third';
export type FaceMark = 'blank' | 'text' | 'digit' | 'long' | 'short' | 'deep' | 'shallow';
export type FaceTone = 'good' | 'bad' | 'neutral';

const RESULT_FACE_UP_ROTATIONS = [-Math.PI / 2, Math.PI / 2, 0, Math.PI] as const;

export interface WheelFaceSpec {
  label: string;
  mark: FaceMark;
  tone?: FaceTone;
}

export interface WheelSpec {
  id: string;
  kind: WheelKind;
  /** 四个纵向轮面：正面、背面、上侧面、下侧面。尖端不是额外轮面。 */
  faces: [WheelFaceSpec, WheelFaceSpec, WheelFaceSpec, WheelFaceSpec];
  /** 最后显示哪一面；为空时用略有差异的静止角度展示。 */
  resultFace?: 0 | 1 | 2 | 3;
}

interface Props {
  wheels: WheelSpec[];
  rolling?: boolean;
  rollingIds?: string[];
  label: string;
  className?: string;
}

type Corner = [number, number, number];

function faceTexture(spec: WheelFaceSpec, kind: WheelKind, faceIndex: number, showMark = true): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建木轮纹理');

  const wood = ctx.createLinearGradient(0, 0, 0, canvas.height);
  wood.addColorStop(0, '#dcaf78');
  wood.addColorStop(0.48, '#c99359');
  wood.addColorStop(1, '#aa7141');
  ctx.fillStyle = wood;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 18; i += 1) {
    const y = 12 + i * 16;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(150, y - 6 + (i % 3), 425, y + 5 - (i % 4), 640, y - 1);
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(113,66,35,.18)' : 'rgba(255,226,177,.16)';
    ctx.lineWidth = i % 4 === 0 ? 2 : 1;
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(102,61,35,.52)';
  ctx.lineWidth = 7;
  ctx.strokeRect(10, 10, 620, 280);
  ctx.strokeStyle = 'rgba(255,229,183,.56)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 600, 260);

  const ink = spec.tone === 'good' ? '#a33325' : spec.tone === 'bad' ? '#263f3a' : '#342a21';
  if (showMark && kind === 'second') {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#3e3023';
    ctx.font = 'bold 46px "Noto Serif SC", "Songti SC", "SimSun", serif';
    ctx.fillText(spec.label, canvas.width / 2, 66);

    if (spec.mark === 'long' || spec.mark === 'short') {
      const span = spec.mark === 'long' ? 594 : 205;
      const start = (canvas.width - span) / 2;
      ctx.beginPath();
      ctx.moveTo(start, 176);
      ctx.lineTo(start + span, 176);
      ctx.strokeStyle = spec.mark === 'long' ? '#a33427' : '#b34b37';
      ctx.lineWidth = spec.mark === 'long' ? 25 : 8;
      ctx.lineCap = 'butt';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(start, 180);
      ctx.lineTo(start + span, 180);
      ctx.strokeStyle = 'rgba(255,221,176,.52)';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (spec.mark === 'deep' || spec.mark === 'shallow') {
      const span = spec.mark === 'deep' ? 594 : 205;
      const start = (canvas.width - span) / 2;
      const width = spec.mark === 'deep' ? 24 : 8;
      ctx.beginPath();
      ctx.moveTo(start, 176);
      ctx.lineTo(start + span, 176);
      ctx.strokeStyle = 'rgba(74,43,28,.9)';
      ctx.lineWidth = width + 8;
      ctx.lineCap = 'butt';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(start + 1, 173);
      ctx.lineTo(start + span - 1, 173);
      ctx.strokeStyle = 'rgba(239,201,148,.72)';
      ctx.lineWidth = spec.mark === 'deep' ? 4 : 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(start, 177);
      ctx.lineTo(start + span, 177);
      ctx.strokeStyle = '#53321f';
      ctx.lineWidth = width;
      ctx.stroke();
    }
  } else if (showMark && kind === 'third' && spec.mark === 'digit' && spec.label) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,238,207,.6)';
    ctx.shadowBlur = 2;
    ctx.fillStyle = '#433020';
    ctx.font = spec.label.length > 1
      ? 'bold 124px "Noto Serif SC", "Songti SC", "SimSun", serif'
      : 'bold 156px "Noto Serif SC", "Songti SC", "SimSun", serif';
    ctx.fillText(spec.label, canvas.width / 2, 154);
  } else if (showMark && spec.mark === 'text' && spec.label) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,238,207,.55)';
    ctx.shadowBlur = 2;
    ctx.fillStyle = ink;
    ctx.font = spec.label.length > 4
      ? 'bold 74px "Noto Serif SC", "Songti SC", "SimSun", serif'
      : 'bold 96px "Noto Serif SC", "Songti SC", "SimSun", serif';
    ctx.fillText(spec.label, canvas.width / 2, 155);
  }

  // A small inner rule differentiates specimens without claiming a historical paint standard.
  if (showMark && kind === 'first' && spec.tone) {
    ctx.fillStyle = spec.tone === 'good' ? '#a33325' : '#263f3a';
    ctx.globalAlpha = 0.68;
    ctx.fillRect(faceIndex === 0 ? 24 : canvas.width - 30, 28, 6, canvas.height - 56);
    ctx.globalAlpha = 1;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function quadGeometry(corners: Corner[], uvs: Array<[number, number]>): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(corners.flat(), 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs.flat(), 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  return geometry;
}

function triangleGeometry(corners: Corner[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(corners.flat(), 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0.5, 1, 0, 0, 1, 0], 2));
  geometry.setIndex([0, 1, 2]);
  geometry.computeVertexNormals();
  return geometry;
}

function makeWoodMesh(geometry: THREE.BufferGeometry, texture?: THREE.CanvasTexture): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({
    color: texture ? 0xffffff : '#bc8652',
    roughness: 0.88,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  if (texture) {
    material.map = texture;
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildWheel(spec: WheelSpec, slot: number, showOnlyResultFace: boolean): THREE.Group {
  const group = new THREE.Group();
  group.userData.baseY = 0.34;
  group.userData.targetX = spec.resultFace === undefined
    ? [0.14, -0.56, 0.92, -0.29][slot % 4]
    : RESULT_FACE_UP_ROTATIONS[spec.resultFace];
  group.userData.restY = spec.resultFace === undefined ? [0.14, -0.12, 0.1, -0.09][slot % 4] : 0;
  group.userData.restZ = 0;
  const length = 1.68;
  const halfCenter = 0.46;
  const halfY = 0.255;
  const halfZ = 0.31;
  const endX = length / 2;

  const quads: Array<{ corners: Corner[]; faceIndex: number }> = [
    { faceIndex: 0, corners: [[-halfCenter, -halfY, halfZ], [halfCenter, -halfY, halfZ], [halfCenter, halfY, halfZ], [-halfCenter, halfY, halfZ]] },
    { faceIndex: 1, corners: [[halfCenter, -halfY, -halfZ], [-halfCenter, -halfY, -halfZ], [-halfCenter, halfY, -halfZ], [halfCenter, halfY, -halfZ]] },
    { faceIndex: 2, corners: [[-halfCenter, halfY, -halfZ], [-halfCenter, halfY, halfZ], [halfCenter, halfY, halfZ], [halfCenter, halfY, -halfZ]] },
    { faceIndex: 3, corners: [[-halfCenter, -halfY, halfZ], [-halfCenter, -halfY, -halfZ], [halfCenter, -halfY, -halfZ], [halfCenter, -halfY, halfZ]] },
  ];
  // Keep every face's mark horizontal and upright when that face is turned upward.
  const faceUvs: Array<Array<[number, number]>> = [
    [[0, 0], [1, 0], [1, 1], [0, 1]],
    [[1, 1], [0, 1], [0, 0], [1, 0]],
    [[0, 1], [0, 0], [1, 0], [1, 1]],
    [[0, 1], [0, 0], [1, 0], [1, 1]],
  ];
  const textures: THREE.CanvasTexture[] = [];
  const faceEdgeMaterials: THREE.LineBasicMaterial[] = [];

  quads.forEach(({ corners, faceIndex }) => {
    const isResultFace = spec.resultFace === faceIndex;
    const texture = faceTexture(spec.faces[faceIndex], spec.kind, faceIndex, !showOnlyResultFace || isResultFace);
    textures.push(texture);
    const mesh = makeWoodMesh(quadGeometry(corners, faceUvs[faceIndex]), texture);
    group.add(mesh);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 8), new THREE.LineBasicMaterial({
      color: isResultFace ? '#fff0a8' : '#68442b',
      transparent: !isResultFace,
      opacity: isResultFace ? 1 : 0.76,
    }));
    faceEdgeMaterials[faceIndex] = edges.material as THREE.LineBasicMaterial;
    group.add(edges);
  });

  const ring = [
    [-halfY, -halfZ], [halfY, -halfZ], [halfY, halfZ], [-halfY, halfZ],
  ];
  for (const direction of [-1, 1]) {
    const tip: Corner = [direction * endX, 0, 0];
    const x = direction * halfCenter;
    for (let i = 0; i < 4; i += 1) {
      const a = ring[i];
      const b = ring[(i + 1) % 4];
      const pa: Corner = [x, a[0], a[1]];
      const pb: Corner = [x, b[0], b[1]];
      const points = direction < 0 ? [tip, pb, pa] : [tip, pa, pb];
      const geometry = triangleGeometry(points);
      group.add(makeWoodMesh(geometry));
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 8), new THREE.LineBasicMaterial({ color: '#68442b', transparent: true, opacity: 0.62 })));
    }
  }

  group.userData.textures = textures;
  group.userData.faceEdgeMaterials = faceEdgeMaterials;
  group.userData.kind = spec.kind;
  group.userData.specId = spec.id;
  group.rotation.order = 'XYZ';
  group.position.y = group.userData.baseY;
  group.rotation.x = group.userData.targetX;
  group.rotation.y = group.userData.restY;
  return group;
}

export function ThreeWheelTray({ wheels, rolling = false, rollingIds, label, className = '' }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rollingRef = useRef(rolling);
  const rollingIdsRef = useRef(rollingIds);
  const wheelsRef = useRef(wheels);
  const groupsRef = useRef(new Map<string, THREE.Group>());
  const [webglError, setWebglError] = useState(false);
  rollingRef.current = rolling;
  rollingIdsRef.current = rollingIds;
  wheelsRef.current = wheels;

  const structureKey = wheels.map((wheel) => `${wheel.id}/${wheel.kind}/${wheel.resultFace ?? 'n'}/${wheel.faces.map((face) => `${face.label}:${face.mark}:${face.tone ?? ''}`).join(',')}`).join('|');
  const resultKey = wheels.map((wheel) => `${wheel.id}:${wheel.resultFace ?? 'n'}`).join('|');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      setWebglError(true);
      return undefined;
    }

    setWebglError(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = false;
    renderer.domElement.className = 'three-wheel-canvas';
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', label);
    host.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const hasAnyResult = wheelsRef.current.some((wheel) => wheel.resultFace !== undefined);
    const camera = new THREE.OrthographicCamera(-5, 5, 3, -3, 0.1, 50);
    camera.up.set(0, hasAnyResult ? 0 : 1, hasAnyResult ? -1 : 0);
    camera.position.set(0, hasAnyResult ? 15 : 7.6, hasAnyResult ? 0 : 9.8);
    camera.lookAt(0, 0, 0);

    const ambient = new THREE.HemisphereLight('#fff0d7', '#55412e', 2.35);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight('#fff4de', 2.3);
    keyLight.position.set(-4, 9, 7);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight('#d19b5e', 1.05);
    rimLight.position.set(5, 5, -6);
    scene.add(rimLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 12),
      new THREE.MeshStandardMaterial({ color: '#334e42', roughness: 0.96, metalness: 0 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.12;
    scene.add(ground);
    const groundLines = new THREE.GridHelper(18, 34, '#a27b4d', '#789078');
    groundLines.position.y = -0.105;
    const lineMaterials = Array.isArray(groundLines.material) ? groundLines.material : [groundLines.material];
    lineMaterials.forEach((material) => { material.transparent = true; material.opacity = 0.12; });
    scene.add(groundLines);

    const map = new Map<string, THREE.Group>();
    const trayWidth = host.clientWidth;
    const maxColumns = wheelsRef.current.length >= 7
      ? trayWidth < 420 ? 2 : trayWidth < 720 ? 3 : 5
      : wheelsRef.current.length >= 5
        ? trayWidth < 420 ? 2 : trayWidth < 720 ? 3 : wheelsRef.current.length
        : Math.max(1, wheelsRef.current.length);
    const columns = Math.min(maxColumns, Math.max(1, wheelsRef.current.length));
    const rows = Math.ceil(wheelsRef.current.length / columns);
    const strideX = 1.82;
    const strideZ = 1.18;
    const width = Math.max(2.25, columns * 1.58 + (columns - 1) * (strideX - 1.58));
    const depth = Math.max(1.85, rows * 0.56 + (rows - 1) * (strideZ - 0.56));

    wheelsRef.current.forEach((wheel, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const rowCount = Math.min(columns, wheelsRef.current.length - row * columns);
      const group = buildWheel(wheel, index, hasAnyResult);
      group.userData.homeX = (col - (rowCount - 1) / 2) * strideX;
      group.userData.homeZ = (row - (rows - 1) / 2) * strideZ;
      group.position.x = group.userData.homeX;
      group.position.z = group.userData.homeZ;
      group.userData.baseY = 0.34;
      group.position.y = group.userData.baseY;
      scene.add(group);
      map.set(wheel.id, group);
    });
    groupsRef.current = map;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const widthPx = Math.max(280, rect.width);
      const heightPx = Math.max(210, rect.height);
      const aspect = widthPx / heightPx;
      const viewHeight = Math.max(depth + 1.45, width / aspect, 2.5);
      camera.left = (-viewHeight * aspect) / 2;
      camera.right = (viewHeight * aspect) / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(widthPx, heightPx, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let frame = 0;
    let last = performance.now();
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isRolling = rollingRef.current && !reduced;
      for (const [index, group] of [...groupsRef.current.values()].entries()) {
        const selectedForRoll = !rollingIdsRef.current || rollingIdsRef.current.includes(String(group.userData.specId));
        if (isRolling && selectedForRoll) {
          group.rotation.x += dt * 18;
          group.rotation.y += dt * (4.6 + index * 0.13);
          group.rotation.z += dt * (index % 2 === 0 ? 4.2 : -4.2);
          group.position.y = group.userData.baseY + Math.abs(Math.sin(now * 0.011 + index)) * 0.35;
          group.position.x = (group.userData.homeX as number) + Math.sin(now * 0.006 + index * 1.7) * 0.12;
          group.position.z = (group.userData.homeZ as number) + Math.cos(now * 0.005 + index) * 0.08;
        } else {
          const targetX = group.userData.targetX as number;
          const targetY = group.userData.restY as number ?? [0.025, -0.02, 0.012, -0.018][index % 4];
          const targetZ = group.userData.restZ as number ?? 0;
          group.rotation.x = THREE.MathUtils.damp(group.rotation.x, targetX, 5.7, dt);
          group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetY, 6.5, dt);
          group.rotation.z = THREE.MathUtils.damp(group.rotation.z, targetZ, 6.5, dt);
          group.position.y = THREE.MathUtils.damp(group.position.y, group.userData.baseY, 8, dt);
          group.position.x = THREE.MathUtils.damp(group.position.x, group.userData.homeX as number, 7, dt);
          group.position.z = THREE.MathUtils.damp(group.position.z, group.userData.homeZ as number, 7, dt);
        }
      }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial) material.map?.dispose();
            material.dispose();
          });
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      groupsRef.current.clear();
    };
    // Scene objects are deliberately rebuilt only when the visible labels/marks change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey, label]);

  useEffect(() => {
    for (const wheel of wheelsRef.current) {
      const group = groupsRef.current.get(wheel.id);
      if (!group) continue;
      const faceEdgeMaterials = group.userData.faceEdgeMaterials as THREE.LineBasicMaterial[] | undefined;
      faceEdgeMaterials?.forEach((material, faceIndex) => {
        const isResultFace = wheel.resultFace === faceIndex;
        material.color.set(isResultFace ? '#fff0a8' : '#68442b');
        material.transparent = !isResultFace;
        material.opacity = isResultFace ? 1 : 0.76;
        material.needsUpdate = true;
      });
      if (wheel.resultFace === undefined) continue;
      const base = RESULT_FACE_UP_ROTATIONS[wheel.resultFace];
      const turns = Math.ceil((group.rotation.x - base) / (Math.PI * 2));
      group.userData.targetX = base + Math.max(0, turns) * Math.PI * 2;
      group.userData.restY = 0;
      group.userData.restZ = 0;
    }
  }, [resultKey, structureKey]);

  return (
    <div className={`three-wheel-stage ${className} ${rolling ? 'is-rolling' : ''}`} ref={hostRef} aria-label={label}>
      <span className="three-wheel-caption">{wheels.some((wheel) => wheel.resultFace !== undefined) ? '俯视结果：金框内仅显示已占出的轮相' : '四面棱轮形制示意 · 尚未起轮'}</span>
      {webglError && <div className="three-wheel-fallback" role="img" aria-label={`${label}；当前设备不支持 WebGL`}>
        {wheels.map((wheel) => <span className="fallback-specimen" key={wheel.id}>{wheel.faces.map((face, index) => <b className={`fallback-face ${face.tone ?? 'neutral'} ${wheel.resultFace === index ? 'result-face-up' : ''}`} aria-label={wheel.resultFace === index ? `${face.label || '空白'}，本次占出结果面` : face.label || '空白轮面'} key={index}>{face.label || '○'}<i>{face.mark === 'long' ? '━━━━' : face.mark === 'short' ? '━━' : face.mark === 'deep' ? '▰' : face.mark === 'shallow' ? '━' : ''}</i></b>)}</span>)}
      </div>}
    </div>
  );
}
