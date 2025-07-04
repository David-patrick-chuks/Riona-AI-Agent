import express, { Request, Response } from 'express';
import { scrapeFollowersHandler } from '../../client/Instagram';
const router = express.Router();

let shouldExitInteractions = false;

export function getShouldExitInteractions() {
  return shouldExitInteractions;
}

router.post('/exit-interactions', async (_req: Request, res: Response) => {
  shouldExitInteractions = true;
  res.json({ success: true, message: 'Exiting interactions requested.' });
});

router.post('/scrape-followers', async (req: Request, res: Response) => {
  const { targetAccount, maxFollowers } = req.body;
  try {
    const result = await scrapeFollowersHandler(targetAccount, maxFollowers);
    if (Array.isArray(result)) {
      if (req.query.download === '1') {
        const filename = `${targetAccount}_followers.txt`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'text/plain');
        res.send(result.join('\n'));
      } else {
        res.json({ success: true, followers: result });
      }
    } else {
      res.json({ success: true, result });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}); 