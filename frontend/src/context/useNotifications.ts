
import { useContext } from "react";
import { NotificationContext } from "./NotificationContext";

/**
 * Read the notification list and actions from anywhere inside NotificationProvider. 
 * Throws outside it, same reasoning as useOrgList.
 * A silent `null` would surface as a crash far from the real cause.
 */
export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return ctx;
}