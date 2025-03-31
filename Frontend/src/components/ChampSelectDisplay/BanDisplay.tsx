// frontend/src/components/ChampSelectDisplay/BanDisplay.tsx
import React from 'react';
import { Bans } from '../../types/lcu';

interface BanDisplayProps {
    bans: Bans | null;
}

// Placeholder/Helper function - MOVE to a utils/helpers file later
const getChampionIconUrl = (championId: number): string => {
    if (championId === 0) return 'https://via.placeholder.com/25?text=X';
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`;
};
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, placeholderText: string = '?') => {
     const fallbackUrl = `https://via.placeholder.com/${e.currentTarget.width}?text=${placeholderText}`;
    if (e.currentTarget.src !== fallbackUrl) e.currentTarget.src = fallbackUrl;
};

export function BanDisplay({ bans }: BanDisplayProps) {
    if (!bans) return null;

    return (
        <div>
            <h4 style={{ marginTop: '10px', marginBottom: '5px' }}>Bans</h4>
            <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.9em', alignItems: 'center' }}>
                <div style={{color: 'blue'}}>
                    Blue Bans: {bans.myTeamBans.length > 0 ? bans.myTeamBans.map((champId, index) => (
                        <img key={`b-${champId}-${index}`} src={getChampionIconUrl(champId)} alt={`Ban ${champId}`} style={{ width: '25px', height: '25px', margin: '1px', border: '1px solid #ccc' }} onError={(e) => handleImageError(e, 'B')} />
                    )) : 'None'}
                </div>
                <div style={{color: 'red'}}>
                    Red Bans: {bans.theirTeamBans.length > 0 ? bans.theirTeamBans.map((champId, index) => (
                        <img key={`r-${champId}-${index}`} src={getChampionIconUrl(champId)} alt={`Ban ${champId}`} style={{ width: '25px', height: '25px', margin: '1px', border: '1px solid #ccc' }} onError={(e) => handleImageError(e, 'B')} />
                    )) : 'None'}
                </div>
            </div>
        </div>
    );
}