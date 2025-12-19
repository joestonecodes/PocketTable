'use client';

import { TokenType, ClientEvents } from 'vtt-shared';
import { Socket } from 'socket.io-client';
import { Lock, Unlock, Eye, EyeOff, Copy, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';

interface TokenToolbarProps {
    token: TokenType;
    socket: Socket | null;
    onClose: () => void;
}

export default function TokenToolbar({ token, socket, onClose }: TokenToolbarProps) {
    if (!socket || !token) return null;

    const updateToken = (updates: Partial<TokenType>) => {
        socket.emit(ClientEvents.UPDATE_TOKEN, { ...token, ...updates });
        // Optimistic update should be handled by parent state ideally, 
        // but for now relying on server broadcast to update roomState -> parent -> this component.
    };

    const handleDuplicate = () => {
        const newToken = {
            ...token,
            id: uuidv4(),
            x: token.x + 25,
            y: token.y + 25
        };
        socket.emit(ClientEvents.UPDATE_TOKEN, newToken);
        onClose(); // Deselect original?
    };

    const handleDelete = () => {
        // Soft delete via visibility or hard delete?
        // Schema visible=false usually implies "hidden from players" but "deleted" implies gone.
        // If we want to fully delete, we need a DELETE event or use safe 'soft delete' logic.
        // Let's assume hiding is NOT deleting.
        if (confirm('Delete this token?')) {
            socket.emit(ClientEvents.UPDATE_TOKEN, { ...token, visible: false });
            // Actually currently visible:false removes it from rendering loop in GameCanvas, 
            // effectively deleting it from view.
            onClose();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute z-50 bg-stone-900 border border-stone-700 rounded-xl shadow-2xl p-2 flex items-center gap-2"
            style={{
                // Position? We don't know screen coords here easily without tracking.
                // For now, let's fix it to the bottom center or top center of the screen,
                // OR passing screen coords from parent.
                // Ideally it floats NEAR the token.
                // MVP: Fixed position bottom center just above the main toolbar?
                // Let's put it top center (below ID bar) or bottom center.
                // Let's do fixed "Centered Floating" for now.
                left: '50%',
                bottom: '100px',
                translateX: '-50%'
            }}
        >
            <div className="flex items-center gap-1 border-r border-stone-700 pr-2">
                <span className="text-xs font-bold text-stone-400 px-2 max-w-[100px] truncate">{token.label || 'Token'}</span>
            </div>

            <button
                onClick={() => updateToken({ visible: !token.visible })}
                className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition"
                title={token.visible ? "Hide" : "Show"}
            >
                {token.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-red-400" />}
            </button>

            <button
                onClick={() => updateToken({ locked: !token.locked })}
                className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition"
                title={token.locked ? "Unlock" : "Lock"}
            >
                {token.locked ? <Lock className="w-4 h-4 text-orange-400" /> : <Unlock className="w-4 h-4" />}
            </button>

            <div className="w-px h-6 bg-stone-800" />

            {/* Layer Control: Just modifying Z-index? 
                Actually Pixi sorts children. 
                We can't easily change z-index without reordering array in schema or a 'zIndex' prop.
                Schema doesn't have zIndex. It uses order in object? No, tokens are a Record. Order is arbitrary.
                We rely on `sortableChildren`. We need a `zIndex` field in TokenSchema.
                Current Schema: `layer` enum.
                Maybe we use `layer` for "Map vs Token".
                If we want Sort Order, we need a field.
                Let's skip Layer Reordering for MVP unless critical.
                "Bring Front/Send Back".
                Using array index is hard with Record.
                Let's skip for velocity.
            */}

            <button
                onClick={handleDuplicate}
                className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition"
                title="Duplicate"
            >
                <Copy className="w-4 h-4" />
            </button>

            <button
                onClick={handleDelete}
                className="p-2 hover:bg-red-900/50 rounded-lg text-stone-400 hover:text-red-400 transition"
                title="Delete"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </motion.div>
    );
}
