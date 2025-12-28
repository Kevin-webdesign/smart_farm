import express from 'express';
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole
} from '../controllers/role.controller.js';

const router = express.Router();

router.get('/', getRoles);
router.post('/', createRole);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);

export default router;