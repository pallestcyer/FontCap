import React, { useEffect } from 'react';
import { useNotificationStore } from '../stores/notificationStore';

const NotificationItem = ({ notification, onRemove }) => {
  // Type-based styling - minimal with subtle icon backgrounds
  const typeConfig = {
    success: {
      iconBg: 'bg-status-success/10',
      iconColor: 'text-status-success',
    },
    error: {
      iconBg: 'bg-status-error/10',
      iconColor: 'text-status-error',
    },
    warning: {
      iconBg: 'bg-status-warning/10',
      iconColor: 'text-status-warning',
    },
    info: {
      iconBg: 'bg-accent/10',
      iconColor: 'text-accent',
    },
  };

  const config = typeConfig[notification.type] || typeConfig.info;

  const icons = {
    success: <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />,
    error: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
    warning: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />,
    info: <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />,
  };

  return (
    <div
      className="bg-white/90 backdrop-blur-xl rounded-xl px-3 py-2.5 mb-2
                 border border-black/[0.04] shadow-soft
                 flex items-center gap-2.5 animate-slide-in"
    >
      {/* Icon with subtle background */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg ${config.iconBg} flex items-center justify-center`}>
        <svg className={`w-4 h-4 ${config.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          {icons[notification.type] || icons.info}
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-apple-text font-medium whitespace-pre-line leading-snug">
          {notification.message}
        </p>
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => onRemove(notification.id)}
        className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center
                   text-apple-tertiary hover:text-apple-text hover:bg-black/[0.04] transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default function NotificationBanner() {
  const { notifications, removeNotification } = useNotificationStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]">
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
