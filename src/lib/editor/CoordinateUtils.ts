import { Shape } from '../shapes/Shape';

/**
 * Получаем координаты мыши относительно canvas
 * с учётом DPR и позиции canvas на странице
 */
export function getCanvasPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  return {
    x: (clientX - rect.left) * dpr,
    y: (clientY - rect.top) * dpr,
  };
}

/**
 * Hit test: ищем верхний объект под курсором.
 * Обходим массив В ОБРАТНОМ порядке (сверху вниз по слоям).
 */
export function hitTestShapes(
  shapes: Shape[],
  px: number,
  py: number
): Shape | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (shapes[i].hitTest(px, py)) {
      return shapes[i];
    }
  }
  return null;
}