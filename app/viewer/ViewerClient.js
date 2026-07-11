"use client";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";


const ANNOTATION_COLORS = ["#E8746A", "#E8A33D", "#6FCF97", "#5AA9E6", "#FFFFFF"];
const POINTER_FADE_MS = 1300;

function ViewerClient() {
  useEffect(() => {
    function handlePageShow(e) {
      // If this page was restored from the browser's back-forward cache
      // instead of freshly loaded, force a real reload — otherwise the
      // login check never re-runs and you can land here without ever
      // hitting the server.
      if (e.persisted) {
        window.location.reload();
      }
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const holderRef = useRef(null);
  const sceneRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const [bgMode, setBgMode] = useState("light");

  // Annotation UI state (mirrored into refs so the Three.js event handlers,
  // which are attached once on mount, always see the latest values)
  const [annotateMode, setAnnotateModeState] = useState(false);
  const [tool, setToolState] = useState("pen");
  const [color, setColorState] = useState(ANNOTATION_COLORS[0]);
  const annotateModeRef = useRef(false);
  const toolRef = useRef("pen");
  const colorRef = useRef(ANNOTATION_COLORS[0]);

  const penCanvasRef = useRef(null); // persistent strokes
  const pointerCanvasRef = useRef(null); // animated fading pointer dots
  const drawStateRef = useRef({ drawing: false, lastX: 0, lastY: 0 });
  const pointerDotsRef = useRef([]);
  const pointerRafRef = useRef(null);

  const THEMES = {
    dark: { bg: 0x0b1e33, gridMain: 0x2a4a6e, gridSub: 0x1a3350 },
    light: { bg: 0xeef2f6, gridMain: 0xc3ccd6, gridSub: 0xdbe1e8 },
  };

  useEffect(() => {
    initScene();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setAnnotateMode(v) {
    annotateModeRef.current = v;
    setAnnotateModeState(v);
  }
  function setTool(v) {
    toolRef.current = v;
    setToolState(v);
  }
  function setColor(v) {
    colorRef.current = v;
    setColorState(v);
  }

  function applyTheme(mode) {
    const theme = THEMES[mode];
    const { scene, grid } = sceneRef.current || {};
    if (!scene || !grid) return;
    scene.background = new THREE.Color(theme.bg);
    grid.material[0].color.setHex(theme.gridMain);
    grid.material[1].color.setHex(theme.gridSub);
  }

  function toggleBackground() {
    const next = bgMode === "dark" ? "light" : "dark";
    setBgMode(next);
    applyTheme(next);
  }

  function clearAnnotations() {
    const pen = penCanvasRef.current;
    const ptr = pointerCanvasRef.current;
    if (pen) {
      const ctx = pen.getContext("2d");
      ctx.clearRect(0, 0, pen.width, pen.height);
    }
    if (ptr) {
      const ctx = ptr.getContext("2d");
      ctx.clearRect(0, 0, ptr.width, ptr.height);
    }
    pointerDotsRef.current = [];
  }

  function resizeOverlayCanvases() {
    const holder = holderRef.current;
    const dpr = window.devicePixelRatio || 1;
    [penCanvasRef.current, pointerCanvasRef.current].forEach((canvas) => {
      if (!canvas) return;
      canvas.width = holder.clientWidth * dpr;
      canvas.height = holder.clientHeight * dpr;
      canvas.style.width = holder.clientWidth + "px";
      canvas.style.height = holder.clientHeight + "px";
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
  }

  function runPointerAnimation() {
    if (pointerRafRef.current) return; // already running
    function frame() {
      const canvas = pointerCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = performance.now();
      pointerDotsRef.current = pointerDotsRef.current.filter((dot) => now - dot.t < POINTER_FADE_MS);
      pointerDotsRef.current.forEach((dot) => {
        const age = (now - dot.t) / POINTER_FADE_MS;
        const alpha = 1 - age;
        const radius = 10 + age * 22;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = dot.color;
        ctx.globalAlpha = alpha * 0.9;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = dot.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (pointerDotsRef.current.length > 0) {
        pointerRafRef.current = requestAnimationFrame(frame);
      } else {
        pointerRafRef.current = null;
      }
    }
    pointerRafRef.current = requestAnimationFrame(frame);
  }

  function initScene() {
    const holder = holderRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(THEMES.light.bg);
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

    resizeOverlayCanvases();

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 0.9);
    dl.position.set(100, 200, 100);
    scene.add(dl);
    const dl2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dl2.position.set(-100, 50, -100);
    scene.add(dl2);

    const grid = new THREE.GridHelper(400, 40, THEMES.light.gridMain, THEMES.light.gridSub);
    scene.add(grid);

    let dragging = false,
      lastX = 0,
      lastY = 0,
      theta = 0.8,
      phi = 1.0,
      radius = 250,
      minRadius = 5,
      maxRadius = 5000;
    const target = new THREE.Vector3(0, 0, 0);

    function update() {
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(target);
      // Keep the "near" clipping distance proportional to how close the
      // camera currently is — otherwise zooming in past a fixed near value
      // clips straight through the model instead of just getting closer.
      camera.near = Math.max(0.001, radius * 0.01);
      camera.far = Math.max(1000, radius * 50);
      camera.updateProjectionMatrix();
    }
    update();

    const dom = renderer.domElement;
    // Rotation only ever reaches this element when the annotation overlay
    // isn't capturing pointer events (i.e. annotate mode is off) — so any
    // rotate/zoom gesture here means the view is about to change, and any
    // sketch on screen is now describing the wrong angle. Clear it.
    dom.addEventListener("mousedown", (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      clearAnnotations();
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
        // Trackpads can fire many wheel events in a single scroll gesture,
        // each with a large deltaY — without clamping this, one "scroll" can
        // compound into a huge, disorienting jump. Cap each event's effect.
        const clampedDelta = Math.max(-50, Math.min(50, e.deltaY));
        radius = Math.max(minRadius, Math.min(maxRadius, radius * (1 + clampedDelta * 0.001)));
        update();
        clearAnnotations();
      },
      { passive: false }
    );

    function onResize() {
      camera.aspect = holder.clientWidth / holder.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(holder.clientWidth, holder.clientHeight);
      resizeOverlayCanvases();
      clearAnnotations();
    }
    window.addEventListener("resize", onResize);

    function loop() {
      requestAnimationFrame(loop);
      renderer.render(scene, camera);
    }
    loop();

    sceneRef.current = {
      scene,
      camera,
      renderer,
      holder,
      target,
      grid,
      zoomBy: (factor) => {
        radius = Math.max(minRadius, Math.min(maxRadius, radius * factor));
        update();
      },
      frameTo: (maxDim) => {
        // Reset theta/phi/radius together, then go through the same update()
        // the drag/zoom handlers use — this is the single source of truth
        // for camera position, so nothing can desync on the next interaction.
        theta = 0.8;
        phi = 1.0;
        minRadius = maxDim * 0.005;
        maxRadius = maxDim * 20;
        radius = maxDim * 1.8;
        target.set(0, 0, 0);
        update();
      },
    };
  }

  function frameObject(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    object.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 100;
    sceneRef.current.frameTo(maxDim);
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
    clearAnnotations();

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
            c.material = new THREE.MeshStandardMaterial({ color: 0x999999, side: THREE.DoubleSide });
          }
        });
      }
      // Render both sides of every triangle: OBJ exports from CAD tools don't
      // always have perfectly consistent face winding, which otherwise causes
      // faces to vanish from certain viewing angles (backface culling).
      obj.traverse((c) => {
        if (c.isMesh && c.material) {
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          mats.forEach((m) => (m.side = THREE.DoubleSide));
        }
      });
      obj.userData.isModel = true;
      scene.add(obj);
      frameObject(obj);
      setStatus(`表示中: ${objFile.name}${mtlFile ? " + " + mtlFile.name : ""}`);
    } catch (err) {
      console.error(err);
      setStatus("読み込みエラー: " + err.message);
    }
  }

  // --- Annotation overlay pointer handlers ---
  function getRelPos(e) {
    const rect = pointerCanvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handleOverlayDown(e) {
    const { x, y } = getRelPos(e);
    if (toolRef.current === "pen") {
      drawStateRef.current = { drawing: true, lastX: x, lastY: y };
    } else {
      pointerDotsRef.current.push({ x, y, t: performance.now(), color: colorRef.current });
      runPointerAnimation();
    }
  }
  function handleOverlayMove(e) {
    if (toolRef.current !== "pen" || !drawStateRef.current.drawing) return;
    const { x, y } = getRelPos(e);
    const ctx = penCanvasRef.current.getContext("2d");
    ctx.strokeStyle = colorRef.current;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(drawStateRef.current.lastX, drawStateRef.current.lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    drawStateRef.current.lastX = x;
    drawStateRef.current.lastY = y;
  }
  function handleOverlayUp() {
    drawStateRef.current.drawing = false;
  }

  const panelBg = bgMode === "dark" ? "rgba(20,42,66,0.92)" : "rgba(255,255,255,0.92)";
  const panelBorder = bgMode === "dark" ? "1px solid #1E3A56" : "1px solid #D5DCE3";
  const panelText = bgMode === "dark" ? "#EAF2FA" : "#16324A";
  const panelMuted = bgMode === "dark" ? "#7C93AC" : "#5A7387";

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative", background: "#0B1E33" }}>
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 10,
          background: panelBg,
          border: panelBorder,
          borderLeft: "2px solid #E8A33D",
          padding: "14px 16px",
          color: panelText,
          fontFamily: "var(--font-sans), sans-serif",
          maxWidth: 280,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 10,
            letterSpacing: "0.12em",
            color: "#E8A33D",
            marginBottom: 6,
          }}
        >
          3D VIEWER
        </div>
        <h1 style={{ fontSize: 15, margin: "0 0 12px 0", fontWeight: 600 }}>3D モデルビューアー</h1>
        <input
          type="file"
          multiple
          accept=".obj,.mtl"
          onChange={(e) => handleFiles(e.target.files)}
          style={{ color: panelText, fontSize: 12, marginBottom: 8 }}
        />
        <p style={{ fontSize: 11, color: panelMuted, margin: "8px 0 0 0", lineHeight: 1.5 }}>
          .obj ファイル（と任意で同名の .mtl）を選択してください。
          <br />
          ドラッグで回転、ホイールでズーム。
        </p>
        {status && (
          <p
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 11.5,
              marginTop: 12,
              paddingTop: 10,
              borderTop: panelBorder,
              color: bgMode === "dark" ? "#8FD19E" : "#2E8B57",
            }}
          >
            {status}
          </p>
        )}
      </div>

      {/* Annotation toolbar */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          zIndex: 10,
          background: panelBg,
          border: panelBorder,
          borderLeft: "2px solid #E8A33D",
          padding: "12px 14px",
          fontFamily: "var(--font-sans), sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          maxWidth: 560,
        }}
      >
        <button
          onClick={() => {
            const next = !annotateMode;
            setAnnotateMode(next);
            if (!next) clearAnnotations();
          }}
          style={{
            background: annotateMode ? "#E8A33D" : "transparent",
            color: annotateMode ? "#1a1206" : panelText,
            border: `1px solid ${annotateMode ? "#E8A33D" : "#1E3A56"}`,
            padding: "7px 12px",
            fontFamily: "var(--font-mono), monospace",
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: "0.04em",
            cursor: "pointer",
          }}
        >
          {annotateMode ? "✎ 注釈: ON" : "✎ 注釈: OFF"}
        </button>

        {annotateMode && (
          <>
            <div style={{ display: "flex", gap: 4 }}>
              <ToolButton active={tool === "pen"} onClick={() => setTool("pen")} panelText={panelText}>
                ペン
              </ToolButton>
              <ToolButton active={tool === "pointer"} onClick={() => setTool("pointer")} panelText={panelText}>
                ポインター
              </ToolButton>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              {ANNOTATION_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  title={c}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: c,
                    border: color === c ? "2px solid #E8A33D" : "2px solid transparent",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              ))}
            </div>

            <button
              onClick={clearAnnotations}
              style={{
                background: "transparent",
                color: panelMuted,
                border: `1px solid ${bgMode === "dark" ? "#1E3A56" : "#D5DCE3"}`,
                padding: "7px 12px",
                fontFamily: "var(--font-mono), monospace",
                fontSize: 11.5,
                cursor: "pointer",
              }}
            >
              クリア
            </button>
          </>
        )}
      </div>

      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10, display: "flex", gap: 8 }}>
        <button
          onClick={toggleBackground}
          title="背景の明るさを切り替え（モデルの色に合わせて選んでください）"
          style={{
            background: "#142A42",
            color: "#EAF2FA",
            border: "1px solid #1E3A56",
            padding: "9px 16px",
            fontFamily: "var(--font-mono), monospace",
            fontSize: 11.5,
            letterSpacing: "0.04em",
            cursor: "pointer",
          }}
        >
          {bgMode === "dark" ? "☀ 背景を明るく" : "☾ 背景を暗く"}
        </button>
        <form action="/api/logout" method="POST" style={{ margin: 0 }}>
          <button
            type="submit"
            style={{
              background: "#142A42",
              color: "#EAF2FA",
              border: "1px solid #1E3A56",
              padding: "9px 16px",
              fontFamily: "var(--font-mono), monospace",
              fontSize: 11.5,
              letterSpacing: "0.04em",
              cursor: "pointer",
            }}
          >
            ログアウト
          </button>
        </form>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <button
          onClick={() => {
            sceneRef.current?.zoomBy(0.9);
            clearAnnotations();
          }}
          title="ズームイン"
          style={{
            width: 36,
            height: 36,
            background: "#142A42",
            color: "#EAF2FA",
            border: "1px solid #1E3A56",
            fontSize: 18,
            fontFamily: "var(--font-mono), monospace",
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          +
        </button>
        <button
          onClick={() => {
            sceneRef.current?.zoomBy(1.1);
            clearAnnotations();
          }}
          title="ズームアウト"
          style={{
            width: 36,
            height: 36,
            background: "#142A42",
            color: "#EAF2FA",
            border: "1px solid #1E3A56",
            fontSize: 18,
            fontFamily: "var(--font-mono), monospace",
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          −
        </button>
      </div>

      <div style={{ position: "absolute", inset: 0 }}>
        {/* React never renders anything inside this div — Three.js appends
            its canvas here directly, so there's nothing for React's virtual
            DOM to conflict with. */}
        <div ref={holderRef} style={{ position: "absolute", inset: 0 }} />
        <canvas
          ref={penCanvasRef}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
          }}
        />
        <canvas
          ref={pointerCanvasRef}
          onMouseDown={handleOverlayDown}
          onMouseMove={handleOverlayMove}
          onMouseUp={handleOverlayUp}
          onMouseLeave={handleOverlayUp}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            pointerEvents: annotateMode ? "auto" : "none",
            cursor: annotateMode ? (tool === "pen" ? "crosshair" : "pointer") : "default",
          }}
        />
      </div>
    </div>
  );
}

function ToolButton({ active, onClick, children, panelText }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "#E8A33D" : "transparent",
        color: active ? "#1a1206" : panelText,
        border: `1px solid ${active ? "#E8A33D" : "#1E3A56"}`,
        padding: "7px 10px",
        fontFamily: "var(--font-mono), monospace",
        fontSize: 11.5,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default ViewerClient;