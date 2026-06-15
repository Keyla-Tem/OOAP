import { Shape } from './Shape';
import { Bounds } from './types';
import { Point2D } from '../math/mat3';  
import { RasterRenderer, hexToRGBA } from '../raster/RasterRenderer';

export class Triangle extends Shape {
  // Вершины в локальных координатах (относительно центра фигуры)
  private localP1: Point2D;
  private localP2: Point2D;
  private localP3: Point2D;

  constructor(id: string, p1: Point2D, p2: Point2D, p3: Point2D) {
    super(id);

    // 1. Вычисляем геометрический центр (центроид) треугольника
    // Это нужно, чтобы transform применялся от центра фигуры, а не от (0,0)
    const centerX = (p1.x + p2.x + p3.x) / 3;
    const centerY = (p1.y + p2.y + p3.y) / 3;

    // Устанавливаем позицию трансформации в центр треугольника
    this.transform.x = centerX;
    this.transform.y = centerY;

    // 2. Сохраняем вершины в локальных координатах (сдвиг относительно центра)
    this.localP1 = { x: p1.x - centerX, y: p1.y - centerY };
    this.localP2 = { x: p2.x - centerX, y: p2.y - centerY };
    this.localP3 = { x: p3.x - centerX, y: p3.y - centerY };
  }

  // ================= ОТРИСОВКА =================

  drawRaster(r: RasterRenderer): void {
    // Переводим локальные вершины в экранные координаты
    const p1 = this.transformPointToDevice(this.localP1.x, this.localP1.y);
    const p2 = this.transformPointToDevice(this.localP2.x, this.localP2.y);
    const p3 = this.transformPointToDevice(this.localP3.x, this.localP3.y);

    const points = [p1, p2, p3];

    // Заливка
    if (this.fillOpacity > 0) {
      const fillColor = hexToRGBA(this.fillStyle, Math.floor(this.fillOpacity * 255));
      r.fillPolygon(points, fillColor);
    }

    // Обводка
    if (this.strokeWidth > 0 && this.strokeOpacity > 0) {
      const strokeColor = hexToRGBA(this.strokeStyle, Math.floor(this.strokeOpacity * 255));
      r.strokePolygon(points, strokeColor, this.strokeWidth);
    }
  }

  // ================= HIT TEST =================

  hitTest(px: number, py: number): boolean {
    // 1. Переводим точку клика в локальные координаты
    const localPt = this.transformPointToLocal(px, py);
    if (!localPt) return false;

    // 2. Проверяем, лежит ли точка внутри треугольника
    // Используем метод знаков (Cross Product)
    // Точка внутри, если она находится по одну сторону от всех трех ребер
    
    const sign = (p1: Point2D, p2: Point2D, p3: Point2D) => {
      return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    };

    const d1 = sign(localPt, this.localP1, this.localP2);
    const d2 = sign(localPt, this.localP2, this.localP3);
    const d3 = sign(localPt, this.localP3, this.localP1);

    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);

    // Если есть и отрицательные, и положительные значения — точка снаружи
    return !(hasNeg && hasPos);
  }

  // ================= ГРАНИЦЫ =================

  getBounds(): Bounds {
    // Переводим все вершины в экранные координаты
    const p1 = this.transformPointToDevice(this.localP1.x, this.localP1.y);
    const p2 = this.transformPointToDevice(this.localP2.x, this.localP2.y);
    const p3 = this.transformPointToDevice(this.localP3.x, this.localP3.y);

    return {
      minX: Math.min(p1.x, p2.x, p3.x),
      minY: Math.min(p1.y, p2.y, p3.y),
      maxX: Math.max(p1.x, p2.x, p3.x),
      maxY: Math.max(p1.y, p2.y, p3.y)
    };
  }

  getLocalBounds(): Bounds {
    return {
      minX: Math.min(this.localP1.x, this.localP2.x, this.localP3.x),
      minY: Math.min(this.localP1.y, this.localP2.y, this.localP3.y),
      maxX: Math.max(this.localP1.x, this.localP2.x, this.localP3.x),
      maxY: Math.max(this.localP1.y, this.localP2.y, this.localP3.y)
    };
  }

  // ================= СЕРИАЛИЗАЦИЯ И КОПИРОВАНИЕ =================

  clone(): Triangle {
    // Чтобы клонировать, нам нужно восстановить глобальные координаты из локальных
    const p1 = this.transformPointToDevice(this.localP1.x, this.localP1.y);
    const p2 = this.transformPointToDevice(this.localP2.x, this.localP2.y);
    const p3 = this.transformPointToDevice(this.localP3.x, this.localP3.y);
    
    const cloned = new Triangle(this.id, p1, p2, p3);
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
      type: 'Triangle',
      id: this.id,
      points: [this.localP1, this.localP2, this.localP3], // Сохраняем локальные для простоты восстановления
      transform: this.transform,
      fillStyle: this.fillStyle,
      fillOpacity: this.fillOpacity,
      strokeStyle: this.strokeStyle,
      strokeWidth: this.strokeWidth,
      strokeOpacity: this.strokeOpacity
    };
  }
}