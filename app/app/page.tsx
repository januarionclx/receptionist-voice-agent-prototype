'use client';

export default function Home() {
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
      </main>
    </div>
  );
}
