import { Router } from 'express';

const router = Router();

router.get('/hello', (_req, res) => {
  res.status(200).json({ ok: true });
});

export default router;
import express from 'express';
import helloRouter from './routes/hello';

const app = express();

appexpress.json());

app.use(helloRouter);

export default app;
import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});