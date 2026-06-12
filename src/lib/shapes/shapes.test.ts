import { test, expect } from 'vitest';
import { Rect } from './Rect';
import { Line } from './Line';
import { Oval } from './Oval';

// Вспомогательная функция для создания тестовых фигур
function createTestRect(): Rect {
  const rect = new Rect('test-rect', 100, 50);
  rect.transform.x = 200;
  rect.transform.y = 150;
  return rect;
}

function createTestLine(): Line {
  const line = new Line('test-line', 0, 0, 100, 0);
  line.transform.x = 200;
  line.transform.y = 150;
  return line;
}

function createTestOval(): Oval {
  const oval = new Oval('test-oval', 60, 30);
  oval.transform.x = 200;
  oval.transform.y = 150;
  return oval;
}

// ========== ТЕСТЫ ДЛЯ RECT ==========

test('Rect: hitTest - точка внутри прямоугольника', () => {
  const rect = createTestRect();
  
  // Точка в центре прямоугольника (в экранных координатах)
  expect(rect.hitTest(200, 150)).toBe(true);
});

test('Rect: hitTest - точка вне прямоугольника', () => {
  const rect = createTestRect();
  
  // Точка далеко от прямоугольника
  expect(rect.hitTest(0, 0)).toBe(false);
  expect(rect.hitTest(500, 500)).toBe(false);
});

test('Rect: getBounds - корректные границы', () => {
  const rect = createTestRect();
  const bounds = rect.getBounds();
  
  expect(bounds.minX).toBeLessThan(bounds.maxX);
  expect(bounds.minY).toBeLessThan(bounds.maxY);
});

test('Rect: clone - создаёт копию', () => {
  const rect = createTestRect();
  const cloned = rect.clone();
  
  expect(cloned.id).toBe(rect.id);
  expect(cloned.width).toBe(rect.width);
  expect(cloned.height).toBe(rect.height);
  expect(cloned.transform.x).toBe(rect.transform.x);
});

// ========== ТЕСТЫ ДЛЯ LINE ==========

test('Line: hitTest - точка на линии', () => {
  const line = createTestLine();
  
  // Точка на линии (с учётом толщины)
  expect(line.hitTest(250, 150)).toBe(true);
});

test('Line: hitTest - точка далеко от линии', () => {
  const line = createTestLine();
  
  expect(line.hitTest(200, 100)).toBe(false);
});

test('Line: getBounds - корректные границы', () => {
  const line = createTestLine();
  const bounds = line.getBounds();
  
  expect(bounds.minX).toBeLessThanOrEqual(bounds.maxX);
  expect(bounds.minY).toBeLessThanOrEqual(bounds.maxY);
});

// ========== ТЕСТЫ ДЛЯ OVAL ==========

test('Oval: hitTest - точка внутри эллипса', () => {
  const oval = createTestOval();
  
  // Точка в центре
  expect(oval.hitTest(200, 150)).toBe(true);
  
  // Точка внутри эллипса
  expect(oval.hitTest(230, 150)).toBe(true);
});

test('Oval: hitTest - точка вне эллипса', () => {
  const oval = createTestOval();
  
  // Точка далеко
  expect(oval.hitTest(500, 500)).toBe(false);
  
  // Точка за пределами радиуса
  expect(oval.hitTest(300, 150)).toBe(false);
});

test('Oval: getBounds - корректные границы', () => {
  const oval = createTestOval();
  const bounds = oval.getBounds();
  
  expect(bounds.minX).toBeLessThan(bounds.maxX);
  expect(bounds.minY).toBeLessThan(bounds.maxY);
});

// ========== ТЕСТЫ TRANSFORM ==========

test('Shape: transformPointToDevice/Local - round-trip', () => {
  const rect = createTestRect();
  
  const localX = 10;
  const localY = 20;
  
  // Локальные → Device
  const device = rect.transformPointToDevice(localX, localY);
  
  // Device → Локальные
  const backToLocal = rect.transformPointToLocal(device.x, device.y);
  
  expect(backToLocal).not.toBeNull();
  if (backToLocal) {
    expect(backToLocal.x).toBeCloseTo(localX, 5);
    expect(backToLocal.y).toBeCloseTo(localY, 5);
  }
});

test('Shape: getCenter - корректный центр', () => {
  const rect = createTestRect();
  const center = rect.getCenter();
  
  const bounds = rect.getBounds();
  const expectedX = (bounds.minX + bounds.maxX) / 2;
  const expectedY = (bounds.minY + bounds.maxY) / 2;
  
  expect(center.x).toBeCloseTo(expectedX);
  expect(center.y).toBeCloseTo(expectedY);
});