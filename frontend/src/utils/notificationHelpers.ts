import { Notification } from '../api/notifications';

export const getNotificationConfig = (notification: Notification) => {
  const workspace = notification.payload?.workspace || notification.org_name || 'Workspace';

  switch (notification.type) {
    case 'transaction_added':
      return {
        message: `Added a new transaction to ${workspace} workspace`,
        route: '/transactions',
      };
    case 'goal_completed':
      return {
        message: `Contributed to a goal in ${workspace} workspace`,
        route: '/goals',
      };
    case 'member_left':
      return {
        message: `Left ${workspace} workspace`,
        route: '/settings',
      };
    default:
      return {
        message: 'New notification',
        route: '/',
      };
  }
};