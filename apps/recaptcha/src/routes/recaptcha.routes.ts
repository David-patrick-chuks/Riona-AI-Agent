import express from 'express';
import multer from 'multer';
import controller from '@/controllers/recaptcha.controller';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.get('/ping', controller.ping);
router.get('/hello', (_req, res) => res.json({ ok: true }));
router.post('/predict', upload.array('images'), controller.predict);

export default router;
