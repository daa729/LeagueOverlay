// frontend/src/components/SummonerDisplay.tsx
import React from 'react';
import { SummonerInfo } from '../types/lcu';

interface SummonerDisplayProps {
    summonerInfo: SummonerInfo | null;
    isLoading: boolean;
    error: string | null;
    onRefresh: () => void; // Callback to trigger refresh
    isConnected: boolean; // Is LCU connected?
}

// Basic cache for profile icons to avoid repeated lookups within a session
const profileIconCache: Record<number, boolean> = {};

const defaultIconUrl = 'https://via.placeholder.com/50?text=?'; // Fallback icon

export function SummonerDisplay({ summonerInfo, isLoading, error, onRefresh, isConnected }: SummonerDisplayProps) {

    const getProfileIconUrl = (iconId: number): string => {
        if (!iconId) return defaultIconUrl;
         // Replace with your actual CommunityDragon/DDragon URL structure if different
        return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${iconId}.jpg`;
    };

     // Simple error handler for images
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const target = e.currentTarget;
        if (target.src !== defaultIconUrl) { // Prevent infinite loop if fallback fails
            const iconId = parseInt(target.alt, 10); // Assuming alt stores the iconId
            if (!isNaN(iconId)) {
                profileIconCache[iconId] = false; // Mark as failed for this session
            }
            target.src = defaultIconUrl;
        }
        target.style.border = '1px dashed red'; // Indicate failure
    };

    return (
        <div style={{ margin: '20px 0', border: '1px solid #1a8cff', padding: '15px' }}>
            <h2>Summoner Info</h2>
            <button onClick={onRefresh} disabled={isLoading || !isConnected} style={{ marginBottom: '10px' }}>
                {isLoading ? "Fetching..." : "Refresh Summoner Info"}
            </button>

            {isLoading && <p>Loading summoner data...</p>}
            {error && !isLoading && <p style={{ color: 'red' }}>Summoner Error: {error}</p>}

            {summonerInfo && !isLoading && !error && (
                <div>
                    <p>Name: <strong>{summonerInfo.name /* or displayName */}</strong></p>
                    <p>Level: {summonerInfo.summonerLevel}</p>
                    <p>ID: {summonerInfo.summonerId}</p>
                    <p>Icon:
                        <img
                            key={summonerInfo.profileIconId} // Add key for potential re-renders
                            src={getProfileIconUrl(summonerInfo.profileIconId)}
                            alt={String(summonerInfo.profileIconId)} // Store ID for error handler
                            style={{ width: '50px', height: '50px', verticalAlign: 'middle', border: '1px solid #ccc', marginLeft: '10px' }}
                            onError={handleImageError}
                        />
                    </p>
                </div>
            )}

            {!summonerInfo && !isLoading && !error && <p>Waiting for summoner data...</p>}
        </div>
    );
}