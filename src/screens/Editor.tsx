// src/screens/Editor.tsx
import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CanvasScene from "./CanvasScene";
import { Shape } from "../lib/shapes/Shape";

// =====================================================================
// ИМПОРТ ИКОНОК (lucide-react должен быть установлен: npm install lucide-react)
// =====================================================================
import { MousePointer2, Square, Minus, Circle } from 'lucide-react';

// =====================================================================
// ПРОПСЫ ДЛЯ CanvasScene (вынесены для чистоты кода)
// =====================================================================
interface CanvasSceneProps {
  lineAlg: "bresenham" | "wu";
  currentTool: "select" | "rect" | "line" | "oval";
  shapes: Shape[];
  selectedId: string | null;
  onShapesChange: (shapes: Shape[]) => void;
  onSelectedIdChange: (id: string | null) => void;
}

export default function Editor() {
  // =====================================================================
  // ПАРАМЕТРЫ МАРШРУТА И НАВИГАЦИЯ
  // =====================================================================
  const { id } = useParams();              // ID проекта из URL (например, "/editor/123")
  const navigate = useNavigate();          // Функция для программной навигации

  // =====================================================================
  // СОСТОЯНИЕ РЕДАКТОРА (объявляем все переменные состояния в начале)
  // =====================================================================
  
  // Текущий выбранный инструмент: выбор, прямоугольник, линия или овал
  const [currentTool, setCurrentTool] = useState<"select" | "rect" | "line" | "oval">("select");
  
  // Массив всех фигур на холсте
  const [shapes, setShapes] = useState<Shape[]>([]);
  
  // ID выделенной фигуры (null = ничего не выделено)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Алгоритм отрисовки линий (из ЛР-4: Брезенхем или Ву)
  const [lineAlg, setLineAlg] = useState<"bresenham" | "wu">("bresenham");

  // =====================================================================
  // ОБРАБОТЧИКИ СОБЫТИЙ (объявляем все колбэки в начале)
  // =====================================================================

  // Обновление массива фигур (вызывается из CanvasScene при создании/удалении)
  const handleShapesChange = useCallback((newShapes: Shape[]) => {
    setShapes(newShapes);
  }, []);

  // Обновление выделенного объекта (вызывается из CanvasScene при клике)
  const handleSelectedIdChange = useCallback((newId: string | null) => {
    setSelectedId(newId);
  }, []);

  // Удаление выделенной фигуры (по кнопке или клавише Delete)
  const handleDeleteSelected = useCallback(() => {
    if (selectedId) {
      setShapes(prev => prev.filter(s => s.id !== selectedId));
      setSelectedId(null);
    }
  }, [selectedId]);

  // Обновление позиции фигуры (используется в панели свойств)
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

  // Обновление поворота фигуры (используется в панели свойств и клавишами)
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

  // Обновление масштаба фигуры (используется в панели свойств)
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

  // Обновление цвета и прозрачности заливки (используется в панели свойств)
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
  // ОБРАБОТКА КЛАВИАТУРЫ (удаление и поворот стрелками)
  // =====================================================================
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // === ДОБАВИТЬ ПРОВЕРКУ: игнорировать клавиши в полях ввода ===
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || 
                    target.tagName === 'TEXTAREA' || 
                    target.isContentEditable;
    
    if (e.key === "Delete" || e.key === "Backspace") {
      // Удаляем фигуру ТОЛЬКО если не в поле ввода
      if (!isInput) {
        handleDeleteSelected();
      }
      // Если в поле ввода — пусть браузер обрабатывает удаление текста
      return;
    }
    
    // Поворот стрелками (тоже только вне полей ввода)
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
  // ПОЛУЧЕНИЕ ВЫДЕЛЕННОЙ ФИГУРЫ (для отображения в панели свойств)
  // =====================================================================
  const selectedShape = shapes.find(s => s.id === selectedId) || null;

  // =====================================================================
  // ОТРИСОВКА ИНТЕРФЕЙСА РЕДАКТОРА
  // =====================================================================
  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white">
      
      {/* ВЕРХНЯЯ ПАНЕЛЬ (Header) */}
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900">
        <div className="flex items-center gap-4">
          {/* Кнопка "Назад" — возврат в галерею */}
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded transition"
          >
            ← Назад
          </button>
          
          {/* Заголовок редактора с номером проекта */}
          <h1 className="text-lg font-semibold">
            Редактор {id ? `№${id}` : "(Новый)"}
          </h1>
        </div>
        
        {/* Правая часть хедера: алгоритм линий + кнопка сохранения */}
        <div className="flex items-center gap-2">
          {/* Выбор алгоритма отрисовки линий */}
          <select
            value={lineAlg}
            onChange={(e) => setLineAlg(e.target.value as "bresenham" | "wu")}
            className="px-2 py-1 bg-slate-700 rounded text-sm"
          >
            <option value="bresenham">Брезенхем</option>
            <option value="wu">Сяолинь Ву</option>
          </select>
          
          {/* Кнопка сохранения (заглушка) */}
          <button className="px-4 py-1 bg-green-600 hover:bg-green-500 rounded transition">
            Сохранить
          </button>
        </div>
      </header>

      {/* ОСНОВНАЯ ОБЛАСТЬ: панели + холст */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* =================================================================
             ЛЕВАЯ ПАНЕЛЬ — ИНСТРУМЕНТЫ (с иконками lucide-react)
             ================================================================= */}
        <aside className="w-16 border-r border-slate-800 bg-slate-900 flex flex-col items-center py-4 gap-2">
          
          {/* Инструмент: ВЫБОР (курсор) */}
          <button 
            onClick={() => setCurrentTool("select")}
            className={`p-2.5 rounded-lg transition-all ${
              currentTool === "select" 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white hover:scale-110"
            }`}
            title="Выбор (V)"
          >
            <MousePointer2 size={20} strokeWidth={2.5} />
          </button>
          
          {/* Инструмент: ПРЯМОУГОЛЬНИК */}
          <button 
            onClick={() => setCurrentTool("rect")}
            className={`p-2.5 rounded-lg transition-all ${
              currentTool === "rect" 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white hover:scale-110"
            }`}
            title="Прямоугольник (R)"
          >
            <Square size={20} strokeWidth={2.5} />
          </button>
          
          {/* Инструмент: ЛИНИЯ */}
          <button 
            onClick={() => setCurrentTool("line")}
            className={`p-2.5 rounded-lg transition-all ${
              currentTool === "line" 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white hover:scale-110"
            }`}
            title="Линия (L)"
          >
            <Minus size={20} strokeWidth={2.5} />
          </button>
          
          {/* Инструмент: ОВАЛ */}
          <button 
            onClick={() => setCurrentTool("oval")}
            className={`p-2.5 rounded-lg transition-all ${
              currentTool === "oval" 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white hover:scale-110"
            }`}
            title="Овал (O)"
          >
            <Circle size={20} strokeWidth={2.5} />
          </button>
        </aside>

        {/* =================================================================
             ЦЕНТРАЛЬНАЯ ЗОНА — ХОЛСТ (CanvasScene)
             ================================================================= */}
        <main className="flex-1 bg-slate-800 p-4 overflow-auto">
          <div className="w-full h-full bg-white shadow-lg rounded overflow-hidden">
            <CanvasScene
              lineAlg={lineAlg}
              currentTool={currentTool}
              shapes={shapes}
              selectedId={selectedId}
              onShapesChange={handleShapesChange}
              onSelectedIdChange={handleSelectedIdChange}
            />
          </div>
        </main>

        {/* =================================================================
             ПРАВАЯ ПАНЕЛЬ — СВОЙСТВА ВЫДЕЛЕННОЙ ФИГУРЫ
             ================================================================= */}
        <aside className="w-72 border-l border-slate-800 bg-slate-900 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">Свойства</h2>
          
          {selectedShape ? (
            <div className="space-y-4">
              
              {/* Тип фигуры (читаем из constructor.name) */}
              <div className="p-3 bg-slate-800 rounded">
                <p className="text-sm text-slate-400 mb-1">Тип</p>
                <p className="font-mono">{selectedShape.constructor.name}</p>
              </div>

              {/* Позиция (X, Y) — редактируемые поля */}
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

              {/* Поворот (слайдер + отображение в градусах) */}
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

              {/* Масштаб (отдельно по X и Y) */}
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

              {/* Цвет и прозрачность заливки */}
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

              {/* Кнопка удаления выделенной фигуры */}
              <button
                onClick={handleDeleteSelected}
                className="w-full py-2 bg-red-600 hover:bg-red-500 rounded transition text-sm"
              >
                Удалить фигуру
              </button>
            </div>
          ) : (
           <div className="text-slate-300 text-sm space-y-3">
  <p className="text-slate-400 mb-3">Выберите инструмент:</p>
  
  <div className="space-y-2">
    {/* Выбор */}
    <div className="flex items-start gap-2 p-2 rounded hover:bg-slate-800/50 transition">
      <MousePointer2 size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
      <div>
        <span className="font-medium text-white">Выбор</span>
        <span className="text-slate-400"> — кликать и перетаскивать фигуры</span>
      </div>
    </div>
    
    {/* Прямоугольник */}
    <div className="flex items-start gap-2 p-2 rounded hover:bg-slate-800/50 transition">
      <Square size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
      <div>
        <span className="font-medium text-white">Прямоугольник</span>
        <span className="text-slate-400"> — создать прямоугольник</span>
      </div>
    </div>
    
    {/* Линия */}
    <div className="flex items-start gap-2 p-2 rounded hover:bg-slate-800/50 transition">
      <Minus size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
      <div>
        <span className="font-medium text-white">Линия</span>
        <span className="text-slate-400"> — создать отрезок</span>
      </div>
    </div>
    
    {/* Овал */}
    <div className="flex items-start gap-2 p-2 rounded hover:bg-slate-800/50 transition">
      <Circle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
      <div>
        <span className="font-medium text-white">Овал</span>
        <span className="text-slate-400"> — создать эллипс</span>
      </div>
    </div>
  </div>
  
  {/* Подсказки по клавиатуре */}
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
        </aside>
      </div>
    </div>
  );
}