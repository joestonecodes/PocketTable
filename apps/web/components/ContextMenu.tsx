'use client';

import { useEffect, useRef } from 'react';
import { Trash2, RotateCw, Lock, Copy } from 'lucide-react';
import { TokenType } from 'vtt-shared';

interface ContextMenuProps {
    x: number;
    y: number;
    token: TokenType;
    onClose: () => void;
    onAction: (action: string, payload?: any) => void;
}

export default function ContextMenu({ x, y, token, onClose, onAction }: ContextMenuProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="absolute bg-stone-900 border border-stone-700 rounded shadow-xl py-1 z-50 text-sm text-stone-200 w-48"
            style={{ top: y, left: x }}
        >
            <div className="px-3 py-2 border-b border-stone-800 font-bold bg-stone-950/50 truncate">
                {token.label || 'Token'}
            </div>

            <button
                onClick={() => onAction('ROTATE_CW')}
                className="w-full text-left px-3 py-2 hover:bg-stone-800 flex items-center gap-2"
            >
                <RotateCw className="w-4 h-4" /> Rotate 45°
            </button>

            <button
                onClick={() => onAction('TOGGLE_LOCK')}
                className="w-full text-left px-3 py-2 hover:bg-stone-800 flex items-center gap-2"
            >
                <Lock className="w-4 h-4" /> {token.locked ? 'Unlock' : 'Lock'}
            </button>

            <button
                onClick={() => onAction('DUPLICATE')}
                className="w-full text-left px-3 py-2 hover:bg-stone-800 flex items-center gap-2"
            >
                <Copy className="w-4 h-4" /> Duplicate
            </button>

            <div className="h-px bg-stone-800 my-1"></div>

            <button
                onClick={() => onAction('DELETE')}
                className="w-full text-left px-3 py-2 hover:bg-red-900/50 text-red-400 flex items-center gap-2"
            >
                <Trash2 className="w-4 h-4" /> Delete
            </button>
        </div>
    );
}
