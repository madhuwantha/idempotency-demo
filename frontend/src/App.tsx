import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';

import BookingForm from './components/BookingForm';
import BookingList from './components/BookingList';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

const App: React.FC = () => {
  const [userId, setUserId] = useState('user_alice');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleBookingCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const users = ['user_alice', 'user_bob', 'user_charlie', 'user_diana'];

  return (
    <div className="App">
      <header className="app-header">
        <h1>Room Booking System</h1>
        <div className="user-selector">
          <label>Current User: </label>
          <select value={userId} onChange={(event) => setUserId(event.target.value)}>
            {users.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          <div className="left-panel">
            <BookingForm userId={userId} onBookingCreated={handleBookingCreated} />
          </div>

          <div className="right-panel">
            <BookingList userId={userId} refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </main>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
    </div>
  );
};

export default App;
