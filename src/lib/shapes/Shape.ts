import { Mat3, Point2D, mat3 } from '../math/mat3';
import { Transform, Bounds } from './types';
import { RasterRenderer } from '../raster/RasterRenderer';

export abstract class Shape {
  id: string;
  transform: Transform;
  
  fillStyle: string;
  fillOpacity: number;
  strokeStyle: string;
  strokeWidth: number;
  strokeOpacity: number;

  constructor(id: string) {
    this.id = id;
    this.transform = {
      x: 0, y: 0,
      rotation: 0,
      scaleX: 1, scaleY: 1
    };
    
    this.fillStyle = '#000000';
    this.fillOpacity = 1;
    this.strokeStyle = '#000000';
    this.strokeWidth = 1;
    this.strokeOpacity = 1;
  }

  // ✅ ИСПРАВЛЕНИЕ: получаем DPR для корректной работы на Retina
  private getDpr(): number {
    return typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  }

  // Матрица: локальные → экранные (DEVICE координаты!)
  getLocalToDeviceMatrix(): Mat3 {
    const dpr = this.getDpr();
    return mat3.fromTransform(
      this.transform.x * dpr,   // ✅ CSS → Device
      this.transform.y * dpr,   // ✅ CSS → Device
      this.transform.rotation,
      this.transform.scaleX,
      this.transform.scaleY
    );
  }

  getDeviceToLocalMatrix(): Mat3 | null {
    const localToDevice = this.getLocalToDeviceMatrix();
    return mat3.invert(localToDevice);
  }

  // Перевод: локальные → DEVICE координаты
  transformPointToDevice(px: number, py: number): Point2D {
    const matrix = this.getLocalToDeviceMatrix();
    return mat3.transformPoint(matrix, px, py);
  }

  // Перевод: DEVICE → локальные координаты
  transformPointToLocal(px: number, py: number): Point2D | null {
    const matrix = this.getDeviceToLocalMatrix();
    if (!matrix) return null;
    return mat3.transformPoint(matrix, px, py);
  }

  getCenter(): Point2D {
    const bounds = this.getBounds();
    return {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2
    };
  }

  resizeFromDeviceAABB(_minX: number, _minY: number, _maxX: number, _maxY: number): void {}
  
  setBounds(minX: number, minY: number, maxX: number, maxY: number): void {
    this.resizeFromDeviceAABB(minX, minY, maxX, maxY);
  }

  abstract clone(): Shape;
  abstract drawRaster(r: RasterRenderer): void;
  abstract hitTest(px: number, py: number): boolean;
  abstract getBounds(): Bounds;
  abstract getLocalBounds(): Bounds;
  abstract toJSON(): object;
}