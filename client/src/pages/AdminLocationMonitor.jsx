import { useState, useEffect, useRef } from 'react';
import { MapPin, Users, Navigation, Clock, RefreshCw, User, Activity, LogOut, LogIn, 
  Target, BookOpen, BarChart3, Library } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AdminLocationMonitor() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);

  useEffect(() => {
    let mounted = true;
    
    // Initialize map FIRST (fast)
    const initMapWhenReady = () => {
      if (!mounted) return;
      
      if (window.google && window.google.maps && mapRef.current && !googleMapRef.current) {
        console.log('🗺️  Admin: Initializing map...');
        try {
          initializeMap();
          if (mounted) {
            console.log('✅ Admin: Map initialized successfully');
            setMapReady(true); // Hide overlay
          }
        } catch (error) {
          console.error('❌ Admin: Map initialization failed:', error);
          if (mounted) {
            setMapReady(true); // Hide overlay even on error
            toast.error('Failed to initialize map');
          }
        }
      }
    };

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      console.log('⚡ Google Maps already loaded, initializing immediately');
      setTimeout(initMapWhenReady, 100); // Small delay to ensure DOM is ready
    } else {
      // Wait for Google Maps to load
      console.log('⏳ Admin: Waiting for Google Maps API...');
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds max
      
      const checkInterval = setInterval(() => {
        if (!mounted) {
          clearInterval(checkInterval);
          return;
        }
        
        attempts++;
        if (window.google && window.google.maps) {
          console.log('✅ Admin: Google Maps API loaded!');
          clearInterval(checkInterval);
          initMapWhenReady();
        } else if (attempts >= maxAttempts) {
          console.error('❌ Admin: Google Maps API failed to load after 10 seconds');
          clearInterval(checkInterval);
          if (mounted) {
            setMapReady(true); // Hide overlay
            toast.error('Google Maps failed to load. Please refresh the page.');
          }
        }
      }, 100);

      return () => {
        mounted = false;
        clearInterval(checkInterval);
      };
    }
    
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // Load location data AFTER map is initialized (runs in parallel)
    loadAllLocations();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadAllLocations();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Update map markers when users data changes
    if (googleMapRef.current && users.length > 0) {
      updateMapMarkers();
    }
  }, [users, selectedUser]);

  const loadAllLocations = async () => {
    try {
      setRefreshing(true);
      console.log('📡 Fetching admin locations...');
      const res = await api.get('/attendance/admin/all-locations');
      console.log('✅ Received location data:', res.data.users?.length || 0, 'users');
      setUsers(res.data.users || []);
      setLastUpdate(new Date());
      setRefreshing(false);
    } catch (err) {
      console.error('❌ Failed to load locations:', err);
      console.error('Error response:', err.response?.data);
      toast.error(err.response?.data?.error || 'Failed to load locations');
      setUsers([]);
      setRefreshing(false);
    }
  };

  const initializeMap = () => {
    if (!mapRef.current) {
      console.error('❌ Map container ref is null');
      return;
    }
    
    try {
      // Default center (India)
      const defaultCenter = { lat: 20.5937, lng: 78.9629 };
      
      console.log('🗺️  Creating Google Map instance...');
      
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 5,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1a1f2e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1f2e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
          {
            featureType: 'administrative.locality',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }]
          },
          {
            featureType: 'poi',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }]
          },
          {
            featureType: 'poi.park',
            elementType: 'geometry',
            stylers: [{ color: '#263c3f' }]
          },
          {
            featureType: 'poi.park',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#6b9a76' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#38414e' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#212a37' }]
          },
          {
            featureType: 'road',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#9ca5b3' }]
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry',
            stylers: [{ color: '#746855' }]
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#1f2835' }]
          },
          {
            featureType: 'road.highway',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#f3d19c' }]
          },
          {
            featureType: 'transit',
            elementType: 'geometry',
            stylers: [{ color: '#2f3948' }]
          },
          {
            featureType: 'transit.station',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }]
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#17263c' }]
          },
          {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#515c6d' }]
          },
          {
            featureType: 'water',
            elementType: 'labels.text.stroke',
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
      });
      
      console.log('✅ Admin map initialized successfully');
      setMapReady(true); // Force re-render to hide overlay
    } catch (error) {
      console.error('❌ Error creating map:', error);
      throw error;
    }
  };

  const updateMapMarkers = () => {
    if (!googleMapRef.current) return;

    // Clear existing markers and polylines
    markersRef.current.forEach(marker => marker.setMap(null));
    polylinesRef.current.forEach(polyline => polyline.setMap(null));
    markersRef.current = [];
    polylinesRef.current = [];

    if (users.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    // Enhanced color palette with more distinct colors
    const colors = [
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#10B981', // Green
      '#F59E0B', // Amber
      '#3B82F6', // Blue
      '#EF4444', // Red
      '#14B8A6', // Teal
      '#F97316', // Orange
      '#8B5CF6', // Violet
      '#84CC16'  // Lime
    ];

    users.forEach((user, index) => {
      const color = colors[index % colors.length];
      const isSelected = selectedUser?.userId === user.userId;

      // Add check-in marker
      if (user.checkIn) {
        const checkInMarker = new window.google.maps.Marker({
          position: { lat: user.checkIn.lat, lng: user.checkIn.lng },
          map: googleMapRef.current,
          title: `${user.userName} - Check In`,
          label: {
            text: '🟢',
            fontSize: '24px'
          },
          animation: isSelected ? window.google.maps.Animation.BOUNCE : null
        });

        const checkInInfo = new window.google.maps.InfoWindow({
          content: `
            <div style="color: #000; padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold;">${user.userName}</h3>
              <p style="margin: 4px 0;"><strong>Check In:</strong> ${new Date(user.checkIn.time).toLocaleTimeString()}</p>
              <p style="margin: 4px 0;"><strong>Status:</strong> ${user.status}</p>
            </div>
          `
        });

        checkInMarker.addListener('click', () => {
          checkInInfo.open(googleMapRef.current, checkInMarker);
          setSelectedUser(user);
        });

        markersRef.current.push(checkInMarker);
        bounds.extend({ lat: user.checkIn.lat, lng: user.checkIn.lng });
      }

      // Add location history points and draw route
      if (user.locationHistory && user.locationHistory.length > 0) {
        const pathCoordinates = [
          user.checkIn ? { lat: user.checkIn.lat, lng: user.checkIn.lng } : null,
          ...user.locationHistory.map(loc => ({ lat: loc.lat, lng: loc.lng })),
          user.checkOut ? { lat: user.checkOut.lat, lng: user.checkOut.lng } : null
        ].filter(Boolean);

        // Draw polyline for route
        const polyline = new window.google.maps.Polyline({
          path: pathCoordinates,
          geodesic: true,
          strokeColor: color,
          strokeOpacity: isSelected ? 1.0 : 0.7,
          strokeWeight: isSelected ? 5 : 3,
          map: googleMapRef.current,
          zIndex: isSelected ? 1000 : index
        });

        polylinesRef.current.push(polyline);

        // Add markers for location pings (smaller dots with user color)
        user.locationHistory.forEach((loc, idx) => {
          const pingMarker = new window.google.maps.Marker({
            position: { lat: loc.lat, lng: loc.lng },
            map: googleMapRef.current,
            title: `${user.userName} - Point ${idx + 1}/${user.locationHistory.length}`,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: isSelected ? 5 : 4,
              fillColor: color,
              fillOpacity: isSelected ? 1.0 : 0.8,
              strokeColor: '#ffffff',
              strokeWeight: isSelected ? 2 : 1
            },
            zIndex: isSelected ? 999 : index
          });

          const pingInfo = new window.google.maps.InfoWindow({
            content: `
              <div style="color: #000; padding: 8px;">
                <p style="margin: 4px 0;"><strong>${user.userName}</strong></p>
                <p style="margin: 4px 0;">${new Date(loc.timestamp).toLocaleString()}</p>
              </div>
            `
          });

          pingMarker.addListener('click', () => {
            pingInfo.open(googleMapRef.current, pingMarker);
          });

          markersRef.current.push(pingMarker);
          bounds.extend({ lat: loc.lat, lng: loc.lng });
        });
      }

      // Add check-out marker
      if (user.checkOut) {
        const checkOutMarker = new window.google.maps.Marker({
          position: { lat: user.checkOut.lat, lng: user.checkOut.lng },
          map: googleMapRef.current,
          title: `${user.userName} - Check Out`,
          label: {
            text: '🔴',
            fontSize: '24px'
          }
        });

        const checkOutInfo = new window.google.maps.InfoWindow({
          content: `
            <div style="color: #000; padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold;">${user.userName}</h3>
              <p style="margin: 4px 0;"><strong>Check Out:</strong> ${new Date(user.checkOut.time).toLocaleTimeString()}</p>
            </div>
          `
        });

        checkOutMarker.addListener('click', () => {
          checkOutInfo.open(googleMapRef.current, checkOutMarker);
        });

        markersRef.current.push(checkOutMarker);
        bounds.extend({ lat: user.checkOut.lat, lng: user.checkOut.lng });
      }
    });

    // Fit map to show all markers
    if (markersRef.current.length > 0) {
      googleMapRef.current.fitBounds(bounds);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getActivityStatus = (user) => {
    if (!user.checkIn) return { label: 'Inactive', color: 'bg-gray-500', textColor: 'text-gray-400' };
    
    if (user.status === 'CHECKED_IN') {
      return { label: 'Active', color: 'bg-green-500', textColor: 'text-green-400' };
    } else {
      return { label: 'Checked Out', color: 'bg-red-500', textColor: 'text-red-400' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Mobile Quick Access Shortcuts */}
      <div className="block lg:hidden">
        <div className="glass-card p-3">
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => navigate('/pipeline')}
              className="flex flex-col items-center gap-1 p-2 rounded-lg bg-dark-800/50 hover:bg-dark-700 border border-white/5 hover:border-brand-500/30 transition-all"
            >
              <Target size={20} className="text-brand-400" />
              <span className="text-[10px] text-gray-300 font-medium">Pipeline</span>
            </button>
            <button
              onClick={() => navigate('/playbook')}
              className="flex flex-col items-center gap-1 p-2 rounded-lg bg-dark-800/50 hover:bg-dark-700 border border-white/5 hover:border-brand-500/30 transition-all"
            >
              <BookOpen size={20} className="text-brand-400" />
              <span className="text-[10px] text-gray-300 font-medium">Playbook</span>
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="flex flex-col items-center gap-1 p-2 rounded-lg bg-dark-800/50 hover:bg-dark-700 border border-white/5 hover:border-brand-500/30 transition-all"
            >
              <BarChart3 size={20} className="text-brand-400" />
              <span className="text-[10px] text-gray-300 font-medium">Reports</span>
            </button>
            <button
              onClick={() => navigate('/assets')}
              className="flex flex-col items-center gap-1 p-2 rounded-lg bg-dark-800/50 hover:bg-dark-700 border border-white/5 hover:border-brand-500/30 transition-all"
            >
              <Library size={20} className="text-brand-400" />
              <span className="text-[10px] text-gray-300 font-medium">Library</span>
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Navigation className="text-brand-400" />
            Live Location Monitor
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Track team member locations in real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-500">Last updated</p>
            <p className="text-sm font-medium text-gray-300">
              {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={loadAllLocations}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-dark-800 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Activity className="text-green-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {users.filter(u => u.status === 'CHECKED_IN').length}
              </p>
              <p className="text-xs text-gray-400">Checked In</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <LogOut className="text-red-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {users.filter(u => u.status === 'CHECKED_OUT').length}
              </p>
              <p className="text-xs text-gray-400">Checked Out</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <MapPin className="text-blue-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{users.length}</p>
              <p className="text-xs text-gray-400">Total Today</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-lg font-semibold text-white mb-3">Team Members</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {refreshing && users.length === 0 ? (
              // Loading skeleton
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-dark-800 rounded-xl p-4 border border-white/5 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-700 rounded w-3/4" />
                        <div className="h-3 bg-gray-700 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : users.length === 0 ? (
              <div className="bg-dark-800 rounded-xl p-6 text-center border border-white/5">
                <Users className="mx-auto text-gray-600 mb-2" size={32} />
                <p className="text-sm text-gray-400">No check-ins today</p>
              </div>
            ) : (
              users.map((user) => {
                const status = getActivityStatus(user);
                const isSelected = selectedUser?.userId === user.userId;
                
                return (
                  <motion.button
                    key={user.userId}
                    onClick={() => setSelectedUser(user)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full bg-dark-800 rounded-xl p-4 border transition-all text-left ${
                      isSelected 
                        ? 'border-brand-500 ring-2 ring-brand-500/20' 
                        : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-brand-600/30 flex items-center justify-center">
                          <User size={20} className="text-brand-400" />
                        </div>
                        <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${status.color} border-2 border-dark-800`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{user.userName}</p>
                        <p className="text-xs text-gray-400 truncate">{user.userEmail}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-medium ${status.textColor}`}>
                          {status.label}
                        </span>
                        <p className="text-[10px] text-gray-500">
                          {formatTime(user.checkIn?.time)}
                        </p>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-3 pt-3 border-t border-white/5 text-xs text-gray-400">
                      <div className="flex justify-between mb-1">
                        <span>Check In:</span>
                        <span className="text-gray-300">{new Date(user.checkIn.time).toLocaleTimeString()}</span>
                      </div>
                      {user.checkOut && (
                        <div className="flex justify-between mb-1">
                          <span>Check Out:</span>
                          <span className="text-gray-300">{new Date(user.checkOut.time).toLocaleTimeString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Location Pings:</span>
                        <span className="text-gray-300">{user.locationHistory?.length || 0}</span>
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </div>

        {/* Map View */}
        <div className="lg:col-span-2">
          <div className="bg-dark-800 rounded-xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h2 className="text-lg font-semibold text-white">
                {selectedUser ? `${selectedUser.userName}'s Route` : 'All Team Routes'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                🟢 Check In • 🔴 Check Out • Colored lines show travel routes
              </p>
            </div>
            <div className="relative">
              <div ref={mapRef} className="h-[600px] w-full" style={{ minHeight: '600px' }} />
              
              {/* Loading overlay for map */}
              {!mapReady && (
                <div className="absolute inset-0 bg-dark-900 flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent mb-4"></div>
                    <p className="text-sm text-gray-400">Loading map...</p>
                    <p className="text-xs text-gray-600 mt-2">Waiting for Google Maps API</p>
                  </div>
                </div>
              )}
              
              {/* Color Legend Overlay */}
              {users.length > 0 && (
                <div className="absolute top-4 right-4 bg-dark-900/95 backdrop-blur-sm rounded-lg border border-white/10 p-3 max-w-xs">
                  <h4 className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
                    <MapPin size={12} className="text-brand-400" />
                    User Routes
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {users.map((user, index) => {
                      const colors = [
                        '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', 
                        '#EF4444', '#14B8A6', '#F97316', '#8B5CF6', '#84CC16'
                      ];
                      const color = colors[index % colors.length];
                      const isSelected = selectedUser?.userId === user.userId;
                      
                      return (
                        <button
                          key={user.userId}
                          onClick={() => setSelectedUser(user)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                            isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                          }`}
                        >
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate">{user.userName}</p>
                            <p className="text-[10px] text-gray-400">
                              {user.locationHistory?.length || 0} points
                            </p>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            user.status === 'CHECKED_IN' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {user.status === 'CHECKED_IN' ? 'Active' : 'Done'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
