import { test, expect } from "vitest";
import { mat3, type Mat3 } from "./mat3";

function expectMatCloseTo(actual: Mat3, expected: Mat3, eps = 1e-9) {
  for (let i = 0; i < 9; i++) {
    expect(actual[i]).toBeCloseTo(expected[i], Math.log10(1 / eps));
  }
}

function expectAffine(m: Mat3) {
  expect(m[6]).toBeCloseTo(0);
  expect(m[7]).toBeCloseTo(0);
  expect(m[8]).toBeCloseTo(1);
}

test("identity: returns correct matrix", () => {
  const I = mat3.identity();
  const expected: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  expectMatCloseTo(I, expected);
  expectAffine(I);
});

test("translate: correct matrix and point transformation", () => {
  const tx = 10, ty = -5;
  const T = mat3.translate(tx, ty);
  const expected: Mat3 = [1, 0, tx, 0, 1, ty, 0, 0, 1];
  expectMatCloseTo(T, expected);
  
  const p = mat3.transformPoint(T, 3, 4);
  expect(p.x).toBeCloseTo(3 + tx);
  expect(p.y).toBeCloseTo(4 + ty);
});

test("scale: correct matrix and point transformation", () => {
  const sx = 2, sy = 0.5;
  const S = mat3.scale(sx, sy);
  const expected: Mat3 = [sx, 0, 0, 0, sy, 0, 0, 0, 1];
  expectMatCloseTo(S, expected);
  
  const p = mat3.transformPoint(S, 4, 6);
  expect(p.x).toBeCloseTo(4 * sx);
  expect(p.y).toBeCloseTo(6 * sy);
});

test("rotate: 0 and 90 degrees", () => {
  const r0 = mat3.rotate(0);
  expectMatCloseTo(r0, mat3.identity());
  
  const angle = Math.PI / 2;
  const r90 = mat3.rotate(angle);
  const p = mat3.transformPoint(r90, 1, 0);
  expect(p.x).toBeCloseTo(0);
  expect(p.y).toBeCloseTo(1);
});

test("fromTransform: scale → rotate → translate", () => {
  const tx = 100, ty = 50, angle = Math.PI / 4, sx = 2, sy = 1;
  const M = mat3.fromTransform(tx, ty, angle, sx, sy);
  
  const local = { x: 1, y: 0 };
  const scaled = { x: local.x * sx, y: local.y * sy };
  const rotated = {
    x: scaled.x * Math.cos(angle) - scaled.y * Math.sin(angle),
    y: scaled.x * Math.sin(angle) + scaled.y * Math.cos(angle)
  };
  const translated = { x: rotated.x + tx, y: rotated.y + ty };
  
  const pFromM = mat3.transformPoint(M, local.x, local.y);
  expect(pFromM.x).toBeCloseTo(translated.x);
  expect(pFromM.y).toBeCloseTo(translated.y);
  expectAffine(M);
});

test("multiply: identity property", () => {
  const A = mat3.translate(5, 7);
  const I = mat3.identity();
  expectMatCloseTo(mat3.multiply(A, I), A);
  expectMatCloseTo(mat3.multiply(I, A), A);
});

test("invert: round-trip transformation", () => {
  const M = mat3.fromTransform(10, 20, 0.5, 2, 3);
  const inv = mat3.invert(M);
  expect(inv).not.toBeNull();
  
  if (inv) {
    const pts = [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: -3.3, y: 4.4 }];
    for (const p of pts) {
      const pDev = mat3.transformPoint(M, p.x, p.y);
      const pBack = mat3.transformPoint(inv, pDev.x, pDev.y);
      expect(pBack.x).toBeCloseTo(p.x);
      expect(pBack.y).toBeCloseTo(p.y);
    }
  }
});

test("invert: degenerate matrix returns null", () => {
  expect(mat3.invert(mat3.scale(0, 1))).toBeNull();
  expect(mat3.invert(mat3.scale(1, 0))).toBeNull();
});