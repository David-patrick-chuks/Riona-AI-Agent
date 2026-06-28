import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helloRouter from './routes/hello';

dotenv.config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/hello', helloRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({ ok: true });
});

export default router;