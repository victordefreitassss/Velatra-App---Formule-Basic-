import React, { useState } from 'react';
import { AppState, Task } from '../types';
import { db, doc, updateDoc, setDoc, deleteDoc } from '../firebase';
import { Plus, Search, Trash2, Calendar, CheckCircle, Circle, Clock, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  state: AppState;
}

export const TasksPage: React.FC<Props> = ({ state }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', assignedTo: state.user?.id.toString() || '' });

  const filteredTasks = state.tasks.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const handleStatusChange = async (taskId: string, newStatus: 'todo' | 'done') => {
    try {
      await updateDoc(doc(db, "tasks", taskId), { status: newStatus });
    } catch (err) {
      console.error("Error updating task status", err);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.user?.clubId) return;
    
    const id = Date.now().toString();
    const task: Task = {
      id,
      clubId: state.user.clubId,
      title: newTask.title,
      description: newTask.description,
      dueDate: newTask.dueDate || new Date().toISOString().split('T')[0],
      assignedTo: newTask.assignedTo,
      status: 'todo'
    };

    try {
      await setDoc(doc(db, "tasks", id), task);
      setIsAdding(false);
      setNewTask({ title: '', description: '', dueDate: '', assignedTo: state.user.id.toString() });
    } catch (err) {
      console.error("Error adding task", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Supprimer cette tâche ?")) {
      try {
        await deleteDoc(doc(db, "tasks", id));
      } catch (err) {
        console.error("Error deleting task", err);
      }
    }
  };

  const isOverdue = (dateString: string) => {
    return new Date(dateString) < new Date() && new Date(dateString).toDateString() !== new Date().toDateString();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 page-transition">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Tâches & Rappels</h1>
          <p className="text-velatra-textMuted mt-1">Gérez vos relances et actions quotidiennes.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-velatra-textMuted" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-velatra-bgCard border border-velatra-border rounded-xl py-2 pl-10 pr-4 text-white focus:outline-none focus:border-velatra-accent transition-colors"
            />
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-velatra-accent hover:bg-velatra-accentDark text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Tâche</span>
          </button>
        </div>
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-velatra-bgCard border border-velatra-border rounded-xl p-6"
        >
          <h2 className="text-xl font-semibold text-white mb-4">Ajouter une Tâche</h2>
          <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-velatra-textMuted mb-1">Titre</label>
              <input required type="text" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full bg-velatra-bg border border-velatra-border rounded-lg p-2 text-white" placeholder="Ex: Appeler Thomas pour renouvellement" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-velatra-textMuted mb-1">Description</label>
              <textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="w-full bg-velatra-bg border border-velatra-border rounded-lg p-2 text-white h-20" placeholder="Notes supplémentaires..." />
            </div>
            <div>
              <label className="block text-sm text-velatra-textMuted mb-1">Date d'échéance</label>
              <input type="date" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} className="w-full bg-velatra-bg border border-velatra-border rounded-lg p-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-velatra-textMuted mb-1">Assigné à</label>
              <select value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})} className="w-full bg-velatra-bg border border-velatra-border rounded-lg p-2 text-white">
                {state.coaches.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-velatra-textMuted hover:text-white transition-colors">Annuler</button>
              <button type="submit" className="bg-velatra-accent text-white px-6 py-2 rounded-lg font-medium hover:bg-velatra-accentDark transition-colors">Enregistrer</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-velatra-bgCard border border-velatra-border rounded-xl">
            <CheckCircle className="w-12 h-12 text-velatra-textDark mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white">Toutes les tâches sont terminées !</h3>
            <p className="text-velatra-textMuted mt-2">Profitez de votre temps libre ou ajoutez de nouvelles actions.</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const isDone = task.status === 'done';
            const overdue = !isDone && isOverdue(task.dueDate);
            const coach = state.coaches.find(c => c.id.toString() === task.assignedTo);

            return (
              <motion.div 
                key={task.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`bg-velatra-bgCard border rounded-xl p-4 flex items-start gap-4 group transition-colors ${isDone ? 'border-velatra-border opacity-60' : overdue ? 'border-red-500/30 bg-red-500/5' : 'border-velatra-border hover:border-velatra-textMuted'}`}
              >
                <button 
                  onClick={() => handleStatusChange(task.id, isDone ? 'todo' : 'done')}
                  className={`mt-1 flex-shrink-0 transition-colors ${isDone ? 'text-velatra-success' : 'text-velatra-textMuted hover:text-white'}`}
                >
                  {isDone ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-medium ${isDone ? 'text-velatra-textMuted line-through' : 'text-white'}`}>{task.title}</h3>
                  {task.description && <p className="text-sm text-velatra-textMuted mt-1 line-clamp-2">{task.description}</p>}
                  
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs font-medium">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${overdue ? 'bg-red-500/20 text-red-400' : 'bg-velatra-bg text-velatra-textMuted'}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                    {coach && (
                      <div className="flex items-center gap-1.5 text-velatra-textMuted">
                        <User className="w-3.5 h-3.5" />
                        <span>{coach.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => handleDelete(task.id)}
                  className="text-velatra-textMuted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
