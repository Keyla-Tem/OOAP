//import React from "react";
import { NavLink } from "react-router-dom";

export default function NavBar() {
  return (
    <nav className="flex gap-4 p-4 bg-slate-900 border-b border-slate-800">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          isActive ? "text-blue-400 font-bold" : "text-slate-400 hover:text-white"
        }
      >
        Галерея
      </NavLink>
      <NavLink
        to="/editor/new"
        className={({ isActive }) =>
          isActive ? "text-blue-400 font-bold" : "text-slate-400 hover:text-white"
        }
      >
        Создать проект
      </NavLink>
    </nav>
  );
}