'use client';

import { useState, useEffect } from 'react';
import { Settings, Upload, Grid, Monitor, ChevronLeft, ChevronRight, Volume2, Gamepad2, Copy, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { RoomStateType } from 'vtt-shared';

interface SettingsSidebarProps {
    config: {
        gridSize: number;
        gridVisible: boolean;
        gridColor: string;
        gridOpacity: number;
        snapToGrid: boolean;
        scaleToGrid: boolean;
    };
    onUpdateConfig: (updates: Partial<{ gridSize: number, gridVisible: boolean, gridColor: string, gridOpacity: number, snapToGrid: boolean, scaleToGrid: boolean }>) => void;
    map: { width: number, height: number, url: string, scale: number } | null;
    onUpdateMap: (updates: Partial<{ scale: number }>) => void;
    onMapUpload: (file: File) => Promise<void>;
    roomId: string;
    isGm: boolean;
    onExportSession: () => Promise<void>;
    onImportSession: (file: File) => Promise<void>;
}

type Tab = 'map' | 'grid' | 'audio' | 'system';

export default function SettingsSidebar({ config, onUpdateConfig, map, onUpdateMap, onMapUpload, roomId, isGm, onExportSession, onImportSession }: SettingsSidebarProps) {
    const [activeTab, setActiveTab] = useState<Tab>('map');
    const [collapsed, setCollapsed] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [host, setHost] = useState('');

    useEffect(() => {
        setHost(window.location.origin);
    }, []);

    const tabs: { id: Tab, label: string, icon: any }[] = [
        { id: 'map', label: 'Map', icon: Upload },
        { id: 'grid', label: 'Grid', icon: Grid },
        { id: 'system', label: 'System', icon: Monitor },
    ];

    return (
        <div className="flex h-full border-l border-stone-800 bg-stone-950 transition-all duration-300 relative z-40">
            {/* Content Drawer (Left of Icons) */}
            <div className={clsx(
                "bg-stone-900 overflow-hidden flex flex-col transition-all duration-300 ease-in-out border-l border-stone-800",
                collapsed ? "w-0 opacity-0 border-none" : "w-72 opacity-100"
            )}>
                {/* Header */}
                <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-900/50 backdrop-blur h-14">
                    <h3 className="font-bold text-stone-200 flex items-center gap-2">
                        {tabs.find(t => t.id === activeTab)?.label} Settings
                    </h3>
                    <button onClick={() => setCollapsed(true)} className="md:hidden text-stone-500">
                        <ChevronRight />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {activeTab === 'map' && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Background Image</h4>
                                <div className="border-2 border-dashed border-stone-700 rounded-xl p-6 hover:bg-stone-800/50 transition-colors group cursor-pointer relative flex flex-col items-center justify-center text-center">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={uploading}
                                        onChange={async (e) => {
                                            if (e.target.files?.[0]) {
                                                setUploading(true);
                                                await onMapUpload(e.target.files[0]);
                                                setUploading(false);
                                            }
                                        }}
                                    />
                                    {uploading ? (
                                        <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mb-2" />
                                    ) : (
                                        <Upload className="w-8 h-8 text-stone-500 group-hover:text-indigo-400 mb-2 transition" />
                                    )}
                                    <p className="text-sm font-medium text-stone-400 group-hover:text-stone-200">
                                        {uploading ? 'Uploading...' : 'Upload Map'}
                                    </p>
                                </div>
                            </div>

                            {map && (
                                <div>
                                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Scale</h4>
                                    <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-stone-400">Zoom</span>
                                            <span className="font-mono text-stone-300">{(map.scale || 1).toFixed(1)}x</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="5"
                                            step="0.1"
                                            value={map.scale || 1}
                                            onChange={(e) => onUpdateMap({ scale: Number(e.target.value) })}
                                            className="w-full accent-indigo-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'grid' && (
                        <div className="space-y-6">
                            <label className="flex items-center justify-between p-3 bg-stone-950 rounded-xl border border-stone-800 cursor-pointer hover:border-stone-700 transition">
                                <span className="text-stone-300 font-medium">Show Grid</span>
                                <input
                                    type="checkbox"
                                    checked={config.gridVisible}
                                    onChange={(e) => onUpdateConfig({ gridVisible: e.target.checked })}
                                    className="w-5 h-5 accent-indigo-500 rounded"
                                />
                            </label>

                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex items-center justify-between p-3 bg-stone-950 rounded-xl border border-stone-800 cursor-pointer hover:border-stone-700 transition">
                                    <span className="text-stone-300 font-medium text-xs">Snap to Grid</span>
                                    <input
                                        type="checkbox"
                                        checked={config.snapToGrid ?? false}
                                        onChange={(e) => onUpdateConfig({ snapToGrid: e.target.checked })}
                                        className="w-4 h-4 accent-indigo-500 rounded"
                                    />
                                </label>
                                <label className="flex items-center justify-between p-3 bg-stone-950 rounded-xl border border-stone-800 cursor-pointer hover:border-stone-700 transition">
                                    <span className="text-stone-300 font-medium text-xs">Scale to Grid</span>
                                    <input
                                        type="checkbox"
                                        checked={config.scaleToGrid ?? false}
                                        onChange={(e) => onUpdateConfig({ scaleToGrid: e.target.checked })}
                                        className="w-4 h-4 accent-indigo-500 rounded"
                                    />
                                </label>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Grid Size</h4>
                                <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-stone-400">Pixel Size</span>
                                        <span className="font-mono text-stone-300">{config.gridSize}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="25"
                                        max="200"
                                        step="5"
                                        value={config.gridSize}
                                        onChange={(e) => onUpdateConfig({ gridSize: Number(e.target.value) })}
                                        className="w-full accent-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Appearance</h4>
                                <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-stone-400">Opacity</span>
                                            <span className="font-mono text-stone-300">{Math.round((config.gridOpacity || 0.2) * 100)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.05"
                                            max="1"
                                            step="0.05"
                                            value={config.gridOpacity || 0.2}
                                            onChange={(e) => onUpdateConfig({ gridOpacity: Number(e.target.value) })}
                                            className="w-full accent-indigo-500"
                                        />
                                    </div>
                                    <div className="pt-2 border-t border-stone-800 flex justify-between items-center">
                                        <span className="text-sm text-stone-400">Color</span>
                                        <input
                                            type="color"
                                            value={config.gridColor || '#000000'}
                                            onChange={(e) => onUpdateConfig({ gridColor: e.target.value })}
                                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'system' && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Invite Players</h4>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-stone-400 truncate font-mono select-all">
                                        {host ? `${host}/game/${roomId}` : '...'}
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${host}/game/${roomId}`);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition"
                                        title="Copy Player Link"
                                    >
                                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-stone-500 mt-2">
                                    Share this link with players. It grants access to the game board without GM controls.
                                </p>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Session</h4>
                                <div className="grid gap-3">
                                    <button
                                        onClick={async () => {
                                            setUploading(true);
                                            await onExportSession?.();
                                            setUploading(false);
                                        }}
                                        disabled={uploading}
                                        className="w-full p-3 bg-stone-950 hover:bg-stone-800 border border-stone-800 rounded-xl text-left text-sm font-medium text-stone-300 transition flex items-center justify-between group"
                                    >
                                        <span>Export Backup</span>
                                        <Upload className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                    </button>

                                    <label className="w-full p-3 bg-stone-950 hover:bg-stone-800 border border-stone-800 rounded-xl text-left text-sm font-medium text-stone-300 transition flex items-center justify-between cursor-pointer group">
                                        <span>Import Backup</span>
                                        <Upload className="w-4 h-4 opacity-50 group-hover:opacity-100 rotate-180" />
                                        <input
                                            type="file"
                                            accept=".zip"
                                            className="hidden"
                                            onChange={async (e) => {
                                                if (e.target.files?.[0]) {
                                                    setUploading(true);
                                                    await onImportSession?.(e.target.files[0]);
                                                    setUploading(false);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>
                            <div className="p-3 bg-orange-900/10 border border-orange-500/20 rounded-xl text-xs text-orange-400">
                                Session backups include the map, all tokens, and drawings. Restoring will overwrite the current room.
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Icon Bar (Right) */}
            <div className="w-16 flex flex-col items-center py-4 gap-4 bg-stone-950 border-l border-stone-800 z-50">
                <div className="p-2 bg-stone-900 rounded-xl mb-2">
                    <Settings className="w-6 h-6 text-stone-400" />
                </div>

                {tabs.map(t => {
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.id}
                            onClick={() => {
                                if (activeTab === t.id && !collapsed) {
                                    setCollapsed(true);
                                } else {
                                    setActiveTab(t.id);
                                    setCollapsed(false);
                                }
                            }}
                            className={clsx(
                                "p-3 rounded-xl transition-all relative group",
                                activeTab === t.id && !collapsed ? "bg-stone-800 text-white" : "text-stone-500 hover:bg-stone-900 hover:text-stone-300"
                            )}
                            title={t.label}
                        >
                            <Icon className="w-5 h-5" />
                            <div className="absolute right-14 bg-stone-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-stone-700">
                                {t.label}
                            </div>
                        </button>
                    )
                })}

                <div className="flex-1" />

                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-3 text-stone-600 hover:text-stone-400 transition"
                >
                    {collapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
            </div>
        </div>
    );
}
