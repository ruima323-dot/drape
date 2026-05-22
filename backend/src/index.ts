import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { authMiddleware } from './middleware/auth.js';
import { ensureUser } from './middleware/ensureUser.js';
import apiRouter from './routes/index.js';
import { DATA_DIR, IMAGES_DIR, THUMBNAILS_DIR, UPLOAD_DIR, SELFIES_DIR } from './config.js';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Ensure storage directories exist
mkdirSync(THUMBNAILS_DIR, { recursive: true });
mkdirSync(SELFIES_DIR, { recursive: true });

// CORS — allow the frontend origin
app.use(
  cors({
    origin: [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  }),
);

// Body parsing
app.use(express.json());

// Serve generated images statically (no auth required)
app.use('/api/images', express.static(IMAGES_DIR));

// Serve uploaded photos statically (no auth required)
app.use('/api/uploads', express.static(UPLOAD_DIR));

// Public health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected API routes — auth required
app.use('/api', authMiddleware, ensureUser, apiRouter);

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Only start listening when this module is run directly (not imported for tests)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Drape backend running on port ${PORT}`);
  });
}

export default app;
