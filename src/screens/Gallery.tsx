// src/screens/Gallery.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loadProjectIndex, deleteProject, ProjectMeta } from '../lib/projectStorage';
import { Plus, Trash2, FolderOpen } from 'lucide-react';

export default function Gallery() {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const list = await loadProjectIndex();
      // Сортируем по дате обновления (новые сверху)
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      setProjects(list);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Удалить этот проект?')) return;
    
    try {
      await deleteProject(projectId);
      await loadProjects(); // Обновляем список
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('Не удалось удалить проект');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Галерея проектов</h1>
          <Link 
            to="/editor/new" 
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition"
          >
            <Plus size={18} /> Создать проект
          </Link>
        </div>

        {loading ? (
          <p className="text-slate-400">Загрузка...</p>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
            <p>Нет сохранённых проектов</p>
            <p className="text-sm mt-2">Создайте первый проект, чтобы начать</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <Link
                key={project.id}
                to={`/editor/${project.id}`}
                className="block p-4 bg-slate-900 border border-slate-800 rounded-lg 
                          hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 
                          transition-all group relative"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white group-hover:text-blue-400">
                      {project.name}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Обновлено: {new Date(project.updatedAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(project.id, e)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded 
                              opacity-0 group-hover:opacity-100 transition"
                    title="Удалить проект"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}