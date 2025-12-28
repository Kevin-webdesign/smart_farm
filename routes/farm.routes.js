import express from 'express';
import {
  createTransaction,
  getAllTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getPublicTransactions
} from '../controllers/farm.controller.js';
import verifyToken from '../middleware/auth.midleware.js'; 

const router = express.Router();

// Public route (no authentication required)
router.get('/public/all', getPublicTransactions);

// All other routes require authentication
router.use(verifyToken);

router.post('/', createTransaction);
router.get('/', getAllTransactions);
router.get('/:id', getTransactionById);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;