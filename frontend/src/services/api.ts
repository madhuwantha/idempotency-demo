import axios from 'axios';

const API_BASE_URL =
  // process.env.REACT_APP_API_URL || 'https://api.bookingapp.com/api';
  process.env.REACT_APP_API_URL || 'http://bookingapp.local/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

const generateIdempotencyKey = () =>
  `idem_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

export type Booking = {
  _id: string;
  userId: string;
  resourceId: string;
  date: string;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
};

export type BookingResponse = {
  success: true;
  message: string;
  booking: {
    id: string;
    userId: string;
    resourceId: string;
    date: string;
    status: 'confirmed' | 'cancelled';
    createdAt: string;
  };
};

export type BookingsListResponse = {
  success: true;
  bookings: Booking[];
};

export type AvailableResourcesResponse = {
  success: true;
  date: string;
  availableResources: string[];
};

export type ApiError = {
  error?: string;
  code?: string;
  details?: string;
};

const normalizeError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as ApiError) || { error: error.message };
  }
  if (error instanceof Error) {
    return { error: error.message };
  }
  return { error: 'Unknown error' };
};

export const bookingAPI = {
  createBooking: async (
    userId: string,
    resourceId: string,
    date: string
  ): Promise<BookingResponse> => {
    const idempotencyKey = generateIdempotencyKey();

    try {
      const response = await apiClient.post<BookingResponse>(
        '/bookings',
        {
          userId,
          resourceId,
          date
        },
        {
          headers: {
            'Idempotency-Key': idempotencyKey
          }
        }
      );
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  getBookings: async (
    userId: string,
    filters: { resourceId?: string; date?: string } = {}
  ): Promise<BookingsListResponse> => {
    try {
      const params = new URLSearchParams();
      if (filters.resourceId) params.append('resourceId', filters.resourceId);
      if (filters.date) params.append('date', filters.date);

      const response = await apiClient.get<BookingsListResponse>(
        `/bookings/${userId}?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  cancelBooking: async (
    bookingId: string,
    userId: string
  ): Promise<{ success: true; message: string; booking: Booking }> => {
    try {
      const response = await apiClient.patch(`/bookings/${bookingId}/cancel`, {
        userId
      });
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  getAvailableResources: async (
    date: string
  ): Promise<AvailableResourcesResponse> => {
    try {
      const response = await apiClient.get<AvailableResourcesResponse>(
        `/resources/available?date=${date}`
      );
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  }
};
