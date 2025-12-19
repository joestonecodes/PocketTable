'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import GameCanvas from '@/components/GameCanvas';
import AssetLibrary from '@/components/AssetLibrary';
import Toolbar, { ToolType } from '@/components/Toolbar';
import { toast } from 'sonner';
import SettingsSidebar from '@/components/SettingsSidebar';
import DiceTray from '@/components/DiceTray';
import Timer from '@/components/Timer';
import TokenToolbar from '@/components/TokenToolbar';
import { Settings } from 'lucide-react';
import ContextMenu from '@/components/ContextMenu';
import AudioManager from '@/components/AudioManager';
import { ClientEvents, ServerEvents, RoomStateType, TokenType } from 'vtt-shared';
import { v4 as uuidv4 } from 'uuid';

export default function GamePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const roomId = params.id as string;
    const isGm = searchParams.get('gm') === 'true';
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const [roomState, setRoomState] = useState<RoomStateType | null>(null);
    const [activeTool, setActiveTool] = useState<ToolType>('PAN');
    const [guestId, setGuestId] = useState<string>('');

    // Context Menu
    const [menu, setMenu] = useState<{ x: number, y: number, token: TokenType } | null>(null);
    const [selectedToken, setSelectedToken] = useState<TokenType | null>(null);

    // Update selectedToken when roomState updates
    useEffect(() => {
        if (selectedToken && roomState) {
            const current = roomState.tokens[selectedToken.id];
            if (current) setSelectedToken(current); // Live update toolbar
            else setSelectedToken(null); // Deselect if deleted
        }
    }, [roomState, selectedToken?.id]);

    const handleSelect = (token: TokenType | null) => {
        setSelectedToken(token);
    };

    useEffect(() => {
        let gId = localStorage.getItem('vtt_guest_id');
        if (!gId) {
            gId = uuidv4();
            localStorage.setItem('vtt_guest_id', gId);
        }
        setGuestId(gId);

        const s = io('http://localhost:4000');
        setSocket(s);

        s.on('connect', () => {
            setConnected(true);
            s.emit(ClientEvents.JOIN_ROOM, { roomId, displayName: `Player ${gId?.slice(0, 4)}`, guestId: gId });
        });

        s.on(ServerEvents.ROOM_STATE, (state: RoomStateType) => {
            setRoomState(state);
        });

        s.on(ServerEvents.PATCH_STATE, (patch) => {
            console.log('Received Patch:', patch);
            if (patch.op === 'update') {
                setRoomState(prev => {
                    if (!prev) return null;
                    const path = patch.path;
                    const newState = { ...prev };
                    if (path[0] === 'tokens') newState.tokens = { ...prev.tokens, [path[1]]: patch.value };
                    else if (path[0] === 'drawings') newState.drawings = { ...prev.drawings, [path[1]]: patch.value };
                    else if (path[0] === 'map') {
                        console.log('Updating map state to:', patch.value);
                        newState.map = patch.value;
                    }
                    return newState;
                });
            }
        });

        const handleKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;
            switch (e.key.toLowerCase()) {
                case ' ': setActiveTool('PAN'); break;
                case 'v': setActiveTool('SELECT'); break;
                case 'd': setActiveTool('DRAW'); break;
                case 'f': setActiveTool('FOG'); break;
                case 'r': setActiveTool('RULER'); break;
                case 'n': setActiveTool('NOTE'); break;
            }
        };
        window.addEventListener('keydown', handleKey);

        return () => {
            s.disconnect();
            window.removeEventListener('keydown', handleKey);
        }
    }, [roomId]);

    const handleContextAction = (action: string, payload?: any) => {
        if (!menu || !socket) return;
        const token = menu.token;
        switch (action) {
            case 'DELETE':
                socket.emit(ClientEvents.UPDATE_TOKEN, { ...token, visible: false });
                break;
            case 'ROTATE_CW':
                socket.emit(ClientEvents.UPDATE_TOKEN, { ...token, rotation: token.rotation + 45 });
                break;
            case 'TOGGLE_LOCK':
                socket.emit(ClientEvents.UPDATE_TOKEN, { ...token, locked: !token.locked });
                break;
            case 'DUPLICATE':
                const newToken = { ...token, id: uuidv4(), x: token.x + 25, y: token.y + 25 };
                socket.emit(ClientEvents.UPDATE_TOKEN, newToken);
                break;
        }
        setMenu(null);
    };

    const handleMapUpload = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('http://localhost:4000/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.url) {
                toast.loading('Loading map image...', { id: 'map-load' });
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    if (socket) {
                        socket.emit(ClientEvents.UPDATE_MAP, {
                            url: data.url,
                            width: img.width,
                            height: img.height,
                            offset: { x: 0, y: 0 },
                            scale: 1
                        });
                        toast.success('Map updated successfully', { id: 'map-load' });
                    }
                };
                img.onerror = (err) => {
                    console.error('Map Image Load Failed:', err);
                    toast.error('Failed to load map image (CORS or 404)', { id: 'map-load' });
                };
                img.src = data.url;
            }
        } catch (e) {
            console.error('Upload error:', e);
            toast.error(`Upload failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    };

    const [isExporting, setIsExporting] = useState(false);

    const handleExportSession = async () => {
        if (!roomState) return;
        setIsExporting(true);
        try {
            const JSZip = (await import('jszip')).default;
            const saveAs = (await import('file-saver')).default;
            const { getAssets } = await import('@/lib/db');

            const zip = new JSZip();

            // 1. Add Room State
            zip.file('state.json', JSON.stringify(roomState, null, 2));

            // 2. Add Assets
            const assetsFolder = zip.folder('assets');
            const assets = await getAssets();
            const manifest: any[] = [];

            assets.forEach(asset => {
                if (assetsFolder) {
                    const ext = asset.blob.type.split('/')[1] || 'bin';
                    assetsFolder.file(`${asset.id}.${ext}`, asset.blob);
                    manifest.push({
                        id: asset.id,
                        name: asset.name,
                        type: asset.type,
                        timestamp: asset.timestamp,
                        ext
                    });
                }
            });
            zip.file('assets.json', JSON.stringify(manifest, null, 2));

            // 3. Generate Zip
            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `vtt-session-${roomId}-${new Date().toISOString().slice(0, 10)}.zip`);
            toast.success('Session backup created!');
        } catch (e) {
            console.error('Export failed:', e);
            toast.error('Export failed');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportSession = async (file: File) => {
        if (!socket) return;
        try {
            const JSZip = (await import('jszip')).default;
            const { addAsset, getAssets } = await import('@/lib/db');

            const zip = await JSZip.loadAsync(file);

            // 1. Restore Assets
            const assetsFolder = zip.folder('assets');
            if (assetsFolder) {
                // ... (logic from before)
            }

            const stateFile = zip.file('state.json');
            if (!stateFile) throw new Error('Invalid backup: missing state.json');
            const stateStr = await stateFile.async('string');
            const newState = JSON.parse(stateStr) as RoomStateType;

            const assetsManifestFile = zip.file('assets.json');
            if (assetsManifestFile) {
                const manifestStr = await assetsManifestFile.async('string');
                const manifest = JSON.parse(manifestStr) as { id: string, name: string, type: any, timestamp: number, ext: string }[];

                for (const meta of manifest) {
                    const blob = await assetsFolder?.file(`${meta.id}.${meta.ext}`)?.async('blob');
                    if (blob) {
                        await addAsset({
                            id: meta.id,
                            name: meta.name,
                            type: meta.type,
                            blob: blob,
                            timestamp: meta.timestamp
                        });
                    }
                }
            }

            socket.emit(ClientEvents.UPDATE_MAP, newState.map);
            socket.emit('client:patch_state', { path: ['map'], value: newState.map });
            socket.emit('client:patch_state', { path: ['tokens'], value: newState.tokens });
            socket.emit('client:patch_state', { path: ['drawings'], value: newState.drawings });
            socket.emit('client:patch_state', { path: ['config'], value: newState.config });

            toast.success('Session restored successfully!');
            setTimeout(() => window.location.reload(), 500);

        } catch (e) {
            console.error('Import failed:', e);
            toast.error('Invalid backup file');
        }
    };

    if (!connected) return <div className="text-white">Connecting...</div>;
    if (!roomState) return <div className="text-white">Loading Room...</div>;

    const updateToken = (token: TokenType) => {
        if (!socket) return;
        // Optimistic Update
        setRoomState(prev => {
            if (!prev) return null;
            return {
                ...prev,
                tokens: { ...prev.tokens, [token.id]: token }
            };
        });
        socket.emit(ClientEvents.UPDATE_TOKEN, token);
    };

    return (
        <div className="w-screen h-screen bg-black overflow-hidden flex">
            {/* Left Sidebar: Asset Library */}
            <div className="h-full z-30 relative shrink-0">
                <AssetLibrary onAddToMap={(asset) => {
                    const newToken: TokenType = {
                        id: uuidv4(),
                        type: asset.type as any,
                        x: 400,
                        y: 300,
                        rotation: 0,
                        scale: 1,
                        layer: 'TOKEN',
                        ownerId: localStorage.getItem('vtt_guest_id'),
                        src: asset.url,
                        label: asset.name,
                        visible: true,
                        statusRings: [],
                        locked: false
                    };
                    updateToken(newToken);
                    toast.success(`Added ${asset.name} to map`);
                }} />
            </div>

            {/* Main Content */}
            <div className="flex-1 relative h-full min-w-0">
                <Toolbar activeTool={activeTool} setTool={setActiveTool} />

                <GameCanvas
                    roomState={roomState}
                    socket={socket}
                    activeTool={activeTool}
                    onContextMenu={(x, y, token) => setMenu({ x, y, token })}
                    onSelect={handleSelect}
                    onTokenUpdate={updateToken}
                />

                {menu && (
                    <ContextMenu
                        x={menu.x}
                        y={menu.y}
                        token={menu.token}
                        onClose={() => setMenu(null)}
                        onAction={handleContextAction}
                    />
                )}

                {selectedToken && (
                    <TokenToolbar
                        token={selectedToken}
                        socket={socket}
                        onClose={() => setSelectedToken(null)}
                    />
                )}

                <div className="absolute top-4 left-4 z-50 text-white bg-black/50 p-2 rounded pointer-events-none">
                    Room: {roomId} | Tool: {activeTool}
                </div>

                <AudioManager
                    socket={socket}
                    roomId={roomId}
                    isGm={isGm}
                    guestId={guestId}
                />
                <Timer
                    socket={socket}
                    timer={roomState.timer}
                    isGm={isGm}
                    roomId={roomId}
                />
                <DiceTray socket={socket} roomId={roomId} displayName={`Player ${guestId.slice(0, 4)}`} />
            </div>

            {/* Right Sidebar: Settings */}
            <div className="h-full z-30 relative shrink-0">
                <SettingsSidebar
                    config={roomState.config}
                    onUpdateConfig={(updates) => {
                        if (socket) socket.emit('client:patch_state', {
                            path: ['config'],
                            value: { ...roomState.config, ...updates }
                        });
                        setRoomState(prev => prev ? { ...prev, config: { ...prev.config, ...updates } } : null);
                    }}
                    map={roomState.map}
                    onUpdateMap={(updates) => {
                        if (roomState.map && socket) {
                            const newMap = { ...roomState.map, ...updates };
                            socket.emit(ClientEvents.UPDATE_MAP, newMap);
                            setRoomState(prev => prev ? { ...prev, map: newMap } : null);
                        }
                    }}
                    onMapUpload={handleMapUpload}
                    roomId={roomId}
                    isGm={isGm}
                    onExportSession={handleExportSession}
                    onImportSession={handleImportSession}
                />
            </div>
        </div>
    );
}
