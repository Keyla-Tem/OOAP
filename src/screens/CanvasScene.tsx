import { useEffect, useRef } from "react";
import { RasterRenderer } from "../lib/raster/RasterRenderer";
import { Rect } from "../lib/shapes/Rect";
import { Line } from "../lib/shapes/Line";
import { Oval } from "../lib/shapes/Oval";
import { Triangle } from "../lib/shapes/Triangle";
import { QuadraticBezier } from "../lib/shapes/QuadraticBezier";
import { CubicBezier } from "../lib/shapes/CubicBezier";
import { PathBezier, PathMode } from "../lib/shapes/PathBezier";
import { Shape } from "../lib/shapes/Shape";
import { Point2D } from "../lib/math/mat3";

// =====================================================================
// ПРОПСЫ КОМПОНЕНТА
// =====================================================================
interface CanvasSceneProps {
  lineAlg: "bresenham" | "wu";
  currentTool: "select" | "rect" | "line" | "oval" | "triangle" | "quadbezier" | "cubicbezier" | "path";
  pathMode: PathMode; // для PathBezier: 'polyline' | 'bezier' | 'catmull'
  shapes: Shape[];
  selectedId: string | null;
  onShapesChange: (shapes: Shape[]) => void;
  onSelectedIdChange: (id: string | null) => void;
}

export default function CanvasScene({
  lineAlg,
  currentTool,
  pathMode,
  shapes,
  selectedId,
  onShapesChange,
  onSelectedIdChange
}: CanvasSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<RasterRenderer | null>(null);
  
  // =====================================================================
  // REFS ДЛЯ ПЛАВНОГО ПЕРЕМЕЩЕНИЯ
  // =====================================================================
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragShapeIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Refs для актуальных данных
  const shapesRef = useRef<Shape[]>(shapes);
  const selectedIdRef = useRef<string | null>(selectedId);
  const currentToolRef = useRef<CanvasSceneProps["currentTool"]>(currentTool);
  const pathModeRef = useRef<PathMode>(pathMode);

  // Обновляем refs при изменении props
  useEffect(() => { shapesRef.current = shapes; }, [shapes]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { currentToolRef.current = currentTool; }, [currentTool]);
  useEffect(() => { pathModeRef.current = pathMode; }, [pathMode]);

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
        // Режим выбора: ищем фигуру под курсором (с конца — верхние слои)
        for (let i = shapesRef.current.length - 1; i >= 0; i--) {
          const shape = shapesRef.current[i];
          if (shape.hitTest(x, y)) {
            onSelectedIdChange(shape.id);
            isDraggingRef.current = true;
            dragStartRef.current = { x, y };
            dragShapeIdRef.current = shape.id;
            
            // Вычисляем смещение от центра фигуры до курсора
            const shapeCenter = shape.transformPointToDevice(0, 0);
            dragOffsetRef.current = {
              x: x - shapeCenter.x,
              y: y - shapeCenter.y
            };
            
            canvas.style.cursor = 'grabbing';
            return;
          }
        }
        // Клик в пустоту — снимаем выделение
        onSelectedIdChange(null);
      } else {
        // Режим создания: добавляем новую фигуру
        const newShape = createShapeAt(currentToolRef.current, pathModeRef.current, x, y, renderer.dpr);
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
      
      // Используем requestAnimationFrame для синхронизации с частотой обновления экрана
      requestAnimationFrame(() => {
        const currentShapes = shapesRef.current;
        const updatedShapes = currentShapes.map(shape => {
          if (shape.id === dragShapeIdRef.current) {
            const cloned = shape.clone();
            
            // Прямое вычисление новой позиции без накопления ошибки
            const newX = (x - dragOffsetRef.current.x) / renderer.dpr;
            const newY = (y - dragOffsetRef.current.y) / renderer.dpr;
            
            cloned.transform.x = newX;
            cloned.transform.y = newY;
            
            return cloned;
          }
          return shape;
        });
        
        shapesRef.current = updatedShapes;
        onShapesChange(updatedShapes);
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      dragStartRef.current = null;
      dragShapeIdRef.current = null;
      dragOffsetRef.current = { x: 0, y: 0 };
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
    // ЦИКЛ ОТРИСОВКИ
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
  }, [lineAlg, onShapesChange, onSelectedIdChange]);

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
  tool: CanvasSceneProps["currentTool"],
  pathMode: PathMode,
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
    case "triangle": {
      // Равносторонний треугольник со стороной ~100px
      const h = 86.6; // высота: 100 * √3/2
      const p1 = { x: cssX - 50, y: cssY + h/2 };
      const p2 = { x: cssX + 50, y: cssY + h/2 };
      const p3 = { x: cssX, y: cssY - h/2 };
      
      const triangle = new Triangle(id, p1, p2, p3);
      triangle.fillStyle = "#f97316"; // оранжевый
      triangle.fillOpacity = 0.6;
      triangle.strokeStyle = "#ea580c";
      triangle.strokeWidth = 2;
      return triangle;
    }
    case "quadbezier": {
      // Квадратичная кривая: 3 точки
      const p0 = { x: cssX - 60, y: cssY };
      const p1 = { x: cssX, y: cssY - 80 }; // управляющая
      const p2 = { x: cssX + 60, y: cssY };
      
      const curve = new QuadraticBezier(id, p0, p1, p2, 0.3);
      curve.strokeStyle = "#8b5cf6"; // фиолетовый
      curve.strokeWidth = 3;
      return curve;
    }
    case "cubicbezier": {
      // Кубическая кривая: 4 точки
      const p0 = { x: cssX - 80, y: cssY };
      const p1 = { x: cssX - 30, y: cssY - 60 };
      const p2 = { x: cssX + 30, y: cssY + 60 };
      const p3 = { x: cssX + 80, y: cssY };
      
      const curve = new CubicBezier(id, p0, p1, p2, p3, 0.3);
      curve.strokeStyle = "#06b6d4"; // циан
      curve.strokeWidth = 3;
      return curve;
    }
    case "path": {
      // Составной путь: 5 точек для демонстрации
      const points: Point2D[] = [
        { x: cssX - 80, y: cssY },
        { x: cssX - 40, y: cssY - 40 },
        { x: cssX, y: cssY },
        { x: cssX + 40, y: cssY + 40 },
        { x: cssX + 80, y: cssY }
      ];
      
      const path = new PathBezier(id, points, pathMode, false, 0.3);
      path.strokeStyle = "#eab308"; // жёлтый
      path.strokeWidth = 3;
      return path;
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