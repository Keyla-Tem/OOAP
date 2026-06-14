import { useEffect, useRef } from "react";
import { RasterRenderer, RGBA } from "../lib/raster/RasterRenderer";
import { Rect } from "../lib/shapes/Rect";
import { Line } from "../lib/shapes/Line";
import { Oval } from "../lib/shapes/Oval";
import { Triangle } from "../lib/shapes/Triangle";
import { QuadraticBezier } from "../lib/shapes/QuadraticBezier";
import { CubicBezier } from "../lib/shapes/CubicBezier";
import { PathBezier, PathMode } from "../lib/shapes/PathBezier";
import { Shape } from "../lib/shapes/Shape";
import { Point2D } from "../lib/math/mat3";

type InteractionMode = "idle" | "moving" | "resizing" | "rotating" | "editingPoint";
type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "rotate";

interface DragStartData {
  mode: InteractionMode;
  shapeId: string;
  startMouse: { x: number; y: number };
  startTransform: { x: number; y: number; rotation: number; scaleX: number; scaleY: number };
  handle?: ResizeHandle;
  anchorDevice?: { x: number; y: number };
  anchorLocal?: { x: number; y: number };
  pointIndex?: number;
}

interface CanvasSceneProps {
  lineAlg: "bresenham" | "wu";
  currentTool: "select" | "rect" | "line" | "oval" | "triangle" | "quadbezier" | "cubicbezier" | "path";
  pathMode: PathMode;
  shapes: Shape[];
  selectedId: string | null;
  onShapesChange: (shapes: Shape[]) => void;
  onSelectedIdChange: (id: string | null) => void;
}

export default function CanvasScene({
  lineAlg, currentTool, pathMode, shapes, selectedId,
  onShapesChange, onSelectedIdChange
}: CanvasSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<RasterRenderer | null>(null);
  const modeRef = useRef<InteractionMode>("idle");
  const dragDataRef = useRef<DragStartData | null>(null);

  const shapesRef = useRef<Shape[]>(shapes);
  const selectedIdRef = useRef<string | null>(selectedId);
  const currentToolRef = useRef<CanvasSceneProps["currentTool"]>(currentTool);
  const pathModeRef = useRef<PathMode>(pathMode);
  const onShapesChangeRef = useRef(onShapesChange);
  const onSelectedIdChangeRef = useRef(onSelectedIdChange);

  useEffect(() => { shapesRef.current = shapes; }, [shapes]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { currentToolRef.current = currentTool; }, [currentTool]);
  useEffect(() => { pathModeRef.current = pathMode; }, [pathMode]);
  useEffect(() => { onShapesChangeRef.current = onShapesChange; }, [onShapesChange]);
  useEffect(() => { onSelectedIdChangeRef.current = onSelectedIdChange; }, [onSelectedIdChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new RasterRenderer(canvas);
    renderer.setLineAlgorithm(lineAlg);
    rendererRef.current = renderer;

    const parent = canvas.parentElement;
    const ro = new ResizeObserver(() => renderer.resize());
    if (parent) ro.observe(parent);
    else ro.observe(canvas);

    const getMousePos = (e: PointerEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      const dpr = renderer.dpr;
      return {
        x: (e.clientX - rect.left) * dpr,
        y: (e.clientY - rect.top) * dpr
      };
    };

    const getHandlePositions = (shape: Shape) => {
      const lb = shape.getLocalBounds();
      const corners = [
        { name: "nw" as ResizeHandle, local: { x: lb.minX, y: lb.minY } },
        { name: "n" as ResizeHandle, local: { x: (lb.minX + lb.maxX) / 2, y: lb.minY } },
        { name: "ne" as ResizeHandle, local: { x: lb.maxX, y: lb.minY } },
        { name: "e" as ResizeHandle, local: { x: lb.maxX, y: (lb.minY + lb.maxY) / 2 } },
        { name: "se" as ResizeHandle, local: { x: lb.maxX, y: lb.maxY } },
        { name: "s" as ResizeHandle, local: { x: (lb.minX + lb.maxX) / 2, y: lb.maxY } },
        { name: "sw" as ResizeHandle, local: { x: lb.minX, y: lb.maxY } },
        { name: "w" as ResizeHandle, local: { x: lb.minX, y: (lb.minY + lb.maxY) / 2 } },
      ];
      return corners.map(c => ({
        name: c.name,
        pos: shape.transformPointToDevice(c.local.x, c.local.y),
        local: c.local
      }));
    };

    const getRotateHandlePos = (shape: Shape) => {
      const lb = shape.getLocalBounds();
      const topCenter = shape.transformPointToDevice((lb.minX + lb.maxX) / 2, lb.minY);
      const center = shape.transformPointToDevice(0, 0);
      const dx = topCenter.x - center.x;
      const dy = topCenter.y - center.y;
      const len = Math.hypot(dx, dy) || 1;
      return {
        x: topCenter.x + (dx / len) * 30 * renderer.dpr,
        y: topCenter.y + (dy / len) * 30 * renderer.dpr
      };
    };

    const hitTestHandles = (shape: Shape, mx: number, my: number): ResizeHandle | null => {
      const handles = getHandlePositions(shape);
      const threshold = 10 * renderer.dpr;
      const rotatePos = getRotateHandlePos(shape);
      if (Math.hypot(mx - rotatePos.x, my - rotatePos.y) < threshold) return "rotate";
      for (const h of handles) {
        if (Math.hypot(mx - h.pos.x, my - h.pos.y) < threshold) return h.name;
      }
      return null;
    };

    const hitTestControlPoints = (shape: Shape, mx: number, my: number): number | null => {
      if (!("getControlPoints" in shape)) return null;
      const points = (shape as any).getControlPoints() as Point2D[];
      const threshold = 10 * renderer.dpr;
      for (let i = 0; i < points.length; i++) {
        const screenPt = shape.transformPointToDevice(points[i].x, points[i].y);
        if (Math.hypot(mx - screenPt.x, my - screenPt.y) < threshold) return i;
      }
      return null;
    };

    const getAnchorForHandle = (shape: Shape, handle: ResizeHandle) => {
      const handles = getHandlePositions(shape);
      const map: Record<ResizeHandle, ResizeHandle> = {
        "nw": "se", "n": "s", "ne": "sw", "e": "w",
        "se": "nw", "s": "n", "sw": "ne", "w": "e", "rotate": "rotate"
      };
      return handles.find(h => h.name === map[handle]) || null;
    };

    const getCursorForHandle = (handle: ResizeHandle): string => {
      switch (handle) {
        case "nw": case "se": return "nwse-resize";
        case "ne": case "sw": return "nesw-resize";
        case "n": case "s": return "ns-resize";
        case "e": case "w": return "ew-resize";
        case "rotate": return "grab";
        default: return "default";
      }
    };

    const applyLocalTransform = (point: { x: number; y: number }, rotation: number, scaleX: number, scaleY: number): { x: number; y: number } => {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      return {
        x: cos * scaleX * point.x - sin * scaleY * point.y,
        y: sin * scaleX * point.x + cos * scaleY * point.y
      };
    };

    const handlePointerDown = (e: PointerEvent) => {
      const { x, y } = getMousePos(e);
      if (currentToolRef.current === "select") {
        const selectedShape = shapesRef.current.find(s => s.id === selectedIdRef.current);
        if (selectedShape) {
          const handle = hitTestHandles(selectedShape, x, y);
          if (handle) {
            if (handle === "rotate") {
              modeRef.current = "rotating";
              dragDataRef.current = { mode: "rotating", shapeId: selectedShape.id, startMouse: { x, y }, startTransform: { ...selectedShape.transform } };
              canvas.setPointerCapture(e.pointerId);
              canvas.style.cursor = "grab";
              return;
            } else {
              modeRef.current = "resizing";
              const anchor = getAnchorForHandle(selectedShape, handle);
              if (!anchor) return;
              dragDataRef.current = {
                mode: "resizing", shapeId: selectedShape.id, handle,
                startMouse: { x, y }, startTransform: { ...selectedShape.transform },
                anchorDevice: anchor.pos, anchorLocal: anchor.local
              };
              canvas.setPointerCapture(e.pointerId);
              canvas.style.cursor = getCursorForHandle(handle);
              return;
            }
          }
          const ptIdx = hitTestControlPoints(selectedShape, x, y);
          if (ptIdx !== null) {
            modeRef.current = "editingPoint";
            dragDataRef.current = { mode: "editingPoint", shapeId: selectedShape.id, startMouse: { x, y }, startTransform: { ...selectedShape.transform }, pointIndex: ptIdx };
            canvas.setPointerCapture(e.pointerId);
            canvas.style.cursor = "move";
            return;
          }
        }
        for (let i = shapesRef.current.length - 1; i >= 0; i--) {
          const shape = shapesRef.current[i];
          if (shape.hitTest(x, y)) {
            onSelectedIdChangeRef.current(shape.id);
            modeRef.current = "moving";
            dragDataRef.current = { mode: "moving", shapeId: shape.id, startMouse: { x, y }, startTransform: { ...shape.transform } };
            canvas.setPointerCapture(e.pointerId);
            canvas.style.cursor = "grabbing";
            return;
          }
        }
        onSelectedIdChangeRef.current(null);
      } else {
        const newShape = createShapeAt(currentToolRef.current, pathModeRef.current, x, y, renderer.dpr);
        if (newShape) {
          onShapesChangeRef.current([...shapesRef.current, newShape]);
          onSelectedIdChangeRef.current(newShape.id);
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const { x, y } = getMousePos(e);
      if (modeRef.current !== "idle" && dragDataRef.current) {
        const data = dragDataRef.current;
        const dx = x - data.startMouse.x;
        const dy = y - data.startMouse.y;
        const updatedShapes = shapesRef.current.map(shape => {
          if (shape.id !== data.shapeId) return shape;
          const cloned = shape.clone();
          if (data.mode === "moving") {
            cloned.transform.x = data.startTransform.x + dx / renderer.dpr;
            cloned.transform.y = data.startTransform.y + dy / renderer.dpr;
          } else if (data.mode === "rotating") {
            const center = shape.transformPointToDevice(0, 0);
            const startAngle = Math.atan2(data.startMouse.y - center.y, data.startMouse.x - center.x);
            const currAngle = Math.atan2(y - center.y, x - center.x);
            cloned.transform.rotation = data.startTransform.rotation + (currAngle - startAngle);
          } else if (data.mode === "resizing" && data.anchorDevice && data.anchorLocal) {
            const cos = Math.cos(data.startTransform.rotation);
            const sin = Math.sin(data.startTransform.rotation);
            const localDx = dx * cos + dy * sin;
            const localDy = -dx * sin + dy * cos;
            const lb = shape.getLocalBounds();
            const localWidth = lb.maxX - lb.minX;
            const localHeight = lb.maxY - lb.minY;
            if (Math.abs(localWidth) < 0.001 || Math.abs(localHeight) < 0.001) return shape;
            const startWidthDevice = Math.abs(localWidth * data.startTransform.scaleX * renderer.dpr);
            const startHeightDevice = Math.abs(localHeight * data.startTransform.scaleY * renderer.dpr);
            if (startWidthDevice < 0.1 || startHeightDevice < 0.1) return shape;
            let newScaleX = data.startTransform.scaleX;
            let newScaleY = data.startTransform.scaleY;
            const handle = data.handle!;
            const signX = (handle === "w" || handle === "nw" || handle === "sw") ? -1 : 1;
            const signY = (handle === "n" || handle === "ne" || handle === "nw") ? -1 : 1;
            if ((handle === "e" || handle === "w" || handle === "ne" || handle === "nw" || handle === "se" || handle === "sw")) {
              const scaleFactor = 1 + (signX * localDx) / startWidthDevice;
              newScaleX = Math.max(0.05, Math.min(data.startTransform.scaleX * scaleFactor, 20));
            }
            if ((handle === "n" || handle === "s" || handle === "ne" || handle === "nw" || handle === "se" || handle === "sw")) {
              const scaleFactor = 1 + (signY * localDy) / startHeightDevice;
              newScaleY = Math.max(0.05, Math.min(data.startTransform.scaleY * scaleFactor, 20));
            }
            cloned.transform.scaleX = newScaleX;
            cloned.transform.scaleY = newScaleY;
            const rotatedCss = applyLocalTransform(data.anchorLocal, cloned.transform.rotation, newScaleX, newScaleY);
            const anchorCss = { x: data.anchorDevice.x / renderer.dpr, y: data.anchorDevice.y / renderer.dpr };
            cloned.transform.x = anchorCss.x - rotatedCss.x;
            cloned.transform.y = anchorCss.y - rotatedCss.y;
          } else if (data.mode === "editingPoint" && data.pointIndex !== undefined) {
            if ("setControlPoint" in cloned) {
              const localMouse = cloned.transformPointToLocal(x, y);
              if (localMouse) (cloned as any).setControlPoint(data.pointIndex, localMouse);
            }
          }
          return cloned;
        });
        shapesRef.current = updatedShapes;
        onShapesChangeRef.current(updatedShapes);
        return;
      }
      if (currentToolRef.current === "select") {
        const selectedShape = shapesRef.current.find(s => s.id === selectedIdRef.current);
        if (selectedShape) {
          const handle = hitTestHandles(selectedShape, x, y);
          if (handle) { canvas.style.cursor = getCursorForHandle(handle); return; }
          const ptIdx = hitTestControlPoints(selectedShape, x, y);
          if (ptIdx !== null) { canvas.style.cursor = "move"; return; }
        }
        let hoverFound = false;
        for (let i = shapesRef.current.length - 1; i >= 0; i--) {
          if (shapesRef.current[i].hitTest(x, y)) {
            canvas.style.cursor = "grab";
            hoverFound = true;
            break;
          }
        }
        canvas.style.cursor = hoverFound ? "grab" : "default";
      } else {
        canvas.style.cursor = "crosshair";
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      modeRef.current = "idle";
      dragDataRef.current = null;
      canvas.style.cursor = currentToolRef.current === "select" ? "default" : "crosshair";
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);

    let raf = 0;
    const render = () => {
      renderer.beginFrame(true);
      renderer.setLineAlgorithm(lineAlg);
      for (const shape of shapesRef.current) shape.drawRaster(renderer);
      if (selectedIdRef.current) {
        const selected = shapesRef.current.find(s => s.id === selectedIdRef.current);
        if (selected) drawSelectionOverlay(renderer, selected, renderer.dpr, modeRef.current, dragDataRef.current?.pointIndex);
      }
      renderer.commit();
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      renderer.dispose();
    };
  }, [lineAlg]);

  return (
    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full bg-white" style={{ touchAction: 'none', display: 'block' }} />
  );
}

function drawSelectionOverlay(renderer: RasterRenderer, shape: Shape, dpr: number, mode: InteractionMode, activePointIdx?: number) {
  const lb = shape.getLocalBounds();
  const color: RGBA = { r: 59, g: 130, b: 246, a: 255 };
  const handleColor: RGBA = { r: 255, g: 255, b: 255, a: 255 };
  const handleSize = 8 * dpr;
  const corners = [
    shape.transformPointToDevice(lb.minX, lb.minY),
    shape.transformPointToDevice(lb.maxX, lb.minY),
    shape.transformPointToDevice(lb.maxX, lb.maxY),
    shape.transformPointToDevice(lb.minX, lb.maxY),
  ];
  renderer.strokePolygon(corners, color, 1.5 * dpr);
  const handles = [
    corners[0], { x: (corners[0].x + corners[1].x) / 2, y: (corners[0].y + corners[1].y) / 2 },
    corners[1], { x: (corners[1].x + corners[2].x) / 2, y: (corners[1].y + corners[2].y) / 2 },
    corners[2], { x: (corners[2].x + corners[3].x) / 2, y: (corners[2].y + corners[3].y) / 2 },
    corners[3], { x: (corners[3].x + corners[0].x) / 2, y: (corners[3].y + corners[0].y) / 2 },
  ];
  for (const h of handles) {
    renderer.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize, handleColor);
    renderer.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize, color, 1.5 * dpr);
  }
  const topCenter = { x: (corners[0].x + corners[1].x) / 2, y: (corners[0].y + corners[1].y) / 2 };
  const center = shape.transformPointToDevice(0, 0);
  const dx = topCenter.x - center.x;
  const dy = topCenter.y - center.y;
  const len = Math.hypot(dx, dy) || 1;
  const rotatePos = { x: topCenter.x + (dx / len) * 30 * dpr, y: topCenter.y + (dy / len) * 30 * dpr };
  renderer.drawLine(topCenter.x, topCenter.y, rotatePos.x, rotatePos.y, color);
  renderer.fillCircle(rotatePos.x, rotatePos.y, handleSize / 2, { r: 255, g: 100, b: 100, a: 255 });
  if ("getControlPoints" in shape) {
    const points = (shape as any).getControlPoints() as Point2D[];
    const pointColor: RGBA = { r: 0, g: 200, b: 0, a: 255 };
    points.forEach((p, idx) => {
      const screenPt = shape.transformPointToDevice(p.x, p.y);
      const size = idx === activePointIdx ? 10 * dpr : 6 * dpr;
      renderer.fillRect(screenPt.x - size / 2, screenPt.y - size / 2, size, size, pointColor);
    });
  }
}

function createShapeAt(tool: CanvasSceneProps["currentTool"], pathMode: PathMode, deviceX: number, deviceY: number, dpr: number): Shape | null {
  const cssX = deviceX / dpr;
  const cssY = deviceY / dpr;
  const id = `${tool}-${Date.now()}`;
  switch (tool) {
    case "rect": {
      const rect = new Rect(id, 100, 60);
      rect.transform.x = cssX; rect.transform.y = cssY;
      rect.fillStyle = "#3b82f6"; rect.fillOpacity = 0.7;
      return rect;
    }
    case "line": {
      const line = new Line(id, -50, 0, 50, 0);
      line.transform.x = cssX; line.transform.y = cssY;
      line.strokeStyle = "#22c55e"; line.strokeWidth = 2;
      return line;
    }
    case "oval": {
      const oval = new Oval(id, 40, 30);
      oval.transform.x = cssX; oval.transform.y = cssY;
      oval.fillStyle = "#ef4444"; oval.fillOpacity = 0.6;
      return oval;
    }
    case "triangle": {
      const h = 86.6;
      const p1 = { x: cssX - 50, y: cssY + h / 2 };
      const p2 = { x: cssX + 50, y: cssY + h / 2 };
      const p3 = { x: cssX, y: cssY - h / 2 };
      const triangle = new Triangle(id, p1, p2, p3);
      triangle.fillStyle = "#f97316"; triangle.fillOpacity = 0.6;
      return triangle;
    }
    case "quadbezier": {
      const p0 = { x: cssX - 60, y: cssY };
      const p1 = { x: cssX, y: cssY - 80 };
      const p2 = { x: cssX + 60, y: cssY };
      const curve = new QuadraticBezier(id, p0, p1, p2, 0.3);
      curve.strokeStyle = "#8b5cf6"; curve.strokeWidth = 3;
      return curve;
    }
    case "cubicbezier": {
      const p0 = { x: cssX - 80, y: cssY };
      const p1 = { x: cssX - 30, y: cssY - 60 };
      const p2 = { x: cssX + 30, y: cssY + 60 };
      const p3 = { x: cssX + 80, y: cssY };
      const curve = new CubicBezier(id, p0, p1, p2, p3, 0.3);
      curve.strokeStyle = "#06b6d4"; curve.strokeWidth = 3;
      return curve;
    }
    case "path": {
      const points: Point2D[] = [{ x: cssX - 80, y: cssY }, { x: cssX - 40, y: cssY - 40 }, { x: cssX, y: cssY }, { x: cssX + 40, y: cssY + 40 }, { x: cssX + 80, y: cssY }];
      const path = new PathBezier(id, points, pathMode, false, 0.3);
      path.strokeStyle = "#eab308"; path.strokeWidth = 3;
      return path;
    }
    default: return null;
  }
}