import express from 'express'
import cors from 'cors';
import 'dotenv/config'
import connectDB from './config/mongodb.js';
import userRouter from './routes/userRoutes.js';
import imageRouter from './routes/imageRoutes.js';
import { stripeWebhook } from './controllers/webhook.js';

const PORT = process.env.PORT || 4000;
const app = express();

app.use(cors());
await connectDB();

app.get('/', (req, res) => res.send('API working'));
app.use('/api/user', express.json(), userRouter);
app.use('/api/image', express.json(), imageRouter);
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), stripeWebhook);


app.listen(PORT, () => console.log('Server running on port ' + PORT));