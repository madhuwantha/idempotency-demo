import crypto from 'crypto';
import type { ClientSession } from 'mongoose';

import Booking from '../models/booking.model';
import { claimIdempotency, completeIdempotency, IdempotencyConfig } from './booking-idempotency.service';
import { acquireLock, releaseLock } from './booking-lock.service';
import { buildConflictError, buildServerError } from '../utils/errors';





/**
 * Creates a new booking within a MongoDB transaction.
 * Uses idempotency when Idempotency-Key header is present; returns appropriate status and body on known errors.
 */
export const createBooking = async (
  userId: string,
  resourceId: string,
  date: string,
  idempotency: IdempotencyConfig,
  session: ClientSession
): Promise<{ cached: boolean; statusCode: number; data: unknown }> => {
  const lockKey = `${resourceId}:${date}`; // generate a lock key for the resource and date
  const lockExpiry = new Date(Date.now() + 30000); // set the lock expiry to 30 seconds from now
  const lockTtlMs = lockExpiry.getTime() - Date.now(); // set the lock TTL to the expiry time minus the current time
  const lockHolder = idempotency.key; // set the lock holder to the idempotency key
  let idempotencyOwned = false; // set the idempotency to not owned by this request for the next step

  try {
    const idempotencyClaim = await claimIdempotency(idempotency);
    if (idempotencyClaim.cached) { // if the idempotency is cached, return the cached response      
      return { // return the cached response
        cached: true,
        statusCode: idempotencyClaim.statusCode,
        data: idempotencyClaim.data
      }; // return the cached response
    }

    if (!idempotencyClaim.owned) { // not owned by this request
      throw buildConflictError( // throw a conflict error ( this means another request with this idempotency key is in progress)
        'Another request with this idempotency key is in progress',
        'IDEMPOTENCY_IN_PROGRESS'
      );
    }

    idempotencyOwned = true; // set the idempotency to owned by this request for the next step

    await acquireLock(lockKey, lockHolder, lockTtlMs); // acquire the lock for the resource and date by the holder

    const existingBooking = await Booking.findOne({ // check if the booking already exists
      resourceId,
      date,
      status: 'confirmed'
    })
    .session(session);

    if (existingBooking) { // if the booking already exists, throw a conflict error ( this means the booking is already booked)
      throw buildConflictError(
        `Resource ${resourceId} is already booked on ${date}`,
        'ALREADY_BOOKED'
      );
    }

    // create the booking
    let booking; 
    try {
      [booking] = await Booking.create(
        [
          {
            userId,
            resourceId,
            date,
            status: 'confirmed'
          }
        ],
        { session }
      );
    } catch (error) {
      // if the booking already exists, throw a conflict error 
      if ((error as { code?: number }).code === 11000) {
        throw buildConflictError(
          `Resource ${resourceId} is already booked on ${date}`,
          'ALREADY_BOOKED'
        );
      }
      throw error;
    }

    const response = {
      success: true,
      message: 'Booking created successfully',
      booking: {
        id: booking._id,
        userId: booking.userId,
        resourceId: booking.resourceId,
        date: booking.date,
        status: booking.status,
        createdAt: booking.createdAt
      }
    };

    await completeIdempotency(idempotency, response, 201); // complete the idempotency with the response and status code
    await releaseLock(lockKey, lockHolder); // release the lock for the resource and date by the holder

    return {
      cached: false,
      statusCode: 201,
      data: response
    };
  } catch (error) {
    // if the error is a server error, wrap it in a server error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const wrappedError = // wrap the error in a server error if it is a server error
      typeof (error as { httpStatus?: number }).httpStatus === 'number'
        ? (error as Error & { httpStatus: number; responseBody: unknown })
        : buildServerError(errorMessage);

    if (idempotencyOwned) { // if the idempotency is owned by this request, complete the idempotency with the response and status code for making it available to other requests
      try {
        await completeIdempotency( // complete the idempotency with the response and status code
          idempotency,
          (wrappedError as { responseBody: unknown }).responseBody,
          (wrappedError as { httpStatus: number }).httpStatus
        );
      } catch (idempotencyError) {
        console.error('Idempotency update failed:', idempotencyError);
      }
    }

    try {
      await releaseLock(lockKey, lockHolder); // release the lock for the resource and date by the holder
    } catch (cleanupError) {
      console.error('Lock cleanup failed:', cleanupError);
    }

    throw wrappedError;
  }
};

export const getBookings = async (userId: string, filters: { resourceId?: string; date?: string } = {}) => {
  const query: { userId: string; status: string; resourceId?: string; date?: string } = {
    userId,
    status: 'confirmed'
  };

  if (filters.resourceId) {
    query.resourceId = filters.resourceId;
  }

  if (filters.date) {
    query.date = filters.date;
  }

  return Booking.find(query).sort({ createdAt: -1 });
};

export const cancelBooking = async (bookingId: string, userId: string) => {
  const booking = await Booking.findOne({ _id: bookingId, userId });

  if (!booking) {
    throw new Error('Booking not found');
  }

  booking.status = 'cancelled';
  await booking.save();

  return booking;
};

export const getAvailableResources = async (date: string) => {
  try {
    const bookedResources = await Booking.find({
      date,
      status: 'confirmed'
    })
    .distinct('resourceId');

    const allResources = ['room_A', 'room_B', 'room_C', 'room_D'];

    return allResources.filter((resource) => !bookedResources.includes(resource));
  } catch (error) {
    console.error('Get available resources error:', error);
    throw buildServerError('Failed to fetch available resources');
  }
};

export const ensureBookingCollection = async () => {
  const count = await Booking.estimatedDocumentCount();
  console.log('Booking collection count:', count);
  if (count === 0 || String(count) == '0' || count == undefined) {
    await Booking.create({
      userId: 'init',
      resourceId: 'init',
      date: new Date().toISOString(),
      status: 'cancelled'
    });
    // Optionally delete it immediately
    await Booking.deleteOne({ userId: 'init' });
  }
};