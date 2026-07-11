"use client";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";

export default function ViewerPage() {
  const holderRef = useRef(null);
  const sceneRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    initScene();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initScene() {
    const holder = holderRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    const camera = new THREE.PerspectiveCamera(
      45,
      holder.clientWidth / holder.clientHeight,
      0.1,
      10000
    );
    camera.position.set(150, 120, 150);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(holder.clientWidth, holder.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    holder.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 0.9);
    dl.position.set(100, 200, 100);
    scene.add(dl);
    const dl2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dl2.position.set(-100, 50, -100);
    scene.add(dl2);

    const grid = new THREE.GridHelper(400, 40, 0x333333, 0x262626);
    scene.add(grid);

    let dragging = false,
      lastX = 0,
      lastY = 0,
      theta = 0.8,
      phi = 1.0,
      radius = 250;
    const target = new THREE.Vector3(0, 0, 0);

    function update() {
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(target);
    }
    update();

    const dom = renderer.domElement;
    dom.addEventListener("mousedown", (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    });
    window.addEventListener("mouseup", () => (dragging = false));
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      theta -= (e.clientX - lastX) * 0.008;
      phi = Math.max(0.15, Math.min(Math.PI - 0.15, phi - (e.clientY - lastY) * 0.008));
      lastX = e.clientX;
      lastY = e.clientY;
      update();
    });
    dom.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        radius = Math.max(5, Math.min(5000, radius * (1 + e.deltaY * 0.001)));
        update();
      },
      { passive: false }
    );

    function onResize() {
      camera.aspect = holder.clientWidth / holder.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(holder.clientWidth, holder.clientHeight);
    }
    window.addEventListener("resize", onResize);

    function loop() {
      requestAnimationFrame(loop);
      renderer.render(scene, camera);
    }
    loop();

    sceneRef.current = { scene, camera, renderer, holder, target, setRadius: (r) => (radius = r) };
  }

  function frameObject(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    object.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 100;
    const { camera, target, setRadius } = sceneRef.current;
    target.set(0, 0, 0);
    setRadius(maxDim * 1.8);
    camera.position.set(maxDim * 1.2, maxDim, maxDim * 1.2);
    camera.lookAt(target);
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList);
    const objFile = files.find((f) => f.name.toLowerCase().endsWith(".obj"));
    const mtlFile = files.find((f) => f.name.toLowerCase().endsWith(".mtl"));
    if (!objFile) {
      setStatus(".objファイルを選択してください");
      return;
    }
    setFileName(objFile.name);
    setStatus("読み込み中...");

    const { scene } = sceneRef.current;
    scene.children = scene.children.filter((c) => !c.userData?.isModel);

    try {
      const objText = await objFile.text();
      let obj;
      if (mtlFile) {
        const mtlText = await mtlFile.text();
        const mtlLoader = new MTLLoader();
        const materials = mtlLoader.parse(mtlText, "");
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        obj = objLoader.parse(objText);
      } else {
        const objLoader = new OBJLoader();
        obj = objLoader.parse(objText);
        obj.traverse((c) => {
          if (c.isMesh) {
            c.material = new THREE.MeshStandardMaterial({ color: 0x999999 });
          }
        });
      }
      obj.userData.isModel = true;
      scene.add(obj);
      frameObject(obj);
      setStatus(`表示中: ${objFile.name}${mtlFile ? " + " + mtlFile.name : ""}`);
    } catch (err) {
      console.error(err);
      setStatus("読み込みエラー: " + err.message);
    }
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative", background: "#1a1a1a" }}>
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 10,
          background: "rgba(20,20,20,0.85)",
          padding: 14,
          borderRadius: 10,
          color: "#eee",
          fontFamily: '-apple-system, "Hiragino Kaku Gothic ProN", sans-serif',
          maxWidth: 280,
        }}
      >
        <h1 style={{ fontSize: 15, margin: "0 0 10px 0" }}>3D モデルビューアー</h1>
        <input
          type="file"
          multiple
          accept=".obj,.mtl"
          onChange={(e) => handleFiles(e.target.files)}
          style={{ color: "#eee", fontSize: 12, marginBottom: 8 }}
        />
        <p style={{ fontSize: 11, color: "#888", margin: "8px 0 0 0" }}>
          .obj ファイル（と任意で同名の .mtl）を選択してください。
          <br />
          ドラッグで回転、ホイールでズーム。
        </p>
        {status && <p style={{ fontSize: 12, marginTop: 10, color: "#9c9" }}>{status}</p>}
      </div>
      <button
        onClick={handleLogout}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 10,
          background: "#2b2b2b",
          color: "#eee",
          border: "1px solid #444",
          borderRadius: 6,
          padding: "8px 14px",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        ログアウト
      </button>
      <div ref={holderRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}
