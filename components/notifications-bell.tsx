"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { UserNotificationView } from "@/lib/server/notifications";
import { BellIcon } from "./icons";

function formatWhen(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationsBell({
  initialNotifications,
  initialUnreadCount,
}: {
  initialNotifications: UserNotificationView[];
  initialUnreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("pointerdown", onPointerDown);
    }
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  async function refreshNotifications() {
    const response = await fetch("/api/notifications");
    if (!response.ok) return;
    const data = (await response.json()) as {
      notifications?: UserNotificationView[];
      unreadCount?: number;
    };
    setNotifications(data.notifications ?? []);
    setUnreadCount(data.unreadCount ?? 0);
  }

  async function markRead(notificationId: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notificationId }),
    });
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, readAt: new Date().toISOString() }
          : notification,
      ),
    );
    setUnreadCount((current) => Math.max(0, current - 1));
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        readAt: notification.readAt ?? new Date().toISOString(),
      })),
    );
    setUnreadCount(0);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          void refreshNotifications();
        }}
        className="notification-bell-button"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="notification-bell-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <p className="text-sm font-medium">Notifications</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs text-accent"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          {notifications.length === 0 ? (
            <p className="notification-panel-empty">No notifications yet.</p>
          ) : (
            <ul className="notification-panel-list">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!notification.readAt) {
                        void markRead(notification.id);
                      }
                    }}
                    className={`notification-item ${
                      notification.readAt ? "notification-item-read" : ""
                    }`}
                  >
                    <span className="notification-item-message">
                      {notification.message}
                    </span>
                    <span className="notification-item-time">
                      {formatWhen(notification.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/shared"
            onClick={() => setOpen(false)}
            className="notification-panel-footer"
          >
            View shared list
          </Link>
        </div>
      ) : null}
    </div>
  );
}
