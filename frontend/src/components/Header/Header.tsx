import { useState } from "react";
import { OrgSwitcher } from "./OrgSwitcher";

interface HeaderProps {
  onLogout: () => void;
}

export function Header({ onLogout }: HeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header id="header" className="header">
      <div className="header-actions">
        <OrgSwitcher />
        <button aria-label="Log out" onClick={onLogout}>
          Logout
        </button>
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
        {/* <button aria-label="Log out" onClick={onLogout}>
          Logout
        </button> */}
      </div>
    </header>
  );
}
