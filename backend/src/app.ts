import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import postsRoutes from './modules/posts/posts.routes';
import likesRoutes from './modules/likes/likes.routes';
import commentsRoutes from './modules/comments/comments.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';

const createApp = (): Application => {
  const app = express();

  // CORS configuration - allow all origins
  app.use(cors({
    origin: '*', // In production, specify allowed origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

  // Helmet with content security policy relaxed for Swagger
  app.use(helmet());

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Mini Social Feed API is running' });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/posts', postsRoutes);
  app.use('/api/posts', likesRoutes);
  app.use('/api/posts', commentsRoutes);
  app.use('/api/notifications', notificationsRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};

export default createApp;
