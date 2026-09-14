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
const achievementRoutes = require('./routes/achievements');
const focusRoutes = require('./routes/focus');
const focusRoomRoutes = require('./routes/focusRooms');
const goalRoutes = require('./routes/goals');
const routineRoutes = require('./routes/routines');
const journeyRoutes = require('./routes/journeys');
const rewardRoutes = require('./routes/rewards');
const calendarRoutes = require('./routes/calendar');
const intelRoutes = require('./routes/intel');
const { syncAchievementDefinitions } = require('./services/achievementService');

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
app.use('/api/achievements', achievementRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/focus-rooms', focusRoomRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/journeys', journeyRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/intel', intelRoutes);

// 404 for unknown API routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found.' } });
});

// Error handler (must be last)
app.use(errorHandler);

// Bind explicitly so the server is reachable on managed hosts (Heroku/Render
// inject a PORT and expect the process to listen on 0.0.0.0).
app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚔️  LIFE//LEVEL API running on port ${PORT}`);
});

// Phase 8: keep the centralized achievement definitions in sync with the
// database on boot (fresh databases get the catalog without a manual seed).
syncAchievementDefinitions().catch((err) => {
  console.error('[boot] failed to sync achievement definitions:', err);
});