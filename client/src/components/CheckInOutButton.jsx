import { useState, useEffect } from 'react';
import { MapPin, LogIn, LogOut, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function CheckInOutButton() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);

  // Check current check-in status and location permission on mount
  useEffect(() => {
    checkStatus();
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setLocationPermission(result.state);
      } else {
        // Try to get location to check if it's available
        try {
          await getCurrentLocation();
          setLocationPermission('granted');
        } catch {
          setLocationPermission('prompt');
        }
      }
    } catch (err) {
      console.error('Permission check error:', err);
      setLocationPermission('prompt');
    }
  };

  // Update elapsed time every second
  useEffect(() => {
    if (!isCheckedIn || !checkInTime) return;

    const timer = setInterval(() => {
      const now = new Date();
      const checkIn = new Date(checkInTime);
      const diff = now - checkIn;
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [isCheckedIn, checkInTime]);

  const checkStatus = async () => {
    try {
      const res = await api.get('/attendance/status');
      if (res.data.isCheckedIn) {
        setIsCheckedIn(true);
        setCheckInTime(res.data.checkInTime);
        setCurrentLocation({
          lat: res.data.checkInLat,
          lng: res.data.checkInLng
        });
      }
    } catch (err) {
      console.error('Failed to check status:', err);
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  const handleCheckIn = async () => {
    // Check location permission first
    if (locationPermission !== 'granted') {
      toast.error('Please allow location access to check in', {
        duration: 4000,
        icon: '📍'
      });
      
      // Try to request permission
      try {
        await getCurrentLocation();
        setLocationPermission('granted');
      } catch (err) {
        toast.error('Location access is required for check-in. Please enable it in your browser settings.');
        return;
      }
    }

    setLoading(true);
    const loadingToast = toast.loading('Getting location...');

    try {
      // Get current location
      const location = await getCurrentLocation();
      setCurrentLocation(location);

      // Send check-in request
      const res = await api.post('/attendance/check-in', {
        latitude: location.lat,
        longitude: location.lng,
        accuracy: location.accuracy
      });

      toast.dismiss(loadingToast);
      toast.success('Checked in successfully!');
      
      setIsCheckedIn(true);
      setCheckInTime(new Date().toISOString());
      
      // Start background location tracking
      startLocationTracking();
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error('Check-in failed:', err);
      toast.error(err.message || 'Failed to check in. Please enable location access.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!window.confirm('Are you sure you want to check out?')) {
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Getting location...');

    try {
      // Get current location
      const location = await getCurrentLocation();

      // Send check-out request
      await api.post('/attendance/check-out', {
        latitude: location.lat,
        longitude: location.lng,
        accuracy: location.accuracy
      });

      toast.dismiss(loadingToast);
      toast.success('Checked out successfully!');
      
      setIsCheckedIn(false);
      setCheckInTime(null);
      setElapsedTime('00:00:00');
      
      // Stop background location tracking
      stopLocationTracking();
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error('Check-out failed:', err);
      toast.error(err.message || 'Failed to check out');
    } finally {
      setLoading(false);
    }
  };

  // Background location tracking (every 5 minutes)
  let locationTrackingInterval = null;

  const startLocationTracking = () => {
    locationTrackingInterval = setInterval(async () => {
      try {
        const location = await getCurrentLocation();
        await api.post('/attendance/location-ping', {
          latitude: location.lat,
          longitude: location.lng,
          accuracy: location.accuracy
        });
        console.log('Location ping sent:', location);
      } catch (err) {
        console.error('Location ping failed:', err);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  };

  const stopLocationTracking = () => {
    if (locationTrackingInterval) {
      clearInterval(locationTrackingInterval);
      locationTrackingInterval = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        className="fixed bottom-24 right-6 z-40"
      >
        <div className="flex flex-col items-end gap-2">
          {/* Timer Display (when checked in) */}
          {isCheckedIn && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-800 border border-white/10 rounded-lg px-4 py-2 shadow-lg"
            >
              <div className="flex items-center gap-2 text-sm">
                <Clock size={16} className="text-brand-400" />
                <span className="text-white font-mono">{elapsedTime}</span>
              </div>
            </motion.div>
          )}

          {/* Main Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
            disabled={loading || (locationPermission === 'denied')}
            className={`
              w-16 h-16 rounded-full shadow-xl flex items-center justify-center
              transition-all duration-300 border-2
              ${isCheckedIn 
                ? 'bg-red-500 hover:bg-red-600 border-red-400' 
                : locationPermission === 'denied'
                  ? 'bg-gray-500 cursor-not-allowed border-gray-400'
                  : 'bg-green-500 hover:bg-green-600 border-green-400'
              }
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            title={locationPermission === 'denied' ? 'Location access required' : ''}
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isCheckedIn ? (
              <LogOut size={24} className="text-white" />
            ) : (
              <LogIn size={24} className="text-white" />
            )}
          </motion.button>

          {/* Label */}
          <div className="text-xs font-medium text-gray-400 bg-dark-800 px-3 py-1 rounded-full border border-white/10">
            {isCheckedIn ? 'Check Out' : 'Check In'}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
