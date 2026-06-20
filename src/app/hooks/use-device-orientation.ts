import { useState, useEffect } from 'react';

export function useDeviceOrientation() {
  const [orientation, setOrientation] = useState({ beta: 0, gamma: 0 });
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    // Safely check if DeviceOrientationEvent exists
    const hasDeviceOrientation = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
    
    // Check if permission is already granted or not needed
    if (hasDeviceOrientation) {
      // @ts-ignore
      if (typeof DeviceOrientationEvent.requestPermission !== 'function') {
        setPermissionGranted(true);
        
        const handleOrientation = (e: DeviceOrientationEvent) => {
          setOrientation({
            beta: e.beta || 0,
            gamma: e.gamma || 0
          });
        };
        
        window.addEventListener('deviceorientation', handleOrientation);
        return () => window.removeEventListener('deviceorientation', handleOrientation);
      }
    } else {
      // Desktop or unsupported browser
      setPermissionGranted(true);
    }
  }, []);

  const requestPermission = async () => {
    const hasDeviceOrientation = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
    
    if (hasDeviceOrientation) {
      // @ts-ignore
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          // @ts-ignore
          const permissionState = await DeviceOrientationEvent.requestPermission();
          if (permissionState === 'granted') {
            setPermissionGranted(true);
            
            const handleOrientation = (e: DeviceOrientationEvent) => {
              setOrientation({
                beta: e.beta || 0,
                gamma: e.gamma || 0
              });
            };
            
            window.addEventListener('deviceorientation', handleOrientation);
            return () => window.removeEventListener('deviceorientation', handleOrientation);
          } else {
            setPermissionGranted(false);
          }
        } catch (error) {
          console.error('Error requesting device orientation permission:', error);
          setPermissionGranted(false);
        }
      }
    }
  };

  return { orientation, permissionGranted, requestPermission };
}
