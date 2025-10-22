'use client';

import { useState, useEffect } from 'react';

/**
 * Hook for managing audio input devices
 *
 * Provides device enumeration, selection, and automatic cleanup.
 * Filters out duplicate "Communications" virtual devices on Windows.
 *
 * @example
 * ```tsx
 * const { devices, selectedDeviceId, selectDevice } = useAudioDevices();
 *
 * // Render a custom select
 * <select value={selectedDeviceId} onChange={(e) => selectDevice(e.target.value)}>
 *   {devices.map(device => (
 *     <option key={device.deviceId} value={device.deviceId}>
 *       {device.label}
 *     </option>
 *   ))}
 * </select>
 * ```
 */
export function useAudioDevices() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  useEffect(() => {
    loadDevices();

    // Listen for device changes (plugging/unplugging)
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
    };
  }, []);

  const loadDevices = async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();

      // Filter audio inputs and exclude "Communications" virtual devices
      const audioInputs = deviceList.filter(device => {
        if (device.kind !== 'audioinput') return false;

        // Filter out Windows "Communications" virtual device duplicates
        const label = device.label.toLowerCase();
        if (label.includes('communications')) return false;

        return true;
      });

      setDevices(audioInputs);

      // Auto-select first device if none selected
      if (audioInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }
    } catch (error) {
      console.error('Error enumerating devices:', error);
    }
  };

  const selectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  return {
    devices,
    selectedDeviceId,
    selectDevice,
  };
}
