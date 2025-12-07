import React, { useEffect } from 'react';
import { useNotificationStore } from '../stores/notificationStore';

const NotificationItem = ({ notification, onRemove }) => {
  // Type-based styling
  const typeConfig = {
    success: {
      bg: 'bg-white',
      border: 'border-status-success/20',
      icon: (
        <svg className="w-5 h-5 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    error: {
      bg: 'bg-white',
      border: 'border-status-error/20',
      icon: (
        <svg className="w-5 h-5 text-status-error" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    warning: {
      bg: 'bg-white',
      border: 'border-status-warning/20',
      icon: (
        <svg className="w-5 h-5 text-status-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      ),
    },
    info: {
      bg: 'bg-white',
      border: 'border-accent/20',
      icon: (
        <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      ),
    },
  };

  const config = typeConfig[notification.type] || typeConfig.info;

  return (
    <div
      className={`${config.bg} ${config.border} border rounded-2xl p-4 mb-3 shadow-elevated
                  flex items-start gap-3 animate-slide-in`}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-apple-text font-medium whitespace-pre-line leading-relaxed">
          {notification.message}
        </p>
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => onRemove(notification.id)}
        className="flex-shrink-0 p-1 -mr-1 rounded-lg text-apple-secondary hover:text-apple-text
                   hover:bg-black/[0.04] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
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
