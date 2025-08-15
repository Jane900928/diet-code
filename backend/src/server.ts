import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { DietPlanningAgent } from './diet-planning-agent';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// 中间件
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));
app.use(express.json());

// 初始化 Diet Planning Agent
let dietAgent: DietPlanningAgent;

async function initializeAgent() {
  try {
    dietAgent = new DietPlanningAgent();
    await dietAgent.start();
    console.log('Diet Planning Agent initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Diet Planning Agent:', error);
    process.exit(1);
  }
}

// API 路由
app.post('/api/chat', async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }

    const response = await dietAgent.handleUserMessage(userId, message);
    res.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 启动服务器
async function startServer() {
  await initializeAgent();
  
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer().catch(console.error);