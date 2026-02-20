// import request from 'supertest';
// import mongoose from 'mongoose';
// import { MongoMemoryReplSet } from 'mongodb-memory-server';

// import app from '../src/app';
// import Booking from '../src/models/booking.model';
// import { getRedis, closeRedis } from '../src/redis/client';

// let replset: MongoMemoryReplSet;

// const basePayload = {
//   userId: 'user_alice',
//   resourceId: 'room_A',
//   date: '2026-02-15'
// };

// const createBooking = (payload: typeof basePayload, idempotencyKey: string) =>
//   request(app).post('/api/bookings').set('Idempotency-Key', idempotencyKey).send(payload);

// beforeAll(async () => {
//   replset = await MongoMemoryReplSet.create({
//     replSet: { storageEngine: 'wiredTiger' }
//   });
//   await mongoose.connect(replset.getUri(), {
//     dbName: 'booking_test'
//   });
// });

// afterAll(async () => {
//   await mongoose.disconnect();
//   await replset.stop();
//   await closeRedis();
// });

// beforeEach(async () => {
//   await Booking.deleteMany({});
//   const redis = await getRedis();
//   await redis.flushAll();
// });

// describe('Booking API idempotency', () => {
//   it('returns the same booking on repeated idempotency key', async () => {
//     const idempotencyKey = 'idem_repeat_key';

//     const firstResponse = await createBooking(basePayload, idempotencyKey);
//     expect(firstResponse.status).toBe(201);
//     expect(firstResponse.body.booking).toBeDefined();

//     const secondResponse = await createBooking(basePayload, idempotencyKey);
//     expect(secondResponse.status).toBe(201);
//     expect(secondResponse.body.booking.id).toBe(firstResponse.body.booking.id);

//     const bookingCount = await Booking.countDocuments();
//     expect(bookingCount).toBe(1);
//   });

//   it('ignores payload changes with the same idempotency key', async () => {
//     const idempotencyKey = 'idem_payload_change';
//     const firstResponse = await createBooking(basePayload, idempotencyKey);
//     expect(firstResponse.status).toBe(201);

//     const alteredPayload = {
//       ...basePayload,
//       resourceId: 'room_B'
//     };

//     const secondResponse = await createBooking(alteredPayload, idempotencyKey);
//     expect(secondResponse.status).toBe(201);
//     expect(secondResponse.body.booking.id).toBe(firstResponse.body.booking.id);

//     const bookings = await Booking.find({});
//     expect(bookings).toHaveLength(1);
//     expect(bookings[0].resourceId).toBe(basePayload.resourceId);
//   });

//   it('reuses server-generated idempotency key for repeated payloads', async () => {
//     const firstResponse = await request(app).post('/api/bookings').send(basePayload);
//     expect(firstResponse.status).toBe(201);
//     expect(firstResponse.body.booking).toBeDefined();

//     const secondResponse = await request(app).post('/api/bookings').send(basePayload);
//     expect(secondResponse.status).toBe(201);
//     expect(secondResponse.body.booking.id).toBe(firstResponse.body.booking.id);

//     const bookingCount = await Booking.countDocuments();
//     expect(bookingCount).toBe(1);
//   });

//   it('returns in-progress conflict on concurrent same-key requests', async () => {
//     const idempotencyKey = 'idem_in_progress';
//     const [responseA, responseB] = await Promise.all([
//       createBooking(basePayload, idempotencyKey),
//       createBooking(basePayload, idempotencyKey)
//     ]);

//     const bookingCount = await Booking.countDocuments();
//     expect(bookingCount).toBe(1);

//     const successResponses = [responseA, responseB].filter(
//       (response) => response.status === 201
//     );
//     const conflictResponses = [responseA, responseB].filter(
//       (response) => response.status === 409
//     );

//     if (successResponses.length === 2) {
//       expect(successResponses[0].body.booking.id).toBe(
//         successResponses[1].body.booking.id
//       );
//     } else {
//       expect(successResponses).toHaveLength(1);
//       expect(conflictResponses).toHaveLength(1);
//       expect(conflictResponses[0].body.code).toBe('IDEMPOTENCY_IN_PROGRESS');
//     }
//   });

//   it('allows only one booking under concurrent requests', async () => {
//     const payloadA = { ...basePayload, userId: 'user_alice' };
//     const payloadB = { ...basePayload, userId: 'user_bob' };

//     const [responseA, responseB] = await Promise.all([
//       createBooking(payloadA, 'idem_concurrent_a'),
//       createBooking(payloadB, 'idem_concurrent_b')
//     ]);

//     const statuses = [responseA.status, responseB.status].sort();
//     expect(statuses).toEqual([201, 409]);

//     const conflictResponse = responseA.status === 409 ? responseA : responseB;
//     expect(['RESOURCE_LOCKED', 'ALREADY_BOOKED']).toContain(
//       conflictResponse.body.code
//     );

//     const bookingCount = await Booking.countDocuments();
//     expect(bookingCount).toBe(1);
//   });
// });
