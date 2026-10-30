import { useState, useEffect, useRef } from 'react';
import { MapPin, Clock, Navigation, TrendingUp, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';

// Helper: Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// Helper: Detect stops (places where user stayed > 5 minutes within 100m radius)
function detectStops(locationHistory) {
  if (locationHistory.length < 2) return [];
  
  const stops = [];
  let currentStop = null;
  const STOP_RADIUS_KM = 0.1; // 100 meters
  const MIN_STOP_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  locationHistory.forEach((loc, index) => {
    if (index === 0) {
      currentStop = {
        startTime: new Date(loc.timestamp),
        endTime: new Date(loc.timestamp),
        lat: loc.lat,
        lng: loc.lng,
        locations: [loc]
      };
      return;
    }

    const distance = calculateDistance(
      currentStop.lat,
      currentStop.lng,
      loc.lat,
      loc.lng
    );

    if (distance <= STOP_RADIUS_KM) {
      // Still at the same location
      currentStop.endTime = new Date(loc.timestamp);
      currentStop.locations.push(loc);
    } else {
      // Moved to a new location
      const duration = currentStop.endTime - currentStop.startTime;
      
      if (duration >= MIN_STOP_DURATION_MS) {
        stops.push({
          ...currentStop,
          duration: duration,
          durationFormatted: formatDuration(duration)
        });
      }

      // Start new stop
      currentStop = {
        startTime: new Date(loc.timestamp),
        endTime: new Date(loc.timestamp),
        lat: loc.lat,
        lng: loc.lng,
        locations: [loc]
      };
    }
  });

  // Add final stop if it meets duration criteria
  if (currentStop) {
    const duration = currentStop.endTime - currentStop.startTime;
    if (duration >= MIN_STOP_DURATION_MS) {
      stops.push({
        ...currentStop,
        duration: duration,
        durationFormatted: formatDuration(duration)
      });
    }
  }

  return stops;
}

// Helper: Format duration
function formatDuration(ms) {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Helper: Format time
function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export default function AdminUserTimeline({ userData }) {
  const [timeline, setTimeline] = useState(null);
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const routePolylineRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (userData && userData.checkIn) {
      processTimeline(userData);
    } else {
      setTimeline(null);
      // Clear map
      if (googleMapRef.current) {
        clearMapMarkers();
      }
    }
  }, [userData]);

  useEffect(() => {
    // Initialize map when Google Maps is loaded
    const initMapWhenReady = () => {
      if (window.google && window.google.maps && mapRef.current && !googleMapRef.current) {
        initializeMap();
      }
    };

    if (window.google && window.google.maps) {
      initMapWhenReady();
    } else {
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkInterval);
          initMapWhenReady();
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
  }, []);

  useEffect(() => {
    // Update map when timeline changes
    if (googleMapRef.current && timeline) {
      drawRouteOnMap();
    }
  }, [timeline]);

  const initializeMap = () => {
    const defaultCenter = { lat: 20.5937, lng: 78.9629 };
    
    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 6,
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
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true
    });
  };

  const clearMapMarkers = () => {
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  };

  const drawRouteOnMap = () => {
    if (!googleMapRef.current || !timeline) return;

    clearMapMarkers();

    const locations = userData.locationHistory || [];
    
    // Build path coordinates
    const pathCoordinates = [
      { lat: timeline.checkIn.lat, lng: timeline.checkIn.lng },
      ...locations.map(loc => ({ lat: loc.lat, lng: loc.lng })),
      ...(timeline.checkOut ? [{ lat: timeline.checkOut.lat, lng: timeline.checkOut.lng }] : [])
    ];

    if (pathCoordinates.length < 2) return;

    // Draw the route polyline
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

    // Add START marker
    const startMarker = new window.google.maps.Marker({
      position: pathCoordinates[0],
      map: googleMapRef.current,
      title: 'Check-in Location (START)',
      label: {
        text: '🟢',
        fontSize: '24px'
      },
      zIndex: 1000
    });

    const startInfo = new window.google.maps.InfoWindow({
      content: `
        <div style="padding: 8px; color: #000;">
          <h4 style="margin: 0 0 4px 0; font-weight: bold;">🟢 Starting Point</h4>
          <p style="margin: 4px 0; font-size: 11px;">${timeline.userName}</p>
          <p style="margin: 4px 0; font-size: 11px;">${formatTime(timeline.checkIn.time)}</p>
        </div>
      `
    });

    startMarker.addListener('click', () => {
      startInfo.open(googleMapRef.current, startMarker);
    });

    markersRef.current.push(startMarker);

    // Add markers for each stop
    timeline.stops.forEach((stop, index) => {
      const stopMarker = new window.google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map: googleMapRef.current,
        title: `Stop #${index + 1}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#8B5CF6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        },
        label: {
          text: `${index + 1}`,
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 'bold'
        },
        zIndex: 900
      });

      const stopInfo = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; color: #000;">
            <h4 style="margin: 0 0 4px 0; font-weight: bold;">📍 Stop #${index + 1}</h4>
            <p style="margin: 4px 0; font-size: 11px;">Duration: ${stop.durationFormatted}</p>
            <p style="margin: 4px 0; font-size: 11px;">${formatTime(stop.startTime)} - ${formatTime(stop.endTime)}</p>
          </div>
        `
      });

      stopMarker.addListener('click', () => {
        stopInfo.open(googleMapRef.current, stopMarker);
      });

      markersRef.current.push(stopMarker);
    });

    // Add END marker if checked out
    if (timeline.checkOut) {
      const endMarker = new window.google.maps.Marker({
        position: pathCoordinates[pathCoordinates.length - 1],
        map: googleMapRef.current,
        title: 'Check-out Location (END)',
        label: {
          text: '🔴',
          fontSize: '24px'
        },
        zIndex: 1000
      });

      const endInfo = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; color: #000;">
            <h4 style="margin: 0 0 4px 0; font-weight: bold;">🔴 Ending Point</h4>
            <p style="margin: 4px 0; font-size: 11px;">${timeline.userName}</p>
            <p style="margin: 4px 0; font-size: 11px;">${formatTime(timeline.checkOut.time)}</p>
          </div>
        `
      });

      endMarker.addListener('click', () => {
        endInfo.open(googleMapRef.current, endMarker);
      });

      markersRef.current.push(endMarker);
    }

    // Fit map bounds to show entire route
    const bounds = new window.google.maps.LatLngBounds();
    pathCoordinates.forEach(point => bounds.extend(point));
    googleMapRef.current.fitBounds(bounds);
  };

  const processTimeline = (user) => {
    const locations = user.locationHistory || [];

    // Calculate statistics
    let totalDistance = 0;
    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const curr = locations[i];
      totalDistance += calculateDistance(
        prev.lat,
        prev.lng,
        curr.lat,
        curr.lng
      );
    }

    // Detect stops
    const stops = detectStops(locations);

    // Calculate total duration
    const checkInTime = new Date(user.checkIn.time);
    const checkOutTime = user.checkOut 
      ? new Date(user.checkOut.time) 
      : new Date();
    const totalDuration = checkOutTime - checkInTime;

    setTimeline({
      userName: user.userName,
      checkIn: {
        time: checkInTime,
        lat: user.checkIn.lat,
        lng: user.checkIn.lng
      },
      checkOut: user.checkOut ? {
        time: checkOutTime,
        lat: user.checkOut.lat,
        lng: user.checkOut.lng
      } : null,
      stops,
      stats: {
        totalDistance: totalDistance.toFixed(2),
        totalDuration: formatDuration(totalDuration),
        totalLocations: locations.length,
        totalStops: stops.length
      },
      status: user.status
    });
  };

  if (!timeline) {
    return (
      <div className="bg-dark-800 rounded-xl border border-white/5 p-6">
        <div className="text-center py-8">
          <Calendar className="mx-auto text-gray-600 mb-3" size={48} />
          <p className="text-gray-400">No user selected</p>
          <p className="text-xs text-gray-600 mt-2">Select a team member to view their journey</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map View */}
      <div className="bg-dark-800 rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-gradient-to-r from-brand-900/20 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-600/30 flex items-center justify-center">
                <User size={20} className="text-brand-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{timeline.userName}'s Route</h3>
                <p className="text-xs text-gray-400">
                  {new Date(timeline.checkIn.time).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              timeline.status === 'CHECKED_IN' 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {timeline.status === 'CHECKED_IN' ? '🟢 Active' : '🔴 Completed'}
            </span>
          </div>
        </div>

        {/* Map */}
        <div className="relative">
          <div ref={mapRef} className="h-[400px] w-full" />
          
          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 bg-dark-900/95 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10 shadow-xl">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🟢</span>
                <span className="text-xs text-gray-300">Check-in Point</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-xs text-gray-300">Travel Route</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-[10px] font-bold">N</div>
                <span className="text-xs text-gray-300">Stop Points</span>
              </div>
              {timeline.checkOut && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔴</span>
                  <span className="text-xs text-gray-300">Check-out Point</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats Overlay */}
          <div className="absolute top-4 right-4 bg-dark-900/95 backdrop-blur-sm rounded-lg border border-white/10 shadow-xl">
            <div className="grid grid-cols-3 gap-3 p-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp size={12} className="text-blue-400" />
                </div>
                <p className="text-sm font-bold text-white">{timeline.stats.totalDistance} km</p>
                <p className="text-[10px] text-gray-400">Distance</p>
              </div>
              
              <div className="text-center border-x border-white/10">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock size={12} className="text-green-400" />
                </div>
                <p className="text-sm font-bold text-white">{timeline.stats.totalDuration}</p>
                <p className="text-[10px] text-gray-400">Duration</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <MapPin size={12} className="text-purple-400" />
                </div>
                <p className="text-sm font-bold text-white">{timeline.stats.totalStops}</p>
                <p className="text-[10px] text-gray-400">Stops</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Events */}
      <div className="bg-dark-800 rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-base font-semibold text-white">Journey Timeline</h3>
          <p className="text-xs text-gray-400 mt-1">Chronological breakdown of the day's journey</p>
        </div>

        <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
        {/* Check-in Event */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex gap-4"
        >
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🟢</span>
            </div>
            <div className="w-0.5 h-full bg-gradient-to-b from-green-500/50 to-purple-500/50 mt-2"></div>
          </div>
          
          <div className="flex-1 pb-6">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-white">Started Work</h4>
              <span className="text-xs text-gray-500">{formatTime(timeline.checkIn.time)}</span>
            </div>
            <p className="text-xs text-gray-400 mb-2">Checked in at this location</p>
            <div className="bg-dark-700/50 rounded-lg p-2 border border-white/5">
              <div className="flex items-start gap-2">
                <MapPin size={12} className="text-green-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-300 font-mono">
                    {timeline.checkIn.lat.toFixed(6)}, {timeline.checkIn.lng.toFixed(6)}
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${timeline.checkIn.lat},${timeline.checkIn.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-400 hover:text-brand-300 mt-1 inline-block"
                  >
                    View on Maps →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stops */}
        {timeline.stops.map((stop, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: (index + 1) * 0.1 }}
            className="flex gap-4"
          >
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center flex-shrink-0">
                <MapPin size={16} className="text-purple-400" />
              </div>
              {index < timeline.stops.length - 1 && (
                <div className="w-0.5 h-full bg-purple-500/50 mt-2"></div>
              )}
            </div>
            
            <div className="flex-1 pb-6">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-white">Stop #{index + 1}</h4>
                <span className="text-xs text-gray-500">
                  {formatTime(stop.startTime)} - {formatTime(stop.endTime)}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={12} className="text-purple-400" />
                <span className="text-xs text-gray-400">Stayed for {stop.durationFormatted}</span>
              </div>
              <div className="bg-dark-700/50 rounded-lg p-2 border border-white/5">
                <div className="flex items-start gap-2">
                  <MapPin size={12} className="text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-300 font-mono">
                      {stop.lat.toFixed(6)}, {stop.lng.toFixed(6)}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${stop.lat},${stop.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-400 hover:text-brand-300 mt-1 inline-block"
                    >
                      View on Maps →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Check-out Event (if exists) */}
        {timeline.checkOut && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: (timeline.stops.length + 1) * 0.1 }}
            className="flex gap-4"
          >
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🔴</span>
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-white">Ended Work</h4>
                <span className="text-xs text-gray-500">{formatTime(timeline.checkOut.time)}</span>
              </div>
              <p className="text-xs text-gray-400 mb-2">Checked out at this location</p>
              <div className="bg-dark-700/50 rounded-lg p-2 border border-white/5">
                <div className="flex items-start gap-2">
                  <MapPin size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-300 font-mono">
                      {timeline.checkOut.lat.toFixed(6)}, {timeline.checkOut.lng.toFixed(6)}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${timeline.checkOut.lat},${timeline.checkOut.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-400 hover:text-brand-300 mt-1 inline-block"
                    >
                      View on Maps →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Currently Active (if not checked out) */}
        {!timeline.checkOut && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: (timeline.stops.length + 1) * 0.1 }}
            className="flex gap-4"
          >
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center flex-shrink-0 animate-pulse">
                <Navigation size={16} className="text-blue-400" />
              </div>
            </div>
            
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-white mb-1">Currently Active</h4>
              <p className="text-xs text-gray-400">Journey is being tracked...</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/5 bg-dark-900/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">
            {timeline.stats.totalLocations} location points recorded
          </span>
          <span className="text-gray-500">
            Updated every 2 minutes
          </span>
        </div>
      </div>
    </div>
    </div>
  );
}
