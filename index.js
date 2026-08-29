const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api/auth', authRoutes);
console.log('AUTH ROUTES LOADED');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

app.get('/', (req, res) => {
  res.send('Backend Server Running');
});

const PORT = process.env.PORT || 5000;
app.get('/test', (req, res) => {
  res.send('Test route working');
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});