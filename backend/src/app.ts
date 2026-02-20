import express from 'express';
import cors from 'cors';

import bookingRoutes from './routes/booking.routes';
import { getRedis } from './redis/client';
import mongoose from 'mongoose';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', bookingRoutes);

const healthJson = (req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
};


app.get('/health', healthJson);
app.get('/api/health', healthJson);

app.get('/api/health-redis', async (req, res) => {
  try {
    const redis = await getRedis();
    const health = await redis.ping();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      redis: health
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: (error as Error).message
    });
  }
});

app.get('/api/health-mongo', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'MongoDB not connected'
      });
    }
    await mongoose.connection.db.admin().command({ ping: 1 });
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      mongo: 'ok'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: (error as Error).message
    });
  }
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

export default app;
