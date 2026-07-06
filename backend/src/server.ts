import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api';
import prisma from './config/db';
import { processQueueOffline } from './services/sqs';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors({
  origin: '*', // Allow all origins for dev simplicity
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// API route attachment
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Setup Socket.io
export const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  // Send initial queue stats on connection
  prisma.notificationQueue.count().then(count => {
    socket.emit('queue-status', { count });
  }).catch(() => {});

  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

// Scheduling / Polling system for scheduled notifications
// Checks database for notifications that are scheduled but still PENDING and have reached scheduledFor time
async function checkScheduledNotifications() {
  try {
    const now = new Date();
    const scheduled = await prisma.notification.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: now,
        },
        queueItem: null, // Not already in queue
      },
    });

    for (const notif of scheduled) {
      console.log(`[Scheduler] Enqueuing scheduled notification: ${notif.id}`);
      // Add to database queue
      await prisma.notificationQueue.upsert({
        where: { notificationId: notif.id },
        create: {
          notificationId: notif.id,
          attempts: 0,
          visibleAfter: new Date(),
        },
        update: {
          attempts: 0,
          visibleAfter: new Date(),
          lockedAt: null,
          error: null,
        },
      });
    }

    if (scheduled.length > 0) {
      // Trigger offline processor to dispatch
      processQueueOffline().catch(console.error);
    }
  } catch (err) {
    console.error('Error checking scheduled notifications:', err);
  }
}

// Scheduled check interval (every 10 seconds)
setInterval(checkScheduledNotifications, 10000);

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`NotifyFlow backend server running on port ${PORT}`);

  // Test database connection
  try {
    await prisma.$connect();
    console.log('Database connected successfully.');

    // Run initial queue worker sweep on startup
    processQueueOffline().catch(console.error);
  } catch (err) {
    console.error('Database connection failed:', err);
  }
});
