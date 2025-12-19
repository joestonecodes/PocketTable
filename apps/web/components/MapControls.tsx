'use client';

import { useState } from 'react';
import { Upload, Grid, Settings } from 'lucide-react';

interface MapControlsProps {
    onMapUpload: (file: File) => void;
    gridSize: number;
    setGridSize: (n: number) => void;
}

export default function MapControls({ onMapUpload, gridSize, setGridSize }: MapControlsProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className={`absolute top-4 right-4 bg-stone-900 border border-stone-700 rounded-lg p-2 transition-all z-30 ${open ? 'w-64' : 'w-12'}`}>
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex justify-center text-stone-400 hover:text-white"
            >
                <Settings className="w-5 h-5" />
            </button>

            {open && (
                <div className="mt-4 flex flex-col gap-4 p-2">
                    <div>
                        <h3 className="text-xs font-bold text-stone-500 uppercase mb-2">Map Background</h3>
                        <label className="flex items-center justify-center w-full p-2 border border-dashed border-stone-600 rounded cursor-pointer hover:bg-stone-800 text-stone-300 text-sm">
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onClick={(e) => (e.target as HTMLInputElement).value = ''}
                                onChange={async e => {
                                    if (e.target.files?.[0]) await onMapUpload(e.target.files[0]);
                                }}
                            />
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Map
                        </label>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-stone-500 uppercase mb-2">Grid Settings</h3>
                        <div className="flex items-center gap-2 text-stone-300 text-sm">
                            <Grid className="w-4 h-4" />
                            <input
                                type="range"
                                min="25"
                                max="200"
                                value={gridSize}
                                onChange={e => setGridSize(Number(e.target.value))}
                                className="flex-1"
                            />
                            <span>{gridSize}px</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
