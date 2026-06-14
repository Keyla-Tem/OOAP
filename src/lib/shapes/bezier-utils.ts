// src/lib/shapes/bezier-utils.ts
import { Point2D } from '../math/mat3';

/*
 * Вычисляет точку на квадратичной кривой Безье
 * @param p0 - начальная точка
 * @param p1 - управляющая точка
 * @param p2 - конечная точка
 * @param t - параметр от 0 до 1
 */
export function quadraticBezierPoint(p0: Point2D, p1: Point2D, p2: Point2D, t: number): Point2D {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  
  return {
    x: mt2 * p0.x + 2 * mt * t * p1.x + t2 * p2.x,
    y: mt2 * p0.y + 2 * mt * t * p1.y + t2 * p2.y
  };
}

/*
 * Вычисляет точку на кубической кривой Безье
 * @param p0 - начальная точка
 * @param p1 - первая управляющая точка
 * @param p2 - вторая управляющая точка
 * @param p3 - конечная точка
 * @param t - параметр от 0 до 1
 */
export function cubicBezierPoint(p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D, t: number): Point2D {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
  };
}

/*
 * Аппроксимирует квадратичную кривую набором точек
 * @param p0 - начальная точка
 * @param p1 - управляющая точка
 * @param p2 - конечная точка
 * @param flatness - точность (чем меньше, тем больше точек)
 */
export function flattenQuadraticBezier(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  flatness: number = 0.5
): Point2D[] {
  const points: Point2D[] = [];
  const steps = Math.max(10, Math.floor(1 / flatness));
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push(quadraticBezierPoint(p0, p1, p2, t));
  }
  
  return points;
}

/*
 * Аппроксимирует кубическую кривую набором точек
 * @param p0 - начальная точка
 * @param p1 - первая управляющая точка
 * @param p2 - вторая управляющая точка
 * @param p3 - конечная точка
 * @param flatness - точность (чем меньше, тем больше точек)
 */
export function flattenCubicBezier(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  flatness: number = 0.5
): Point2D[] {
  const points: Point2D[] = [];
  const steps = Math.max(10, Math.floor(1 / flatness));
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push(cubicBezierPoint(p0, p1, p2, p3, t));
  }
  
  return points;
}

/**
 * Вычисляет расстояние от точки до отрезка
 */
export function distancePointToSegment(
  pt: Point2D,
  p0: Point2D,
  p1: Point2D
): number {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const lenSq = dx * dx + dy * dy;
  
  if (lenSq === 0) {
    // Отрезок вырожден в точку
    const dpx = pt.x - p0.x;
    const dpy = pt.y - p0.y;
    return Math.sqrt(dpx * dpx + dpy * dpy);
  }
  
  let t = ((pt.x - p0.x) * dx + (pt.y - p0.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  
  const projX = p0.x + t * dx;
  const projY = p0.y + t * dy;
  
  const distX = pt.x - projX;
  const distY = pt.y - projY;
  
  return Math.sqrt(distX * distX + distY * distY);
}

/*
 * Находит минимальное расстояние от точки до ломаной
 */
export function distancePointToPolyline(pt: Point2D, points: Point2D[]): number {
  if (points.length < 2) return Infinity;
  
  let minDist = Infinity;
  
  for (let i = 0; i < points.length - 1; i++) {
    const dist = distancePointToSegment(pt, points[i], points[i + 1]);
    minDist = Math.min(minDist, dist);
  }
  
  return minDist;
}