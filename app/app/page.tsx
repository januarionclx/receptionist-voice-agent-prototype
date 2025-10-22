'use client';

import { useState } from 'react';

export default function Home() {
  const [isListening, setIsListening] = useState(false);

  const handleCallPaloma = () => {
    setIsListening(!isListening);
    // TODO: Connect to voice agent
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <main className="flex flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-5xl font-bold text-black">
            Prime Auto Lab
          </h1>
          <p className="text-xl text-zinc-600">
            Miami, FL
          </p>
          <p className="text-sm text-zinc-500">
            Premium Car Detailing & Restoration
          </p>
        </div>

        <button
          onClick={handleCallPaloma}
          className={`px-8 py-4 text-lg font-semibold rounded-full transition-all ${
            isListening
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isListening ? '🔴 End Call' : '📞 Call Now'}
        </button>

        {isListening && (
          <div className="mt-4 text-sm text-zinc-600">
            Connected...
          </div>
        )}
      </main>
    </div>
  );
}
