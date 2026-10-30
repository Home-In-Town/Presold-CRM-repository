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
        // Permission denied
        toast.error('Location permission denied. Please enable in Settings > Apps > PreSold CRM > Permissions');
        return false;
      }
    }

    // Permission is granted - just return true, don't show any more dialogs
    console.log('✅ Location permission granted');
    return true;
  } catch (error) {
    console.error('Permission request error:', error);
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
