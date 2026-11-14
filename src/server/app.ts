import express from 'express';
import apiRouter from './routes.ts';

export function createApiApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/api', apiRouter);
  return app;
}
