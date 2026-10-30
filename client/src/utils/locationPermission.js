import { Geolocation } from '@capacitor/geolocation';
import { App } from '@capacitor/app';
import toast from 'react-hot-toast';

/**
 * Request background location permission with proper flow
 * Android 10+ requires separate background location permission
 */
export const requestBackgroundLocationPermission = async () => {
  try {
    console.log('📍 Requesting background location permission...');

    // Step 1: Check current permission status
    const permission = await Geolocation.checkPermissions();
    console.log('Current permission:', permission);

    // Step 2: If not granted, request permission
    if (permission.location !== 'granted') {
      const result = await Geolocation.requestPermissions();
      console.log('Permission request result:', result);

      if (result.location !== 'granted') {
        // Permission denied - offer to open settings
        toast((t) => (
          <div>
            <p className="font-semibold mb-2">📍 Location Permission Required</p>
            <p className="text-sm text-gray-600 mb-3">
              PreSold CRM needs "Allow all the time" access to track your location
              even when the app is closed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  openLocationSettings();
                  toast.dismiss(t.id);
                }}
                className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium"
              >
                Open Settings
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ), {
          duration: 10000,
          position: 'top-center',
        });

        return false;
      }
    }

    // Step 3: For Android 10+, we need background location permission
    // Show user they need to select "Allow all the time" in settings
    if (permission.location === 'granted') {
      toast((t) => (
        <div>
          <p className="font-semibold mb-2">✅ Location Access Granted</p>
          <p className="text-sm text-gray-600 mb-3">
            For background tracking, please select <strong>"Allow all the time"</strong> in Settings.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                openLocationSettings();
                toast.dismiss(t.id);
              }}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium"
            >
              Open Settings
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm"
            >
              Done
            </button>
          </div>
        </div>
      ), {
        duration: 15000,
        position: 'top-center',
      });
    }

    return true;
  } catch (error) {
    console.error('Permission request error:', error);
    toast.error('Failed to request location permission');
    return false;
  }
};

/**
 * Open phone's location settings
 * Uses Capacitor App plugin or fallback methods
 */
export const openLocationSettings = async () => {
  try {
    // Try to open location-specific settings
    // This requires a custom plugin or native code
    // For now, open app settings
    await App.openAppSettings();
    toast.success('Opening settings - Select "Allow all the time" for location');
  } catch (error) {
    console.error('Failed to open settings:', error);
    toast.error('Please manually open Settings > Apps > PreSold CRM > Permissions > Location');
  }
};

/**
 * Check if background location is enabled
 */
export const isBackgroundLocationEnabled = async () => {
  try {
    const permission = await Geolocation.checkPermissions();
    // On Android, we can't directly check for "Allow all the time"
    // We can only check if location permission is granted
    return permission.location === 'granted';
  } catch {
    return false;
  }
};
