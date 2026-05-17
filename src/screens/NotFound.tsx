import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-slate-400 mb-6">Страница не найдена</p>
      <Link to="/" className="text-blue-400 hover:underline">
        Вернуться в галерею
      </Link>
    </div>
  );
}