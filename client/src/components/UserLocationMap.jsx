import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function UserLocationMap() {
  const [locationPermission, setLocationPermission] = useState('prompt'); // 'granted', 'denied', 'prompt'
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [routeHistory, setRouteHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const currentMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    checkLocationPermission();
    checkCheckInStatus();
    return () => {
      // Cleanup location watch
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Initialize map when Google Maps is loaded and we have location permission
    if (window.google && mapRef.current && !googleMapRef.current && locationPermission === 'granted') {
      initializeMap();
    }
  }, [locationPermission]);

  useEffect(() => {
    // Update map when location or route changes
    if (googleMapRef.current && currentLocation) {
      updateMapLocation();
    }
  }, [currentLocation, routeHistory]);

  const checkLocationPermission = async () => {
    setLoading(true);
    try {
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setLocationPermission(result.state);
        
        result.addEventListener('change', () => {
          setLocationPermission(result.state);
        });

        if (result.state === 'granted') {
          startLocationTracking();
        }
      } else {
        // Fallback for browsers that don't support permissions API
        try {
          const position = await getCurrentPosition();
          setLocationPermission('granted');
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        } catch (err) {
          setLocationPermission('denied');
        }
      }
    } catch (err) {
      console.error('Permission check failed:', err);
      setLocationPermission('prompt');
    } finally {
      setLoading(false);
    }
  };

  const checkCheckInStatus = async () => {
    try {
      const res = await api.get('/attendance/status');
      if (res.data.isCheckedIn) {
        setIsCheckedIn(true);
        loadTodayRoute();
      }
    } catch (err) {
      console.error('Failed to check status:', err);
    }
  };

  const loadTodayRoute = async () => {
    try {
      const today = new Date();
      const res = await api.get('/attendance/history', {
        params: {
          month: today.getMonth() + 1,
          year: today.getFullYear()
        }
      });
      
      const todayRecords = res.data.records || [];
      if (todayRecords.length > 0) {
        // Get location history for today's check-in
        const todayCheckIn = todayRecords[0];
        const historyRes = await api.get(`/attendance/route-history`, {
          params: {
            checkInId: todayCheckIn.id
          }
        });
        
        setRouteHistory(historyRes.data.locations || []);
      }
    } catch (err) {
      console.error('Failed to load route:', err);
    }
  };

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
  };

  const requestLocationPermission = async () => {
    try {
      const position = await getCurrentPosition();
      setLocationPermission('granted');
      setCurrentLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
      toast.success('Location access granted!');
      startLocationTracking();
      initializeMap();
    } catch (err) {
      setLocationPermission('denied');
      toast.error('Location access denied. Please enable location in your browser settings.');
    }
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    // Watch position for real-time updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCurrentLocation(newLocation);

        // Add to route history if checked in
        if (isCheckedIn) {
          setRouteHistory(prev => [...prev, {
            latitude: newLocation.lat,
            longitude: newLocation.lng,
            timestamp: new Date().toISOString()
          }]);
        }
      },
      (error) => {
        console.error('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  const initializeMap = () => {
    if (!currentLocation) return;

    const mapOptions = {
      center: currentLocation,
      zoom: 15,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#1a1f2e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1f2e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
        {
          featureType: 'road',
          elementType: 'geometry',
          stylers: [{ color: '#38414e' }]
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#17263c' }]
        }
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true
    };

    googleMapRef.current = new window.google.maps.Map(mapRef.current, mapOptions);

    // Add current location marker
    currentMarkerRef.current = new window.google.maps.Marker({
      position: currentLocation,
      map: googleMapRef.current,
      title: 'Your Location',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#8B5CF6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      },
      animation: window.google.maps.Animation.DROP
    });
  };

  const updateMapLocation = () => {
    if (!googleMapRef.current || !currentLocation) return;

    // Update marker position
    if (currentMarkerRef.current) {
      currentMarkerRef.current.setPosition(currentLocation);
    }

    // Center map on current location
    googleMapRef.current.panTo(currentLocation);

    // Draw route if checked in
    if (isCheckedIn && routeHistory.length > 0) {
      const pathCoordinates = routeHistory.map(loc => ({
        lat: loc.latitude,
        lng: loc.longitude
      }));

      // Add current location to path
      pathCoordinates.push(currentLocation);

      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
      }

      routePolylineRef.current = new window.google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#8B5CF6',
        strokeOpacity: 1.0,
        strokeWeight: 3,
        map: googleMapRef.current
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-dark-800 rounded-xl border border-white/5 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
            <p className="mt-4 text-sm text-gray-400">Loading map...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-800 rounded-xl border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="text-brand-400" size={20} />
          <div>
            <h3 className="text-lg font-semibold text-white">Your Location</h3>
            <p className="text-xs text-gray-400">
              {isCheckedIn ? 'Tracking your route' : 'Check in to start tracking'}
            </p>
          </div>
        </div>
        
        {/* Location Status */}
        <div className="flex items-center gap-2">
          {locationPermission === 'granted' ? (
            <div className="flex items-center gap-1 text-green-400 text-xs">
              <CheckCircle size={14} />
              <span>Location Active</span>
            </div>
          ) : locationPermission === 'denied' ? (
            <div className="flex items-center gap-1 text-red-400 text-xs">
              <Lock size={14} />
              <span>Location Blocked</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-yellow-400 text-xs">
              <AlertCircle size={14} />
              <span>Permission Required</span>
            </div>
          )}
        </div>
      </div>

      {/* Map or Permission Request */}
      <div className="relative">
        {locationPermission === 'granted' ? (
          <>
            <div ref={mapRef} className="h-80 w-full" />
            
            {/* Route Info Overlay */}
            {isCheckedIn && routeHistory.length > 0 && (
              <div className="absolute bottom-4 left-4 bg-dark-900/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-brand-400" />
                  <span className="text-xs text-gray-300">
                    {routeHistory.length} location points tracked
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="h-80 flex items-center justify-center bg-dark-900">
            <div className="text-center max-w-md px-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center mx-auto mb-4"
              >
                <MapPin className="text-brand-400" size={32} />
              </motion.div>
              
              <h4 className="text-lg font-semibold text-white mb-2">
                {locationPermission === 'denied' 
                  ? 'Location Access Required' 
                  : 'Enable Location Tracking'}
              </h4>
              
              <p className="text-sm text-gray-400 mb-6">
                {locationPermission === 'denied'
                  ? 'Location access was denied. Please enable location permissions in your browser settings to use this feature.'
                  : 'Allow location access to view your live position, track your route, and enable check-in functionality.'}
              </p>

              {locationPermission !== 'denied' && (
                <button
                  onClick={requestLocationPermission}
                  className="btn-primary flex items-center gap-2 mx-auto"
                >
                  <Navigation size={16} />
                  <span>Allow Location Access</span>
                </button>
              )}

              {locationPermission === 'denied' && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-xs text-red-400">
                    💡 <strong>Tip:</strong> Click the lock icon in your browser's address bar to manage location permissions
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info Footer */}
      {locationPermission === 'granted' && currentLocation && (
        <div className="p-3 border-t border-white/5 bg-dark-900/50">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-gray-500">Latitude:</span>
                <span className="text-gray-300 ml-1 font-mono">{currentLocation.lat.toFixed(6)}</span>
              </div>
              <div>
                <span className="text-gray-500">Longitude:</span>
                <span className="text-gray-300 ml-1 font-mono">{currentLocation.lng.toFixed(6)}</span>
              </div>
            </div>
            <a
              href={`https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              <span>Open in Maps</span>
              <MapPin size={12} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
