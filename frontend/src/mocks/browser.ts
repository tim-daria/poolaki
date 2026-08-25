import { setupWorker } from 'msw/browser';
import { notificationHandlers } from './notificationHandlers';

export const worker = setupWorker(...notificationHandlers);