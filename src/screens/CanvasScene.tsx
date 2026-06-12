// src/screens/CanvasScene.tsx
import { useEffect, useRef, useState } from "react";
import { RasterRenderer } from "../lib/raster/RasterRenderer";
import { Rect } from "../lib/shapes/Rect";
import { Line } from "../lib/shapes/Line";
import { Oval } from "../lib/shapes/Oval";

export default function CanvasScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lineAlg, setLineAlg] = useState<"bresenham" | "wu">("bresenham");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("❌ Canvas not found!");
      return;
    }

    const renderer = new RasterRenderer(canvas);
    renderer.setLineAlgorithm(lineAlg);

    // =====================================================================
    // СОЗДАНИЕ ТЕСТОВЫХ ФИГУР
    // =====================================================================

    // --- ТЕСТ 1: Линии (сравнение алгоритмов) ---
    
    // Красная диагональная линия (вверху слева)
    const redLine = new Line('line-red', 0, 0, 150, 50);
    redLine.transform.x = 50;
    redLine.transform.y = 50;
    redLine.strokeStyle = '#ef4444';
    redLine.strokeWidth = 1;
    redLine.strokeOpacity = 1;

    // Зеленая горизонтальная линия (посередине слева)
    const greenLine = new Line('line-green', 0, 0, 250, 0);
    greenLine.transform.x = 50;
    greenLine.transform.y = 220;
    greenLine.strokeStyle = '#22c55e';
    greenLine.strokeWidth = 1;
    greenLine.strokeOpacity = 1;

    // --- ТЕСТ 2: Прозрачность (квадрат + круг) ---
    
    // Синий квадрат (непрозрачный)
    const blueSquare = new Rect('rect-blue', 150, 150);
    blueSquare.transform.x = 325;  // центр по горизонтали
    blueSquare.transform.y = 125;  // центр по вертикали
    blueSquare.fillStyle = '#3b82f6';
    blueSquare.fillOpacity = 1;

    // Полупрозрачный красный круг (тест альфа-блендинга)
    const redCircle = new Oval('circle-red', 60, 60);
    redCircle.transform.x = 405;  
    redCircle.transform.y = 125;
    redCircle.fillStyle = '#ef4444';
    redCircle.fillOpacity = 0.5;  // 50% прозрачности → фиолетовое пересечение!

    // --- ТЕСТ 3: Красный заполненный треугольник ---
    const triRedBase = new Line('tri-r-base', -60, 0, 60, 0);           // основание 120px
    const triRedRight = new Line('tri-r-right', 60, 0, 0, -104);        // правая сторона
    const triRedLeft = new Line('tri-r-left', 0, -104, -60, 0);         // левая сторона
    // Высота равностороннего треугольника: 120 × √3/2 ≈ 104
    
    const triRedX = 160;
    const triRedY = 402;  // 350 + 52 (сдвиг к центру высоты)
    
    [triRedBase, triRedRight, triRedLeft].forEach(line => {
      line.transform.x = triRedX;
      line.transform.y = triRedY;
      line.strokeStyle = '#ef4444';
      line.strokeWidth = 1;
      line.strokeOpacity = 1;
    });

    // --- ТЕСТ 4: Жёлтый контур треугольника (толстые линии) ---
    
    const triYellowBase = new Line('tri-y-base', -70, -75, 70, -75);
    const triYellowRight = new Line('tri-y-right', 70, -75, 0, 75);
    const triYellowLeft = new Line('tri-y-left', 0, 75, -70, -75);
    
    const triYellowX = 360;
    const triYellowY = 325;
    
    [triYellowBase, triYellowRight, triYellowLeft].forEach(line => {
      line.transform.x = triYellowX;
      line.transform.y = triYellowY;
      line.strokeStyle = '#fde047';
      line.strokeWidth = 6;      // толстая обводка
      line.strokeOpacity = 1;
    });

    // =====================================================================
    // ЦИКЛ ОТРИСОВКИ
    // =====================================================================
    
    let raf = 0;
    const render = () => {
      renderer.beginFrame(true);

      // Применяем выбранный алгоритм ко всем линиям
      renderer.setLineAlgorithm(lineAlg);

      // =====================================================================
      // ОТРИСОВКА ФИГУР (порядок: задние → передние)
      // =====================================================================

      // --- Линии ---
      redLine.drawRaster(renderer);
      greenLine.drawRaster(renderer);

      // --- Прозрачность: квадрат + круг ---
      blueSquare.drawRaster(renderer);   // сначала фон
      redCircle.drawRaster(renderer);    // потом полупрозрачный круг сверху

      // --- Треугольники (контуры) ---
      // Красный (равносторонний, тонкий)
      triRedBase.drawRaster(renderer);
      triRedRight.drawRaster(renderer);
      triRedLeft.drawRaster(renderer);
      
      // Жёлтый (толстый)
      triYellowBase.drawRaster(renderer);
      triYellowRight.drawRaster(renderer);
      triYellowLeft.drawRaster(renderer);

      renderer.commit();
      raf = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
    };
  }, [lineAlg]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Система фигур (ЛР-5)</h1>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setLineAlg("bresenham")}
          className={`px-4 py-2 rounded ${
            lineAlg === "bresenham" ? "bg-blue-600" : "bg-slate-700"
          }`}
        >
          Брезенхем
        </button>
        <button
          onClick={() => setLineAlg("wu")}
          className={`px-4 py-2 rounded ${
            lineAlg === "wu" ? "bg-blue-600" : "bg-slate-700"
          }`}
        >
          Сяолинь Ву
        </button>
      </div>

      <div className="w-[800px] h-[650px] bg-slate-900 border border-slate-800 rounded shadow-xl overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full bg-white"
        />
      </div>
    </div>
  );
}