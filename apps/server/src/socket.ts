import { Server, Socket } from 'socket.io';
import { store } from './store';
import {
    ServerEvents,
    ClientEvents,
    JoinRoomPayload,
    PlayerPresenceType,
} from 'vtt-shared';
import { z } from 'zod';

const JoinPayloadSchema = z.object({
    roomId: z.string(),
    password: z.string().optional(),
    displayName: z.string(),
    guestId: z.string()
});

export function setupSocket(io: Server) {
    io.on('connection', (socket: Socket) => {
        let currentRoomId: string | null = null;
        let guestId: string | null = null;

        socket.on(ClientEvents.JOIN_ROOM, async (payload: any) => {
            try {
                const { roomId, displayName, guestId: gId } = JoinPayloadSchema.parse(payload);

                let room = await store.getRoom(roomId);
                if (!room) {
                    return socket.emit(ServerEvents.ERROR, { message: 'Room not found' });
                }

                currentRoomId = roomId;
                guestId = gId;
                socket.join(roomId);

                const presence: PlayerPresenceType = {
                    id: guestId,
                    displayName,
                    color: '#' + Math.floor(Math.random() * 16777215).toString(16),
                    cursor: null,
                    connected: true,
                    isGm: guestId === room.gmId
                };

                room.players[guestId] = presence;
                // Do NOT persist presence constantly to redis if high churn, but for MVP yes.
                await store.saveRoom(roomId, room);

                socket.emit(ServerEvents.ROOM_STATE, room);
                socket.to(roomId).emit(ServerEvents.PLAYER_JOINED, presence);
            } catch (e) {
                console.error(e);
                socket.emit(ServerEvents.ERROR, { message: 'Invalid join request' });
            }
        });

        // Validations omitted for velocity
        socket.on(ClientEvents.UPDATE_TOKEN, async (data: any) => {
            console.log('Server received UPDATE_TOKEN:', data.id);
            if (!currentRoomId) return;
            io.to(currentRoomId).emit(ServerEvents.PATCH_STATE, {
                op: 'update',
                path: ['tokens', data.id],
                value: data
            });

            // Async save
            const room = await store.getRoom(currentRoomId);
            if (room) {
                room.tokens[data.id] = data;
                await store.saveRoom(currentRoomId, room);
            }
        });

        socket.on(ClientEvents.UPDATE_DRAWING, async (data: any) => {
            if (!currentRoomId) return;
            io.to(currentRoomId).emit(ServerEvents.PATCH_STATE, {
                op: 'update',
                path: ['drawings', data.id],
                value: data
            });

            const room = await store.getRoom(currentRoomId);
            if (room) {
                room.drawings[data.id] = data;
                await store.saveRoom(currentRoomId, room);
            }
        });

        socket.on(ClientEvents.UPDATE_MAP, async (data: any) => {
            if (!currentRoomId) return;
            // Broadcast full update because map changes are big
            // Or PATCH
            // Broadcast full update to EVERYONE inclusive because client does not optimistic update map
            io.to(currentRoomId).emit(ServerEvents.PATCH_STATE, {
                op: 'update',
                path: ['map'],
                value: data
            });

            const room = await store.getRoom(currentRoomId);
            if (room) {
                room.map = data;
                await store.saveRoom(currentRoomId, room);
            }
        });

        socket.on(ClientEvents.POINTER_MOVE, (data) => {
            if (!currentRoomId) return;
            socket.on(ClientEvents.POINTER_MOVE, (data) => {
                // Avoid echo? handled by broadcast .to() excluding sender
            });
            socket.to(currentRoomId).emit(ServerEvents.EVENT_POINTER, data);
        });

        // Audio Signaling (Relay)
        socket.on('SIGNAL_AUDIO', (data: { target: string, signal: any }) => {
            // Relay to specific target
            io.to(data.target).emit('SIGNAL_AUDIO', { from: guestId, signal: data.signal });
        });

        socket.on('AUDIO_STARTED', () => {
            if (!currentRoomId) return;
            socket.to(currentRoomId).emit('AUDIO_STARTED');
        });

        socket.on('AUDIO_STOPPED', () => {
            if (!currentRoomId) return;
            socket.to(currentRoomId).emit('AUDIO_STOPPED');
        });

        socket.on('JOIN_AUDIO_REQUEST', (data: { from: string }) => {
            // Relay to GM? Or broadcast?
            // Actually this is sent BY listener TO broadcaster. 
            // Broadcaster is not explicitly known by ID here easily unless we track text.
            // But usually GM is host.
            // For simple mesh: Relay to everyone or just GM? 
            // Logic: Listener emits this. We relay to GM.
            // We know GM Name/ID from room state? 
            // Optimization: Listener broadcasts "I want audio", GM picks it up.
            if (!currentRoomId) return;
            socket.to(currentRoomId).emit('JOIN_AUDIO_REQUEST', data);
        });

        socket.on('client:dice_roll', (data: { roomId: string, roll: any }) => {
            if (!currentRoomId) return;
            io.to(currentRoomId).emit('dice_roll', data.roll);
        });

        socket.on('disconnect', async () => {
            if (currentRoomId && guestId) {
                const room = await store.getRoom(currentRoomId);
                if (room && room.players[guestId]) {
                    room.players[guestId].connected = false;
                    await store.saveRoom(currentRoomId, room);
                    io.to(currentRoomId).emit(ServerEvents.PLAYER_LEFT, { id: guestId });
                }
            }
        });
    });
}
