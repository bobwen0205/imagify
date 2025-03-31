import express from 'express';
import { loginUser, paymentStripe, registerUser, userCredits } from '../controllers/userController.js';
import { userAuth } from '../middlewares/auth.js';

const userRouter = express.Router();

userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
userRouter.get('/credits', userAuth, userCredits);
userRouter.post('/buy', userAuth, paymentStripe);

export default userRouter;