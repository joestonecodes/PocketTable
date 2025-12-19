'use client';

import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { Dices, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { ClientEvents } from 'vtt-shared';

interface DiceTrayProps {
    socket: Socket | null;
    roomId: string;
    displayName?: string;
}

type RollType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

interface RollLogItem {
    id: string;
    displayName: string;
    type: RollType;
    result: number;
    timestamp: number;
}

export default function DiceTray({ socket, roomId, displayName }: DiceTrayProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [rolls, setRolls] = useState<RollLogItem[]>([]);
    const [modifier, setModifier] = useState(0);

    useEffect(() => {
        if (!socket) return;

        const onRoll = (data: RollLogItem) => {
            setRolls(prev => {
                if (prev.some(r => r.id === data.id)) return prev;
                return [data, ...prev].slice(0, 50);
            });
        };

        socket.on('dice_roll', onRoll); // We need to ensure server broadcasts this
        // If server doesn't have a specific handler, we might need to use a generic 'broadcast_event'
        // or add 'dice_roll' to the server.
        // For MVP without editing server, we can misuse 'client:patch_state' or just assume we'll add the event.
        // Let's assume we'll add 'dice_roll' logic or use a transient event.

        return () => {
            socket.off('dice_roll', onRoll);
        };
    }, [socket]);

    const handleRoll = (type: RollType) => {
        if (!socket) return;
        const max = parseInt(type.slice(1));
        const raw = Math.floor(Math.random() * max) + 1;
        const result = raw + modifier;

        const roll: RollLogItem = {
            id: Math.random().toString(36).slice(2),
            displayName: displayName || 'Unknown',
            type,
            result,
            timestamp: Date.now()
        };

        // Emit to server (which should broadcast to others)
        // Since we don't have a dedicated DICE_ROLL event in shared types yet,
        // we might strictly need to add it or use an existing channel.
        // Let's use a custom event name 'client:dice_roll' and hope we implement the server handler.
        socket.emit('client:dice_roll', { roomId, roll });

        // Optimistic update
        setRolls(prev => [roll, ...prev].slice(0, 50));
    };

    return (
        <>
            {/* Toggle Button */}
            <div className="absolute bottom-4 left-4 z-40">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={clsx(
                        "p-4 rounded-full shadow-lg transition-all",
                        isOpen ? "bg-indigo-600 text-white" : "bg-stone-800 text-stone-400 hover:text-white"
                    )}
                >
                    <Dices className="w-6 h-6" />
                </button>
            </div>

            {/* Tray */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="absolute bottom-20 left-4 z-40 bg-stone-900/95 backdrop-blur border border-stone-800 rounded-2xl shadow-2xl w-80 overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-3 border-b border-stone-800 flex justify-between items-center bg-stone-950/50">
                            <span className="font-bold text-stone-200 text-sm">Dice Tray</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-stone-500">Mod:</span>
                                <input
                                    type="number"
                                    value={modifier}
                                    onChange={e => setModifier(Number(e.target.value))}
                                    className="w-12 bg-stone-900 border border-stone-700 rounded px-1 text-xs text-white text-center"
                                />
                            </div>
                        </div>

                        {/* Recent Rolls */}
                        <div className="flex-1 max-h-48 overflow-y-auto p-3 space-y-2 bg-stone-900/50 scrollbar-thin scrollbar-thumb-stone-700">
                            {rolls.length === 0 && <div className="text-center text-xs text-stone-600 py-4">No rolls yet</div>}
                            {rolls.map(roll => (
                                <div key={roll.id} className="flex justify-between items-center text-sm border-b border-stone-800/50 pb-1 last:border-0">
                                    <span className="text-stone-400 font-medium truncate max-w-[100px]">{roll.displayName}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-stone-500 text-xs">{roll.type}</span>
                                        <span className={clsx(
                                            "font-bold font-mono",
                                            roll.result === 1 && "text-red-500",
                                            roll.type === 'd20' && roll.result === 20 && "text-green-400",
                                            roll.result > 1 && "text-white"
                                        )}>
                                            {roll.result}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Controls */}
                        <div className="p-3 grid grid-cols-3 gap-2 bg-stone-950/30 border-t border-stone-800">
                            {(['d4', 'd6', 'd8', 'd10', 'd12', 'd20'] as RollType[]).map(type => (
                                <button
                                    key={type}
                                    onClick={() => handleRoll(type)}
                                    className="py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded transition text-xs font-bold border border-stone-700 hover:border-stone-500"
                                >
                                    {type.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
