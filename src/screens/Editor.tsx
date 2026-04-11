import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Square, Circle, MousePointer } from "lucide-react";

export default function Editor() {
  const { id } = useParams(); // Получаем ID из URL
  const navigate = useNavigate(); // Для навигации

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white">
      {/* 1. ВЕРХНЯЯ ПАНЕЛЬ (HEADER) */}
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900">
        <div className="flex items-center gap-4">
          {/* Кнопка "Назад" */}
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-800 rounded transition"
          >
            <ArrowLeft size={20} />
          </button>
          
          {/* Название проекта */}
          <h1 className="font-bold">
            Редактор {id ? `№${id}` : "(Новый)"}
          </h1>
        </div>

        {/* Кнопка "Сохранить" */}
        <button className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-4 py-1 rounded transition">
          <Save size={18} /> Сохранить
        </button>
      </header>

      {/* ОСНОВНАЯ ЧАСТЬ С ТРЕМЯ ПАНЕЛЯМИ */}
      <div className="flex flex-1 overflow-hidden">
        {/* 2. ЛЕВАЯ ПАНЕЛЬ (ИНСТРУМЕНТЫ) */}
        <aside className="w-16 border-r border-slate-800 flex flex-col items-center py-4 gap-4 bg-slate-900">
          <button className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition">
            <MousePointer size={20} />
          </button>
          <button className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition">
            <Square size={20} />
          </button>
          <button className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition">
            <Circle size={20} />
          </button>
        </aside>

        {/* 3. ЦЕНТРАЛЬНАЯ ЗОНА (ХОЛСТ) */}
        <main className="flex-1 bg-slate-100 relative overflow-auto">
          <div className="w-[800px] h-[600px] bg-white shadow-xl mx-auto mt-10 flex items-center justify-center text-slate-400">
            Холст проекта
          </div>
        </main>

        {/* 4. ПРАВАЯ ПАНЕЛЬ (СВОЙСТВА) */}
        <aside className="w-64 border-l border-slate-800 bg-slate-900 p-4">
          <h3 className="font-bold mb-4 text-slate-400">Свойства</h3>
          <div className="text-sm text-slate-500">
            Выберите объект на холсте
          </div>
        </aside>
      </div>
    </div>
  );
}