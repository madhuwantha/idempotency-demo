import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

import { bookingAPI, type Booking } from '../services/api';

type BookingListProps = {
  userId: string;
  refreshTrigger: number;
};

const BookingList: React.FC<BookingListProps> = ({ userId, refreshTrigger }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    resourceId: '',
    date: ''
  });

  useEffect(() => {
    fetchBookings();
  }, [userId, refreshTrigger]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const result = await bookingAPI.getBookings(userId, filter);
      setBookings(result.bookings);
    } catch {
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await bookingAPI.cancelBooking(bookingId, userId);
      toast.success('Booking cancelled successfully');
      fetchBookings();
    } catch {
      toast.error('Failed to cancel booking');
    }
  };

  const applyFilter = () => {
    fetchBookings();
  };

  if (loading) {
    return <div className="loading">Loading bookings...</div>;
  }

  return (
    <div className="booking-list">
      <h2>Your Bookings</h2>

      <div className="filter-section">
        <input
          type="text"
          placeholder="Filter by Resource ID"
          value={filter.resourceId}
          onChange={(event) =>
            setFilter({ ...filter, resourceId: event.target.value })
          }
        />
        <input
          type="date"
          value={filter.date}
          onChange={(event) => setFilter({ ...filter, date: event.target.value })}
        />
        <button onClick={applyFilter}>Apply Filter</button>
        <button
          onClick={() => {
            setFilter({ resourceId: '', date: '' });
            fetchBookings();
          }}
        >
          Clear
        </button>
      </div>

      {bookings.length === 0 ? (
        <p className="no-bookings">No bookings found.</p>
      ) : (
        <div className="bookings-grid">
          {bookings.map((booking) => (
            <div key={booking._id} className="booking-card">
              <div className="booking-header">
                <h3>{booking.resourceId}</h3>
                <span className={`status status-${booking.status}`}>
                  {booking.status}
                </span>
              </div>
              <div className="booking-details">
                <p>
                  <strong>Date:</strong> {booking.date}
                </p>
                <p>
                  <strong>Created:</strong>{' '}
                  {format(new Date(booking.createdAt), 'PPpp')}
                </p>
                <p>
                  <strong>Booking ID:</strong> {booking._id}
                </p>
              </div>
              {booking.status === 'confirmed' && (
                <button
                  className="btn-cancel"
                  onClick={() => handleCancelBooking(booking._id)}
                >
                  Cancel Booking
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingList;
