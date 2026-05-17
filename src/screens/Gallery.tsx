import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

type Project = {
  id: string;
  name: string;
  date: string;
};

export default function Gallery() {
  const [projects, setProjects] = useState<Project[]>([]);

  const addProject = () => {
    const newProject: Project = {
      id: Date.now().toString(),
      name: `Проект ${projects.length + 1}`,
      date: new Date().toLocaleDateString(),
    };
    setProjects([...projects, newProject]);
  };

  return (
    <div className="p-8 min-h-screen bg-slate-950 text-white">
      <h1 className="text-3xl font-bold mb-8">Галерея проектов</h1>

      <button
        onClick={addProject}
        className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded mb-8"
      >
        Создать проект
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {projects.map((project) => (
          <motion.div
            key={project.id}
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-slate-900 p-6 rounded-lg border border-slate-800"
          >
            <Link to={`/editor/${project.id}`}>
              <h2 className="text-xl font-semibold">{project.name}</h2>
              <p className="text-slate-400 text-sm">{project.date}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}