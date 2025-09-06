'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Plane, Calendar, MapPin, Users, Clock } from 'lucide-react';
import { StripeProvider } from '@/components/providers/StripeProvider';
import { PaymentForm } from '@/components/PaymentForm';

interface Flight {
  id: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  availableSeats: number;
  soldSeats: number;
  minimumSeats: number;
  aircraft: {
    model: string;
    manufacturer: string;
  };
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState({
    origin: '',
    destination: '',
    date: '',
  });
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState('');
  const [currentBookingId, setCurrentBookingId] = useState('');
  const [bookingData, setBookingData] = useState({
    passengerName: '',
    passengerEmail: '',
    seatsToBook: 1,
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    
    fetchFlights();
  }, [session, status]);

  const fetchFlights = async () => {
    try {
      const params = new URLSearchParams();
      if (searchParams.origin) params.append('origin', searchParams.origin);
      if (searchParams.destination) params.append('destination', searchParams.destination);
      if (searchParams.date) params.append('date', searchParams.date);

      const response = await fetch(`/api/flights?${params}`);
      const data = await response.json();
      setFlights(data);
    } catch (error) {
      console.error('Error fetching flights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchFlights();
  };

  const handleBooking = async (flight: Flight) => {
    setSelectedFlight(flight);
    setBookingData({
      passengerName: session?.user?.name || '',
      passengerEmail: session?.user?.email || '',
      seatsToBook: 1,
    });
    setShowBookingModal(true);
  };

  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlight) return;

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flightId: selectedFlight.id,
          ...bookingData,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentBookingId(data.bookingId);
        setPaymentClientSecret(data.clientSecret);
        setShowBookingModal(false);
        setShowPaymentModal(true);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert('Booking failed. Please try again.');
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setPaymentClientSecret('');
    setCurrentBookingId('');
    alert('Payment successful! Your booking has been confirmed.');
    fetchFlights(); // Refresh flights to show updated seat availability
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setPaymentClientSecret('');
    setCurrentBookingId('');
    // TODO: Cancel the booking in the database
  };

  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Plane className="h-8 w-8 text-indigo-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">Flight Booking</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {session.user.name}</span>
              {session.user.isAdmin && (
                <button
                  onClick={() => router.push('/admin')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Admin Panel
                </button>
              )}
              <button
                onClick={() => signOut()}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline h-4 w-4 mr-1" />
                From
              </label>
              <input
                type="text"
                value={searchParams.origin}
                onChange={(e) => setSearchParams({ ...searchParams, origin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Origin city"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline h-4 w-4 mr-1" />
                To
              </label>
              <input
                type="text"
                value={searchParams.destination}
                onChange={(e) => setSearchParams({ ...searchParams, destination: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Destination city"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Date
              </label>
              <input
                type="date"
                value={searchParams.date}
                onChange={(e) => setSearchParams({ ...searchParams, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search Flights'}
              </button>
            </div>
          </form>
        </div>

        {/* Flight Results */}
        <div className="space-y-4">
          {flights.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No flights found. Try adjusting your search criteria.
            </div>
          )}
          
          {flights.map((flight) => (
            <div key={flight.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{flight.flightNumber}</div>
                    <div className="text-sm text-gray-500">
                      {flight.aircraft.manufacturer} {flight.aircraft.model}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <Clock className="h-4 w-4 mr-1" />
                      Departure
                    </div>
                    <div className="font-medium">{flight.origin}</div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(flight.departureTime), 'MMM dd, HH:mm')}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <Clock className="h-4 w-4 mr-1" />
                      Arrival
                    </div>
                    <div className="font-medium">{flight.destination}</div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(flight.arrivalTime), 'MMM dd, HH:mm')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">${flight.price}</div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 mr-1" />
                      {flight.availableSeats} seats left
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Min. {flight.minimumSeats} seats required
                    </div>
                  </div>
                </div>
                <div className="ml-6">
                  <button
                    onClick={() => handleBooking(flight)}
                    disabled={flight.availableSeats === 0}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {flight.availableSeats === 0 ? 'Sold Out' : 'Book Now'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedFlight && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Book Flight {selectedFlight.flightNumber}</h3>
            <form onSubmit={submitBooking} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passenger Name
                </label>
                <input
                  type="text"
                  required
                  value={bookingData.passengerName}
                  onChange={(e) => setBookingData({ ...bookingData, passengerName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passenger Email
                </label>
                <input
                  type="email"
                  required
                  value={bookingData.passengerEmail}
                  onChange={(e) => setBookingData({ ...bookingData, passengerEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Seats
                </label>
                <select
                  value={bookingData.seatsToBook}
                  onChange={(e) => setBookingData({ ...bookingData, seatsToBook: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {[...Array(Math.min(selectedFlight.availableSeats, 5))].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} seat{i > 0 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between text-sm">
                  <span>Price per seat:</span>
                  <span>${selectedFlight.price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Seats:</span>
                  <span>{bookingData.seatsToBook}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2 mt-2">
                  <span>Total:</span>
                  <span>${selectedFlight.price * bookingData.seatsToBook}</span>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
                >
                  Book Flight
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedFlight && paymentClientSecret && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              Complete Payment for Flight {selectedFlight.flightNumber}
            </h3>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span>Flight:</span>
                <span>{selectedFlight.flightNumber}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Route:</span>
                <span>{selectedFlight.origin} → {selectedFlight.destination}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Passenger:</span>
                <span>{bookingData.passengerName}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Seats:</span>
                <span>{bookingData.seatsToBook}</span>
              </div>
            </div>
            <StripeProvider clientSecret={paymentClientSecret}>
              <PaymentForm
                bookingId={currentBookingId}
                amount={selectedFlight.price * bookingData.seatsToBook}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
              />
            </StripeProvider>
          </div>
        </div>
      )}
    </div>
  );
}
