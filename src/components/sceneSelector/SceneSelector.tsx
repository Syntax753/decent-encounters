import { useState, useEffect, useRef } from "react";
import { EncounterStub, loadEncounterList } from "@/encounters/encounterUtil";

type Props = {
    onSelect: (encounterUrl: string) => void;
    onCancel?: () => void;
}

export default function SceneSelector({ onSelect, onCancel }: Props) {
    const [encounters, setEncounters] = useState<EncounterStub[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        loadEncounterList().then(setEncounters);
    }, []);

    useEffect(() => {
        if (itemRefs.current[selectedIndex]) {
            itemRefs.current[selectedIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [selectedIndex]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && onCancel) {
                e.preventDefault();
                onCancel();
                return;
            }

            if (encounters.length === 0) return;
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(0, prev - 1));
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(encounters.length - 1, prev + 1));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                onSelect(encounters[selectedIndex].url);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [encounters, selectedIndex, onSelect, onCancel]);

    return (
        <div style={{ marginTop: '30px', textAlign: 'left', width: '100%', maxWidth: '600px', margin: '30px auto 0 auto' }}>
            <h2 style={{ color: '#ccc', marginBottom: '10px', fontSize: '1.2rem' }}>Select an Encounter:</h2>
            <div
                style={{ maxHeight: '300px', overflowY: 'auto', background: '#111', borderRadius: '8px', padding: '10px' }}
                tabIndex={0}
                autoFocus
            >
                {encounters.map((enc, idx) => (
                    <div
                        key={enc.url}
                        ref={el => { itemRefs.current[idx] = el; }}
                        onClick={() => {
                            setSelectedIndex(idx);
                            onSelect(enc.url);
                        }}
                        style={{
                            padding: '10px',
                            cursor: 'pointer',
                            background: idx === selectedIndex ? '#fff' : 'transparent',
                            color: idx === selectedIndex ? '#000' : '#aaa',
                            borderRadius: '4px',
                            display: 'flex',
                            justifyContent: 'space-between'
                        }}
                    >
                        <span style={{ fontWeight: 'bold' }}>{enc.title}</span>
                        <span style={{ fontSize: '0.8rem', color: idx === selectedIndex ? '#333' : '#666' }}>{enc.url}</span>
                    </div>
                ))}
            </div>
            <p style={{ marginTop: '10px', fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>
                Use Arrow Keys to highlight and Enter to load. Or click with your mouse.
                {onCancel && " Press ESC to cancel."}
            </p>
        </div>
    );
}
