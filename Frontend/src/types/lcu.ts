// frontend/src/types/lcu.ts

/** Represents the overall connection status managed by the WebSocket hook */
export interface LcuStatus {
    connected: boolean;     // Represents connection status TO LCU (via backend)
    error?: string;         // Stores error messages related to connection
    loading: boolean;       // Indicates if we are actively trying to connect or waiting for status
    wsConnected: boolean;   // Represents WebSocket connection status TO our backend server
}

/** Represents basic summoner info fetched via HTTP */
export interface SummonerInfo {
    name: string; // Or potentially 'displayName' - VERIFY THIS from LCU logs
    summonerId: number;
    summonerLevel: number;
    profileIconId: number;
    // Add other relevant fields if needed
}

/** Represents the event payload for gameflow phase updates */
export interface GameflowPhaseData {
    uri: string;
    eventType: 'Update' | 'Create' | 'Delete';
    data: string; // The phase name, e.g., "ChampSelect", "InProgress", "None"
}

// --- Champion Select Interfaces (Simplified) ---
// Based on common structure of /lol-champ-select/v1/session event data
export interface ChampSelectAction {
    actorCellId: number;
    championId: number;
    completed: boolean;
    id: number;
    isAllyAction: boolean;
    isInProgress: boolean;
    pickTurn: number;
    type: 'pick' | 'ban';
}

export interface ChampSelectTimer {
    adjustedTimeLeftInPhase: number;
    internalTimeLeftInPhase: number;
    phase: string;
    totalTimeInPhase: number;
    timeLeftInPhase: number;
}

export interface TeamMember {
    assignedPosition: string;
    cellId: number;
    championId: number;
    championPickIntent: number;
    displayName?: string; // May not always be present
    summonerId: number;
    spell1Id: number;
    spell2Id: number;
    team: 1 | 2; // 1=Blue, 2=Red
    wardSkinId: number;
}

export interface Bans {
    myTeamBans: number[];
    numBans: number;
    theirTeamBans: number[];
}

export interface ChampSelectSession {
    actions: ChampSelectAction[][];
    allowBattleBoost: boolean;
    allowDuplicatePicks: boolean;
    allowLockedEvents: boolean;
    allowRerolling: boolean;
    allowSkinSelection: boolean;
    bans: Bans;
    benchChampionIds: number[];
    benchEnabled: boolean;
    boostableSkinCount: number;
    chatDetails: { chatRoomName: string; chatRoomPassword?: string };
    counter: number;
    hasSimultaneousBans: boolean;
    hasSimultaneousPicks: boolean;
    isCustomGame: boolean;
    isSpectating: boolean;
    localPlayerCellId: number;
    lockedEventIndex: number;
    myTeam: TeamMember[];
    rerollsRemaining: number;
    skipChampionSelect: boolean;
    theirTeam: TeamMember[];
    timer: ChampSelectTimer;
    trades: any[];
    pickOrderSwaps: any[];
    teamId: string;
    tournamentId: number;
}

/** Structure for LCU Event messages forwarded by the backend */
export interface LcuEventMessage {
    uri: string;
    eventType: 'Update' | 'Create' | 'Delete';
    data: any; // Data payload varies depending on the URI
}