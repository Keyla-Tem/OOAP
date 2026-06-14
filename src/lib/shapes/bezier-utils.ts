// src/lib/shapes/bezier-utils.ts
import { Point2D } from '../math/mat3';

// Квадратичная кривая Безье: точка по параметру t
export function quadraticBezierPoint(p0: Point2D, p1: Point2D, p2: Point2D, t: number): Point2D {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
  };
}

// Кубическая кривая Безье: точка по параметру t
export function cubicBezierPoint(p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D, t: number): Point2D {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y
  };
}

// Аппроксимация квадратичной кривой ломаной
export function flattenQuadraticBezier(p0: Point2D, p1: Point2D, p2: Point2D, flatness: number): Point2D[] {
  const points: Point2D[] = [];
  const steps = Math.max(2, Math.ceil(1 / flatness));
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push(quadraticBezierPoint(p0, p1, p2, t));
  }
  return points;
}

// Аппроксимация кубической кривой ломаной
export function flattenCubicBezier(p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D, flatness: number): Point2D[] {
  const points: Point2D[] = [];
  const steps = Math.max(2, Math.ceil(1 / flatness));
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push(cubicBezierPoint(p0, p1, p2, p3, t));
  }
  return points;
}

// Расстояние от точки до полилинии
export function distancePointToPolyline(point: Point2D, polyline: Point2D[]): number {
  if (polyline.length < 2) return Infinity;
  
  let minDist = Infinity;
  
  for (let i = 0; i < polyline.length - 1; i++) {
    const dist = distancePointToSegment(point, polyline[i], polyline[i + 1]);
    minDist = Math.min(minDist, dist);
  }
  
  return minDist;
}

// Расстояние от точки до отрезка
function distancePointToSegment(point: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  
  if (lenSq === 0) {
    // Отрезок вырожден в точку
    return Math.hypot(point.x - a.x, point.y - a.y);
  }
  
  // Проекция точки на прямую
  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  
  return Math.hypot(point.x - projX, point.y - projY);
}