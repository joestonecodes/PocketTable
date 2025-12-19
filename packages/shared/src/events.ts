import { RoomStateType } from './schema';

export enum ServerEvents {
    ROOM_STATE = 'ROOM_STATE', // Full sync
    PATCH_STATE = 'PATCH_STATE', // Delta update
    PLAYER_JOINED = 'PLAYER_JOINED',
    PLAYER_LEFT = 'PLAYER_LEFT',
    EVENT_POINTER = 'EVENT_POINTER',
    EVENT_DICE = 'EVENT_DICE',
    ERROR = 'ERROR',
}

export enum ClientEvents {
    JOIN_ROOM = 'JOIN_ROOM',
    UPDATE_TOKEN = 'UPDATE_TOKEN',
    DELETE_TOKEN = 'DELETE_TOKEN',
    UPDATE_DRAWING = 'UPDATE_DRAWING',
    UPDATE_FOG = 'UPDATE_FOG',
    UPDATE_MAP = 'UPDATE_MAP',
    UPDATE_CONFIG = 'UPDATE_CONFIG',
    POINTER_MOVE = 'POINTER_MOVE',
    ROLL_DICE = 'ROLL_DICE',
}

export interface JoinRoomPayload {
    roomId: string;
    password?: string;
    displayName: string;
    guestId: string; // Stable ID from localStorage
}

export interface PatchStatePayload {
    op: 'replace' | 'add' | 'remove';
    path: string[]; // e.g. ['tokens', 'id123', 'x']
    value: any;
}

export interface PointerEventPayload {
    x: number;
    y: number;
    color: string;
    guestId: string;
}

export interface DiceEventPayload {
    formula: string;
    results: number[];
    total: number;
    guestId: string;
}
