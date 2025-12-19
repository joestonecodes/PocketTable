'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Radio, StopCircle } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface AudioConfigProps {
    socket: Socket | null;
    roomId: string;
    isGm: boolean;
    guestId: string;
}

export default function AudioManager({ socket, roomId, isGm, guestId }: AudioConfigProps) {
    const [broadcasting, setBroadcasting] = useState(false);
    const [listening, setListening] = useState(false);

    // Refs
    const peersRef = useRef<Map<string, any>>(new Map());
    const streamRef = useRef<MediaStream | null>(null);
    const SimplePeerRef = useRef<any>(null);

    useEffect(() => {
        import('simple-peer').then(mod => {
            SimplePeerRef.current = mod.default;
        });
    }, []);

    useEffect(() => {
        if (!socket) return;

        // Signal Handler
        socket.on('SIGNAL_AUDIO', (data: { from: string, signal: any }) => {
            if (!SimplePeerRef.current) return;
            const SimplePeer = SimplePeerRef.current;

            const { from, signal } = data;
            let peer = peersRef.current.get(from);

            if (!peer) {
                if (!broadcasting) {
                    peer = new SimplePeer({
                        initiator: false,
                        trickle: false,
                    });

                    peer.on('signal', (sig: any) => {
                        socket.emit('SIGNAL_AUDIO', { target: from, signal: sig });
                    });

                    peer.on('stream', (stream: MediaStream) => {
                        const audio = new Audio();
                        audio.srcObject = stream;
                        audio.play().catch(e => console.error('Audio play failed', e));
                        setListening(true);
                    });

                    peersRef.current.set(from, peer);
                }
            }

            if (peer) {
                peer.signal(signal);
            }
        });

        socket.on('JOIN_AUDIO_REQUEST', (data: { from: string }) => {
            if (!broadcasting || !streamRef.current || !SimplePeerRef.current) return;
            const SimplePeer = SimplePeerRef.current;
            const { from } = data;

            // Create audio-only stream for efficient transmission
            const audioTracks = streamRef.current.getAudioTracks();
            if (audioTracks.length === 0) {
                console.warn("No audio tracks found in stream. functionality requires 'Share Tab Audio'.");
                return; // Or alert user?
            }
            const audioStream = new MediaStream(audioTracks);

            const peer = new SimplePeer({
                initiator: true,
                trickle: false,
                stream: audioStream
            });

            peer.on('signal', (sig: any) => {
                socket.emit('SIGNAL_AUDIO', { target: from, signal: sig });
            });

            peersRef.current.set(from, peer);
        });

        return () => {
            socket.off('SIGNAL_AUDIO');
            socket.off('JOIN_AUDIO_REQUEST');
            peersRef.current.forEach(p => p.destroy());
            peersRef.current.clear();
        };
    }, [socket, broadcasting]);

    const startBroadcast = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });

            if (stream.getAudioTracks().length === 0) {
                alert("No audio shared! Please check 'Share Tab Audio' in the browser dialog.");
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            streamRef.current = stream;
            setBroadcasting(true);

            stream.getVideoTracks()[0].onended = stopBroadcast;
            socket?.emit('AUDIO_STARTED');

        } catch (e) {
            console.error('Failed to start broadcast', e);
            alert('Could not share audio. Ensure you selected "Share Tab Audio".');
        }
    };

    const stopBroadcast = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setBroadcasting(false);
        peersRef.current.forEach(p => p.destroy());
        peersRef.current.clear();
        socket?.emit('AUDIO_STOPPED');
    };

    useEffect(() => {
        if (!socket) return;
        socket.on('AUDIO_STARTED', () => {
            socket.emit('JOIN_AUDIO_REQUEST', { from: guestId });
        });
        socket.on('AUDIO_STOPPED', () => {
            setListening(false);
            peersRef.current.forEach(p => p.destroy());
            peersRef.current.clear();
        });
        return () => {
            socket.off('AUDIO_STARTED');
            socket.off('AUDIO_STOPPED');
        };
    }, [socket, guestId]);

    if (isGm) {
        return (
            <div className="absolute bottom-4 right-4 bg-stone-900 border border-stone-700 p-2 rounded flex items-center gap-2 z-50">
                {broadcasting ? (
                    <button onClick={stopBroadcast} className="flex items-center gap-2 text-red-400 font-bold hover:text-red-300">
                        <StopCircle className="w-5 h-5" /> Stop Audio
                    </button>
                ) : (
                    <button onClick={startBroadcast} className="flex items-center gap-2 text-stone-400 hover:text-white">
                        <Radio className="w-5 h-5" /> Share Tab Audio
                    </button>
                )}
            </div>
        );
    }

    if (listening) {
        return (
            <div className="absolute bottom-4 right-4 bg-stone-900/80 p-2 rounded text-green-400 text-xs flex items-center gap-2 pointer-events-none z-50">
                <Radio className="w-4 h-4 animate-pulse" /> GM Audio Live
            </div>
        );
    }

    return null;
}
