import 'dotenv/config';
import { env } from './config/env';
import { initFirebase } from './config/firebase';
import createApp from './app';

// Initialize Firebase at startup (before creating app)
console.log('Initializing Firebase...');
initFirebase();

const startServer = () => {
  const app = createApp();

  app.listen(env.PORT, () => {
    console.log('');
    console.log('=================================');
    console.log(`Server running on port ${env.PORT}`);
    console.log(`Environment: ${env.NODE_ENV}`);
    console.log(`Health check: http://localhost:${env.PORT}/health`);
    console.log('=================================');
  });
};

startServer();
