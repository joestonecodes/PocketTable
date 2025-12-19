'use client';

import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Play, Pause, RotateCcw, Clock, X } from 'lucide-react';
import { ClientEvents, RoomStateType } from 'vtt-shared';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface TimerProps {
    socket: Socket | null;
    timer: RoomStateType['timer'];
    isGm: boolean;
    roomId: string;
}

export default function Timer({ socket, timer, isGm, roomId }: TimerProps) {
    const [timeLeft, setTimeLeft] = useState(0);

    // Sync local state with server state
    useEffect(() => {
        if (timer) {
            setTimeLeft(timer.remainingSec);
        }
    }, [timer]);

    // Local tick
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timer?.status === 'RUNNING' && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => Math.max(0, prev - 1));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer?.status, timeLeft]);

    const updateTimer = (updates: Partial<RoomStateType['timer']>) => {
        if (!socket) return;
        const newTimer = {
            id: timer?.id || 'default-timer',
            label: 'Timer',
            durationSec: 60,
            remainingSec: 60,
            status: 'PAUSED' as const,
            updatedAt: Date.now(),
            ...timer,
            ...updates
        };

        socket.emit('client:patch_state', {
            path: ['timer'],
            value: newTimer
        });
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    // Render nothing if no timer active and not GM
    if (!timer && !isGm) return null;

    // Schema doesn't have visible field. Let's assume if it exists it is visible, or add visible to schema.
    // Spec says "optional visibility toggle".
    // Let's stick to Schema for now. If null, hidden.

    return (
        <div className="absolute top-4 left-1/2 -translate-x-[200px] z-30">
            <motion.div
                className={clsx(
                    "bg-stone-900/90 backdrop-blur border border-stone-700 rounded-full px-4 py-2 flex items-center gap-3 shadow-xl",
                    !timer && "opacity-50"
                )}
            >
                <Clock className="w-4 h-4 text-stone-400" />
                <span className={clsx(
                    "font-mono text-xl font-bold font-variant-numeric",
                    timeLeft === 0 ? "text-red-400" : "text-white"
                )}>
                    {formatTime(timeLeft)}
                </span>

                {isGm && (
                    <div className="flex items-center gap-1 border-l border-stone-700 pl-3">
                        <button
                            onClick={() => updateTimer({ status: timer?.status === 'RUNNING' ? 'PAUSED' : 'RUNNING' })}
                            className="p-1 hover:text-white text-stone-400 transition"
                        >
                            {timer?.status === 'RUNNING' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => updateTimer({ remainingSec: timer?.durationSec || 60, status: 'PAUSED' })}
                            className="p-1 hover:text-white text-stone-400 transition"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>

                        {/* Preset Time Inputs */}
                        {timer?.status !== 'RUNNING' && (
                            <div className="flex gap-1 ml-1">
                                {[1, 5, 10].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => updateTimer({ durationSec: m * 60, remainingSec: m * 60, status: 'PAUSED' })}
                                        className="text-[10px] bg-stone-800 px-1.5 py-0.5 rounded hover:bg-stone-700 text-stone-300"
                                    >
                                        {m}m
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => {
                                // Toggle visibility by nullifying timer? No, that deletes state.
                                // We need a visible field in schema if we want to toggle visibility without destroying state.
                                // For now, let's treat "Remove" as Hide.
                                socket.emit('client:patch_state', { path: ['timer'], value: null });
                            }}
                            className="p-1 hover:text-red-400 text-stone-500 transition ml-2"
                            title="Remove Timer"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
