import express from 'express';
import { body } from 'express-validator';
import { createBookingController, getBookingsController, cancelBookingController, getAvailableResourcesController } from '../controllers/booking.controller';


const router = express.Router();

const createBookingValidation = [
  body('userId').notEmpty().withMessage('userId is required'),
  body('resourceId').notEmpty().withMessage('resourceId is required'),
  body('date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date must be in YYYY-MM-DD format')
];

router.post('/bookings', createBookingValidation, createBookingController);
router.get('/bookings/:userId', getBookingsController);
router.patch('/bookings/:bookingId/cancel', cancelBookingController);
router.get('/resources/available', getAvailableResourcesController);

export default router;
