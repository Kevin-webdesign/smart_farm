import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats
} from '../controllers/user.controller.js';

const router = express.Router();


router.get('/stats', getUserStats);

router.get('/', getAllUsers);

// Get user by ID
router.get('/:id', getUserById);

router.post('/', createUser);

// Update user ( or user updating own profile)
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;