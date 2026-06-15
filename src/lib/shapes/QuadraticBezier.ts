
import { Shape } from './Shape';
import { Bounds } from './types';
import { Point2D } from '../math/mat3';
import { RasterRenderer, hexToRGBA } from '../raster/RasterRenderer';
import { 
  quadraticBezierPoint, 
  flattenQuadraticBezier,
  distancePointToPolyline 
} from './bezier-utils';

export class QuadraticBezier extends Shape {
  // Три точки в локальных координатах
  private p0: Point2D; // начальная
  private p1: Point2D; // управляющая
  private p2: Point2D; // конечная
  
  // Точность аппроксимации (в пикселях)
  private flatness: number;

  constructor(id: string, p0: Point2D, p1: Point2D, p2: Point2D, flatness: number = 0.5) {
    super(id);
    this.p0 = p0;
    this.p1 = p1;
    this.p2 = p2;
    this.flatness = flatness;
    
    // Вычисляем центр кривой для transform
    const center = this.computeCenter();
    this.transform.x = center.x;
    this.transform.y = center.y;
    
    // Сдвигаем точки в локальные координаты относительно центра
    this.p0 = { x: p0.x - center.x, y: p0.y - center.y };
    this.p1 = { x: p1.x - center.x, y: p1.y - center.y };
    this.p2 = { x: p2.x - center.x, y: p2.y - center.y };
  }

  // Вычисляет приблизительный центр кривой
  private computeCenter(): Point2D {
    const points = [this.p0, this.p1, this.p2];
    let sumX = 0, sumY = 0;
    
    // Берём несколько точек на кривой для вычисления центра
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const pt = quadraticBezierPoint(this.p0, this.p1, this.p2, t);
      sumX += pt.x;
      sumY += pt.y;
    }
    
    return { x: sumX / 11, y: sumY / 11 };
  }

  // Вычисляет точку на кривой по параметру t
  evalLocal(t: number): Point2D {
    return quadraticBezierPoint(this.p0, this.p1, this.p2, t);
  }

  // Получает все контрольные точки
  getControlPoints(): Point2D[] {
    return [this.p0, this.p1, this.p2];
  }

  // Устанавливает контрольную точку по индексу
  setControlPoint(index: number, pt: Point2D): void {
    switch (index) {
      case 0: this.p0 = pt; break;
      case 1: this.p1 = pt; break;
      case 2: this.p2 = pt; break;
    }
  }

  // Аппроксимирует кривую ломаной в экранных координатах
  flattenDevicePoints(dpr: number): Point2D[] {
    const localPoints = flattenQuadraticBezier(this.p0, this.p1, this.p2, this.flatness);
    
    // Переводим в экранные координаты
    return localPoints.map(pt => this.transformPointToDevice(pt.x, pt.y));
  }

  // Отрисовка
  drawRaster(r: RasterRenderer): void {
    const points = this.flattenDevicePoints(r.dpr);
    
    if (this.strokeWidth > 0 && this.strokeOpacity > 0) {
      const strokeColor = hexToRGBA(this.strokeStyle, Math.floor(this.strokeOpacity * 255));
      r.strokePolygon(points, strokeColor, this.strokeWidth);
    }
    
    // Опционально: рисуем контрольные точки (для отладки)
    // this.drawControlPoints(r);
  }

  // Проверка попадания
  hitTest(px: number, py: number): boolean {
    const points = this.flattenDevicePoints(1); // DPR уже учтён в flattenDevicePoints
    const dist = distancePointToPolyline({ x: px, y: py }, points);
    
    // Порог попадания: толщина линии + небольшой допуск
    const tolerance = Math.max(this.strokeWidth / 2, 5);
    return dist <= tolerance;
  }

  // Границы в экранных координатах
  getBounds(): Bounds {
    const points = this.flattenDevicePoints(1);
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const pt of points) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }
    
    return { minX, minY, maxX, maxY };
  }

  // Локальные границы
  getLocalBounds(): Bounds {
    const points = flattenQuadraticBezier(this.p0, this.p1, this.p2, this.flatness);
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const pt of points) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }
    
    return { minX, minY, maxX, maxY };
  }

  // Клонирование
  clone(): QuadraticBezier {
    // Восстанавливаем глобальные координаты для конструктора
    const p0 = this.transformPointToDevice(this.p0.x, this.p0.y);
    const p1 = this.transformPointToDevice(this.p1.x, this.p1.y);
    const p2 = this.transformPointToDevice(this.p2.x, this.p2.y);
    
    const cloned = new QuadraticBezier(this.id, p0, p1, p2, this.flatness);
    cloned.transform = { ...this.transform };
    cloned.fillStyle = this.fillStyle;
    cloned.fillOpacity = this.fillOpacity;
    cloned.strokeStyle = this.strokeStyle;
    cloned.strokeWidth = this.strokeWidth;
    cloned.strokeOpacity = this.strokeOpacity;
    return cloned;
  }

  // Сериализация
  toJSON(): object {
    return {
      type: 'QuadraticBezier',
      id: this.id,
      p0: this.p0,
      p1: this.p1,
      p2: this.p2,
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