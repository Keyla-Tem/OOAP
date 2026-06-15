import { Shape } from './Shape';
import { Bounds } from './types';
import { RasterRenderer, hexToRGBA } from '../raster/RasterRenderer';

export class Line extends Shape {
  x1: number; // начальная точка (в локальных координатах относительно центра)
  y1: number;
  x2: number; // конечная точка
  y2: number;

  constructor(id: string, x1: number, y1: number, x2: number, y2: number) {
    super(id);
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }

  // Отрисовка линии
  drawRaster(r: RasterRenderer): void {
    // Переводим концы линии в экранные координаты
    const start = this.transformPointToDevice(this.x1, this.y1);
    const end = this.transformPointToDevice(this.x2, this.y2);

    const strokeColor = hexToRGBA(this.strokeStyle, Math.floor(this.strokeOpacity * 255));
    
    // Рисуем линию с учётом толщины
    if (this.strokeWidth > 1) {
      r.strokeLine(start.x, start.y, end.x, end.y, strokeColor, this.strokeWidth);
    } else {
      r.drawLine(start.x, start.y, end.x, end.y, strokeColor);
    }
  }

  // Проверка попадания точки
  hitTest(px: number, py: number): boolean {
    // Переводим точку в локальные координаты
    const localPoint = this.transformPointToLocal(px, py);
    if (!localPoint) return false;

    // Вычисляем расстояние от точки до отрезка
    const dist = this.distancePointToSegment(
      localPoint.x,
      localPoint.y,
      this.x1,
      this.y1,
      this.x2,
      this.y2
    );

    // Если расстояние меньше половины толщины линии — попадание
    const tolerance = Math.max(this.strokeWidth / 2, 5); // минимум 5 пикселей для удобства
    return dist <= tolerance;
  }

  // Расстояние от точки до отрезка
  private distancePointToSegment(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      // Отрезок вырожден в точку
      const dpx = px - x1;
      const dpy = py - y1;
      return Math.sqrt(dpx * dpx + dpy * dpy);
    }

    // Проекция точки на прямую
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t)); // ограничиваем отрезком

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    const distX = px - projX;
    const distY = py - projY;

    return Math.sqrt(distX * distX + distY * distY);
  }

  // Границы в экранных координатах
  getBounds(): Bounds {
    const start = this.transformPointToDevice(this.x1, this.y1);
    const end = this.transformPointToDevice(this.x2, this.y2);

    return {
      minX: Math.min(start.x, end.x),
      minY: Math.min(start.y, end.y),
      maxX: Math.max(start.x, end.x),
      maxY: Math.max(start.y, end.y)
    };
  }

  // Границы в локальных координатах
  getLocalBounds(): Bounds {
    return {
      minX: Math.min(this.x1, this.x2),
      minY: Math.min(this.y1, this.y2),
      maxX: Math.max(this.x1, this.x2),
      maxY: Math.max(this.y1, this.y2)
    };
  }

  // Клонирование
  clone(): Line {
    const cloned = new Line(this.id, this.x1, this.y1, this.x2, this.y2);
    cloned.transform = { ...this.transform };
    cloned.strokeStyle = this.strokeStyle;
    cloned.strokeWidth = this.strokeWidth;
    cloned.strokeOpacity = this.strokeOpacity;
    cloned.fillStyle = this.fillStyle;
    cloned.fillOpacity = this.fillOpacity;
    return cloned;
  }

  // Сериализация
  toJSON(): object {
    return {
      type: 'Line',
      id: this.id,
      x1: this.x1,
      y1: this.y1,
      x2: this.x2,
      y2: this.y2,
      transform: this.transform,
      strokeStyle: this.strokeStyle,
      strokeWidth: this.strokeWidth,
      strokeOpacity: this.strokeOpacity,
      fillStyle: this.fillStyle,
      fillOpacity: this.fillOpacity
    };
  }
}