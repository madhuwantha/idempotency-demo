import mongoose, { Schema } from 'mongoose';

const bookingSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    resourceId: {
      type: String,
      required: true,
      index: true
    },
    date: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

bookingSchema.index(
  { resourceId: 1, date: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' } }
);

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
