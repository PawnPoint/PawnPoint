import { useEffect, useRef } from "react";
import * as THREE from "three";

const MAP_URL =
  "https://upload.wikimedia.org/wikipedia/commons/c/cd/Land_ocean_ice_2048.jpg";

export default function Globe() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 520;
    const height = mount.clientHeight || 520;
    let disposed = false;
    let frameId = 0;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 9;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const radius = 3.2;
    const wireGeo = new THREE.SphereGeometry(radius, 32, 24);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x3a4048,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const wireSphere = new THREE.Mesh(wireGeo, wireMat);
    globeGroup.add(wireSphere);

    const rimGeo = new THREE.SphereGeometry(radius * 1.001, 64, 64);
    const rimMat = new THREE.MeshBasicMaterial({
      color: 0x6b7280,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    globeGroup.add(new THREE.Mesh(rimGeo, rimMat));

    const dotsGroup = new THREE.Group();
    globeGroup.add(dotsGroup);

    const buildDots = (imgEl: HTMLImageElement) => {
      if (disposed) return;

      const srcW = imgEl.naturalWidth || imgEl.width;
      const srcH = imgEl.naturalHeight || imgEl.height;
      const canvasWidth = Math.min(srcW, 2048);
      const canvasHeight = Math.round(canvasWidth * (srcH / srcW));

      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(imgEl, 0, 0, canvasWidth, canvasHeight);
      const data = ctx.getImageData(0, 0, canvasWidth, canvasHeight).data;
      const dotGeo = new THREE.CircleGeometry(0.0095, 6);
      const dotMat = new THREE.MeshBasicMaterial({
        color: 0xe8eaed,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
      });

      const positions: Array<[number, number]> = [];
      const step = 3;

      for (let y = 0; y < canvasHeight; y += step) {
        for (let x = 0; x < canvasWidth; x += step) {
          const idx = (y * canvasWidth + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const brightness = (r + g + b) / 3;
          const isOcean = b > r + 25 && b > 60 && brightness < 180;

          if (!isOcean && brightness > 40) {
            const lon = (x / canvasWidth) * 360 - 180;
            const lat = 90 - (y / canvasHeight) * 180;
            positions.push([lat, lon]);
          }
        }
      }

      const mesh = new THREE.InstancedMesh(dotGeo, dotMat, positions.length);
      const dummy = new THREE.Object3D();

      positions.forEach(([lat, lon], i) => {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        const x = -radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        dummy.position.set(x, y, z);
        dummy.lookAt(x * 2, y * 2, z * 2);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });

      mesh.instanceMatrix.needsUpdate = true;
      dotsGroup.add(mesh);
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => buildDots(img);
    img.onerror = () => {
      console.error("Globe: failed to load world map image.");
    };
    img.src = MAP_URL;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const animate = () => {
      globeGroup.rotation.y += 0.0022;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      const nextWidth = mount.clientWidth || 520;
      const nextHeight = mount.clientHeight || 520;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.remove();
      dotsGroup.traverse((child) => {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) {
          material.forEach((item) => item.dispose());
        } else {
          material?.dispose();
        }
      });
      wireGeo.dispose();
      wireMat.dispose();
      rimGeo.dispose();
      rimMat.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="h-full min-h-[320px] w-full sm:min-h-[420px]" />;
}
