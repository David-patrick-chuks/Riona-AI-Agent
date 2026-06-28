import { Router } from 'express';

const router = Router();

router.get('/hello', (_req, res) => {
  res.status(200).json({ ok: true });
});

export default router;
import express from 'express';
import helloRouter from './routes/hello';

const app = express();
const port = process.env.PORT || 3000;

app.use(helloRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});