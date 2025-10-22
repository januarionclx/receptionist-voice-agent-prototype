import express from 'express';

const router = express.Router();

router.post('/', (req, res) => {
  const sessionId = Math.random().toString(36).substring(7);
  res.json({ sessionId });
});

export default router;
