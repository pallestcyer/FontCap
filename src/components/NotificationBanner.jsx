import React, { useEffect } from 'react';
import { useNotificationStore } from '../stores/notificationStore';

const NotificationItem = ({ notification, onRemove }) => {
  const typeStyles = {
    success: 'bg-white border-black text-black',
    error: 'bg-black border-black text-white',
    warning: 'bg-neutral-100 border-neutral-400 text-black',
    info: 'bg-white border-neutral-300 text-black',
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '!',
    info: '→',
  };

  return (
    <div
      className={`${typeStyles[notification.type]} border rounded-lg p-3 mb-2 shadow-lg flex items-start justify-between animate-slide-in`}
    >
      <div className="flex items-start gap-2 flex-1">
        <span className="text-sm font-bold">{icons[notification.type]}</span>
        <div className="flex-1">
          <p className="text-xs font-medium whitespace-pre-line">{notification.message}</p>
        </div>
      </div>
      <button
        onClick={() => onRemove(notification.id)}
        className={`ml-3 font-bold text-sm leading-none ${
          notification.type === 'error' ? 'text-white/70 hover:text-white' : 'text-neutral-400 hover:text-black'
        }`}
      >
        ×
      </button>
    </div>
  );
};

export default function NotificationBanner() {
  const { notifications, removeNotification } = useNotificationStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-80 max-w-full">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </div>
  );
}
