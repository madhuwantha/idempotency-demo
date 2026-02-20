import mongoose, { Schema } from 'mongoose';

const bookingLogSchema = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true
    },
    action: {
      type: String,
      enum: ['create', 'cancel'],
      required: true
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

bookingLogSchema.index(
  { resourceId: 1, date: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' } }
);

const BookingLog = mongoose.model('BookingLog', bookingLogSchema);

export default BookingLog;
