import mongoose from 'mongoose';
import dotenv from 'dotenv';

import app from './app';
import { closeRedis } from './redis/client';
import { ensureBookingCollection } from './services/booking.service';

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://root:example@localhost:27017/booking_system';
const PORT = process.env.PORT || 5001;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    ensureBookingCollection();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  await closeRedis();
  console.log('MongoDB connection closed');
  process.exit(0);
});
