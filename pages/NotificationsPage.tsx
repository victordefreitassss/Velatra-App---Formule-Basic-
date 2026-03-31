import React from 'react';
import { motion } from 'framer-motion';
import { AppState, Notification } from '../types';
import { BellIcon, CheckIcon, Trash2Icon } from '../components/Icons';
import { Button } from '../components/UI';
import { db, doc, updateDoc, deleteDoc } from '../firebase';

interface NotificationsPageProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ state, setState }) => {
  const userNotifications = state.notifications
    .filter(n => n.userId === state.user?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = userNotifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (notification: Notification) => {
    try {
      if (!notification.read) {
        await updateDoc(doc(db, 'notifications', notification.id), { read: true });
      }
      if (notification.link) {
        setState(prev => ({ ...prev, page: notification.link as any }));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = userNotifications.filter(n => !n.read);
    for (const notification of unreadNotifications) {
      try {
        await updateDoc(doc(db, 'notifications', notification.id), { read: true });
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center"><CheckIcon size={20} /></div>;
      case 'warning': return <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center"><BellIcon size={20} /></div>;
      case 'error': return <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center"><BellIcon size={20} /></div>;
      default: return <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center"><BellIcon size={20} /></div>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 uppercase italic tracking-tight">Notifications</h2>
          <p className="text-zinc-500 mt-2">Vous avez {unreadCount} notification{unreadCount !== 1 ? 's' : ''} non lue{unreadCount !== 1 ? 's' : ''}.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" onClick={handleMarkAllAsRead}>
            Tout marquer comme lu
          </Button>
        )}
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border  overflow-hidden">
        {userNotifications.length > 0 ? (
          <div className="divide-y divide-transparent">
            {userNotifications.map(notification => (
              <motion.div 
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 flex items-start gap-4 transition-colors cursor-pointer ${!notification.read ? 'bg-velatra-accent/5' : 'hover:bg-zinc-50'}`}
                onClick={() => handleMarkAsRead(notification)}
              >
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <h3 className={`text-sm font-bold truncate ${!notification.read ? 'text-zinc-900' : 'text-zinc-700'}`}>
                      {notification.title}
                    </h3>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">
                      {new Date(notification.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={`text-sm ${!notification.read ? 'text-zinc-700' : 'text-zinc-500'}`}>
                    {notification.message}
                  </p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100">
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-velatra-accent mr-2"></div>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(notification.id); }}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2Icon size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-zinc-50 text-zinc-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <BellIcon size={40} />
            </div>
            <h3 className="text-xl font-black text-zinc-900 mb-2">Aucune notification</h3>
            <p className="text-zinc-500">Vous êtes à jour !</p>
          </div>
        )}
      </div>
    </div>
  );
};
