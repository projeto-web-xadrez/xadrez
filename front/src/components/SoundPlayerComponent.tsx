'use client';

import { forwardRef, useRef, useState, useImperativeHandle } from 'react';
import { Mutex } from 'async-mutex'

export interface SoundPlayerHandle {
    playSound: (soundSrc: string) => void
}

export interface SoundPlayerProps {
    minDelayBetweenSounds: number
}

const SoundPlayerComponent = forwardRef<SoundPlayerHandle, SoundPlayerProps>((props, ref) => {
    const mutex = useRef<Mutex>(new Mutex());
    const idCounter = useRef<number>(0);
    const audioSourcesMap = useRef(new Map<number, string>);
    const [audioSources, setAudioSources] = useState<Array<[number, string]>>([]);

    useImperativeHandle(ref, () => ({
        playSound: (soundSrc: string) => {
            mutex.current.acquire().then(() => {
                audioSourcesMap.current.set(idCounter.current++, soundSrc);
                setAudioSources([...audioSourcesMap.current.entries()]);
                setTimeout(() => mutex.current.release(), props.minDelayBetweenSounds);
            });
        }
    }));

    return audioSources.map(([key, src]) =>
        <audio autoPlay key={key} src={src} onEnded={() => {
            audioSourcesMap.current.delete(key);
            setAudioSources([...audioSourcesMap.current.entries()]);
        }} />
    );
});

export default SoundPlayerComponent;