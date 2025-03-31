// frontend/src/components/ChampSelectDisplay/ChampSelectDisplay.tsx
import React from 'react';
import { ChampSelectSession } from '../../types/lcu';
import { TeamDisplay } from './TeamDisplay';
import { BanDisplay } from './BanDisplay';

interface ChampSelectDisplayProps {
    session: ChampSelectSession | null;
}

export function ChampSelectDisplay({ session }: ChampSelectDisplayProps) {
    if (!session) {
        return null; // Or a loading/waiting indicator if preferred
    }

    // Determine current action (simplified)
    const currentAction = session.actions?.flat().find(a => a.isInProgress);
    const currentActionText = currentAction ? `${currentAction.type === 'pick' ? 'Picking' : 'Banning'} (Turn ${currentAction.pickTurn})` : 'Waiting...';

    return (
        <div style={{ margin: '20px 0', border: '2px solid #5a9ce8', padding: '15px', backgroundColor: '#f0f8ff' }}>
            <h2>Champion Select</h2>
            <p>
                Phase: {session.timer?.phase || 'N/A'} |
                Action: {currentActionText} |
                Time Left: {session.timer ? (session.timer.timeLeftInPhase / 1000).toFixed(1) : 'N/A'}s
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                {/* My Team */}
                <div style={{ flex: 1 }}>
                     <TeamDisplay
                         title="My Team (Blue)" // Assuming local player is always blue for now
                         team={session.myTeam}
                         localPlayerCellId={session.localPlayerCellId}
                         actions={session.actions}
                         teamColor="blue"
                    />
                </div>

                 {/* Their Team */}
                 <div style={{ flex: 1 }}>
                     <TeamDisplay
                        title="Their Team (Red)"
                        team={session.theirTeam}
                        localPlayerCellId={null} // Local player not on their team
                        actions={session.actions}
                        teamColor="red"
                    />
                </div>
            </div>


             {/* Bans */}
            <BanDisplay bans={session.bans} />

            {/* Raw data for debugging (optional) */}
            {/* <details style={{marginTop: '15px'}}><summary>Raw Session Data</summary><pre style={{ fontSize: '0.7em', maxHeight: '200px', overflowY: 'auto', backgroundColor: '#eee', padding: '5px' }}>{JSON.stringify(session, null, 2)}</pre></details> */}
        </div>
    );
}