require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const questRoutes = require('./routes/quests');
const characterRoutes = require('./routes/character');
const shopRoutes = require('./routes/shop');
const inventoryRoutes = require('./routes/inventory');
const activityRoutes = require('./routes/activity');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', message: 'LIFE//LEVEL API is running' } });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/character', characterRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/activity', activityRoutes);

// 404 for unknown API routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found.' } });
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`⚔️  LIFE//LEVEL API running on port ${PORT}`);
});