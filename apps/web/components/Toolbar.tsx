'use client';

import {
    MousePointer2,
    Hand,
    Pencil,
    CloudFog,
    Ruler,
    Eraser,
    StickyNote
} from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

export type ToolType = 'PAN' | 'SELECT' | 'DRAW' | 'FOG' | 'RULER' | 'ERASE' | 'NOTE';

interface ToolbarProps {
    activeTool: ToolType;
    setTool: (t: ToolType) => void;
}

export default function Toolbar({ activeTool, setTool }: ToolbarProps) {
    const tools: { id: ToolType, icon: any, label: string, shortcut: string }[] = [
        { id: 'PAN', icon: Hand, label: 'Pan', shortcut: 'Space' },
        { id: 'SELECT', icon: MousePointer2, label: 'Select', shortcut: 'V' },
        { id: 'DRAW', icon: Pencil, label: 'Draw', shortcut: 'D' },
        { id: 'NOTE', icon: StickyNote, label: 'Note', shortcut: 'N' },
        { id: 'ERASE', icon: Eraser, label: 'Erase', shortcut: 'E' },
        { id: 'FOG', icon: CloudFog, label: 'Fog', shortcut: 'F' },
        { id: 'RULER', icon: Ruler, label: 'Measure', shortcut: 'R' },
    ];

    return (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40">
            <div className="bg-stone-900/90 backdrop-blur-md border border-stone-800 rounded-2xl flex items-center p-2 shadow-2xl ring-1 ring-black/20">
                {tools.map(tool => {
                    const isActive = activeTool === tool.id;
                    return (
                        <button
                            key={tool.id}
                            onClick={() => setTool(tool.id)}
                            className="relative group p-3 rounded-xl transition-all duration-200 ease-out mx-0.5"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeTool"
                                    className="absolute inset-0 bg-indigo-600 rounded-xl"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                            <div className="relative flex items-center justify-center">
                                <tool.icon
                                    className={clsx(
                                        "w-6 h-6 transition-colors duration-200",
                                        isActive ? "text-white" : "text-stone-400 group-hover:text-stone-200"
                                    )}
                                />
                            </div>

                            {/* Tooltip */}
                            <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                {tool.label} <span className="text-stone-500">({tool.shortcut})</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
