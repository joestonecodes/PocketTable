'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const router = useRouter();
  const [joinId, setJoinId] = useState('');
  const [displayName, setDisplayName] = useState('');

  const createGame = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.roomId) {
        router.push(`/game/${data.roomId}?gm=true`);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to create game');
    }
  };

  const joinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinId) return;
    router.push(`/game/${joinId}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-stone-900 text-stone-100 font-sans">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold mb-8">Owlbear Clone VTT</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <div className="border border-stone-700 p-8 rounded-lg bg-stone-800 hover:bg-stone-750 transition">
          <h2 className="text-2xl font-bold mb-4">Start a Game</h2>
          <p className="mb-6 text-stone-400">Create a new room and invite your players. You will be the GM.</p>
          <button
            onClick={createGame}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded"
          >
            Create New Room
          </button>
        </div>

        <div className="border border-stone-700 p-8 rounded-lg bg-stone-800 hover:bg-stone-750 transition">
          <h2 className="text-2xl font-bold mb-4">Join a Game</h2>
          <form onSubmit={joinGame} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Room ID"
              value={joinId}
              onChange={e => setJoinId(e.target.value)}
              className="bg-stone-900 border border-stone-600 rounded p-3 text-white"
            />
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded"
            >
              Join Room
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
