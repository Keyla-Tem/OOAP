// Трансформация фигуры
export interface Transform {
  x: number;        // смещение по X
  y: number;        // смещение по Y
  rotation: number; // поворот в радианах
  scaleX: number;   // масштаб по X (1 = исходный размер)
  scaleY: number;   // масштаб по Y
}

// Ограничивающий прямоугольник
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// Вспомогательная функция для создания Bounds
export function createBounds(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): Bounds {
  return { minX, minY, maxX, maxY };
}

// Проверка, содержит ли Bounds точку
export function boundsContains(bounds: Bounds, x: number, y: number): boolean {
  return x >= bounds.minX && x <= bounds.maxX && 
         y >= bounds.minY && y <= bounds.maxY;
}