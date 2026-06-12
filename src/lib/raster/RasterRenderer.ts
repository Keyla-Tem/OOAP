// src/lib/raster/RasterRenderer.ts

export type RGBA = { r: number; g: number; b: number; a: number };
export type LineAlg = 'bresenham' | 'wu';

/* ===================================================================
   УТИЛИТЫ
   =================================================================== */

// Ограничение значения байта диапазоном [0, 255]
export function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

// Парсинг HEX-строки (например, "#FF0000" или "#F00") в объект RGBA
export function hexToRGBA(hex: string, alpha = 255): RGBA {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const num = parseInt(h, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
    a: alpha
  };
}

/* ===================================================================
   КЛАСС РАСТЕРИЗАТОРА
   =================================================================== */

export class RasterRenderer {
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData | null = null;
  private buf!: Uint8ClampedArray;
  
  width = 0;  // физические пиксели (ширина буфера)
  height = 0; // физические пиксели (высота буфера)
  dpr = 1;    // коэффициент плотности пикселей (Device Pixel Ratio)
  
  private canvas: HTMLCanvasElement;
  private _onWindowResize: () => void;
  private lineAlg: LineAlg = 'bresenham';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) { throw new Error('No 2D context'); }
    this.ctx = ctx;
    
    this._onWindowResize = () => this.resize();
    window.addEventListener('resize', this._onWindowResize);
    this.resize();
  }

  dispose() {
    window.removeEventListener('resize', this._onWindowResize);
  }

  setLineAlgorithm(a: LineAlg) { this.lineAlg = a; }
  getLineAlgorithm(): LineAlg { return this.lineAlg; }

  // Управляющий метод рисования линий (выбирает алгоритм)
  drawLine(x0: number, y0: number, x1: number, y1: number, color: RGBA) {
    if (this.lineAlg === 'wu') {
      this.drawLineWu(x0, y0, x1, y1, color);
    } else {
      this.drawLineBresenham(x0, y0, x1, y1, color);
    }
  }

  /* ===================================================================
     РЕАЛИЗАЦИЯ МЕТОДОВ
     =================================================================== */

  // Вычисление 1D индекса в массиве buf по 2D координатам (x, y)
  // Формула: I = (y * W + x) * 4 (так как RGBA = 4 байта)
  private idx(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return -1;
    return (y * this.width + x) * 4;
  }

  // Прямая установка одного пикселя (без смешивания)
  setPixel(x: number, y: number, color: RGBA) {
    const i = this.idx(x, y);
    if (i === -1) return;
    this.buf[i]     = color.r;
    this.buf[i + 1] = color.g;
    this.buf[i + 2] = color.b;
    this.buf[i + 3] = color.a;
  }

  // Альфа-блендинг (композиция Source Over по Портеру-Даффу)
  // alphaFactor используется алгоритмом Ву для сглаживания
  private blendPixel(x: number, y: number, color: RGBA, alphaFactor = 1) {
    const i = this.idx(x, y);
    if (i === -1) return;

    // Нормализация альфы источника в диапазон [0, 1]
    const srcA = (color.a * alphaFactor) / 255;
    if (srcA === 0) return; // Полностью прозрачный пиксель, не рисуем

    // Получение альфы уже нарисованного пикселя (назначения)
    const dstA = this.buf[i + 3] / 255;

    // Результирующая альфа: αout = αsrc + αdst * (1 - αsrc)
    const outA = srcA + dstA * (1 - srcA);
    if (outA === 0) return;

    // Вычисляем RGB по формуле: Cout = (Csrc*αsrc + Cdst*αdst*(1-αsrc)) / αout
    this.buf[i]     = clampByte((color.r * srcA + this.buf[i]     * dstA * (1 - srcA)) / outA);
    this.buf[i + 1] = clampByte((color.g * srcA + this.buf[i + 1] * dstA * (1 - srcA)) / outA);
    this.buf[i + 2] = clampByte((color.b * srcA + this.buf[i + 2] * dstA * (1 - srcA)) / outA);
    this.buf[i + 3] = clampByte(outA * 255);
  }

  // Жизненный цикл кадра: синхронизация размеров с учётом DPR
  resize() {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    const w = Math.floor(rect.width * this.dpr);
    const h = Math.floor(rect.height * this.dpr);

    // ИСПРАВЛЕНИЕ БАГА #1: Проверяем размеры ДО присваивания!
    if (this.width === w && this.height === h) return;

    this.width = w;
    this.height = h;

    // Задаём физический размер canvas (буфера)
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Задаём CSS-размер (чтобы элемент не растягивался на весь экран)
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    // Пересоздаем буфер (ImageData) под новый размер
    this.imageData = this.ctx.createImageData(this.width, this.height);
    this.buf = this.imageData.data;
  }

  // Очистка буфера (заполнение нулями = прозрачный чёрный)
  beginFrame(clear = true) {
    if (clear && this.buf) {
      this.buf.fill(0);
    }
  }

  // Вывод буфера на экран (копирование из CPU в GPU)
  commit() {
    if (this.imageData && this.ctx) {
      this.ctx.putImageData(this.imageData, 0, 0);
    }
  }

  // Алгоритм Брезенхема (Целочисленная отрисовка линии)
  drawLineBresenham(x0: number, y0: number, x1: number, y1: number, color: RGBA) {
    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;

    while (true) {
      this.setPixel(Math.round(x0), Math.round(y0), color);
      if (x0 === x1 && y0 === y1) break;
      
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // Алгоритм Сяолиня Ву (Сглаживание линии / Антиалиасинг)
  drawLineWu(x0: number, y0: number, x1: number, y1: number, color: RGBA) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steep = Math.abs(dy) > Math.abs(dx);

    // Если линия крутая, меняем оси местами
    let tx = steep ? y0 : x0;
    let ty = steep ? x0 : y0;
    let tx1 = steep ? y1 : x1;
    let ty1 = steep ? x1 : y1;

    // Гарантируем, что рисуем слева направо
    if (tx > tx1) {
      [tx, tx1] = [tx1, tx];
      [ty, ty1] = [ty1, ty];
    }

    const grad = tx1 - tx === 0 ? 0 : (ty1 - ty) / (tx1 - tx);
    let intery = ty;

    // ИСПРАВЛЕНИЕ БАГА #2: Функция plot теперь правильно меняет координаты обратно
    const plot = (x: number, y: number, alpha: number) => {
      if (steep) {
        this.blendPixel(y, x, color, alpha); // Меняем y и x местами!
      } else {
        this.blendPixel(x, y, color, alpha);
      }
    };

    // Обработка начальной точки (с учётом субпиксельной точности)
    const xGap0 = 1 - (tx - Math.floor(tx));
    const px0 = Math.floor(tx);
    const px1 = Math.floor(tx1);
    const py0 = Math.floor(intery);

    plot(px0, py0, (1 - (intery - py0)) * xGap0);
    plot(px0, py0 + 1, (intery - py0) * xGap0);

    // Основной цикл отрисовки промежуточных пикселей
    for (let x = px0 + 1; x < px1; x++) {
      intery += grad;
      const ipart = Math.floor(intery);
      const fpart = intery - ipart;
      
      plot(x, ipart, 1 - fpart);
      plot(x, ipart + 1, fpart);
    }

    // Обработка конечной точки
    const xGap1 = 1 - (tx1 - Math.floor(tx1));
    plot(px1, Math.floor(intery), (1 - (intery - Math.floor(intery))) * xGap1);
    plot(px1, Math.floor(intery) + 1, (intery - Math.floor(intery)) * xGap1);
  }

  // Отрисовка горизонтальной линии (используется для заливки фигур)
  private drawHSpan(y: number, x0: number, x1: number, color: RGBA) {
    const startY = Math.round(y);
    const startX = Math.round(Math.min(x0, x1));
    const endX = Math.round(Math.max(x0, x1));

    if (startY < 0 || startY >= this.height) return;

    // ИСПРАВЛЕНИЕ БАГА #3: Поддержка прозрачности при заливке!
    if (color.a === 255) {
      // Если цвет непрозрачный, используем быструю прямую запись
      for (let x = startX; x <= endX; x++) {
        this.setPixel(x, startY, color);
      }
    } else {
      // Иначе используем альфа-блендинг для корректного смешивания цветов
      for (let x = startX; x <= endX; x++) {
        this.blendPixel(x, startY, color);
      }
    }
  }

  // Заливка окружности (через уравнение окружности и горизонтальные линии)
  fillCircle(cx: number, cy: number, radius: number, color: RGBA) {
    const rSq = radius * radius;
    for (let y = -Math.ceil(radius); y <= Math.ceil(radius); y++) {
      const dy = cy + y;
      const dx = Math.sqrt(rSq - y * y);
      this.drawHSpan(dy, cx - dx, cx + dx, color);
    }
  }

  // Заливка многоугольника (алгоритм сканирующей строки)
  fillPolygon(points: { x: number; y: number }[], color: RGBA) {
    if (points.length < 3) return;

    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    // Сканирование каждой строки в пределах ограничивающего прямоугольника
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const intersections: number[] = [];

      // Ищем пересечения сканирующей строки с рёбрами многоугольника
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        
        // Проверяем, пересекает ли ребро текущую строку y
        if ((p1.y > y) !== (p2.y > y)) {
          const xIntersect = p1.x + (y - p1.y) / (p2.y - p1.y) * (p2.x - p1.x);
          intersections.push(xIntersect);
        }
      }

      intersections.sort((a, b) => a - b);

      // Закрашиваем отрезки между парами пересечений (правило чётности)
      for (let i = 0; i < intersections.length; i += 2) {
        if (i + 1 < intersections.length) {
          this.drawHSpan(y, intersections[i], intersections[i + 1], color);
        }
      }
    }
  }

  // Отрисовка толстого отрезка (прямоугольник + круглые шапки)
  strokeLine(x0: number, y0: number, x1: number, y1: number, color: RGBA, width = 1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const half = width / 2;
    // Вычисляем нормаль (перпендикуляр) к линии
    const nx = (-dy / len) * half;
    const ny = (dx / len) * half;

    // Формируем 4 вершины прямоугольника (тела линии)
    const poly = [
      { x: x0 + nx, y: y0 + ny },
      { x: x0 - nx, y: y0 - ny },
      { x: x1 - nx, y: y1 - ny },
      { x: x1 + nx, y: y1 + ny }
    ];

    // Рисуем тело линии как многоугольник
    this.fillPolygon(poly, color);
    
    // Рисуем круглые шапки (caps) на концах для сглаживания углов
    this.fillCircle(x0, y0, half, color);
    this.fillCircle(x1, y1, half, color);
  }

  // Отрисовка контура фигуры (замкнутой или разомкнутой цепи отрезков)
  strokePolygon(points: { x: number; y: number }[], color: RGBA, width = 1) {
    if (points.length < 2) return;

    // Рисуем каждый сегмент как толстую линию
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length]; // Замыкание контура через %
      this.strokeLine(a.x, a.y, b.x, b.y, color, width);
    }
    
    // ИСПРАВЛЕНИЕ БАГА #4: Убрали дублирование кругов!
    // Метод strokeLine УЖЕ рисует круги в концах каждого отрезка,
    // поэтому здесь их рисовать НЕ НУЖДА, иначе в вершинах будут артефакты.
  }
}