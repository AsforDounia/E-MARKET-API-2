import express from 'express';
import * as authController  from '../controllers/authController.js';
import { validate } from '../middlewares/validation/validate.js';
import { registerSchema, loginSchema } from '../middlewares/validation/schemas/authSchemas.js';

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);

export default router;