// frontend/src/components/GamePhaseDisplay.tsx
import React from 'react';

interface GamePhaseDisplayProps {
    phase: string | null;
}

export function GamePhaseDisplay({ phase }: GamePhaseDisplayProps) {
    if (!phase || phase === "None" || phase === "ChampSelect") { // Don't display if None or handled by ChampSelect component
        return null;
    }

    return (
        <div style={{ margin: '20px 0', border: '1px solid #e8ae5a', padding: '15px' }}>
            <h2>Game Phase</h2>
            <p style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{phase}</p>
        </div>
    );
}