import { RasterRenderer, RGBA } from '../raster/RasterRenderer';
import { Shape } from '../shapes/Shape';

const HANDLE_SIZE = 8; // размер ручки в физических пикселях
const ROTATE_HANDLE_OFFSET = 25; // расстояние ручки поворота от центра

export function drawSelectionOverlay(
  r: RasterRenderer,
  shape: Shape,
  dpr: number
) {
  const bounds = shape.getBounds();
  const color: RGBA = { r: 66, g: 135, b: 245, a: 255 }; // синий
  const width = 1.5 * dpr;

  // 1. Рисуем рамку вокруг объекта
  const rect = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ];
  r.strokePolygon(rect, color, width);

  // 2. Рисуем 8 ручек изменения размера
  const handles = getHandlePositions(bounds);
  for (const h of handles) {
    r.fillCircle(h.x, h.y, HANDLE_SIZE / 2, { r: 255, g: 255, b: 255, a: 255 });
    r.strokePolygon(
      [
        { x: h.x - HANDLE_SIZE / 2, y: h.y - HANDLE_SIZE / 2 },
        { x: h.x + HANDLE_SIZE / 2, y: h.y - HANDLE_SIZE / 2 },
        { x: h.x + HANDLE_SIZE / 2, y: h.y + HANDLE_SIZE / 2 },
        { x: h.x - HANDLE_SIZE / 2, y: h.y + HANDLE_SIZE / 2 },
      ],
      color,
      width
    );
  }

  // 3. Рисуем ручку поворота (кружок сверху по центру)
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = bounds.minY - ROTATE_HANDLE_OFFSET * dpr;
  r.fillCircle(cx, cy, HANDLE_SIZE / 2, { r: 255, g: 100, b: 100, a: 255 });
  // Линия от центра верхней грани до ручки поворота
  r.drawLine(cx, bounds.minY, cx, cy, color);
}

export function getHandlePositions(bounds: {
  minX: number; minY: number; maxX: number; maxY: number;
}) {
  const { minX, minY, maxX, maxY } = bounds;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return [
    { x: minX, y: minY }, // nw
    { x: cx, y: minY },   // n
    { x: maxX, y: minY }, // ne
    { x: minX, y: cy },   // w
    { x: maxX, y: cy },   // e
    { x: minX, y: maxY }, // sw
    { x: cx, y: maxY },   // s
    { x: maxX, y: maxY }, // se
  ];
}

export function hitTestHandles(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  px: number,
  py: number,
  dpr: number
): 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se' | 'rotate' | null {
  const handles = getHandlePositions(bounds);
  const names: Array<'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se'> = 
    ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
  
  const threshold = HANDLE_SIZE * dpr;

  // Проверяем ручку поворота
  const cx = (bounds.minX + bounds.maxX) / 2;
  const rotateY = bounds.minY - ROTATE_HANDLE_OFFSET * dpr;
  const dx = px - cx;
  const dy = py - rotateY;
  if (Math.sqrt(dx * dx + dy * dy) < threshold) {
    return 'rotate';
  }

  // Проверяем ручки изменения размера
  for (let i = 0; i < handles.length; i++) {
    const h = handles[i];
    if (Math.abs(px - h.x) < threshold && Math.abs(py - h.y) < threshold) {
      return names[i];
    }
  }
  return null;
}