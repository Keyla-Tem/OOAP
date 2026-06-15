import { useState, useCallback, useRef } from 'react';
import { Shape } from '../shapes/Shape';
import { InteractionMode, ResizeHandle } from './InteractionMode';

export interface EditorState {
  shapes: Shape[];
  selectedId: string | null;
  mode: InteractionMode;
  activeHandle: ResizeHandle | null;
  activePointIndex: number | null; // для редактирования точек кривых
}

export interface DragStartInfo {
  mouseX: number;
  mouseY: number;
  shapeStartX: number;
  shapeStartY: number;
  shapeStartRotation: number;
  shapeStartScaleX: number;
  shapeStartScaleY: number;
  shapeStartWidth?: number;
  shapeStartHeight?: number;
}

export function useEditorState() {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<InteractionMode>(InteractionMode.Idle);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  
  // Храним стартовую информацию о drag-операции
  const dragStartRef = useRef<DragStartInfo | null>(null);

  const selectedShape = shapes.find(s => s.id === selectedId) ?? null;

  // === ВЫБОР ОБЪЕКТА ===
  const selectShape = useCallback((id: string | null) => {
    setSelectedId(id);
    setMode(InteractionMode.Idle);
    setActiveHandle(null);
    setActivePointIndex(null);
  }, []);

  // === ДОБАВЛЕНИЕ ФИГУРЫ ===
  const addShape = useCallback((shape: Shape) => {
    setShapes(prev => [...prev, shape]);
    setSelectedId(shape.id);
  }, []);

  // === УДАЛЕНИЕ ФИГУРЫ ===
  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setShapes(prev => prev.filter(s => s.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  // === ИЗМЕНЕНИЕ ФИГУРЫ ===
  const updateShape = useCallback((id: string, updater: (s: Shape) => Shape) => {
    setShapes(prev => prev.map(s => s.id === id ? updater(s) : s));
  }, []);

  // === СЛОИ ===
  const moveLayerUp = useCallback(() => {
    if (!selectedId) return;
    setShapes(prev => {
      const idx = prev.findIndex(s => s.id === selectedId);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, [selectedId]);

  const moveLayerDown = useCallback(() => {
    if (!selectedId) return;
    setShapes(prev => {
      const idx = prev.findIndex(s => s.id === selectedId);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
      return next;
    });
  }, [selectedId]);

  const moveToTop = useCallback(() => {
    if (!selectedId) return;
    setShapes(prev => {
      const idx = prev.findIndex(s => s.id === selectedId);
      if (idx < 0 || idx === prev.length - 1) return prev;
      const shape = prev[idx];
      return [...prev.filter(s => s.id !== selectedId), shape];
    });
  }, [selectedId]);

  const moveToBottom = useCallback(() => {
    if (!selectedId) return;
    setShapes(prev => {
      const idx = prev.findIndex(s => s.id === selectedId);
      if (idx <= 0) return prev;
      const shape = prev[idx];
      return [shape, ...prev.filter(s => s.id !== selectedId)];
    });
  }, [selectedId]);

  return {
    shapes,
    selectedId,
    selectedShape,
    mode,
    activeHandle,
    activePointIndex,
    dragStartRef,
    selectShape,
    addShape,
    deleteSelected,
    updateShape,
    setMode,
    setActiveHandle,
    setActivePointIndex,
    moveLayerUp,
    moveLayerDown,
    moveToTop,
    moveToBottom,
  };
}