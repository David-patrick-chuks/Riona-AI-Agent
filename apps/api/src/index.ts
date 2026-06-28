import express from 'express';
import healthRouter from './routes/health';
import helloRouter from './routes/hello';

const app = express();
const PORT = process.env.PORT || 3000;
import { initAgent } from './Agent/index';
app.use(express.json());

app.use('/api', healthRouter);
app.use('/api', helloRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

async function startServer() {
  try {
    await initAgent();
  } catch (err) {
    logger.error('Error during agent initialization:', err);
    process.exit(1);
  }

  await connectDB();

  const server = app.listen(process.env.PORT || 3000, () => {
    logger.info(`Server is running on port ${process.env.PORT || 3000}`);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM signal.');
    shutdown(server);
  });
  process.on('SIGINT', () => {
    logger.info('Received SIGINT signal.');
    shutdown(server);
  });
}

startServer().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
