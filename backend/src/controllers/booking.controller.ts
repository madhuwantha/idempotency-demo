import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import type { Request, Response } from 'express';
import { createBooking, getBookings, cancelBooking, getAvailableResources } from '../services/booking.service';
import { buildIdempotencyConfig } from '../services/booking-idempotency.service';



/**
 * Creates a new booking within a MongoDB transaction.
 * Uses idempotency when Idempotency-Key header is present; returns appropriate status and body on known errors.
 */
export const createBookingController = async (req: Request, res: Response): Promise<Response> => {
  // Validate request body (e.g. userId, resourceId, date) and return 400 if invalid
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, resourceId, date } = req.body;
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
  const idempotency = buildIdempotencyConfig(
    { userId, resourceId, date },
    idempotencyKey
  );

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const result = await createBooking(
      userId,
      resourceId,
      date,
      idempotency,
      session
    );

    await session.commitTransaction();

    return res.status(result.statusCode).json(result.data);
  } catch (error) {
    await session.abortTransaction();
    console.error('Booking creation error:', error);

    // Service-thrown errors with httpStatus/responseBody (e.g. validation, idempotency conflict)
    if (
      typeof (error as { httpStatus?: number }).httpStatus === 'number' &&
      (error as { responseBody?: unknown }).responseBody
    ) {
      return res
        .status((error as { httpStatus: number }).httpStatus)
        .json((error as { responseBody: unknown }).responseBody);
    }

    // Resource locked by another booking in progress
    if (error instanceof Error && error.message.includes('currently being booked')) {
      return res.status(409).json({
        error: error.message,
        code: 'RESOURCE_LOCKED'
      });
    }

    // Slot already booked
    if (error instanceof Error && error.message.includes('already booked')) {
      return res.status(409).json({
        error: error.message,
        code: 'ALREADY_BOOKED'
      });
    }

    // Unhandled error
    return res.status(500).json({
      error: 'Failed to create booking',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    session.endSession();
  }
}

export const getBookingsController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId } = req.params;
    const filters = {
      resourceId: req.query.resourceId as string | undefined,
      date: req.query.date as string | undefined
    };

    const bookings = await getBookings(userId as string, filters);

    return res.json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    return res.status(500).json({
      error: 'Failed to fetch bookings'
    });
  }
}

export const cancelBookingController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { bookingId } = req.params;
    const { userId } = req.body;

    const booking = await cancelBooking(bookingId as string, userId as string);

    return res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export const getAvailableResourcesController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      return res.status(400).json({
        error: 'Date query parameter is required'
      });
    }

    const available = await getAvailableResources(date);

    return res.json({
      success: true,
      date,
      availableResources: available
    });
  } catch (error) {
    console.error('Get available resources error:', error);
    return res.status(500).json({
      error: 'Failed to fetch available resources'
    });
  }
}
