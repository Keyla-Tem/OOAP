// src/screens/CanvasScene.tsx
import { useEffect, useRef } from "react";
import { RasterRenderer } from "../lib/raster/RasterRenderer";
import { Rect } from "../lib/shapes/Rect";
import { Line } from "../lib/shapes/Line";
import { Oval } from "../lib/shapes/Oval";
import { Shape } from "../lib/shapes/Shape";

// =====================================================================
// ПРОПСЫ КОМПОНЕНТА
// =====================================================================
interface CanvasSceneProps {
  lineAlg: "bresenham" | "wu";
  currentTool: "select" | "rect" | "line" | "oval";
  shapes: Shape[];
  selectedId: string | null;
  onShapesChange: (shapes: Shape[]) => void;
  onSelectedIdChange: (id: string | null) => void;
}

export default function CanvasScene({
  lineAlg,
  currentTool,
  shapes,
  selectedId,
  onShapesChange,
  onSelectedIdChange
}: CanvasSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<RasterRenderer | null>(null);
  
  // =====================================================================
  // REFS ДЛЯ ПЛАВНОГО ПЕРЕМЕЩЕНИЯ (избегаем устаревших замыканий)
  // =====================================================================
const isDraggingRef = useRef(false);
const dragStartRef = useRef<{ x: number; y: number } | null>(null);
const dragShapeIdRef = useRef<string | null>(null);
const dragOffsetRef = useRef({ x: 0, y: 0 });  // === ДОБАВИТЬ ===

// Refs для актуальных данных
const shapesRef = useRef<Shape[]>(shapes);
const selectedIdRef = useRef<string | null>(selectedId);
const currentToolRef = useRef<"select" | "rect" | "line" | "oval">(currentTool);
  // Обновляем refs при изменении props
  useEffect(() => { shapesRef.current = shapes; }, [shapes]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { currentToolRef.current = currentTool; }, [currentTool]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("❌ Canvas not found!");
      return;
    }

    const renderer = new RasterRenderer(canvas);
    renderer.setLineAlgorithm(lineAlg);
    rendererRef.current = renderer;

    // =====================================================================
    // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // =====================================================================
    const getMousePos = (e: MouseEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      const dpr = renderer.dpr;
      return {
        x: (e.clientX - rect.left) * dpr,
        y: (e.clientY - rect.top) * dpr
      };
    };

    // =====================================================================
    // ОБРАБОТЧИКИ МЫШИ
    // =====================================================================
   const handleMouseDown = (e: MouseEvent) => {
  const { x, y } = getMousePos(e);
  
  if (currentToolRef.current === "select") {
    for (let i = shapesRef.current.length - 1; i >= 0; i--) {
      const shape = shapesRef.current[i];
      if (shape.hitTest(x, y)) {
        onSelectedIdChange(shape.id);
        isDraggingRef.current = true;
        dragStartRef.current = { x, y };
        dragShapeIdRef.current = shape.id;
        
        // === ВЫЧИСЛЯЕМ СМЕЩЕНИЕ ОТ ЦЕНТРА ФИГУРЫ ДО КУРСОРА ===
        const shapeCenterX = shape.transform.x * renderer.dpr;
        const shapeCenterY = shape.transform.y * renderer.dpr;
        dragOffsetRef.current = {
          x: x - shapeCenterX,
          y: y - shapeCenterY
        };
        
        canvas.style.cursor = 'grabbing';
        return;
      }
    }
    onSelectedIdChange(null);
  } else {
    const newShape = createShapeAt(currentToolRef.current, x, y, renderer.dpr);
    if (newShape) {
      onShapesChange([...shapesRef.current, newShape]);
      onSelectedIdChange(newShape.id);
    }
  }
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isDraggingRef.current || !dragShapeIdRef.current || !dragStartRef.current) {
    return;
  }
  
  const { x, y } = getMousePos(e);
  
  // === ИСПОЛЬЗУЕМ requestAnimationFrame для синхронизации ===
  requestAnimationFrame(() => {
    const currentShapes = shapesRef.current;
    const updatedShapes = currentShapes.map(shape => {
      if (shape.id === dragShapeIdRef.current) {
        const cloned = shape.clone();
        
        // === ПРЯМО ВЫЧИСЛЯЕМ НОВУЮ ПОЗИЦИЮ БЕЗ НАКОПЛЕНИЯ ===
        // Новая позиция = (текущая позиция мыши - смещение) / dpr
        const newX = (x - dragOffsetRef.current.x) / renderer.dpr;
        const newY = (y - dragOffsetRef.current.y) / renderer.dpr;
        
        // === НЕ ОКРУГЛЯЕМ ИЛИ ОКРУГЛЯЕМ ДО 4 ЗНАКОВ ===
        cloned.transform.x = newX;
        cloned.transform.y = newY;
        
        return cloned;
      }
      return shape;
    });
    
    shapesRef.current = updatedShapes;
    onShapesChange(updatedShapes);
  });
  
  // === НЕ СБРАСЫВАЕМ dragStartRef — он больше не нужен ===
};

const handleMouseUp = () => {
  isDraggingRef.current = false;
  dragStartRef.current = null;
  dragShapeIdRef.current = null;
  dragOffsetRef.current = { x: 0, y: 0 };  // === СБРОС СМЕЩЕНИЯ ===
  canvas.style.cursor = 'crosshair';
};

    const handleMouseLeave = () => {
      handleMouseUp();
    };

    // =====================================================================
    // НАВЕШИВАЕМ ОБРАБОТЧИКИ
    // =====================================================================
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    
    // Меняем курсор при входе на холст
    canvas.addEventListener("mouseenter", () => {
      canvas.style.cursor = currentToolRef.current === "select" ? 'default' : 'crosshair';
    });

    // =====================================================================
    // ЦИКЛ ОТРИСОВКИ (не зависит от state — используем refs)
    // =====================================================================
    let raf = 0;
    const render = () => {
      renderer.beginFrame(true);
      renderer.setLineAlgorithm(lineAlg);

      // Рисуем все фигуры из актуального ref
      for (const shape of shapesRef.current) {
        shape.drawRaster(renderer);
      }

      // Рисуем выделение вокруг выбранной фигуры
      if (selectedIdRef.current) {
        const selected = shapesRef.current.find(s => s.id === selectedIdRef.current);
        if (selected) {
          drawSelectionOutline(renderer, selected, renderer.dpr);
        }
      }

      renderer.commit();
      raf = requestAnimationFrame(render);
    };

    render();

    // =====================================================================
    // ОЧИСТКА
    // =====================================================================
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      canvas.removeEventListener("mouseenter", () => {});
      renderer.dispose();
    };
  }, [lineAlg, onShapesChange, onSelectedIdChange]); // Убрали shapes/selectedId/currentTool из зависимостей

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full bg-white cursor-crosshair"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

// =====================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (вне компонента)
// =====================================================================

// Создание фигуры в указанных координатах
function createShapeAt(
  tool: "rect" | "line" | "oval",
  deviceX: number,
  deviceY: number,
  dpr: number
): Shape | null {
  const cssX = deviceX / dpr;
  const cssY = deviceY / dpr;
  const id = `${tool}-${Date.now()}`;

  switch (tool) {
    case "rect": {
      const rect = new Rect(id, 100, 60);
      rect.transform.x = cssX;
      rect.transform.y = cssY;
      rect.fillStyle = "#3b82f6";
      rect.fillOpacity = 0.7;
      return rect;
    }
    case "line": {
      const line = new Line(id, -50, 0, 50, 0);
      line.transform.x = cssX;
      line.transform.y = cssY;
      line.strokeStyle = "#22c55e";
      line.strokeWidth = 2;
      return line;
    }
    case "oval": {
      const oval = new Oval(id, 40, 30);
      oval.transform.x = cssX;
      oval.transform.y = cssY;
      oval.fillStyle = "#ef4444";
      oval.fillOpacity = 0.6;
      return oval;
    }
    default:
      return null;
  }
}

// Отрисовка рамки выделения вокруг фигуры
function drawSelectionOutline(
  renderer: RasterRenderer,
  shape: Shape,
  dpr: number
) {
  const bounds = shape.getBounds();
  const padding = 5 * dpr;

  const outlinePoints = [
    { x: bounds.minX - padding, y: bounds.minY - padding },
    { x: bounds.maxX + padding, y: bounds.minY - padding },
    { x: bounds.maxX + padding, y: bounds.maxY + padding },
    { x: bounds.minX - padding, y: bounds.maxY + padding }
  ];

  const outlineColor = { r: 59, g: 130, b: 246, a: 255 };
  renderer.strokePolygon(outlinePoints, outlineColor, 2 * dpr);

  const handleSize = 8 * dpr;
  const handleColor = { r: 255, g: 255, b: 255, a: 255 };
  renderer.fillPolygon([
    { x: bounds.maxX + padding - handleSize/2, y: bounds.minY - padding - handleSize/2 },
    { x: bounds.maxX + padding + handleSize/2, y: bounds.minY - padding - handleSize/2 },
    { x: bounds.maxX + padding + handleSize/2, y: bounds.minY - padding + handleSize/2 },
    { x: bounds.maxX + padding - handleSize/2, y: bounds.minY - padding + handleSize/2 }
  ], handleColor);
}