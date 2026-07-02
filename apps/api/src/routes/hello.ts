import { Application, Request, Response } from 'express';

export const helloHandler = (_req: Request, res: Response) => {
  return res.status(200).json({ ok: true });
};

export const registerHelloRoute = (app: Application) => {
  app.get('/hello', helloHandler);
};
