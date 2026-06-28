import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/hello', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;
import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/hello', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;