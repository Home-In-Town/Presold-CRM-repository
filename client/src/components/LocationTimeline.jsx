import { useState, useEffect } from 'react';
import { MapPin, Clock, Navigation, TrendingUp, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';

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
  const STOP_RADIUS_KM = 0.1; // 100 meters
  const MIN_STOP_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  
  // Sort by timestamp to ensure chronological order
  const sorted = [...locationHistory].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );

  let i = 0;
  while (i < sorted.length) {
    const anchorLoc = sorted[i];
    const clusterStart = new Date(anchorLoc.timestamp);
    let clusterEnd = clusterStart;
    const cluster = [anchorLoc];
    
    // Find all consecutive locations within radius
    let j = i + 1;
    while (j < sorted.length) {
      const testLoc = sorted[j];
      const distance = calculateDistance(
        anchorLoc.latitude,
        anchorLoc.longitude,
        testLoc.latitude,
        testLoc.longitude
      );
      
      if (distance <= STOP_RADIUS_KM) {
        // This location is part of the stop
        cluster.push(testLoc);
        clusterEnd = new Date(testLoc.timestamp);
        j++;
      } else {
        // Location moved away - end of this stop
        break;
      }
    }
    
    // Calculate duration of this stop
    const duration = clusterEnd - clusterStart;
    
    // Only consider it a stop if duration >= 5 minutes
    if (duration >= MIN_STOP_DURATION_MS) {
      // Calculate center point (average of all locations in cluster)
      const centerLat = cluster.reduce((sum, loc) => sum + loc.latitude, 0) / cluster.length;
      const centerLng = cluster.reduce((sum, loc) => sum + loc.longitude, 0) / cluster.length;
      
      stops.push({
        startTime: clusterStart,
        endTime: clusterEnd,
        lat: centerLat,
        lng: centerLng,
        locations: cluster,
        duration: duration,
        durationFormatted: formatDuration(duration),
        pointCount: cluster.length
      });
      
      console.log(`🛑 Stop detected: ${cluster.length} points over ${formatDuration(duration)} at (${centerLat.toFixed(6)}, ${centerLng.toFixed(6)})`);
    }
    
    // Move to the next location after this cluster
    i = j > i ? j : i + 1;
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

export default function LocationTimeline({ date }) {
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);

  useEffect(() => {
    loadTimelineData();
  }, [date]);

  const loadTimelineData = async () => {
    setLoading(true);
    try {
      // Get check-in/out info for the selected date
      const dateObj = date ? new Date(date) : new Date();
      const res = await api.get('/attendance/history', {
        params: {
          month: dateObj.getMonth() + 1,
          year: dateObj.getFullYear()
        }
      });

      const records = res.data.records || [];
      const targetDate = dateObj.toISOString().split('T')[0];
      const dayRecord = records.find(r => 
        new Date(r.checkInTime).toISOString().split('T')[0] === targetDate
      );

      if (dayRecord) {
        // Get location history for this day
        const historyRes = await api.get('/attendance/route-history', {
          params: { checkInId: dayRecord.id }
        });

        const locations = historyRes.data.locations || [];
        setLocationHistory(locations);

        // Calculate statistics
        let totalDistance = 0;
        for (let i = 1; i < locations.length; i++) {
          const prev = locations[i - 1];
          const curr = locations[i];
          totalDistance += calculateDistance(
            prev.latitude,
            prev.longitude,
            curr.latitude,
            curr.longitude
          );
        }

        // Detect stops
        const stops = detectStops(locations);

        // Calculate total duration
        const checkInTime = new Date(dayRecord.checkInTime);
        const checkOutTime = dayRecord.checkOutTime 
          ? new Date(dayRecord.checkOutTime) 
          : new Date();
        const totalDuration = checkOutTime - checkInTime;

        setTimeline({
          checkIn: {
            time: checkInTime,
            lat: dayRecord.checkInLat,
            lng: dayRecord.checkInLng,
            address: dayRecord.checkInAddress
          },
          checkOut: dayRecord.checkOutTime ? {
            time: checkOutTime,
            lat: dayRecord.checkOutLat,
            lng: dayRecord.checkOutLng,
            address: dayRecord.checkOutAddress
          } : null,
          stops,
          stats: {
            totalDistance: totalDistance.toFixed(2),
            totalDuration: formatDuration(totalDuration),
            totalLocations: locations.length,
            totalStops: stops.length
          }
        });
      } else {
        setTimeline(null);
        setLocationHistory([]);
      }
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-dark-800 rounded-xl border border-white/5 p-6">
        <div className="flex items-center justify-center h-40">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
            <p className="mt-4 text-sm text-gray-400">Loading timeline...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!timeline) {
    return (
      <div className="bg-dark-800 rounded-xl border border-white/5 p-6">
        <div className="text-center py-8">
          <Calendar className="mx-auto text-gray-600 mb-3" size={48} />
          <p className="text-gray-400">No activity recorded for this date</p>
          <p className="text-xs text-gray-600 mt-2">Check in to start tracking your journey</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-800 rounded-xl border border-white/5 overflow-hidden">
      {/* Header with Stats */}
      <div className="p-4 border-b border-white/5 bg-gradient-to-r from-brand-900/20 to-transparent">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Navigation className="text-brand-400" size={20} />
            <div>
              <h3 className="text-lg font-semibold text-white">Journey Timeline</h3>
              <p className="text-xs text-gray-400">
                {new Date(timeline.checkIn.time).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-dark-700/50 rounded-lg p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-blue-400" />
              <span className="text-xs text-gray-400">Distance</span>
            </div>
            <p className="text-lg font-bold text-white">{timeline.stats.totalDistance} km</p>
          </div>
          
          <div className="bg-dark-700/50 rounded-lg p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-green-400" />
              <span className="text-xs text-gray-400">Duration</span>
            </div>
            <p className="text-lg font-bold text-white">{timeline.stats.totalDuration}</p>
          </div>
          
          <div className="bg-dark-700/50 rounded-lg p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={14} className="text-purple-400" />
              <span className="text-xs text-gray-400">Stops</span>
            </div>
            <p className="text-lg font-bold text-white">{timeline.stats.totalStops}</p>
          </div>
        </div>
      </div>

      {/* Timeline Events */}
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
              <p className="text-xs text-gray-400">Your journey is being tracked...</p>
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
  );
}
