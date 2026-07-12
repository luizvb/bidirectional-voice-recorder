import express from 'express';
import { cancelEvalRun, createEvalRun, exportEvalCsv, getEvalPrompt, getEvalRun, listEvalRuns, retryEvalCase, reviewEvalPrompt } from '../controllers/evals';

const router = express.Router();
router.post('/runs', createEvalRun);
router.get('/runs', listEvalRuns);
router.get('/prompt', getEvalPrompt);
router.get('/runs/:id', getEvalRun);
router.get('/runs/:id/export.csv', exportEvalCsv);
router.post('/runs/:id/improve-prompt', reviewEvalPrompt);
router.post('/runs/:id/cancel', cancelEvalRun);
router.post('/cases/:id/retry', retryEvalCase);
export default router;
