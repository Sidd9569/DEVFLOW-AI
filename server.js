require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const db = require('./config/db');
const logger = require('./utils/logger');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const sprintRoutes = require('./routes/sprintRoutes');
const taskRoutes = require('./routes/taskRoutes');
const issueRoutes = require('./routes/issueRoutes');
const profileRoutes = require('./routes/profileRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: logger.stream }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sprints', sprintRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'products.html'));
});

app.get('/sprints', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'sprints.html'));
});

app.get('/kanban', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'kanban.html'));
});

app.get('/issues', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'issues.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    logger.info(`User ${socket.id} joined room: ${roomId}`);
  });

  socket.on('task-update', (data) => {
    socket.to(data.roomId).emit('task-updated', data);
  });

  socket.on('notification', (data) => {
    io.to(data.userId).emit('new-notification', data);
  });

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

app.set('io', io);

let isDbReady = false;

const startServer = () => {
  server.on('error', (error) => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use. Please stop the process using this port or change PORT in .env.`);
      process.exit(1);
    }

    throw error;
  });

  server.listen(PORT, () => {
    logger.info(`DevFlow AI server running on port ${PORT}`);
    if (!isDbReady) {
      logger.warn('Server started but MongoDB is not ready yet (static assets and health endpoint should work).');
    }
  });
};

db.connect()
  .then(() => {
    isDbReady = true;
    startServer();
  })
  .catch((err) => {
    logger.error('MongoDB connection failed. Starting server anyway to serve static assets.');
    logger.error(err);
    startServer();
  });

module.exports = { app, server, io };