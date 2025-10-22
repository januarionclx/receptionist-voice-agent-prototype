'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { useAudioDevices } from '@/hooks/useAudioDevices';
import { useAudioStream } from '@/hooks/useAudioStream';
import AudioVisualizer from '@/components/AudioVisualizer';

export default function TestPage() {
  const { devices, selectedDeviceId, selectDevice } = useAudioDevices();
  const [isConnected, setIsConnected] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { audioStream, startAudio, stopAudio } = useAudioStream();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConnect = async () => {
    if (isConnected) {
      stopAudio();
      setIsConnected(false);
    } else {
      try {
        const constraints: MediaStreamConstraints = {
          audio: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId } }
            : true
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        startAudio(stream);
        setIsConnected(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Failed to access microphone. Please check permissions.');
      }
    }
  };

  const handleDeviceSelect = (deviceId: string) => {
    selectDevice(deviceId);
    setIsDropdownOpen(false);
  };

  return (
    <div className="h-screen bg-white flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl flex flex-col items-center space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold text-gray-900">
            Microphone Test
          </h1>
          <p className="text-gray-500">
            Select your microphone and test audio input
          </p>
        </div>

        {/* Audio Visualizer */}
        <div className="flex-shrink-0">
          <AudioVisualizer
            audioStream={audioStream}
            isActive={isConnected}
            width={300}
            height={300}
            className="rounded-lg"
          />
        </div>

        {/* Connection Controls */}
        <div className="flex items-center gap-3">
          {/* Microphone Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={isConnected}
              className={`
                p-3 rounded-lg border border-gray-200
                transition-all duration-200
                ${isConnected
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
                }
                focus:outline-none
              `}
              title={devices.find(d => d.deviceId === selectedDeviceId)?.label || 'Select microphone'}
            >
              <Mic size={20} />
            </button>

            {/* Dropdown */}
            {isDropdownOpen && !isConnected && (
              <div className="absolute bottom-full left-0 mb-2 w-72 bg-white rounded-lg shadow-lg overflow-hidden z-10">
                <div className="p-3 bg-gray-50">
                  <p className="text-xs font-medium text-gray-600">Select Microphone</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {devices.map((device, index) => (
                    <button
                      key={device.deviceId}
                      onClick={() => handleDeviceSelect(device.deviceId)}
                      className={`
                        w-full text-left px-4 py-3 text-sm cursor-pointer
                        transition-colors duration-150
                        ${device.deviceId === selectedDeviceId
                          ? 'bg-gray-100 text-gray-900 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      {device.label || `Microphone ${index + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Connection Button */}
          <button
            onClick={handleConnect}
            disabled={!selectedDeviceId && !isConnected}
            className={`
              px-8 py-3 rounded-lg font-medium text-base
              transition-all duration-200
              ${
                isConnected
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-black hover:bg-gray-800 text-white'
              }
              ${(!selectedDeviceId && !isConnected) ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg cursor-pointer'}
              focus:outline-none
            `}
          >
            {isConnected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
}
