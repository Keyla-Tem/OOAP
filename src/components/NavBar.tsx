import { NavLink } from "react-router-dom";

export default function NavBar() {
  return (
    <nav className="flex gap-4 p-4 bg-slate-900 border-b border-slate-800">
      <NavLink to="/"
        end
        className={({ isActive }) =>
          isActive ? "text-blue-400 font-bold" : "text-slate-400 hover:text-white"
        }
      >
        Галерея
      </NavLink>
      
      <NavLink to="/editor/new"
        className={({ isActive }) =>
          `px-4 py-2 rounded border transition ${
            isActive 
              ? "bg-blue-600 border-blue-500 text-white" 
              : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
          }`
        }
      >
        Создать проект
      </NavLink>

      {/* НОВАЯ ССЫЛКА ДЛЯ ТЕСТА ЛР-4 */}
      <NavLink to="/canvas"
        className={({ isActive }) =>
          isActive ? "text-blue-400 font-bold" : "text-slate-400 hover:text-white"
        }
      >
        Canvas Тест (ЛР-4)
      </NavLink>
    </nav>
  );
}