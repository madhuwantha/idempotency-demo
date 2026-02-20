import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { bookingAPI, type BookingResponse, type ApiError } from '../services/api';

type BookingFormProps = {
  userId: string;
  onBookingCreated?: (booking: BookingResponse['booking']) => void;
};

const BookingForm: React.FC<BookingFormProps> = ({ userId, onBookingCreated }) => {
  const [formData, setFormData] = useState({
    resourceId: '',
    date: ''
  });
  const [availableResources, setAvailableResources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);

  const resources = [
    { id: 'room_A', name: 'Conference Room A' },
    { id: 'room_B', name: 'Conference Room B' },
    { id: 'room_C', name: 'Conference Room C' },
    { id: 'room_D', name: 'Conference Room D' }
  ];

  useEffect(() => {
    if (formData.date) {
      fetchAvailableResources();
    }
  }, [formData.date]);

  const fetchAvailableResources = async () => {
    setLoadingResources(true);
    try {
      const result = await bookingAPI.getAvailableResources(formData.date);
      setAvailableResources(result.availableResources);
    } catch {
      toast.error('Failed to fetch available resources');
    } finally {
      setLoadingResources(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.resourceId || !formData.date) {
      toast.warning('Please fill all fields');
      return;
    }

    setLoading(true);

    try {
      const result = await bookingAPI.createBooking(
        userId,
        formData.resourceId,
        formData.date
      );

      toast.success(result.message || 'Booking created successfully!');
      setFormData({ resourceId: '', date: '' });

      if (onBookingCreated) {
        onBookingCreated(result.booking);
      }
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.code === 'RESOURCE_LOCKED') {
        toast.warning(
          'This resource is being booked by another user. Please try again.'
        );
      } else if (apiError.code === 'ALREADY_BOOKED') {
        toast.error('This resource is already booked for the selected date.');
      } else if (apiError.code === 'IDEMPOTENCY_IN_PROGRESS') {
        toast.info('Booking is already in progress. Please wait.');
      } else {
        toast.error(apiError.error || 'Failed to create booking');
      }
    } finally {
      setLoading(false);
    }
  };

  const isResourceAvailable = (resourceId: string) => {
    if (!formData.date) return true;
    return availableResources.includes(resourceId);
  };

  return (
    <div className="booking-form">
      <h2>Create New Booking</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="date">Select Date:</label>
          <input
            type="date"
            id="date"
            value={formData.date}
            onChange={(event) =>
              setFormData({ ...formData, date: event.target.value })
            }
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="resourceId">Select Resource:</label>
          {loadingResources ? (
            <p>Loading available resources...</p>
          ) : (
            <select
              id="resourceId"
              value={formData.resourceId}
              onChange={(event) =>
                setFormData({ ...formData, resourceId: event.target.value })
              }
              required
            >
              <option value="">-- Choose a resource --</option>
              {resources.map((resource) => (
                <option
                  key={resource.id}
                  value={resource.id}
                  disabled={!isResourceAvailable(resource.id)}
                >
                  {resource.name}{' '}
                  {!isResourceAvailable(resource.id) && '(Unavailable)'}
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || loadingResources}
          className="btn-primary"
        >
          {loading ? 'Creating Booking...' : 'Book Resource'}
        </button>
      </form>

      {formData.date && availableResources.length === 0 && !loadingResources && (
        <div className="alert alert-warning">
          No resources available for the selected date.
        </div>
      )}
    </div>
  );
};

export default BookingForm;
