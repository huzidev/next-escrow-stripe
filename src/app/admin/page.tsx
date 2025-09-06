'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Plane, Plus, Edit, Trash2, Home, Calendar, DollarSign, Users } from 'lucide-react';

interface Flight {
  id: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
  soldSeats: number;
  minimumSeats: number;
  status: string;
  aircraft: {
    id: string;
    model: string;
    manufacturer: string;
  };
}

interface Aircraft {
  id: string;
  model: string;
  manufacturer: string;
  totalSeats: number;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
  const [flightForm, setFlightForm] = useState({
    flightNumber: '',
    origin: '',
    destination: '',
    departureTime: '',
    arrivalTime: '',
    price: '',
    minimumSeats: '5',
    aircraftId: '',
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    if (!session.user.isAdmin) {
      router.push('/');
      return;
    }
    
    fetchData();
  }, [session, status]);

  const fetchData = async () => {
    try {
      const [flightsRes, aircraftRes] = await Promise.all([
        fetch('/api/flights'),
        fetch('/api/aircraft'),
      ]);
      
      const [flightsData, aircraftData] = await Promise.all([
        flightsRes.json(),
        aircraftRes.json(),
      ]);
      
      setFlights(flightsData);
      setAircraft(aircraftData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFlightForm({
      flightNumber: '',
      origin: '',
      destination: '',
      departureTime: '',
      arrivalTime: '',
      price: '',
      minimumSeats: '5',
      aircraftId: '',
    });
  };

  const openCreateModal = () => {
    resetForm();
    setEditingFlight(null);
    setShowCreateModal(true);
  };

  const openEditModal = (flight: Flight) => {
    setFlightForm({
      flightNumber: flight.flightNumber,
      origin: flight.origin,
      destination: flight.destination,
      departureTime: format(new Date(flight.departureTime), "yyyy-MM-dd'T'HH:mm"),
      arrivalTime: format(new Date(flight.arrivalTime), "yyyy-MM-dd'T'HH:mm"),
      price: flight.price.toString(),
      minimumSeats: flight.minimumSeats.toString(),
      aircraftId: flight.aircraft.id,
    });
    setEditingFlight(flight);
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingFlight ? `/api/flights/${editingFlight.id}` : '/api/flights';
      const method = editingFlight ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flightForm),
      });

      if (response.ok) {
        setShowCreateModal(false);
        fetchData();
        alert(editingFlight ? 'Flight updated successfully!' : 'Flight created successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert('Operation failed. Please try again.');
    }
  };

  const handleDelete = async (flightId: string) => {
    if (!confirm('Are you sure you want to delete this flight?')) return;

    try {
      const response = await fetch(`/api/flights/${flightId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
        alert('Flight deleted successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert('Delete failed. Please try again.');
    }
  };

  const runRefundCheck = async () => {
    if (!confirm('This will check flights and process refunds for those not meeting minimum seat requirements. Continue?')) return;

    try {
      const response = await fetch('/api/refunds/check', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Refund check completed. ${data.results.length} bookings processed.`);
        fetchData();
      } else {
        alert('Refund check failed.');
      }
    } catch (error) {
      alert('Refund check failed. Please try again.');
    }
  };

  if (status === 'loading' || loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!session || !session.user.isAdmin) {
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
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                <Home className="h-4 w-4 mr-2" />
                Main Site
              </button>
              <span className="text-gray-700">Admin: {session.user.name}</span>
              <button
                onClick={() => signOut()}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Plane className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Flights</p>
                <p className="text-2xl font-semibold text-gray-900">{flights.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Seats Sold</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {flights.reduce((sum, flight) => sum + flight.soldSeats, 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Revenue Potential</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${flights.reduce((sum, flight) => sum + (flight.price * flight.soldSeats), 0).toFixed(0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Aircraft Types</p>
                <p className="text-2xl font-semibold text-gray-900">{aircraft.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={openCreateModal}
            className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Flight
          </button>
          <button
            onClick={runRefundCheck}
            className="flex items-center bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
          >
            Run Refund Check
          </button>
        </div>

        {/* Flights Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">All Flights</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Flight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {flights.map((flight) => (
                  <tr key={flight.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{flight.flightNumber}</div>
                        <div className="text-sm text-gray-500">
                          {flight.aircraft.manufacturer} {flight.aircraft.model}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{flight.origin} → {flight.destination}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(new Date(flight.departureTime), 'MMM dd, HH:mm')}
                      </div>
                      <div className="text-sm text-gray-500">
                        to {format(new Date(flight.arrivalTime), 'HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {flight.soldSeats}/{flight.totalSeats} sold
                      </div>
                      <div className="text-sm text-gray-500">
                        Min: {flight.minimumSeats}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${flight.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        flight.status === 'SCHEDULED' ? 'bg-green-100 text-green-800' :
                        flight.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        flight.status === 'REFUNDED' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {flight.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(flight)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(flight.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingFlight ? 'Edit Flight' : 'Create New Flight'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Flight Number
                  </label>
                  <input
                    type="text"
                    required
                    value={flightForm.flightNumber}
                    onChange={(e) => setFlightForm({ ...flightForm, flightNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="FL001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aircraft
                  </label>
                  <select
                    required
                    value={flightForm.aircraftId}
                    onChange={(e) => setFlightForm({ ...flightForm, aircraftId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Aircraft</option>
                    {aircraft.map((plane) => (
                      <option key={plane.id} value={plane.id}>
                        {plane.manufacturer} {plane.model} ({plane.totalSeats} seats)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Origin
                  </label>
                  <input
                    type="text"
                    required
                    value={flightForm.origin}
                    onChange={(e) => setFlightForm({ ...flightForm, origin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination
                  </label>
                  <input
                    type="text"
                    required
                    value={flightForm.destination}
                    onChange={(e) => setFlightForm({ ...flightForm, destination: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Los Angeles"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departure Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={flightForm.departureTime}
                    onChange={(e) => setFlightForm({ ...flightForm, departureTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arrival Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={flightForm.arrivalTime}
                    onChange={(e) => setFlightForm({ ...flightForm, arrivalTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={flightForm.price}
                    onChange={(e) => setFlightForm({ ...flightForm, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Seats Required
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="15"
                    value={flightForm.minimumSeats}
                    onChange={(e) => setFlightForm({ ...flightForm, minimumSeats: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
                >
                  {editingFlight ? 'Update Flight' : 'Create Flight'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
