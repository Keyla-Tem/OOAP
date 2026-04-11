import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

type Project = {
  id: string;
  name: string;
  date: string;
};

export default function Gallery() {
  const [projects, setProjects] = useState<Project[]>([
    { id: "1", name: "Проект Альфа", date: "2023-10-01" },
    { id: "2", name: "Проект Бета", date: "2023-10-05" },
  ]);

  const addProject = () => {
    const newProject: Project = {
      id: Date.now().toString(),
      name: `Новый проект ${projects.length + 1}`,
      date: new Date().toLocaleDateString(),
    };
    setProjects([...projects, newProject]);
  };

  return (
    <div className="p-8 min-h-screen bg-slate-950 text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Мои Проекты</h1>
        <button
          onClick={addProject}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded transition"
        >
          <Plus size={20} /> Добавить
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {projects.map((project) => (
          <motion.div
            key={project.id}
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-slate-900 border border-slate-800 p-6 rounded-lg shadow-lg"
          >
            <Link to={`/editor/${project.id}`}>
              <h2 className="text-xl font-semibold mb-2">{project.name}</h2>
              <p className="text-slate-400 text-sm">{project.date}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}