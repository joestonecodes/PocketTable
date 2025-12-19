'use client';

import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Asset, addAsset, getAssets, deleteAsset } from '@/lib/db';
import { Trash2, Plus, Upload, Users, Box, Ghost, Paperclip, ChevronLeft, ChevronRight, Library, Shapes, X, Check, MapPin } from 'lucide-react';
import clsx from 'clsx';

const GENERIC_LABELS = ['A', 'B', 'C', 'D', 'E', '1', '2', '3', '4', '5'];
const GENERIC_COLORS = [
    { name: 'Red', hex: '#ef4444' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Green', hex: '#22c55e' },
    { name: 'Yellow', hex: '#eab308' },
    { name: 'Purple', hex: '#a855f7' },
    { name: 'Orange', hex: '#f97316' },
];

function generateTokenSVG(label: string, color: string) {
    const svg = `
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="${color}" stroke="white" stroke-width="4"/>
        <text x="50" y="50" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="white" text-anchor="middle" dy=".35em">
            ${label}
        </text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export default function AssetLibrary({ onAddToMap }: { onAddToMap?: (asset: Asset) => void }) {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [category, setCategory] = useState<string>('CHARACTER');
    const [collapsed, setCollapsed] = useState(true);

    // Creation State
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [tokenSource, setTokenSource] = useState<'UPLOAD' | 'GENERIC'>('UPLOAD');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [genColor, setGenColor] = useState(GENERIC_COLORS[0]);
    const [genLabel, setGenLabel] = useState(GENERIC_LABELS[0]);

    const loadAssets = async () => {
        const all = await getAssets();
        setAssets(all);
    };

    useEffect(() => {
        loadAssets();
    }, []);

    const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert('File too large (Max 5MB for local storage)');
            return;
        }
        await addAsset({
            id: uuidv4(),
            name: file.name.split('.')[0],
            type: category as Asset['type'],
            blob: file,
            timestamp: Date.now()
        });
        await loadAssets();
    };

    const handleCreateCharacter = async () => {
        if (!newName) {
            alert('Name is required');
            return;
        }

        let blob: Blob;

        if (tokenSource === 'UPLOAD') {
            if (!uploadFile) {
                alert('Please upload a file');
                return;
            }
            blob = uploadFile;
        } else {
            // Convert Base64 SVG to Blob
            const svgData = generateTokenSVG(genLabel, genColor.hex);
            const res = await fetch(svgData);
            blob = await res.blob();
        }

        await addAsset({
            id: uuidv4(),
            name: newName,
            description: newDesc,
            type: 'CHARACTER',
            blob: blob,
            timestamp: Date.now()
        });

        await loadAssets();
        setIsCreating(false);
        setNewName('');
        setNewDesc('');
        setUploadFile(null);
    };

    const handleDragStart = (e: React.DragEvent, asset: Partial<Asset>) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'TOKEN_DROP',
            assetId: asset.id || 'generic',
            src: asset.url,
            tokenType: asset.type || 'CHARACTER'
        }));
    };

    const filtered = assets.filter(a => a.type === category);

    const tabs = [
        { id: 'CHARACTER', label: 'Characters', icon: Users },
        { id: 'PROP', label: 'Props', icon: Box },
        { id: 'MOUNT', label: 'Mounts', icon: Ghost },
        { id: 'ATTACHMENT', label: 'Extras', icon: Paperclip },
        { id: 'GENERIC', label: 'Generic', icon: Shapes },
    ];

    return (
        <div className="flex h-full border-r border-stone-800 bg-stone-950 transition-all duration-300 relative z-40">
            {/* Icon Bar */}
            <div className="w-16 flex flex-col items-center py-4 gap-4 bg-stone-950 border-r border-stone-800 z-50 shrink-0">
                <div className="p-2 bg-indigo-600/20 rounded-xl mb-2">
                    <Library className="w-6 h-6 text-indigo-400" />
                </div>
                {tabs.map(t => {
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.id}
                            onClick={() => {
                                if (category === t.id && !collapsed) {
                                    setCollapsed(true);
                                } else {
                                    setCategory(t.id);
                                    setCollapsed(false);
                                    setIsCreating(false); // Reset creation mode on tab switch
                                }
                            }}
                            className={clsx(
                                "p-3 rounded-xl transition-all relative group",
                                category === t.id && !collapsed ? "bg-stone-800 text-white" : "text-stone-500 hover:bg-stone-900 hover:text-stone-300"
                            )}
                            title={t.label}
                        >
                            <Icon className="w-5 h-5" />
                            <div className="absolute left-14 bg-stone-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-stone-700">
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
                    {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
            </div>

            {/* Content Drawer */}
            <div
                className={clsx(
                    "bg-stone-900 overflow-hidden flex flex-col transition-all duration-300 ease-in-out border-r border-stone-800 min-w-0"
                )}
                style={{ width: collapsed ? 0 : '20rem', opacity: collapsed ? 0 : 1, borderWidth: collapsed ? 0 : '1px' }}
            >
                <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-900/50 backdrop-blur shrink-0 whitespace-nowrap">
                    <h3 className="font-bold text-stone-200">{tabs.find(t => t.id === category)?.label}</h3>
                    {category === 'CHARACTER' && !isCreating && (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white p-1 rounded-md transition"
                            title="Create Character"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {isCreating && category === 'CHARACTER' ? (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-bold text-stone-400">New Character</h4>
                            <button onClick={() => setIsCreating(false)} className="text-stone-500 hover:text-white"><X className="w-4 h-4" /></button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-stone-500 font-medium">Name</label>
                            <input
                                className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-sm text-stone-200 focus:border-indigo-500 outline-none"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Character Name"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-stone-500 font-medium">Description</label>
                            <textarea
                                className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-sm text-stone-200 focus:border-indigo-500 outline-none"
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
                                placeholder="Stats, notes, backstory..."
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-stone-500 font-medium">Token Source</label>
                            <div className="flex bg-stone-950 rounded-lg p-1 border border-stone-800">
                                <button
                                    onClick={() => setTokenSource('UPLOAD')}
                                    className={clsx("flex-1 text-xs py-1.5 rounded transition", tokenSource === 'UPLOAD' ? "bg-stone-800 text-white" : "text-stone-500 hover:text-stone-300")}
                                >
                                    Upload
                                </button>
                                <button
                                    onClick={() => setTokenSource('GENERIC')}
                                    className={clsx("flex-1 text-xs py-1.5 rounded transition", tokenSource === 'GENERIC' ? "bg-stone-800 text-white" : "text-stone-500 hover:text-stone-300")}
                                >
                                    Generic
                                </button>
                            </div>
                        </div>

                        {tokenSource === 'UPLOAD' ? (
                            <label className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-stone-800 rounded-xl cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 text-stone-500 transition group">
                                <input type="file" accept="image/*" className="hidden" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                                {uploadFile ? (
                                    <div className="text-center">
                                        <div className="text-indigo-400 font-medium truncate max-w-[150px]">{uploadFile.name}</div>
                                        <div className="text-[10px] mt-1">Click to change</div>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 mb-2 group-hover:text-indigo-400 transition" />
                                        <span className="text-xs font-medium group-hover:text-stone-300">Choose Image</span>
                                    </>
                                )}
                            </label>
                        ) : (
                            <div className="space-y-4 bg-stone-950 p-4 rounded-xl border border-stone-800">
                                <div className="flex justify-center mb-4">
                                    <img
                                        src={generateTokenSVG(genLabel, genColor.hex)}
                                        className="w-24 h-24 rounded-full shadow-lg"
                                        alt="Preview"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-stone-500">Color</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {GENERIC_COLORS.map(c => (
                                            <button
                                                key={c.name}
                                                onClick={() => setGenColor(c)}
                                                className={clsx("w-6 h-6 rounded-full border-2 transition", genColor.name === c.name ? "border-white scale-110" : "border-transparent hover:scale-105")}
                                                style={{ backgroundColor: c.hex }}
                                                title={c.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-stone-500">Label</label>
                                    <div className="flex gap-1 flex-wrap">
                                        {GENERIC_LABELS.map(l => (
                                            <button
                                                key={l}
                                                onClick={() => setGenLabel(l)}
                                                className={clsx("w-6 h-6 rounded text-xs font-bold transition", genLabel === l ? "bg-white text-black" : "bg-stone-800 text-stone-400 hover:bg-stone-700")}
                                            >
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleCreateCharacter}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition mt-4"
                        >
                            Create Character
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Default View: Grid or Upload for non-character */}
                        {!['GENERIC', 'CHARACTER'].includes(category) && (
                            <div className="p-4 shrink-0">
                                <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-stone-800 rounded-xl cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 text-stone-500 transition group">
                                    <input type="file" accept="image/*" className="hidden" onChange={handleQuickUpload} />
                                    <Upload className="w-6 h-6 mb-2 group-hover:text-indigo-400 transition" />
                                    <span className="text-xs font-medium group-hover:text-stone-300 whitespace-nowrap">Import Image</span>
                                </label>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-3 content-start">
                            {category === 'GENERIC' ? (
                                GENERIC_COLORS.map(color => (
                                    GENERIC_LABELS.map(label => {
                                        const src = generateTokenSVG(label, color.hex);
                                        return (
                                            <div
                                                key={`generic-${color.name}-${label}`}
                                                draggable
                                                onDragStart={e => handleDragStart(e, {
                                                    id: `generic-${color.name}-${label}`,
                                                    url: src,
                                                    type: 'CHARACTER',
                                                    name: `${color.name} ${label}`
                                                })}
                                                className="group relative aspect-square bg-stone-800 rounded-xl overflow-hidden border border-stone-800 hover:border-indigo-500 transition-all cursor-grab active:cursor-grabbing shadow-sm"
                                            >
                                                <img src={src} alt="Token" className="w-full h-full object-cover" />
                                            </div>
                                        )
                                    })
                                ))
                            ) : (
                                filtered.map(asset => (
                                    <div
                                        key={asset.id}
                                        draggable
                                        onDragStart={e => handleDragStart(e, asset)}
                                        className="group relative bg-stone-800 rounded-xl overflow-hidden border border-stone-800 hover:border-indigo-500 transition-all cursor-grab active:cursor-grabbing shadow-sm"
                                    >
                                        <div className="aspect-square relative">
                                            <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                        </div>

                                        <div className="p-2 border-t border-stone-800 bg-stone-900">
                                            <div className="text-xs font-bold text-stone-200 truncate">{asset.name}</div>
                                            {asset.description && <div className="text-[10px] text-stone-500 truncate">{asset.description}</div>}
                                        </div>

                                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                            {onAddToMap && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onAddToMap(asset);
                                                    }}
                                                    title="Add to Map"
                                                    className="p-1.5 bg-black/60 text-indigo-400 rounded-lg hover:bg-indigo-500/20 hover:text-indigo-300 transition backdrop-blur-sm"
                                                >
                                                    <MapPin className="w-3 h-3" />
                                                </button>
                                            )}
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    await deleteAsset(asset.id);
                                                    loadAssets();
                                                }}
                                                title="Delete Asset"
                                                className="p-1.5 bg-black/60 text-red-400 rounded-lg hover:bg-red-500/20 hover:text-red-300 transition backdrop-blur-sm"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}

                            {filtered.length === 0 && category !== 'GENERIC' && !isCreating && (
                                <div className="col-span-2 py-10 flex flex-col items-center text-stone-600 gap-2">
                                    <Box className="w-8 h-8 opacity-20" />
                                    <span className="text-xs whitespace-nowrap">No assets yet</span>
                                    {category === 'CHARACTER' && (
                                        <button onClick={() => setIsCreating(true)} className="text-xs text-indigo-400 font-medium hover:underline">
                                            Create one?
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
