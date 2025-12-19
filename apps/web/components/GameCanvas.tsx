'use client';

import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { RoomStateType, ClientEvents, TokenType } from 'vtt-shared';
import { Socket } from 'socket.io-client';
import { useGesture } from '@use-gesture/react';
import { v4 as uuidv4 } from 'uuid';
import { ToolType } from './Toolbar';

interface GameCanvasProps {
    roomState: RoomStateType;
    socket: Socket | null;
    activeTool: ToolType;
    onContextMenu: (x: number, y: number, token: TokenType) => void;
    onSelect: (token: TokenType | null) => void;
    onTokenUpdate?: (token: TokenType) => void;
}

export default function GameCanvas({ roomState, socket, activeTool, onContextMenu, onSelect, onTokenUpdate }: GameCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);

    // Layers
    const viewportRef = useRef<PIXI.Container | null>(null);
    const mapLayerRef = useRef<PIXI.Sprite | null>(null);
    const drawingLayerRef = useRef<PIXI.Graphics | null>(null);
    const noteLayerRef = useRef<PIXI.Container | null>(null);
    const tokenLayerRef = useRef<PIXI.Container | null>(null);
    const fogLayerRef = useRef<PIXI.Graphics | null>(null);
    const gridRef = useRef<PIXI.Graphics | null>(null);

    // Sync Refs
    const transform = useRef({ x: 0, y: 0, scale: 1 });
    const roomStateRef = useRef(roomState);
    roomStateRef.current = roomState;
    const toolRef = useRef(activeTool);
    toolRef.current = activeTool;
    const draggingId = useRef<string | null>(null);

    // Caches
    const spriteMap = useRef<Map<string, PIXI.Sprite>>(new Map());
    const noteMap = useRef<Map<string, PIXI.Container>>(new Map());
    const drawingBuffer = useRef<number[]>([]);
    const currentDrawingId = useRef<string | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        let activeApp: PIXI.Application | null = null;
        let mounted = true;

        const initPixi = async () => {
            if (containerRef.current) {
                while (containerRef.current.firstChild) {
                    containerRef.current.removeChild(containerRef.current.firstChild);
                }
            }

            const app = new PIXI.Application();
            await app.init({
                resizeTo: containerRef.current!,
                backgroundColor: '#1a1a1a',
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
            });

            if (!mounted) {
                app.destroy(true, { children: true });
                return;
            }

            containerRef.current!.appendChild(app.canvas);
            appRef.current = app;
            activeApp = app;

            // Viewport
            const viewport = new PIXI.Container();
            app.stage.addChild(viewport);
            viewportRef.current = viewport;
            viewport.eventMode = 'static';
            viewport.hitArea = new PIXI.Rectangle(-100000, -100000, 200000, 200000);

            const mapSprite = new PIXI.Sprite();
            mapSprite.anchor.set(0.5); // Center anchor for easier positioning
            viewport.addChild(mapSprite);
            mapLayerRef.current = mapSprite;

            const grid = new PIXI.Graphics();
            viewport.addChild(grid);
            gridRef.current = grid;

            const drawingLayer = new PIXI.Graphics();
            viewport.addChild(drawingLayer);
            drawingLayerRef.current = drawingLayer;

            const noteLayer = new PIXI.Container();
            viewport.addChild(noteLayer);
            noteLayerRef.current = noteLayer;

            const tokenLayer = new PIXI.Container();
            viewport.addChild(tokenLayer);
            tokenLayerRef.current = tokenLayer;
            tokenLayer.sortableChildren = true;

            const fogLayer = new PIXI.Graphics();
            viewport.addChild(fogLayer);
            fogLayerRef.current = fogLayer;
            fogLayer.alpha = 0.5;

            // Interaction
            viewport.on('pointerdown', (e) => {
                if (toolRef.current === 'SELECT') {
                    // If clicking empty space, deselect
                    // Pixi event bubbling: tokens stop propagation. If we reach here, it's empty space (or map).
                    onSelect(null);
                }
                if (toolRef.current === 'DRAW' || toolRef.current === 'FOG') {
                    const pos = e.getLocalPosition(viewport);
                    currentDrawingId.current = uuidv4();
                    drawingBuffer.current = [pos.x, pos.y];
                }
            });

            viewport.on('pointermove', (e) => {
                if ((toolRef.current === 'DRAW' || toolRef.current === 'FOG') && currentDrawingId.current) {
                    const pos = e.getLocalPosition(viewport);
                    drawingBuffer.current.push(pos.x, pos.y);
                }
            });

            viewport.on('pointerup', (e) => {
                // Note Tool
                if (toolRef.current === 'NOTE') {
                    const pos = e.getLocalPosition(viewport);
                    // Use setTimeout to avoid blocking event loop or UI sync issues during click
                    setTimeout(() => {
                        const text = window.prompt("Enter note text:");
                        if (text) {
                            const newNote = {
                                id: uuidv4(),
                                type: 'text',
                                points: [pos.x, pos.y],
                                color: '#000000',
                                fill: '#ffff88',
                                text: text,
                                width: 1,
                                layer: 'NOTE'
                            };
                            if (socket) socket.emit(ClientEvents.UPDATE_DRAWING, newNote);
                        }
                    }, 10);
                }

                if ((toolRef.current === 'DRAW' || toolRef.current === 'FOG') && currentDrawingId.current) {
                    const layer = toolRef.current === 'FOG' ? 'FOG' : 'DRAWING';
                    const color = toolRef.current === 'FOG' ? '#000000' : '#ff0000';
                    const width = toolRef.current === 'FOG' ? 0 : 3;

                    const newDrawing = {
                        id: currentDrawingId.current,
                        type: 'brush',
                        points: [...drawingBuffer.current],
                        color,
                        width: toolRef.current === 'FOG' ? 40 : 3,
                        layer
                    };
                    if (socket) socket.emit(ClientEvents.UPDATE_DRAWING, newDrawing);
                    currentDrawingId.current = null;
                    drawingBuffer.current = [];
                }
            });

            // Ticker
            app.ticker.add(() => {
                // 0. Map
                const mapState = roomStateRef.current.map;
                if (mapState && mapLayerRef.current) {
                    if (mapLayerRef.current.label !== mapState.url) {
                        PIXI.Assets.load(mapState.url).then((texture) => {
                            if (mapLayerRef.current) {
                                mapLayerRef.current.texture = texture;
                                mapLayerRef.current.label = mapState.url;
                                mapLayerRef.current.width = mapState.width * (mapState.scale || 1);
                                mapLayerRef.current.height = mapState.height * (mapState.scale || 1);
                                mapLayerRef.current.anchor.set(0.5); // Center map

                                // Reset Viewport to fit
                                if (viewportRef.current) {
                                    // Scale to fit screen
                                    const screenW = app.screen.width;
                                    const screenH = app.screen.height;
                                    const mapW = mapState.width * (mapState.scale || 1);
                                    const mapH = mapState.height * (mapState.scale || 1);

                                    const scale = Math.min(screenW / mapW, screenH / mapH) * 0.9;
                                    viewportRef.current.scale.set(scale);
                                    viewportRef.current.position.set(screenW / 2, screenH / 2); // Center of screen
                                    // Update ref
                                    transform.current = { x: screenW / 2, y: screenH / 2, scale };
                                }
                            }
                        });
                    } else {
                        // Texture loaded but scale might change
                        mapLayerRef.current.width = mapState.width * (mapState.scale || 1);
                        mapLayerRef.current.height = mapState.height * (mapState.scale || 1);
                    }
                }

                // 1. Grid
                if (gridRef.current) {
                    gridRef.current.clear();
                    const config = roomStateRef.current.config;

                    if (config.gridVisible) {
                        const size = config.gridSize || 50;
                        const color = config.gridColor || '#000000';
                        const opacity = config.gridOpacity ?? 0.2;

                        const scale = transform.current.scale;
                        const vx = viewportRef.current?.x || 0;
                        const vy = viewportRef.current?.y || 0;

                        const screenW = app.screen.width;
                        const screenH = app.screen.height;

                        const worldLeft = (0 - vx) / scale;
                        const worldTop = (0 - vy) / scale;
                        const worldRight = (screenW - vx) / scale;
                        const worldBottom = (screenH - vy) / scale;

                        // Add buffer
                        const buff = size * 2;
                        const startX = Math.floor((worldLeft - buff) / size) * size;
                        const endX = Math.ceil((worldRight + buff) / size) * size;
                        const startY = Math.floor((worldTop - buff) / size) * size;
                        const endY = Math.ceil((worldBottom + buff) / size) * size;

                        // Vertical lines
                        for (let x = startX; x <= endX; x += size) {
                            gridRef.current.moveTo(x, startY);
                            gridRef.current.lineTo(x, endY);
                        }

                        // Horizontal lines
                        for (let y = startY; y <= endY; y += size) {
                            gridRef.current.moveTo(startX, y);
                            gridRef.current.lineTo(endX, y);
                        }

                        gridRef.current.stroke({ width: 1 / scale, color: color, alpha: opacity });
                    }
                }

                // 2. Drawings & Fog
                const drawings = roomStateRef.current.drawings;

                if (drawingLayerRef.current) drawingLayerRef.current.clear();
                if (fogLayerRef.current) fogLayerRef.current.clear();

                const drawBuffer = (target: PIXI.Graphics, pts: number[], color: any, width: number) => {
                    if (pts.length < 2) return;
                    target.moveTo(pts[0], pts[1]);
                    target.strokeStyle = { width, color, alpha: 1, cap: 'round', join: 'round' };
                    for (let i = 2; i < pts.length; i += 2) target.lineTo(pts[i], pts[i + 1]);
                    target.stroke();
                };

                Object.values(drawings).forEach((d: any) => {
                    if (d.type === 'text') return;
                    const target = d.layer === 'FOG' ? fogLayerRef.current : drawingLayerRef.current;
                    if (target) drawBuffer(target, d.points, d.color, d.width);
                });

                if (drawingBuffer.current.length > 2) {
                    const target = toolRef.current === 'FOG' ? fogLayerRef.current : drawingLayerRef.current;
                    const width = toolRef.current === 'FOG' ? 40 : 3;
                    const color = toolRef.current === 'FOG' ? 0x000000 : 0x00ff00;
                    if (target) drawBuffer(target, drawingBuffer.current, color, width);
                }

                // 3. Notes
                const currentNotes = Object.values(drawings).filter(d => (d as any).type === 'text');
                // Cleanup
                for (const [id, container] of noteMap.current.entries()) {
                    if (!drawings[id] || (drawings[id] as any).type !== 'text') {
                        noteLayer.removeChild(container);
                        noteMap.current.delete(id);
                    }
                }
                // Update
                currentNotes.forEach(d => {
                    const note = d as any; // Cast to access text prop until schema updates propogate
                    let container = noteMap.current.get(note.id);
                    if (!container) {
                        container = new PIXI.Container();
                        const bg = new PIXI.Graphics();
                        bg.label = 'bg';

                        const textStyle = new PIXI.TextStyle({
                            fontFamily: 'Arial',
                            fontSize: 14,
                            fill: note.color || '#000000',
                            wordWrap: true,
                            wordWrapWidth: 140
                        });
                        const text = new PIXI.Text({ text: note.text || '', style: textStyle });
                        text.label = 'text';
                        text.anchor.set(0.5);

                        bg.rect(-75, -50, 150, 100).fill({ color: note.fill || '#ffff88' }).stroke({ width: 1, color: '#000000' });

                        container.addChild(bg);
                        container.addChild(text);
                        container.position.set(note.points[0], note.points[1]);

                        container.eventMode = 'static';
                        let dragData: any = null;

                        container.on('pointerdown', (e) => {
                            if (toolRef.current === 'NOTE' || toolRef.current === 'SELECT') {
                                dragData = e.data;
                                container!.alpha = 0.8;
                                e.stopPropagation();
                            }
                        });
                        container.on('globalpointermove', (e) => {
                            if (dragData) {
                                const newPos = dragData.getLocalPosition(viewport);
                                container!.position.set(newPos.x, newPos.y);
                                if (socket) socket.emit(ClientEvents.UPDATE_DRAWING, { ...note, points: [newPos.x, newPos.y] });
                            }
                        });
                        container.on('pointerup', () => {
                            if (dragData) { container!.alpha = 1; dragData = null; }
                        });
                        container.on('rightclick', (e) => {
                            e.stopPropagation();
                            if (confirm('Delete note?')) {
                                if (socket) socket.emit('client:patch_state', { op: 'remove', path: ['drawings', note.id], value: null });
                            }
                        });

                        noteLayer.addChild(container);
                        noteMap.current.set(note.id, container);
                    }
                    // Sync
                    container.position.set(note.points[0], note.points[1]);
                });

                // 4. Tokens
                const currentTokens = roomStateRef.current.tokens;
                for (const [id, sprite] of spriteMap.current.entries()) {
                    if (!currentTokens[id] || currentTokens[id].visible === false) {
                        tokenLayer.removeChild(sprite);
                        spriteMap.current.delete(id);
                    }
                }
                Object.values(currentTokens).filter(t => t.visible !== false).forEach(token => {
                    let sprite = spriteMap.current.get(token.id);
                    if (!sprite) {
                        sprite = PIXI.Sprite.from(token.src);
                        sprite.anchor.set(0.5);
                        sprite.width = 50; sprite.height = 50;
                        sprite.eventMode = 'static';

                        let dragData: any = null;
                        sprite.on('pointerdown', (e) => {
                            if (e.button === 2) {
                                onContextMenu(e.global.x, e.global.y, token);
                                e.stopPropagation();
                                return;
                            }
                            if (toolRef.current === 'SELECT') {
                                dragData = e.data;
                                draggingId.current = token.id;
                                sprite!.alpha = 0.5;
                                onSelect(token);
                                e.stopPropagation();
                            }
                        });
                        sprite.on('globalpointermove', (e) => {
                            if (dragData && toolRef.current === 'SELECT') {
                                const newPos = dragData.getLocalPosition(viewport);
                                const config = roomStateRef.current.config;
                                const gridSize = config.gridSize || 50;

                                let finalX = newPos.x;
                                let finalY = newPos.y;

                                if (config.snapToGrid) {
                                    finalX = Math.round(newPos.x / gridSize) * gridSize;
                                    finalY = Math.round(newPos.y / gridSize) * gridSize;
                                }

                                const dx = finalX - sprite!.position.x;
                                const dy = finalY - sprite!.position.y;

                                if (dx === 0 && dy === 0) return;

                                sprite!.position.set(finalX, finalY);
                                // For drag moves, we stick to socket emit unless onTokenUpdate handles high freq efficiently.
                                // To avoid lag, we'll direct emit here, but use onTokenUpdate on release.
                                if (socket) socket.emit(ClientEvents.UPDATE_TOKEN, { ...token, x: finalX, y: finalY });

                                // Move attachments
                                Object.values(currentTokens).filter(t => t.attachedToId === token.id).forEach(child => {
                                    const childSprite = spriteMap.current.get(child.id);
                                    if (childSprite) {
                                        const cx = childSprite.position.x + dx;
                                        const cy = childSprite.position.y + dy;
                                        childSprite.position.set(cx, cy);
                                        if (socket) socket.emit(ClientEvents.UPDATE_TOKEN, { ...child, x: cx, y: cy });
                                    }
                                });
                            }
                        });
                        sprite.on('pointerup', () => {
                            if (dragData) {
                                dragData = null;
                                draggingId.current = null;
                                sprite!.alpha = 1;

                                // Final Update via Optimistic Handler if available
                                if (onTokenUpdate) {
                                    onTokenUpdate({ ...token, x: sprite!.x, y: sprite!.y });
                                } else if (socket) {
                                    socket.emit(ClientEvents.UPDATE_TOKEN, { ...token, x: sprite!.x, y: sprite!.y });
                                }

                                // Auto-Attach Logic
                                const myRect = sprite!.getBounds();
                                let parentId: string | undefined = undefined; // Explicitly undefined to clear

                                const contentCenter = { x: sprite!.x, y: sprite!.y }; // Local coords (world)

                                for (const otherToken of Object.values(currentTokens)) {
                                    if (otherToken.id === token.id) continue;
                                    if (otherToken.attachedToId) continue;
                                    const otherSprite = spriteMap.current.get(otherToken.id);
                                    if (!otherSprite) continue;

                                    const size = 50 * (otherToken.scale || 1);
                                    const half = size / 2;
                                    if (
                                        contentCenter.x > otherToken.x - half &&
                                        contentCenter.x < otherToken.x + half &&
                                        contentCenter.y > otherToken.y - half &&
                                        contentCenter.y < otherToken.y + half
                                    ) {
                                        parentId = otherToken.id;
                                        break;
                                    }
                                }

                                if (token.attachedToId !== parentId) {
                                    const updated = { ...token, x: sprite!.x, y: sprite!.y, attachedToId: parentId };
                                    if (onTokenUpdate) onTokenUpdate(updated);
                                    else if (socket) socket.emit(ClientEvents.UPDATE_TOKEN, updated);
                                }
                            }
                        });
                        tokenLayer.addChild(sprite);
                        spriteMap.current.set(token.id, sprite);
                    }

                    // Sync Position only if NOT dragging
                    if (draggingId.current !== token.id) {
                        sprite.position.set(token.x, token.y);
                    }

                    sprite.width = 50 * (token.scale || 1);
                    sprite.height = 50 * (token.scale || 1);
                    sprite.rotation = (token.rotation || 0) * (Math.PI / 180);
                });
            });
        };

        initPixi();

        return () => {
            mounted = false;
            activeApp?.destroy(true, { children: true });
            appRef.current = null;
        };
    }, []);

    useEffect(() => { toolRef.current = activeTool; }, [activeTool]);

    useGesture({
        onDrag: ({ offset: [x, y], event }) => {
            if (toolRef.current !== 'PAN') return;
            transform.current.x = x;
            transform.current.y = y;
            if (viewportRef.current) {
                viewportRef.current.position.set(x, y);
            }
        },
        onWheel: ({ delta: [, dy], event }) => {
            event.preventDefault();
            const s = transform.current.scale * (1 - dy / 1000);
            const newScale = Math.max(0.1, Math.min(s, 5));
            transform.current.scale = newScale;
            if (viewportRef.current) viewportRef.current.scale.set(newScale);
        }
    }, {
        target: containerRef,
        drag: { from: () => [transform.current.x, transform.current.y] },
        wheel: { eventOptions: { passive: false } }
    });

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('application/json');
        if (!data) return;
        try {
            const { src, tokenType } = JSON.parse(data);
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect || !viewportRef.current) return;
            const clientX = e.clientX - rect.left;
            const clientY = e.clientY - rect.top;
            const worldX = (clientX - viewportRef.current.x) / viewportRef.current.scale.x;
            const worldY = (clientY - viewportRef.current.y) / viewportRef.current.scale.y;

            const config = roomStateRef.current.config;
            const gridSize = config.gridSize || 50;

            let finalX = worldX;
            let finalY = worldY;

            if (config.snapToGrid) {
                finalX = Math.round(worldX / gridSize) * gridSize;
                finalY = Math.round(worldY / gridSize) * gridSize;
            }

            let initialScale = 1;
            if (config.scaleToGrid) {
                initialScale = gridSize / 50; // Assuming base size 50
            }

            const newToken: TokenType = {
                id: uuidv4(),
                type: tokenType,
                x: finalX,
                y: finalY,
                rotation: 0,
                scale: initialScale,
                layer: 'TOKEN',
                ownerId: localStorage.getItem('vtt_guest_id'),
                src: src, label: 'Token', visible: true, statusRings: [], locked: false
            };

            if (onTokenUpdate) {
                onTokenUpdate(newToken);
            } else if (socket) {
                socket.emit(ClientEvents.UPDATE_TOKEN, newToken);
            }
        } catch (err) {
            console.error('onDrop Error:', err);
        }
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full touch-none select-none outline-none cursor-crosshair"
            onContextMenu={e => e.preventDefault()}
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
        />
    );
}
