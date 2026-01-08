import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup Mock Service Worker server for Node.js
export const server = setupServer(...handlers);
