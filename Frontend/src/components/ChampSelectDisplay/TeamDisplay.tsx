// frontend/src/components/ChampSelectDisplay/TeamDisplay.tsx
import React from 'react';
import { TeamMember, ChampSelectSession } from '../../types/lcu';

interface TeamDisplayProps {
    team: TeamMember[];
    localPlayerCellId: number | null;
    actions: ChampSelectSession['actions'];
    teamColor?: string; // Optional color for styling
    title: string;
}

 // Placeholder/Helper functions - MOVE to a utils/helpers file later
 const getChampionIconUrl = (championId: number): string => {
    if (championId === 0) return 'https://via.placeholder.com/40?text=X'; // Placeholder for no pick
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`;
};
const getSummonerSpellIconUrl = (spellId: number): string => {
    if (spellId === 0) return 'https://via.placeholder.com/20?text=S';
     // Needs mapping from spell ID to spell name/key - Placeholder structure:
     // e.g., 4 -> Flash -> SummonerFlash.png
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/data/spells/icons2d/summoner_${spellId}.png`;
};
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, placeholderText: string = '?') => {
     const fallbackUrl = `https://via.placeholder.com/${e.currentTarget.width}?text=${placeholderText}`;
    if (e.currentTarget.src !== fallbackUrl) e.currentTarget.src = fallbackUrl;
};

export function TeamDisplay({ team, localPlayerCellId, actions, teamColor = 'black', title }: TeamDisplayProps) {

    const isPlayerTurn = (cellId: number): boolean => {
        // Check if any action currently in progress belongs to this player's cellId
        return actions?.flat().some(action => action.actorCellId === cellId && action.isInProgress) ?? false;
    }

    return (
        <div style={{ marginBottom: '15px' }}>
            <h3 style={{ color: teamColor }}>{title}</h3>
            {team.map((member) => (
                <div key={member.cellId} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', borderBottom: '1px solid #eee', paddingBottom: '5px', opacity: member.championId === 0 ? 0.7 : 1 }}>
                    <img
                        src={getChampionIconUrl(member.championId)}
                        alt="Champ"
                        style={{ width: '40px', height: '40px', marginRight: '10px', border: member.championId ? '1px solid #ccc' : '1px dashed #aaa' }}
                        onError={(e) => handleImageError(e, 'C')}
                    />
                    <div style={{ flexGrow: 1 }}>
                        <span style={{ fontWeight: member.cellId === localPlayerCellId ? 'bold' : 'normal' }}>
                            {member.displayName || `Summoner ${member.summonerId}`}
                        </span>
                        <br />
                        <small>Position: {member.assignedPosition || '?'}</small>
                    </div>
                     {/* Spells */}
                     <img src={getSummonerSpellIconUrl(member.spell1Id)} alt="S1" style={{ width: '20px', height: '20px', marginLeft: '5px', border: '1px solid #ccc' }} onError={(e) => handleImageError(e, 'S1')}/>
                     <img src={getSummonerSpellIconUrl(member.spell2Id)} alt="S2" style={{ width: '20px', height: '20px', marginLeft: '2px', border: '1px solid #ccc' }} onError={(e) => handleImageError(e, 'S2')}/>
                    {/* Turn Indicator */}
                    {isPlayerTurn(member.cellId) && <span style={{ marginLeft: '10px', color: 'green', fontSize: '1.5em', fontWeight: 'bold' }}>◀︎</span>}
                </div>
            ))}
        </div>
    );
}