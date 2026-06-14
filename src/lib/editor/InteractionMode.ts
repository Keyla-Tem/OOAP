export enum InteractionMode {
  Idle = 'idle',              // Ожидание
  Selecting = 'selecting',    // Выделение
  Moving = 'moving',          // Перемещение
  Resizing = 'resizing',      // Изменение размеров
  Rotating = 'rotating',      // Поворот
  EditingPoint = 'editingPoint' // Редактирование контрольной точки
}

// Какая именно ручка захвачена при resize
export type ResizeHandle = 
  | 'nw' | 'n' | 'ne'
  | 'w'  | 'e'
  | 'sw' | 's' | 'se'
  | 'rotate'; // ручка поворота