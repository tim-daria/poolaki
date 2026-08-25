import { http, HttpResponse } from 'msw';

export const notificationHandlers = [
  http.get('/api/v1/notifications/', () => {
    return HttpResponse.json({
      notifications: [
        {
          id: 101,
          type: 'transaction_added',
          is_read: false,
          created_at: '2026-08-25T08:00:00Z',
          payload: {
            org_id: 2,
            workspace: 'Italy2026',
          },
        },
        {
          id: 102,
          type: 'goal_completed',
          is_read: false,
          created_at: '2026-08-25T08:10:00Z',
          payload: {
            org_id: 2,
            workspace: 'Italy2026',
            goal_id: 5,
          },
        },
        {
          id: 103,
          type: 'member_left',
          is_read: true,
          created_at: '2026-08-25T08:15:00Z',
          payload: {
            org_id: 2,
            workspace: 'Italy2026',
            user_name: 'alice',
          },
        },
      ],
    });
  }),
];