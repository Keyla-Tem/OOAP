// src/lib/projectStorage.ts
import { BaseDirectory, mkdir, readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { save as saveDialog, open as openDialog } from '@tauri-apps/plugin-dialog';
import { Shape } from './shapes/Shape';
import { shapeFromJSON } from './shapes/shapeFactory';

export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectData {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  lineAlg: 'bresenham' | 'wu';
  pathMode: 'polyline' | 'bezier' | 'catmull';
  shapes: object[]; // JSON-представления фигур
}

const PROJECTS_DIR = 'VectorEngine/projects';
const INDEX_FILE = `${PROJECTS_DIR}/index.json`;

// Гарантирует создание папки для проектов
export async function ensureProjectsDir(): Promise<void> {
  try {
    await mkdir(PROJECTS_DIR, { baseDir: BaseDirectory.Document, recursive: true });
  } catch (e) {
    // Папка уже существует — это нормально
  }
}

// Сохранение проекта
export async function saveProject(data: ProjectData): Promise<void> {
  await ensureProjectsDir();
  
  const filePath = `${PROJECTS_DIR}/${data.id}.json`;
  
  // Записываем файл проекта
  await writeTextFile(filePath, JSON.stringify(data, null, 2), { 
    baseDir: BaseDirectory.Document 
  });
  
  // Обновляем индекс
  await updateProjectIndex(data);
}

// Загрузка проекта по ID
export async function loadProject(projectId: string): Promise<ProjectData | null> {
  await ensureProjectsDir();
  
  try {
    const filePath = `${PROJECTS_DIR}/${projectId}.json`;
    const content = await readTextFile(filePath, { baseDir: BaseDirectory.Document });
    return JSON.parse(content) as ProjectData;
  } catch (err) {
    console.error(`Failed to load project ${projectId}:`, err);
    return null;
  }
}

// Получение списка всех проектов (для галереи)
export async function loadProjectIndex(): Promise<ProjectMeta[]> {
  await ensureProjectsDir();
  
  try {
    const content = await readTextFile(INDEX_FILE, { baseDir: BaseDirectory.Document });
    return JSON.parse(content) as ProjectMeta[];
  } catch {
    return [];
  }
}

// Удаление проекта
export async function deleteProject(projectId: string): Promise<void> {
  await ensureProjectsDir();
  
  try {
    // Удаляем файл проекта (через диалог или напрямую, если есть права)
    // Для простоты: просто удаляем из индекса
    const index = await loadProjectIndex();
    const updated = index.filter(p => p.id !== projectId);
    await writeTextFile(INDEX_FILE, JSON.stringify(updated, null, 2), {
      baseDir: BaseDirectory.Document
    });
  } catch (err) {
    console.error(`Failed to delete project ${projectId}:`, err);
  }
}

// Вспомогательная функция: обновление индекса проектов
async function updateProjectIndex(project: ProjectData): Promise<void> {
  let index: ProjectMeta[] = [];
  
  try {
    index = await loadProjectIndex();
  } catch {
    // Индекс не существует — создадим новый
  }
  
  // Обновляем или добавляем запись
  const existingIdx = index.findIndex(p => p.id === project.id);
  const meta: ProjectMeta = {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };
  
  if (existingIdx >= 0) {
    index[existingIdx] = meta;
  } else {
    index.push(meta);
  }
  
  await writeTextFile(INDEX_FILE, JSON.stringify(index, null, 2), {
    baseDir: BaseDirectory.Document
  });
}

// === Утилиты для работы с фигурами ===

// Преобразование массива фигур в JSON
export function shapesToJSON(shapes: Shape[]): object[] {
  return shapes.map(shape => shape.toJSON());
}

// Восстановление фигур из JSON
export function shapesFromJSON(jsonShapes: object[]): Shape[] {
  return jsonShapes.map(json => shapeFromJSON(json));
}

// === Диалоговые окна (опционально) ===

// Открыть диалог сохранения (если нужно выбрать путь вручную)
export async function showSaveDialog(defaultName: string): Promise<string | null> {
  const path = await saveDialog({
    title: 'Сохранить проект',
    defaultPath: defaultName,
    filters: [{
      name: 'Vector Engine Project',
      extensions: ['vep']
    }]
  });
  return path;
}

// Открыть диалог загрузки (если нужно выбрать файл вручную)
export async function showOpenDialog(): Promise<string | null> {
  const path = await openDialog({
    title: 'Открыть проект',
    filters: [{
      name: 'Vector Engine Project',
      extensions: ['vep']
    }],
    multiple: false
  });
  return Array.isArray(path) ? path[0] : path;
}