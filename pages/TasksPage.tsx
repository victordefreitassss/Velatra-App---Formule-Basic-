import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AppState, Task } from '../types';
import { db, doc, updateDoc, setDoc, deleteDoc } from '../firebase';
import { Plus, Search, Trash2, Calendar, CheckCircle, Circle, Clock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/UI';

interface Props {
  state: AppState;
}

export const TasksPage: React.FC<Props> = ({ state }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Tous');
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', assignedTo: state.user?.id.toString() || '' });
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(null);

  const filteredTasks = state.tasks.filter(t => {
    if (!t.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    if (filterStatus === 'À faire' && t.status !== 'todo') return false;
    if (filterStatus === 'Terminées' && t.status !== 'done') return false;
    
    return true;
  }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

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
    setConfirmDeleteTaskId(id);
  };

  const confirmDeleteTask = async () => {
    if (!confirmDeleteTaskId) return;
    try {
      await deleteDoc(doc(db, "tasks", confirmDeleteTaskId));
    } catch (err) {
      console.error("Error deleting task", err);
    } finally {
      setConfirmDeleteTaskId(null);
    }
  };

  const isOverdue = (dateString: string) => {
    return new Date(dateString) < new Date() && new Date(dateString).toDateString() !== new Date().toDateString();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 page-transition">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-zinc-900">Tâches & Rappels</h1>
            <p className="text-zinc-500 mt-1">Gérez vos relances et actions quotidiennes.</p>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-velatra-accent hover:bg-velatra-accentDark text-zinc-900 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Tâche</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-900" />
            <input
              type="text"
              placeholder="Rechercher une tâche..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-3 pl-14 pr-4 text-zinc-900 font-bold focus:outline-none focus:border-velatra-accent transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {["Tous", "À faire", "Terminées"].map(f => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${filterStatus === f ? 'bg-velatra-accent text-white' : 'bg-zinc-50 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-velatra-bgCard border border-velatra-border rounded-xl p-6"
        >
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">Ajouter une Tâche</h2>
          <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-zinc-500 mb-1">Titre</label>
              <input required type="text" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full bg-velatra-bg border border-velatra-border rounded-lg p-2 text-zinc-900" placeholder="Ex: Appeler Thomas pour renouvellement" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-zinc-500 mb-1">Description</label>
              <textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="w-full bg-velatra-bg border border-velatra-border rounded-lg p-2 text-zinc-900 h-20" placeholder="Notes supplémentaires..." />
            </div>
            <div>
              <label className="block text-sm text-zinc-500 mb-1">Date d'échéance</label>
              <input type="date" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} className="w-full bg-velatra-bg border border-velatra-border rounded-lg p-2 text-zinc-900" />
            </div>
            <div>
              <label className="block text-sm text-zinc-500 mb-1">Assigné à</label>
              <select value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})} className="w-full bg-velatra-bg border border-velatra-border rounded-lg p-2 text-zinc-900">
                {state.coaches.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-zinc-500 hover:text-zinc-900 transition-colors">Annuler</button>
              <button type="submit" className="bg-velatra-accent text-white px-6 py-2 rounded-lg font-medium hover:bg-velatra-accentDark transition-colors">Enregistrer</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-velatra-bgCard border border-velatra-border rounded-xl">
            <CheckCircle className="w-12 h-12 text-zinc-900 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900">Toutes les tâches sont terminées !</h3>
            <p className="text-zinc-500 mt-2">Profitez de votre temps libre ou ajoutez de nouvelles actions.</p>
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
                  className={`mt-1 flex-shrink-0 transition-colors ${isDone ? 'text-velatra-success' : 'text-zinc-500 hover:text-zinc-900'}`}
                >
                  {isDone ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-medium ${isDone ? 'text-zinc-500 line-through' : 'text-zinc-900'}`}>{task.title}</h3>
                  {task.description && <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{task.description}</p>}
                  
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs font-medium">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${overdue ? 'bg-red-500/20 text-red-400' : 'bg-velatra-bg text-zinc-500'}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                    {coach && (
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <User className="w-3.5 h-3.5" />
                        <span>{coach.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => handleDelete(task.id)}
                  className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })
        )}
      </div>

      {confirmDeleteTaskId && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-xl font-black text-zinc-900 mb-2">Supprimer la tâche ?</h3>
            <p className="text-zinc-500 mb-6">Voulez-vous vraiment supprimer cette tâche ?</p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setConfirmDeleteTaskId(null)}>Non, garder</Button>
              <Button variant="danger" fullWidth onClick={confirmDeleteTask}>Oui, supprimer</Button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};
