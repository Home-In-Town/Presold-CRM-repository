import { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

export default function MapWithRoute({ locations = [] }) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (!locations || locations.length === 0) return;

    // For now, we'll show a simple placeholder
    // In production, you would integrate with Google Maps, Leaflet, or Mapbox
    console.log('Map locations:', locations);
  }, [locations]);

  if (!locations || locations.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <MapPin className="mx-auto text-gray-600 mb-3" size={48} />
          <p className="text-gray-400">No location data available</p>
        </div>
      </div>
    );
  }

  const latestLocation = locations[0];

  return (
    <div className="w-full h-full relative bg-dark-900">
      {/* Map Placeholder */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <MapPin className="text-brand-400 mb-4" size={64} />
        <h3 className="text-xl font-semibold text-white mb-2">Map Integration Required</h3>
        <p className="text-gray-400 mb-4 text-center max-w-md">
          To display the interactive map, integrate with Google Maps, Leaflet, or Mapbox.
        </p>
        
        {/* Show location coordinates */}
        <div className="bg-dark-800 rounded-lg p-6 border border-white/10 max-w-md w-full">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Latitude</p>
              <p className="text-white font-mono">{latestLocation.latitude?.toFixed(6)}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Longitude</p>
              <p className="text-white font-mono">{latestLocation.longitude?.toFixed(6)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500 mb-1">Timestamp</p>
              <p className="text-white text-xs">
                {new Date(latestLocation.timestamp).toLocaleString()}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500 mb-1">Total Points</p>
              <p className="text-white">{locations.length} location{locations.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          
          {/* Google Maps Link */}
          <a
            href={`https://www.google.com/maps?q=${latestLocation.latitude},${latestLocation.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 w-full btn-primary flex items-center justify-center gap-2"
          >
            <MapPin size={16} />
            <span>View on Google Maps</span>
          </a>
        </div>
      </div>

      {/* Map library integration placeholder */}
      <div ref={mapRef} className="hidden w-full h-full" />
    </div>
  );
}

// Example integration with Google Maps:
/*
import { useEffect, useRef } from 'react';

export default function MapWithRoute({ locations = [] }) {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);

  useEffect(() => {
    if (!locations || locations.length === 0 || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: locations[0].latitude, lng: locations[0].longitude },
      zoom: 13,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
      ],
    });

    // Add markers for each location
    locations.forEach((loc, index) => {
      new window.google.maps.Marker({
        position: { lat: loc.latitude, lng: loc.longitude },
        map,
        title: `Point ${index + 1}`,
        label: (index + 1).toString(),
      });
    });

    // Draw path
    const path = locations.map(loc => ({ lat: loc.latitude, lng: loc.longitude }));
    new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#8B5CF6',
      strokeOpacity: 1.0,
      strokeWeight: 2,
      map,
    });

    googleMapRef.current = map;
  }, [locations]);

  return <div ref={mapRef} className="w-full h-full" />;
}
*/
