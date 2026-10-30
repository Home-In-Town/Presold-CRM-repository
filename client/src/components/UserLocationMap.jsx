import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor, registerPlugin } from '@capacitor/core';
import api from '../services/api';
import toast from 'react-hot-toast';

// Register the Background Geolocation plugin
const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

import { requestBackgroundLocationPermission } from '../utils/locationPermission.jsx';

const UserLocationMap = () => {
  const [locationPermission, setLocationPermission] = useState(() => {
    // Restore permission from localStorage
    return localStorage.getItem('locationPermission') || 'prompt';
  });
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [routeHistory, setRouteHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const currentMarkerRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const waypointMarkersRef = useRef([]);
  const routePolylineRef = useRef(null);
  const watchIdRef = useRef(null);
  const backgroundTrackingInterval = useRef(null);

  useEffect(() => {
    checkLocationPermission();
    checkCheckInStatus();
    
    // Start background tracking if already checked in and has permission
    const savedPermission = localStorage.getItem('locationPermission');
    if (savedPermission === 'granted') {
      startBackgroundLocationTracking();
    }
    
    return () => {
      // Cleanup location watch
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      // Cleanup background tracking
      if (backgroundTrackingInterval.current) {
        // Check if it's a watcher ID (string) or interval ID (number)
        if (typeof backgroundTrackingInterval.current === 'string') {
          // It's a background geolocation watcher
          BackgroundGeolocation.removeWatcher({ id: backgroundTrackingInterval.current })
            .then(() => console.log('Background watcher removed'))
            .catch(err => console.error('Failed to remove watcher:', err));
        } else {
          // It's a regular interval
          clearInterval(backgroundTrackingInterval.current);
        }
      }
    };
  }, []);

  useEffect(() => {
    // Initialize map when Google Maps is loaded
    const initMapWhenReady = () => {
      if (window.google && window.google.maps && mapRef.current && !googleMapRef.current) {
        console.log('Initializing map...');
        initializeMap();
      }
    };

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      initMapWhenReady();
    } else {
      // Wait for Google Maps to load
      console.log('Waiting for Google Maps API...');
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          console.log('Google Maps API loaded!');
          clearInterval(checkInterval);
          initMapWhenReady();
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }
  }, [currentLocation]);

  useEffect(() => {
    // Update map when location or route changes
    if (googleMapRef.current && currentLocation) {
      updateMapLocation();
    }
  }, [currentLocation, routeHistory]);

  const checkLocationPermission = async () => {
    setLoading(true);
    try {
      // Check Capacitor permission first (for mobile)
      const permission = await Geolocation.checkPermissions();
      console.log('Location permission:', permission.location);
      
      if (permission.location === 'granted') {
        setLocationPermission('granted');
        localStorage.setItem('locationPermission', 'granted');
        startLocationTracking();
        startBackgroundLocationTracking();
      } else if (permission.location === 'denied') {
        setLocationPermission('denied');
        localStorage.setItem('locationPermission', 'denied');
      } else {
        // Check browser permissions API for web
        if ('permissions' in navigator) {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          setLocationPermission(result.state);
          localStorage.setItem('locationPermission', result.state);
          
          result.addEventListener('change', () => {
            setLocationPermission(result.state);
            localStorage.setItem('locationPermission', result.state);
            if (result.state === 'granted') {
              startBackgroundLocationTracking();
            }
          });

          if (result.state === 'granted') {
            startLocationTracking();
            startBackgroundLocationTracking();
          }
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
      
      console.log('📅 Today\'s check-in records:', res.data.records);
      
      const todayRecords = res.data.records || [];
      if (todayRecords.length > 0) {
        // Get location history for today's check-in
        const todayCheckIn = todayRecords[0];
        console.log('🔍 Loading route for check-in:', todayCheckIn.id);
        
        const historyRes = await api.get(`/attendance/route-history`, {
          params: {
            checkInId: todayCheckIn.id
          }
        });
        
        console.log('📍 Route history loaded:', historyRes.data.locations?.length || 0, 'points');
        setRouteHistory(historyRes.data.locations || []);
        
        // Trigger map redraw if already initialized
        if (googleMapRef.current && historyRes.data.locations?.length > 0) {
          console.log('🗺️ Drawing route on map with', historyRes.data.locations.length, 'points');
          setTimeout(() => drawRouteOnMap(), 500); // Small delay to ensure map is ready
        }
      } else {
        console.log('⚠️ No check-in records found for today');
      }
    } catch (err) {
      console.error('Failed to load route:', err);
    }
  };

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve, 
        (error) => {
          let errorMessage = 'Unable to get location';
          switch(error.code) {
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location unavailable. Please check GPS.';
              break;
          }
          reject(new Error(errorMessage));
        }, 
        {
          enableHighAccuracy: true,
          timeout: 30000, // Increased to 30 seconds
          maximumAge: 10000 // Accept cached position up to 10 seconds old
        }
      );
    });
  };

  const requestLocationPermission = async () => {
    try {
      // Request permission using Capacitor for mobile
      const permission = await Geolocation.requestPermissions();
      
      if (permission.location === 'granted') {
        setLocationPermission('granted');
        localStorage.setItem('locationPermission', 'granted');
        
        // Get current position
        const position = await Geolocation.getCurrentPosition();
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        
        toast.success('Location access granted!');
        startLocationTracking();
        startBackgroundLocationTracking();
        initializeMap();
      } else {
        setLocationPermission('denied');
        localStorage.setItem('locationPermission', 'denied');
        toast.error('Location access denied. Please enable location in settings.');
      }
    } catch (err) {
      console.error('Permission request failed:', err);
      setLocationPermission('denied');
      toast.error('Location access denied. Please enable location in your settings.');
    }
  };

  const startBackgroundLocationTracking = async () => {
    // Clear existing interval
    if (backgroundTrackingInterval.current) {
      clearInterval(backgroundTrackingInterval.current);
    }

    console.log('🌍 Starting REAL background location tracking with plugin...');

    // Request background location permission with proper dialog
    const granted = await requestBackgroundLocationPermission();
    if (!granted) {
      console.warn('Background location permission not granted');
      // User will see dialog with option to open settings
      return;
    }

    // Use the Background Geolocation Plugin for TRUE background tracking
    try {
      const watcherId = await BackgroundGeolocation.addWatcher(
        {
          // Required: Request permissions from the user
          backgroundMessage: "PreSold CRM is tracking your location to build your route",
          backgroundTitle: "Location Tracking Active",
          requestPermissions: true,
          stale: false,
          distanceFilter: 20 // Update every 20 meters movement (more frequent)
        },
        async function callback(location, error) {
          if (error) {
            console.error('Background location error:', error);
            if (error.code === 'NOT_AUTHORIZED') {
              toast.error('Location permission denied. Please enable "Allow all the time" in Settings.');
            }
            return;
          }

          if (location) {
            console.log('📍 Background location update:', {
              lat: location.latitude,
              lng: location.longitude,
              time: new Date(location.time).toISOString(),
              appInBackground: document.hidden
            });
            
            const locationData = {
              lat: location.latitude,
              lng: location.longitude,
              accuracy: location.accuracy,
              timestamp: new Date(location.time).toISOString()
            };

            // Update UI (only if app is open)
            if (!document.hidden) {
              setCurrentLocation({
                lat: location.latitude,
                lng: location.longitude
              });
            }

            // Send to backend (works even when app is closed!)
            try {
              // Don't check status first - just send the ping
              // The backend will associate it with today's check-in
              await api.post('/attendance/location-ping', locationData);
              console.log('✅ Location sent to backend (app closed:', document.hidden, ')');
              
              // Add to route history (only if app is open)
              if (!document.hidden) {
                setRouteHistory(prev => [...prev, {
                  latitude: location.latitude,
                  longitude: location.longitude,
                  timestamp: locationData.timestamp,
                  accuracy: location.accuracy
                }]);
              }
            } catch (apiErr) {
              console.error('Failed to send location:', apiErr);
              // Don't show toast errors when app is in background
            }
          }
        }
      );

      console.log('✅ Background geolocation watcher added:', watcherId);
      toast.success('🌍 Background location tracking enabled! Works even when app is closed.');
      
      // Store watcher ID to remove later
      backgroundTrackingInterval.current = watcherId;

    } catch (pluginErr) {
      console.error('Background geolocation plugin error:', pluginErr);
      toast.error('Failed to start background tracking: ' + pluginErr.message);
      
      // Fallback to interval-based tracking (only works when app open)
      startFallbackTracking();
    }
  };

  // Fallback tracking using intervals (only works when app is open)
  const startFallbackTracking = () => {
    console.log('⚠️ Using fallback tracking (app must stay open)');
    
    backgroundTrackingInterval.current = setInterval(async () => {
      try {
        console.log('📍 Fallback location update (2 min interval)');
        
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0
        });

        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };

        setCurrentLocation(location);

        const statusRes = await api.get('/attendance/status');
        if (statusRes.data.isCheckedIn) {
          await api.post('/attendance/location-ping', {
            lat: location.lat,
            lng: location.lng,
            accuracy: location.accuracy,
            timestamp: new Date().toISOString()
          });
          console.log('✅ Location sent (fallback)');
          
          setRouteHistory(prev => [...prev, {
            latitude: location.lat,
            longitude: location.lng,
            timestamp: new Date().toISOString(),
            accuracy: location.accuracy
          }]);
        }
      } catch (err) {
        console.error('Fallback tracking failed:', err);
      }
    }, 120000); // 2 minutes
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
    // Use current location if available, otherwise use a default center (India)
    const center = currentLocation || { lat: 20.5937, lng: 78.9629 };

    const mapOptions = {
      center: center,
      zoom: currentLocation ? 15 : 5,
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
      mapTypeControl: true,
      mapTypeControlOptions: {
        position: window.google.maps.ControlPosition.TOP_RIGHT
      },
      streetViewControl: true,
      streetViewControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_BOTTOM
      },
      fullscreenControl: true,
      zoomControl: true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_CENTER
      }
    };

    googleMapRef.current = new window.google.maps.Map(mapRef.current, mapOptions);

    // Add current location marker with custom icon (only if we have location)
    if (currentLocation) {
      currentMarkerRef.current = new window.google.maps.Marker({
        position: currentLocation,
        map: googleMapRef.current,
        title: 'Your Current Location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#8B5CF6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        },
        animation: window.google.maps.Animation.BOUNCE,
        zIndex: 1000
      });

      // Add info window to current marker
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; color: #000;">
            <h4 style="margin: 0 0 4px 0; font-weight: bold;">📍 You Are Here</h4>
            <p style="margin: 4px 0; font-size: 12px;">Lat: ${currentLocation.lat.toFixed(6)}</p>
            <p style="margin: 4px 0; font-size: 12px;">Lng: ${currentLocation.lng.toFixed(6)}</p>
          </div>
        `
      });

      currentMarkerRef.current.addListener('click', () => {
        infoWindow.open(googleMapRef.current, currentMarkerRef.current);
      });
    }

    // If checked in and has route history, draw it
    if (isCheckedIn && routeHistory.length > 0) {
      drawRouteOnMap();
    }
  };

  const updateMapLocation = () => {
    if (!googleMapRef.current || !currentLocation) return;

    // Update marker position
    if (currentMarkerRef.current) {
      currentMarkerRef.current.setPosition(currentLocation);
    }

    // Center map on current location smoothly
    googleMapRef.current.panTo(currentLocation);

    // Draw route if checked in
    if (isCheckedIn && routeHistory.length > 0) {
      drawRouteOnMap();
    }
  };

  const drawRouteOnMap = () => {
    if (!googleMapRef.current) {
      console.warn('⚠️ Cannot draw route: Google Maps not initialized');
      return;
    }

    console.log('🗺️ Drawing route with history:', routeHistory.length, 'points');

    // Clear existing route visualization
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
    }
    if (startMarkerRef.current) {
      startMarkerRef.current.setMap(null);
    }
    if (endMarkerRef.current) {
      endMarkerRef.current.setMap(null);
    }
    waypointMarkersRef.current.forEach(marker => marker.setMap(null));
    waypointMarkersRef.current = [];

    // Build path: check-in point → all location history → current location
    const pathCoordinates = routeHistory.map(loc => ({
      lat: loc.latitude,
      lng: loc.longitude
    }));

    console.log('📍 Path coordinates before adding current:', pathCoordinates.length);

    // Add current location to path if checked in
    if (currentLocation && isCheckedIn) {
      pathCoordinates.push(currentLocation);
      console.log('✅ Added current location to path');
    }

    if (pathCoordinates.length < 2) {
      console.warn('⚠️ Not enough points to draw route:', pathCoordinates.length);
      return;
    }

    console.log('🎨 Drawing polyline with', pathCoordinates.length, 'points');

    // Draw the route polyline with direction arrows
    routePolylineRef.current = new window.google.maps.Polyline({
      path: pathCoordinates,
      geodesic: true,
      strokeColor: '#8B5CF6',
      strokeOpacity: 1.0,
      strokeWeight: 4,
      map: googleMapRef.current,
      icons: [{
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 3,
          fillColor: '#8B5CF6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1
        },
        offset: '0',
        repeat: '100px'
      }]
    });

    console.log('✅ Polyline drawn successfully');

    // Add START marker (check-in point)
    const startPoint = pathCoordinates[0];
    startMarkerRef.current = new window.google.maps.Marker({
      position: startPoint,
      map: googleMapRef.current,
      title: 'Check-in Location (START)',
      label: {
        text: '🟢',
        fontSize: '24px'
      },
      zIndex: 999
    });

    const startInfo = new window.google.maps.InfoWindow({
      content: `
        <div style="padding: 8px; color: #000;">
          <h4 style="margin: 0 0 4px 0; font-weight: bold;">🟢 Starting Point</h4>
          <p style="margin: 4px 0; font-size: 11px;">Check-in location</p>
          <p style="margin: 4px 0; font-size: 11px;">Lat: ${startPoint.lat.toFixed(6)}</p>
          <p style="margin: 4px 0; font-size: 11px;">Lng: ${startPoint.lng.toFixed(6)}</p>
        </div>
      `
    });

    startMarkerRef.current.addListener('click', () => {
      startInfo.open(googleMapRef.current, startMarkerRef.current);
    });

    // Add END marker if checked out (not currently active)
    if (!isCheckedIn && pathCoordinates.length > 1) {
      const endPoint = pathCoordinates[pathCoordinates.length - 1];
      endMarkerRef.current = new window.google.maps.Marker({
        position: endPoint,
        map: googleMapRef.current,
        title: 'Check-out Location (END)',
        label: {
          text: '🔴',
          fontSize: '24px'
        },
        zIndex: 999
      });

      const endInfo = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; color: #000;">
            <h4 style="margin: 0 0 4px 0; font-weight: bold;">🔴 Ending Point</h4>
            <p style="margin: 4px 0; font-size: 11px;">Check-out location</p>
            <p style="margin: 4px 0; font-size: 11px;">Lat: ${endPoint.lat.toFixed(6)}</p>
            <p style="margin: 4px 0; font-size: 11px;">Lng: ${endPoint.lng.toFixed(6)}</p>
          </div>
        `
      });

      endMarkerRef.current.addListener('click', () => {
        endInfo.open(googleMapRef.current, endMarkerRef.current);
      });
    }

    // Add intermediate waypoint markers (skip first and last)
    pathCoordinates.slice(1, -1).forEach((point, index) => {
      const waypoint = new window.google.maps.Marker({
        position: point,
        map: googleMapRef.current,
        title: `Waypoint ${index + 1}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 5,
          fillColor: '#8B5CF6',
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 1
        },
        zIndex: 500
      });
      waypointMarkersRef.current.push(waypoint);
    });

    // Fit map bounds to show entire route
    const bounds = new window.google.maps.LatLngBounds();
    pathCoordinates.forEach(point => bounds.extend(point));
    googleMapRef.current.fitBounds(bounds);
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
        {locationPermission === 'granted' || window.google ? (
          <>
            <div ref={mapRef} className="h-80 w-full" style={{ minHeight: '320px' }} />
            
            {/* Permission overlay if not granted */}
            {locationPermission !== 'granted' && (
              <div className="absolute inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-center max-w-md px-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center mx-auto mb-4"
                  >
                    <MapPin className="text-brand-400" size={32} />
                  </motion.div>
                  
                  <h4 className="text-lg font-semibold text-white mb-2">
                    Enable Location Tracking
                  </h4>
                  
                  <p className="text-sm text-gray-400 mb-6">
                    Allow location access to view your live position, track your route, and enable check-in functionality.
                  </p>

                  <button
                    onClick={requestLocationPermission}
                    className="btn-primary flex items-center gap-2 mx-auto"
                  >
                    <Navigation size={16} />
                    <span>Allow Location Access</span>
                  </button>
                </div>
              </div>
            )}
            
            {/* Route Info Overlay */}
            {locationPermission === 'granted' && isCheckedIn && routeHistory.length > 0 && (
              <div className="absolute bottom-4 left-4 bg-dark-900/95 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10 shadow-xl">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-xs text-gray-300">Starting Point</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-xs text-gray-300">Current Location</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-brand-400" />
                    <span className="text-xs text-gray-300">
                      {routeHistory.length} waypoints tracked
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Legend for completed routes (when checked out) */}
            {locationPermission === 'granted' && !isCheckedIn && routeHistory.length > 0 && (
              <div className="absolute bottom-4 left-4 bg-dark-900/95 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10 shadow-xl">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🟢</span>
                    <span className="text-xs text-gray-300">Check-in Point</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔴</span>
                    <span className="text-xs text-gray-300">Check-out Point</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-xs text-gray-300">Travel Route</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-brand-400" />
                    <span className="text-xs text-gray-300">
                      {routeHistory.length} location points
                    </span>
                  </div>
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
                  : 'Loading Map...'}
              </h4>
              
              <p className="text-sm text-gray-400 mb-6">
                {locationPermission === 'denied'
                  ? 'Location access was denied. Please enable location permissions in your browser settings to use this feature.'
                  : 'Waiting for Google Maps to load...'}
              </p>

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


export default UserLocationMap;
