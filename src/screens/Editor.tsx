// src/screens/Editor.tsx
import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CanvasScene from "./CanvasScene";
import { Shape } from "../lib/shapes/Shape";
import { PathMode } from '../lib/shapes/PathBezier';

import { 
  MousePointer2, Square, Minus, Circle, Triangle, PenTool, GitMerge,
  ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Trash2
} from 'lucide-react';

// =====================================================================
// ПРОПСЫ ДЛЯ CanvasScene
// =====================================================================
interface CanvasSceneProps {
  lineAlg: "bresenham" | "wu";
  currentTool: "select" | "rect" | "line" | "oval" | "triangle" | "quadbezier" | "cubicbezier" | "path";
  pathMode: PathMode;
  shapes: Shape[];
  selectedId: string | null;
  onShapesChange: (shapes: Shape[]) => void;
  onSelectedIdChange: (id: string | null) => void;
}

export default function Editor() {
  // =====================================================================
  // ПАРАМЕТРЫ МАРШРУТА И НАВИГАЦИЯ
  // =====================================================================
  const { id } = useParams();
  const navigate = useNavigate();

  // =====================================================================
  // СОСТОЯНИЕ РЕДАКТОРА
  // =====================================================================
  const [currentTool, setCurrentTool] = useState<CanvasSceneProps["currentTool"]>("select");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lineAlg, setLineAlg] = useState<"bresenham" | "wu">("bresenham");
  const [pathMode, setPathMode] = useState<PathMode>('catmull');

  // =====================================================================
  // ОБРАБОТЧИКИ СОБЫТИЙ
  // =====================================================================
  const handleShapesChange = useCallback((newShapes: Shape[]) => {
    setShapes(newShapes);
  }, []);

  const handleSelectedIdChange = useCallback((newId: string | null) => {
    setSelectedId(newId);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedId) {
      setShapes(prev => prev.filter(s => s.id !== selectedId));
      setSelectedId(null);
    }
  }, [selectedId]);

  const updateShapePosition = useCallback((shapeId: string, newX: number, newY: number) => {
    setShapes(prevShapes => 
      prevShapes.map(shape => {
        if (shape.id === shapeId) {
          const cloned = shape.clone();
          cloned.transform.x = newX;
          cloned.transform.y = newY;
          return cloned;
        }
        return shape;
      })
    );
  }, []);

  const updateShapeRotation = useCallback((shapeId: string, newRotation: number) => {
    setShapes(prevShapes => 
      prevShapes.map(shape => {
        if (shape.id === shapeId) {
          const cloned = shape.clone();
          cloned.transform.rotation = newRotation;
          return cloned;
        }
        return shape;
      })
    );
  }, []);

  const updateShapeScale = useCallback((shapeId: string, newScaleX: number, newScaleY: number) => {
    setShapes(prevShapes => 
      prevShapes.map(shape => {
        if (shape.id === shapeId) {
          const cloned = shape.clone();
          cloned.transform.scaleX = newScaleX;
          cloned.transform.scaleY = newScaleY;
          return cloned;
        }
        return shape;
      })
    );
  }, []);

  const updateShapeFill = useCallback((shapeId: string, newColor: string, newOpacity: number) => {
    setShapes(prevShapes => 
      prevShapes.map(shape => {
        if (shape.id === shapeId) {
          const cloned = shape.clone();
          cloned.fillStyle = newColor;
          cloned.fillOpacity = newOpacity;
          return cloned;
        }
        return shape;
      })
    );
  }, []);

  // =====================================================================
  // УПРАВЛЕНИЕ СЛОЯМИ
  // =====================================================================
  const moveLayerUp = useCallback(() => {
    if (!selectedId) return;
    setShapes(prev => {
      const idx = prev.findIndex(s => s.id === selectedId);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, [selectedId]);

  const moveLayerDown = useCallback(() => {
    if (!selectedId) return;
    setShapes(prev => {
      const idx = prev.findIndex(s => s.id === selectedId);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
      return next;
    });
  }, [selectedId]);

  const moveToTop = useCallback(() => {
    if (!selectedId) return;
    setShapes(prev => {
      const idx = prev.findIndex(s => s.id === selectedId);
      if (idx < 0 || idx === prev.length - 1) return prev;
      const shape = prev[idx];
      return [...prev.filter(s => s.id !== selectedId), shape];
    });
  }, [selectedId]);

  const moveToBottom = useCallback(() => {
    if (!selectedId) return;
    setShapes(prev => {
      const idx = prev.findIndex(s => s.id === selectedId);
      if (idx <= 0) return prev;
      const shape = prev[idx];
      return [shape, ...prev.filter(s => s.id !== selectedId)];
    });
  }, [selectedId]);

  // =====================================================================
  // ОБРАБОТКА КЛАВИАТУРЫ
  // =====================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable;
      
      if (e.key === "Delete" || e.key === "Backspace") {
        if (!isInput) {
          handleDeleteSelected();
        }
        return;
      }
      
      if (!isInput && selectedId && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        const delta = e.key === "ArrowRight" ? 0.1 : -0.1;
        const shape = shapes.find(s => s.id === selectedId);
        if (shape) {
          updateShapeRotation(selectedId, shape.transform.rotation + delta);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, shapes, handleDeleteSelected, updateShapeRotation]);

  // =====================================================================
  // ПОЛУЧЕНИЕ ВЫДЕЛЕННОЙ ФИГУРЫ
  // =====================================================================
  const selectedShape = shapes.find(s => s.id === selectedId) || null;

  // =====================================================================
  // ОТРИСОВКА ИНТЕРФЕЙСА
  // =====================================================================
  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      
      {/* ВЕРХНЯЯ ПАНЕЛЬ */}
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded transition"
          >
            ← Назад
          </button>
          
          <h1 className="text-lg font-semibold">
            Редактор {id ? `№${id}` : "(Новый)"}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={lineAlg}
            onChange={(e) => setLineAlg(e.target.value as "bresenham" | "wu")}
            className="px-2 py-1 bg-slate-700 rounded text-sm"
          >
            <option value="bresenham">Брезенхем</option>
            <option value="wu">Сяолинь Ву</option>
          </select>
          
          <button className="px-4 py-1 bg-green-600 hover:bg-green-500 rounded transition">
            Сохранить
          </button>
        </div>
      </header>

      {/* ОСНОВНОЙ КОНТЕЙНЕР */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* ЛЕВАЯ ПАНЕЛЬ — ИНСТРУМЕНТЫ */}
        <aside className="w-16 border-r border-slate-800 bg-slate-900 flex flex-col items-center py-4 gap-2 flex-shrink-0">
          
          {/* ВЫБОР */}
          <button 
            onClick={() => setCurrentTool("select")}
            className={`p-2.5 rounded-lg transition-all ${
              currentTool === "select" 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white hover:scale-110"
            }`}
            title="Выбор"
          >
            <MousePointer2 size={20} strokeWidth={2.5} />
          </button>
          
          {/* ПРЯМОУГОЛЬНИК */}
          <button 
            onClick={() => setCurrentTool("rect")}
            className={`p-2.5 rounded-lg transition-all ${
              currentTool === "rect" 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white hover:scale-110"
            }`}
            title="Прямоугольник"
          >
            <Square size={20} strokeWidth={2.5} />
          </button>
          
          {/* ЛИНИЯ */}
          <button 
            onClick={() => setCurrentTool("line")}
            className={`p-2.5 rounded-lg transition-all ${
              currentTool === "line" 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white hover:scale-110"
            }`}
            title="Линия"
          >
            <Minus size={20} strokeWidth={2.5} />
          </button>
          
          {/* ОВАЛ */}
          <button 
            onClick={() => setCurrentTool("oval")}
            className={`p-2.5 rounded-lg transition-all ${
              currentTool === "oval" 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white hover:scale-110"
            }`}
            title="Овал"
          >
            <Circle size={20} strokeWidth={2.5} />
          </button>

          {/* ТРЕУГОЛЬНИК */}
          <button 
            onClick={() => setCurrentTool("triangle")}
            className={`p-2.5 rounded-lg transition-all ${
              currentTool === "triangle" 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white hover:scale-110"
            }`}
            title="Треугольник"
          >
            <Triangle size={20} strokeWidth={2.5} />
          </button>

          {/* КВАДРАТИЧНАЯ КРИВАЯ */}
          <button 
            onClick={() => setCurrentTool("quadbezier")}
            className={`p-2.5 rounded-lg transition-all ${
              currentTool === "quadbezier" 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white hover:scale-110"
            }`}
            title="Квадр. кривая"
          >
            <PenTool size={20} strokeWidth={2.5} />
          </button>

          {/* КУБИЧЕСКАЯ КРИВАЯ */}
          <button 
            onClick={() => setCurrentTool("cubicbezier")}
            className={`p-2.5 rounded-lg transition-all ${
              currentTool === "cubicbezier" 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white hover:scale-110"
            }`}
            title="Кубич. кривая"
          >
            <PenTool size={20} strokeWidth={2.5} />
          </button>

          {/* ПУТЬ (PATH) */}
          <button 
            onClick={() => setCurrentTool("path")}
            className={`p-2.5 rounded-lg transition-all ${
              currentTool === "path" 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white hover:scale-110"
            }`}
            title="Путь"
          >
            <GitMerge size={20} strokeWidth={2.5} />
          </button>
        </aside>
                      
        {/* ЦЕНТРАЛЬНАЯ ЗОНА — ХОЛСТ */}
        <main className="flex-1 bg-slate-800 p-4 overflow-hidden relative">
          <div className="absolute inset-4 bg-white shadow-lg rounded overflow-hidden">
            <CanvasScene
              lineAlg={lineAlg}
              currentTool={currentTool}
              pathMode={pathMode}
              shapes={shapes}
              selectedId={selectedId}
              onShapesChange={handleShapesChange}
              onSelectedIdChange={handleSelectedIdChange}
            />
          </div>
        </main>
        {/* ПРАВАЯ ПАНЕЛЬ — СЛОИ И СВОЙСТВА */}
        <aside className="w-72 border-l border-slate-800 bg-slate-900 p-4 overflow-y-auto flex flex-col gap-4 flex-shrink-0">
          
          {/* СЕКЦИЯ: СЛОИ */}
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              Слои
              <span className="text-xs text-slate-500 font-normal">({shapes.length})</span>
            </h2>
            
            {shapes.length > 0 ? (
              <div className="space-y-1 mb-3">
                {[...shapes].reverse().map((shape, idx) => (
                  <div
                    key={shape.id}
                    onClick={() => handleSelectedIdChange(shape.id)}
                    className={`p-2 rounded cursor-pointer transition-all flex items-center justify-between ${
                      shape.id === selectedId 
                        ? "bg-blue-600 text-white" 
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono opacity-60">#{shapes.length - idx}</span>
                      <span className="text-sm">{shape.constructor.name}</span>
                    </div>
                    {shape.id === selectedId && (
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); moveLayerUp(); }}
                          disabled={idx === 0}
                          className="p-1 hover:bg-blue-700 rounded disabled:opacity-30"
                          title="Выше"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveLayerDown(); }}
                          disabled={idx === shapes.length - 1}
                          className="p-1 hover:bg-blue-700 rounded disabled:opacity-30"
                          title="Ниже"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic mb-3">Нет объектов</p>
            )}

            {selectedId && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={moveToTop}
                  className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs flex items-center justify-center gap-1"
                >
                  <ChevronsUp size={14} /> Наверх
                </button>
                <button
                  onClick={moveLayerUp}
                  className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs flex items-center justify-center gap-1"
                >
                  <ChevronUp size={14} /> Выше
                </button>
                <button
                  onClick={moveLayerDown}
                  className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs flex items-center justify-center gap-1"
                >
                  <ChevronDown size={14} /> Ниже
                </button>
                <button
                  onClick={moveToBottom}
                  className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs flex items-center justify-center gap-1"
                >
                  <ChevronsDown size={14} /> Вниз
                </button>
              </div>
            )}
          </div>

          {/* РАЗДЕЛИТЕЛЬ */}
          <div className="border-t border-slate-700"></div>

          {/* СЕКЦИЯ: СВОЙСТВА */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Свойства</h2>
            
            {selectedShape ? (
              <div className="space-y-4">
                
                {/* Тип фигуры */}
                <div className="p-3 bg-slate-800 rounded">
                  <p className="text-sm text-slate-400 mb-1">Тип</p>
                  <p className="font-mono">{selectedShape.constructor.name}</p>
                </div>

                {/* Позиция */}
                <div className="p-3 bg-slate-800 rounded">
                  <p className="text-sm text-slate-400 mb-2">Позиция</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500">X</label>
                      <input
                        type="number"
                        value={Math.round(selectedShape.transform.x)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          updateShapePosition(selectedId!, val, selectedShape.transform.y);
                        }}
                        className="w-full px-2 py-1 bg-slate-700 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Y</label>
                      <input
                        type="number"
                        value={Math.round(selectedShape.transform.y)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          updateShapePosition(selectedId!, selectedShape.transform.x, val);
                        }}
                        className="w-full px-2 py-1 bg-slate-700 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Поворот */}
                <div className="p-3 bg-slate-800 rounded">
                  <p className="text-sm text-slate-400 mb-2">Поворот</p>
                  <input
                    type="range"
                    min="-3.14"
                    max="3.14"
                    step="0.1"
                    value={selectedShape.transform.rotation}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      updateShapeRotation(selectedId!, val);
                    }}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {(selectedShape.transform.rotation * 180 / Math.PI).toFixed(0)}°
                  </p>
                </div>

                {/* Масштаб */}
                <div className="p-3 bg-slate-800 rounded">
                  <p className="text-sm text-slate-400 mb-2">Масштаб</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500">X</label>
                      <input
                        type="number"
                        step="0.1"
                        value={selectedShape.transform.scaleX.toFixed(1)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          updateShapeScale(selectedId!, val, selectedShape.transform.scaleY);
                        }}
                        className="w-full px-2 py-1 bg-slate-700 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Y</label>
                      <input
                        type="number"
                        step="0.1"
                        value={selectedShape.transform.scaleY.toFixed(1)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          updateShapeScale(selectedId!, selectedShape.transform.scaleX, val);
                        }}
                        className="w-full px-2 py-1 bg-slate-700 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Заливка */}
                <div className="p-3 bg-slate-800 rounded">
                  <p className="text-sm text-slate-400 mb-2">Заливка</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedShape.fillStyle}
                      onChange={(e) => {
                        updateShapeFill(selectedId!, e.target.value, selectedShape.fillOpacity);
                      }}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={selectedShape.fillOpacity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        updateShapeFill(selectedId!, selectedShape.fillStyle, val);
                      }}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* РЕЖИМ ДЛЯ PATHBEZIER */}
                {selectedShape.constructor.name === 'PathBezier' && (
                  <div className="p-3 bg-slate-800 rounded">
                    <p className="text-sm text-slate-400 mb-2">Режим пути</p>
                    <select
                      value={pathMode}
                      onChange={(e) => setPathMode(e.target.value as PathMode)}
                      className="w-full px-2 py-1 bg-slate-700 rounded text-sm"
                    >
                      <option value="polyline">Ломаная</option>
                      <option value="bezier">Безье</option>
                      <option value="catmull">Catmull-Rom</option>
                    </select>
                  </div>
                )}

                {/* Кнопка удаления */}
                <button
                  onClick={handleDeleteSelected}
                  className="w-full py-2 bg-red-600 hover:bg-red-500 rounded transition text-sm flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Удалить фигуру
                </button>
              </div>
            ) : (
              <div className="text-slate-300 text-sm space-y-3">
                <p className="text-slate-400 mb-3">Выберите инструмент:</p>
                
                <div className="space-y-2">
                  <div className="flex items-start gap-2 p-2 rounded hover:bg-slate-800/50 transition">
                    <MousePointer2 size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-white">Выбор</span>
                      <span className="text-slate-400"> — кликать и перетаскивать</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 p-2 rounded hover:bg-slate-800/50 transition">
                    <Square size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-white">Прямоугольник</span>
                      <span className="text-slate-400"> — создать прямоугольник</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 p-2 rounded hover:bg-slate-800/50 transition">
                    <Minus size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-white">Линия</span>
                      <span className="text-slate-400"> — создать отрезок</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 p-2 rounded hover:bg-slate-800/50 transition">
                    <Circle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-white">Овал</span>
                      <span className="text-slate-400"> — создать эллипс</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-2 rounded hover:bg-slate-800/50 transition">
                    <Triangle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-white">Треугольник</span>
                      <span className="text-slate-400"> — создать треугольник</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-2 rounded hover:bg-slate-800/50 transition">
                    <PenTool size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-white">Кривые</span>
                      <span className="text-slate-400"> — квадратичная/кубическая</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-2 rounded hover:bg-slate-800/50 transition">
                    <GitMerge size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-white">Путь</span>
                      <span className="text-slate-400"> — составной PathBezier</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-700">
                  <p className="text-xs text-slate-500 mb-2">Подсказки:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li className="flex items-center gap-2">
                      <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px]">Delete</kbd>
                      <span>удалить выделенное</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px]">← →</kbd>
                      <span>повернуть выделенное</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}