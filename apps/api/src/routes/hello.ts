import { Router, Request, Response } from 'express';

const router = Router();

router.get('/hello', (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

export default router;