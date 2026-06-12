import { Mat3, Point2D, mat3 } from '../math/mat3';
import { Transform, Bounds } from './types';
import { RasterRenderer } from '../raster/RasterRenderer';

export abstract class Shape {
  id: string;
  transform: Transform;
  
  // Стили
  fillStyle: string;
  fillOpacity: number;
  strokeStyle: string;
  strokeWidth: number;
  strokeOpacity: number;

  constructor(id: string) {
    this.id = id;
    this.transform = {
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1
    };
    
    // Стили по умолчанию
    this.fillStyle = '#000000';
    this.fillOpacity = 1;
    this.strokeStyle = '#000000';
    this.strokeWidth = 1;
    this.strokeOpacity = 1;
  }

  // ========== МАТРИЧНЫЕ МЕТОДЫ ==========

  // Матрица: локальные → экранные координаты
  getLocalToDeviceMatrix(): Mat3 {
    return mat3.fromTransform(
      this.transform.x,
      this.transform.y,
      this.transform.rotation,
      this.transform.scaleX,
      this.transform.scaleY
    );
  }

  // Матрица: экранные → локальные координаты
  getDeviceToLocalMatrix(): Mat3 | null {
    const localToDevice = this.getLocalToDeviceMatrix();
    return mat3.invert(localToDevice);
  }

  // Перевод точки из локальных в экранные координаты
  transformPointToDevice(px: number, py: number): Point2D {
    const matrix = this.getLocalToDeviceMatrix();
    return mat3.transformPoint(matrix, px, py);
  }

  // Перевод точки из экранных в локальные координаты
  transformPointToLocal(px: number, py: number): Point2D | null {
    const matrix = this.getDeviceToLocalMatrix();
    if (!matrix) return null;
    return mat3.transformPoint(matrix, px, py);
  }

  // ========== ОБЩИЕ МЕТОДЫ ==========

  // Центр фигуры по её границам
  getCenter(): Point2D {
    const bounds = this.getBounds();
    return {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2
    };
  }

  // Изменение размера через экранные границы
  resizeFromDeviceAABB(
    _minX: number, 
    _minY: number, 
    _maxX: number, 
    _maxY: number): void {
    // По умолчанию — заглушка
    // Конкретные фигуры могут переопределить
  }

  // Обёртка для изменения границ
  setBounds(minX: number, minY: number, maxX: number, maxY: number): void {
    this.resizeFromDeviceAABB(minX, minY, maxX, maxY);
  }

  // Клонирование фигуры
  abstract clone(): Shape;

  // ========== АБСТРАКТНЫЕ МЕТОДЫ ==========
  // (должны быть реализованы в наследниках)

  // Отрисовка через растеризатор
  abstract drawRaster(r: RasterRenderer): void;

  // Проверка попадания точки (хит-тест)
  abstract hitTest(px: number, py: number): boolean;

  // Границы в экранных координатах
  abstract getBounds(): Bounds;

  // Границы в локальных координатах
  abstract getLocalBounds(): Bounds;

  // Сериализация в JSON
  abstract toJSON(): object;
}