import { useParams, useNavigate } from "react-router-dom";

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white">
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded"
          >
            Назад
          </button>
          <h1 className="text-lg font-semibold">
            Редактор {id ? `№${id}` : "(Новый)"}
          </h1>
        </div>
        <button className="px-4 py-1 bg-green-600 hover:bg-green-500 rounded">
          Сохранить
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ЛЕВАЯ ПАНЕЛЬ - ИНСТРУМЕНТЫ */}
        <aside className="w-16 border-r border-slate-800 bg-slate-900 flex flex-col items-center py-4 gap-4">
          {/* Курсор/Выбор */}
          <button 
            className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition text-xl"
            title="Выбор"
          >
            ↖
          </button>
          
          {/* Квадрат */}
          <button 
            className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition text-xl"
            title="Квадрат"
          >
            □
          </button>
          
          {/* Круг */}
          <button 
            className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition text-xl"
            title="Круг"
          >
            ○
          </button>
        </aside>

        {/* ЦЕНТРАЛЬНАЯ ЗОНА - ХОЛСТ */}
        <main className="flex-1 bg-slate-100 p-8 overflow-auto">
          <div className="w-full h-full bg-white shadow-lg mx-auto">
            {/* Здесь будет холст */}
          </div>
        </main>

        {/* ПРАВАЯ ПАНЕЛЬ - СВОЙСТВА */}
        <aside className="w-64 border-l border-slate-800 bg-slate-900 p-4">
          <h2 className="text-lg font-semibold mb-4">Свойства</h2>
          <p className="text-slate-400 text-sm">
            Выберите объект для редактирования
          </p>
        </aside>
      </div>
    </div>
  );
}