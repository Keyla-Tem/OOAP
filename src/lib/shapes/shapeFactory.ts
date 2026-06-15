// src/lib/shapes/shapeFactory.ts
import { Shape } from './Shape';
import { Rect } from './Rect';
import { Line } from './Line';
import { Oval } from './Oval';
import { Triangle } from './Triangle';
import { QuadraticBezier } from './QuadraticBezier';
import { CubicBezier } from './CubicBezier';
import { PathBezier, PathMode } from './PathBezier';
import { Point2D } from '../math/mat3';

export function shapeFromJSON(json: any): Shape {
  // Общие свойства для всех фигур
  const base = {
    transform: { ...json.transform },
    fillStyle: json.fillStyle,
    fillOpacity: json.fillOpacity,
    strokeStyle: json.strokeStyle,
    strokeWidth: json.strokeWidth,
    strokeOpacity: json.strokeOpacity
  };

  switch (json.type) {
    case 'Rect': {
      const rect = new Rect(json.id, json.width, json.height);
      Object.assign(rect, base);
      return rect;
    }
    
    case 'Line': {
      const line = new Line(json.id, json.x1, json.y1, json.x2, json.y2);
      Object.assign(line, base);
      return line;
    }
    
    case 'Oval': {
      const oval = new Oval(json.id, json.rx, json.ry);
      Object.assign(oval, base);
      return oval;
    }
    
    case 'Triangle': {
      // Восстанавливаем глобальные координаты из локальных + transform
      const points = (json.points as Point2D[]).map((p: Point2D) => {
        // Для простоты: считаем, что точки сохранены в глобальных координатах
        // Если у вас локальные — нужно применить transform обратно
        return { ...p };
      });
      const triangle = new Triangle(json.id, points[0], points[1], points[2]);
      Object.assign(triangle, base);
      triangle.transform = { ...json.transform };
      return triangle;
    }
    
    case 'QuadraticBezier': {
      const curve = new QuadraticBezier(
        json.id,
        json.p0, json.p1, json.p2,
        json.flatness ?? 0.5
      );
      Object.assign(curve, base);
      curve.transform = { ...json.transform };
      return curve;
    }
    
    case 'CubicBezier': {
      const curve = new CubicBezier(
        json.id,
        json.p0, json.p1, json.p2, json.p3,
        json.flatness ?? 0.5
      );
      Object.assign(curve, base);
      curve.transform = { ...json.transform };
      return curve;
    }
    
    case 'PathBezier': {
      const path = new PathBezier(
        json.id,
        json.anchors || [],
        json.mode as PathMode ?? 'polyline',
        json.closed ?? false,
        json.flatness ?? 0.5
      );
      Object.assign(path, base);
      path.transform = { ...json.transform };
      return path;
    }
    
    default:
      console.warn(`Unknown shape type: ${json.type}`);
      // Возвращаем пустой Rect как заглушку
      const fallback = new Rect(json.id || 'unknown', 50, 50);
      Object.assign(fallback, base);
      return fallback;
  }
}