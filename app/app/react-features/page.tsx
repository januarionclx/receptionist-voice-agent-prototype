'use client';

import { Activity, ViewTransition, useState, useEffect, useEffectEvent, startTransition } from 'react';

/**
 * React New Features Showcase
 * Demonstrating Activity, useEffectEvent, and ViewTransition
 */

// Simulated connection for chat demo
function createConnection(serverUrl: string, roomId: string) {
  return {
    connect() {
      console.log(`⚡ Connecting to "${roomId}" at ${serverUrl}...`);
    },
    disconnect() {
      console.log(`❌ Disconnected from "${roomId}"`);
    },
    on(event: string, callback: () => void) {
      if (event === 'connected') {
        setTimeout(callback, 1000);
      }
    }
  };
}

function showNotification(message: string, theme: 'light' | 'dark') {
  const color = theme === 'dark' ? '#90EE90' : '#006400';
  console.log(`%c${message}`, `color: ${color}; font-weight: bold; font-size: 16px`);
}

// Demo 1: Activity - Tab Switcher
function ActivityDemo() {
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">1. Activity - State Preservation</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        Fill out the form in Profile, switch to Settings, then back. Your data persists!
      </p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          }`}
        >
          Profile {activeTab === 'profile' && '✓'}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'settings'
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          }`}
        >
          Settings {activeTab === 'settings' && '✓'}
        </button>
      </div>

      <Activity mode={activeTab === 'profile' ? 'visible' : 'hidden'}>
        <ProfileForm />
      </Activity>

      <Activity mode={activeTab === 'settings' ? 'visible' : 'hidden'}>
        <SettingsForm />
      </Activity>
    </div>
  );
}

function ProfileForm() {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');

  return (
    <div className="space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900"
      />
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Tell us about yourself..."
        rows={4}
        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900"
      />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Character count: {bio.length}
      </p>
    </div>
  );
}

function SettingsForm() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={notifications}
          onChange={(e) => setNotifications(e.target.checked)}
          className="w-4 h-4"
        />
        <span>Enable notifications</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={darkMode}
          onChange={(e) => setDarkMode(e.target.checked)}
          className="w-4 h-4"
        />
        <span>Dark mode</span>
      </label>
    </div>
  );
}

// Demo 2: useEffectEvent - Chat Room
function UseEffectEventDemo() {
  const [roomId, setRoomId] = useState('general');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const serverUrl = 'https://localhost:1234';

  const onConnected = useEffectEvent(() => {
    showNotification('Connected!', theme);
  });

  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);
    connection.on('connected', () => {
      onConnected();
    });
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]); // Only roomId, NOT theme!

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">2. useEffectEvent - Non-Reactive Logic</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        Change theme - it uses latest value without reconnecting! (Check console)
      </p>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium mb-2">Chat Room:</p>
          <div className="flex gap-2">
            {['general', 'travel', 'music'].map((room) => (
              <button
                key={room}
                onClick={() => setRoomId(room)}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  roomId === room
                    ? 'bg-green-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {room}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Theme: {theme}</p>
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Toggle Theme (no reconnection!)
          </button>
        </div>
      </div>
    </div>
  );
}

// Demo 3: ViewTransition - Image Gallery
function ViewTransitionDemo() {
  const images = [
    { id: 1, color: 'bg-blue-500', title: 'Blue' },
    { id: 2, color: 'bg-purple-500', title: 'Purple' },
    { id: 3, color: 'bg-pink-500', title: 'Pink' },
  ];

  const [selectedId, setSelectedId] = useState(1);
  const selectedImage = images.find((img) => img.id === selectedId)!;

  const handleImageChange = (id: number) => {
    startTransition(() => {
      setSelectedId(id);
    });
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">3. ViewTransition - Smooth Animations</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        Click different colors to see smooth transitions!
      </p>

      <div className="flex gap-2 mb-4">
        {images.map((img) => (
          <ViewTransition key={img.id} name={`thumbnail-${img.id}`} update="slide-in">
            <button
              onClick={() => handleImageChange(img.id)}
              className={`w-16 h-16 rounded-md ${img.color} ${
                selectedId === img.id ? 'ring-4 ring-blue-600' : ''
              } transition-all hover:scale-105`}
            />
          </ViewTransition>
        ))}
      </div>

      <ViewTransition name="main-image" share="morph">
        <div
          className={`${selectedImage.color} rounded-lg p-8 text-white text-center transition-all`}
        >
          <div className="text-3xl font-bold">{selectedImage.title}</div>
          <div className="mt-2 text-sm opacity-90">Selected color</div>
        </div>
      </ViewTransition>
    </div>
  );
}

// Main showcase page
export default function ReactFeaturesShowcase() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">React New Features Showcase</h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Interactive demos of Activity, useEffectEvent, and ViewTransition
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-2">
            Using React 19.2.0 with Next.js 16 Canary
          </p>
        </div>

        <div className="space-y-8">
          <ActivityDemo />
          <UseEffectEventDemo />
          <ViewTransitionDemo />
        </div>

        <div className="mt-12 p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h4 className="font-semibold mb-2">💡 Try This:</h4>
          <ul className="text-sm space-y-1 text-zinc-700 dark:text-zinc-300">
            <li>1. Fill out Profile form, switch tabs - data persists!</li>
            <li>2. Change theme in chat - check console, no reconnection</li>
            <li>3. Click colors - smooth transitions between states</li>
          </ul>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
