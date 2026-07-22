import { useState } from "react";

interface HeaderProps {
  title: string;
  onLogout: () => void;
}

export default function Header({ title, onLogout }: HeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <div className="header">
      <h2>{title}</h2>
      <div className="header-actions">
        <div className="notif-wrapper">
          <button
            className="notif-btn"
            onClick={() => setNotifOpen((o) => !o)}
            aria-label="Notifications"
          >
            Notifications
          </button>
          {notifOpen && (
            <div className="notif-dropdown">
              <p>No new notifications</p>
            </div>
          )}
        </div>
        <button onClick={onLogout}>Logout</button>
      </div>
    </div>
  );
}
