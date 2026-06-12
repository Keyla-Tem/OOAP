import { Shape } from './Shape';
import { Bounds } from './types';
import { RasterRenderer, hexToRGBA } from '../raster/RasterRenderer';

export class Rect extends Shape {
  width: number;
  height: number;

  constructor(id: string, width: number, height: number) {
    super(id);
    this.width = width;
    this.height = height;
  }

 // Изменение размера фигуры по новым экранным границам
  resizeFromDeviceAABB(minX: number, minY: number, maxX: number, maxY: number): void {
    // Переводим экранные границы в локальные координаты
    const localMin = this.transformPointToLocal(minX, minY);
    const localMax = this.transformPointToLocal(maxX, maxY);
    
    if (localMin && localMax) {
      // Вычисляем новые ширину и высоту
      this.width = Math.abs(localMax.x - localMin.x);
      this.height = Math.abs(localMax.y - localMin.y);
      
      // Обновляем центр фигуры
      this.transform.x = (minX + maxX) / 2;
      this.transform.y = (minY + maxY) / 2;
    }
  }



  // Отрисовка прямоугольника
  drawRaster(r: RasterRenderer): void {
    // Вычисляем 4 угла в локальных координатах
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    
    const localPoints = [
      { x: -halfW, y: -halfH }, // верхний левый
      { x: halfW, y: -halfH },  // верхний правый
      { x: halfW, y: halfH },   // нижний правый
      { x: -halfW, y: halfH }   // нижний левый
    ];

    // Переводим в экранные координаты
    const devicePoints = localPoints.map(p => 
      this.transformPointToDevice(p.x, p.y)
    );

    // Рисуем заполнение
    if (this.fillOpacity > 0) {
      const fillColor = hexToRGBA(this.fillStyle, Math.floor(this.fillOpacity * 255));
      r.fillPolygon(devicePoints, fillColor);
    }

    // Рисуем обводку
    if (this.strokeWidth > 0 && this.strokeOpacity > 0) {
      const strokeColor = hexToRGBA(this.strokeStyle, Math.floor(this.strokeOpacity * 255));
      r.strokePolygon(devicePoints, strokeColor, this.strokeWidth);
    }
  }

  // Проверка попадания точки
  hitTest(px: number, py: number): boolean {
    // Переводим точку из экранных в локальные координаты
    const localPoint = this.transformPointToLocal(px, py);
    if (!localPoint) return false;

    // Проверяем, попадает ли точка в прямоугольник [-w/2, w/2] × [-h/2, h/2]
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    return localPoint.x >= -halfW && localPoint.x <= halfW &&
           localPoint.y >= -halfH && localPoint.y <= halfH;
  }

  // Границы в экранных координатах
  getBounds(): Bounds {
    // Получаем 4 угла в экранных координатах
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    
    const corners = [
      this.transformPointToDevice(-halfW, -halfH),
      this.transformPointToDevice(halfW, -halfH),
      this.transformPointToDevice(halfW, halfH),
      this.transformPointToDevice(-halfW, halfH)
    ];

    // Находим min/max
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const corner of corners) {
      minX = Math.min(minX, corner.x);
      minY = Math.min(minY, corner.y);
      maxX = Math.max(maxX, corner.x);
      maxY = Math.max(maxY, corner.y);
    }

    return { minX, minY, maxX, maxY };
  }

  // Границы в локальных координатах
  getLocalBounds(): Bounds {
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    
    return {
      minX: -halfW,
      minY: -halfH,
      maxX: halfW,
      maxY: halfH
    };
  }

  // Клонирование
  clone(): Rect {
    const cloned = new Rect(this.id, this.width, this.height);
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
      type: 'Rect',
      id: this.id,
      width: this.width,
      height: this.height,
      transform: this.transform,
      fillStyle: this.fillStyle,
      fillOpacity: this.fillOpacity,
      strokeStyle: this.strokeStyle,
      strokeWidth: this.strokeWidth,
      strokeOpacity: this.strokeOpacity
    };
  }
}