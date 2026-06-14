// src/lib/shapes/PathBezier.ts
import { Shape } from './Shape';
import { Bounds } from './types';
import { Point2D } from '../math/mat3';
import { RasterRenderer, hexToRGBA } from '../raster/RasterRenderer';
import { 
  cubicBezierPoint, 
  flattenCubicBezier,
  distancePointToPolyline
} from './bezier-utils';

export type PathMode = 'polyline' | 'bezier' | 'catmull';

export class PathBezier extends Shape {
  // Опорные точки (в локальных координатах)
  private anchors: Point2D[];
  mode: PathMode;
  closed: boolean;
  flatness: number;

  constructor(
    id: string, 
    points: Point2D[], 
    mode: PathMode = 'polyline', 
    closed: boolean = false,
    flatness: number = 0.5
  ) {
    super(id);
    this.anchors = [...points]; // Копируем массив, чтобы не мутировать входной
    this.mode = mode;
    this.closed = closed;
    this.flatness = flatness;

    // Вычисляем центр для трансформации
    const center = this.computeCenter();
    this.transform.x = center.x;
    this.transform.y = center.y;

    // Сдвигаем точки в локальные координаты относительно центра
    this.anchors = points.map(p => ({
      x: p.x - center.x,
      y: p.y - center.y
    }));
  }

  // Вычисляет центр масс фигуры (среднее арифметическое)
  private computeCenter(): Point2D {
    if (this.anchors.length === 0) return { x: 0, y: 0 };
    
    let sumX = 0, sumY = 0;
    for (const p of this.anchors) {
      sumX += p.x;
      sumY += p.y;
    }
    return { x: sumX / this.anchors.length, y: sumY / this.anchors.length };
  }

  // === МАТЕМАТИКА CATMULL-ROM ===
  // Преобразует 4 точки Catmull-Rom в сегмент CubicBezier
  private catmullToCubic(p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D): [Point2D, Point2D, Point2D, Point2D] {
    const tension = 1 / 3; // Стандартное натяжение для плавности
    const cp1 = {
      x: p1.x + (p2.x - p0.x) * tension,
      y: p1.y + (p2.y - p0.y) * tension
    };
    const cp2 = {
      x: p2.x - (p3.x - p1.x) * tension,
      y: p2.y - (p3.y - p1.y) * tension
    };
    return [p1, cp1, cp2, p2];
  }

  // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ДЛЯ РЕДАКТИРОВАНИЯ ===
  
  // Получить копию массива опорных точек
  getControlPoints(): Point2D[] {
    return [...this.anchors];
  }

  // Изменить точку по индексу
  setControlPoint(index: number, pt: Point2D): void {
    if (index >= 0 && index < this.anchors.length) {
      this.anchors[index] = { ...pt };
    }
  }

  // Добавить новую точку в конец (или по индексу)
  addPointLocal(localPt: Point2D, insertAtIndex?: number): void {
    if (insertAtIndex !== undefined && insertAtIndex >= 0 && insertAtIndex <= this.anchors.length) {
      this.anchors.splice(insertAtIndex, 0, { ...localPt });
    } else {
      this.anchors.push({ ...localPt });
    }
  }

  // Удалить точку по индексу
  removePoint(index: number): void {
    if (index >= 0 && index < this.anchors.length) {
      this.anchors.splice(index, 1);
    }
  }

  // === ГЕНЕРАЦИЯ ТОЧЕК (FLATTEN) ===
  flattenDevicePoints(dpr: number): Point2D[] {
    const result: Point2D[] = [];
    
    if (this.anchors.length < 2) return [];

    // === РЕЖИМ 1: Полилиния (простое соединение точек) ===
    if (this.mode === 'polyline') {
      for (const anchor of this.anchors) {
        result.push(this.transformPointToDevice(anchor.x, anchor.y));
      }
      if (this.closed && this.anchors.length > 2) {
        result.push(this.transformPointToDevice(this.anchors[0].x, this.anchors[0].y));
      }
      return result;
    }

    // === РЕЖИМ 2 и 3: Bezier и Catmull-Rom (аппроксимация кривых) ===
    // В обоих режимах разбиваем путь на сегменты по 4 точки (стандарт CubicBezier)
    
    if (this.mode === 'catmull' || this.mode === 'bezier') {
      // Проходим по массиву с шагом 3 (каждые 4 точки = 1 сегмент)
      for (let i = 0; i + 3 < this.anchors.length; i += 3) {
        const p0 = this.anchors[i];
        const p1 = this.anchors[i + 1];
        const p2 = this.anchors[i + 2];
        const p3 = this.anchors[i + 3];
        
        if (!p0 || !p1 || !p2 || !p3) continue;

        let flattened: Point2D[];

        if (this.mode === 'catmull') {
          // Catmull-Rom: преобразуем 4 опорные точки в кривую Безье
          const [start, cp1, cp2, end] = this.catmullToCubic(p0, p1, p2, p3);
          flattened = flattenCubicBezier(start, cp1, cp2, end, this.flatness);
        } else {
          // Чистый Bezier: точки уже являются контрольными (p0, p1, p2, p3)
          flattened = flattenCubicBezier(p0, p1, p2, p3, this.flatness);
        }

        // Переводим полученные точки в экранные координаты и добавляем в результат
        for (const pt of flattened) {
          result.push(this.transformPointToDevice(pt.x, pt.y));
        }
      }
    }

    return result;
  }

  // === ОСНОВНЫЕ МЕТОДЫ SHAPE ===

  drawRaster(r: RasterRenderer): void {
    const points = this.flattenDevicePoints(r.dpr);
    if (points.length < 2) return;

    const strokeColor = hexToRGBA(this.strokeStyle, Math.floor(this.strokeOpacity * 255));
    
    if (this.closed) {
      // Для замкнутого контура: заливка + обводка
      if (this.fillOpacity > 0) {
        const fillColor = hexToRGBA(this.fillStyle, Math.floor(this.fillOpacity * 255));
        r.fillPolygon(points, fillColor);
      }
      r.strokePolygon(points, strokeColor, this.strokeWidth);
    } else {
      // Для открытого пути: только обводка
      r.strokePolygon(points, strokeColor, this.strokeWidth);
    }
  }

  hitTest(px: number, py: number): boolean {
    const points = this.flattenDevicePoints(1); // DPR уже учтён внутри
    const dist = distancePointToPolyline({ x: px, y: py }, points);
    const tolerance = Math.max(this.strokeWidth / 2, 5);
    return dist <= tolerance;
  }

  getBounds(): Bounds {
    const points = this.flattenDevicePoints(1);
    if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const pt of points) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }
    return { minX, minY, maxX, maxY };
  }

  getLocalBounds(): Bounds {
    if (this.anchors.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const pt of this.anchors) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }
    return { minX, minY, maxX, maxY };
  }

  clone(): PathBezier {
    // Восстанавливаем глобальные координаты для конструктора
    const globalAnchors = this.anchors.map(p => this.transformPointToDevice(p.x, p.y));
    const cloned = new PathBezier(this.id, globalAnchors, this.mode, this.closed, this.flatness);
    cloned.transform = { ...this.transform };
    cloned.fillStyle = this.fillStyle;
    cloned.fillOpacity = this.fillOpacity;
    cloned.strokeStyle = this.strokeStyle;
    cloned.strokeWidth = this.strokeWidth;
    cloned.strokeOpacity = this.strokeOpacity;
    return cloned;
  }

  toJSON(): object {
    return {
      type: 'PathBezier',
      id: this.id,
      anchors: this.anchors,
      mode: this.mode,
      closed: this.closed,
      flatness: this.flatness,
      transform: this.transform,
      fillStyle: this.fillStyle,
      fillOpacity: this.fillOpacity,
      strokeStyle: this.strokeStyle,
      strokeWidth: this.strokeWidth,
      strokeOpacity: this.strokeOpacity
    };
  }
}