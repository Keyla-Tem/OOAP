import { Shape } from './Shape';
import { Bounds } from './types';
import { RasterRenderer, hexToRGBA } from '../raster/RasterRenderer';

export class Oval extends Shape {
  rx: number; // радиус по X
  ry: number; // радиус по Y

  constructor(id: string, rx: number, ry: number) {
    super(id);
    this.rx = rx;
    this.ry = ry;
  }

  // Отрисовка эллипса
  drawRaster(r: RasterRenderer): void {
    // Генерируем точки эллипса через параметрическое уравнение
    const points: { x: number; y: number }[] = [];
    const segments = 64; // количество точек для плавности

    for (let i = 0; i <= segments; i++) {
      const theta = (2 * Math.PI * i) / segments;
      const x = this.rx * Math.cos(theta);
      const y = this.ry * Math.sin(theta);
      
      // Переводим в экранные координаты
      const devicePoint = this.transformPointToDevice(x, y);
      points.push(devicePoint);
    }

    // Рисуем заполнение
    if (this.fillOpacity > 0) {
      const fillColor = hexToRGBA(this.fillStyle, Math.floor(this.fillOpacity * 255));
      r.fillPolygon(points, fillColor);
    }

    // Рисуем обводку
    if (this.strokeWidth > 0 && this.strokeOpacity > 0) {
      const strokeColor = hexToRGBA(this.strokeStyle, Math.floor(this.strokeOpacity * 255));
      r.strokePolygon(points, strokeColor, this.strokeWidth);
    }
  }

  // Проверка попадания точки
  hitTest(px: number, py: number): boolean {
    // Переводим точку в локальные координаты
    const localPoint = this.transformPointToLocal(px, py);
    if (!localPoint) return false;

    // Проверяем уравнение эллипса: (x/rx)² + (y/ry)² <= 1
    const normalizedX = localPoint.x / this.rx;
    const normalizedY = localPoint.y / this.ry;
    
    return (normalizedX * normalizedX + normalizedY * normalizedY) <= 1;
  }

  // Границы в экранных координатах
  getBounds(): Bounds {
    // Получаем 4 экстремальные точки эллипса
    const extremePoints = [
      this.transformPointToDevice(this.rx, 0),   // правая
      this.transformPointToDevice(-this.rx, 0),  // левая
      this.transformPointToDevice(0, this.ry),   // нижняя
      this.transformPointToDevice(0, -this.ry)   // верхняя
    ];

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const point of extremePoints) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    return { minX, minY, maxX, maxY };
  }

  // Границы в локальных координатах
  getLocalBounds(): Bounds {
    return {
      minX: -this.rx,
      minY: -this.ry,
      maxX: this.rx,
      maxY: this.ry
    };
  }

  // Клонирование
  clone(): Oval {
    const cloned = new Oval(this.id, this.rx, this.ry);
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
      type: 'Oval',
      id: this.id,
      rx: this.rx,
      ry: this.ry,
      transform: this.transform,
      fillStyle: this.fillStyle,
      fillOpacity: this.fillOpacity,
      strokeStyle: this.strokeStyle,
      strokeWidth: this.strokeWidth,
      strokeOpacity: this.strokeOpacity
    };
  }
}