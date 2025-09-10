import React from 'react';

/**
 * Composant de la liste des matchs
 * Affiche les matchs du jour sélectionné
 */
function MatchList({ matches, selectedMatch, onMatchSelect, loading }) {
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading"></div>
        <p>Chargement des matchs...</p>
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="no-matches">
        <p>Aucun match prévu pour ce jour.</p>
      </div>
    );
  }

  return (
    <div id="schedule-display">
      {matches.map(match => {
        const team1Final = match.team1_goals - match.team2_gamelles;
        const team2Final = match.team2_goals - match.team1_gamelles;
        
        const scoreDisplay = match.finished 
          ? `${team1Final} - ${team2Final}`
          : '- : -';

        const isSelected = selectedMatch?.id === match.id;
        const isFinished = match.finished;

        return (
          <div
            key={match.id}
            className={`match-item ${isFinished ? 'finished' : ''} ${isSelected ? 'selected' : ''}`}
            onClick={() => !isFinished && onMatchSelect(match)}
          >
            <div className="match-header-item">
              <span className="match-time-item">{match.heure}</span>
              <span className="match-score-display">{scoreDisplay}</span>
            </div>
            <div className="match-teams">
              <span className="team-name">{match.team1_nom}</span>
              <span className="team-name">{match.team2_nom}</span>
            </div>
            <div className="match-players">
              <small>{match.team1_joueurs.join(' & ')}</small>
              <small>{match.team2_joueurs.join(' & ')}</small>
            </div>
            {isFinished && (
              <div className="match-details">
                <div className="match-status">
                  <span className="status-badge finished">✓ Terminé</span>
                </div>
                <span>Buts: {match.team1_goals} - {match.team2_goals}</span>
                <span>Gamelles: {match.team1_gamelles} - {match.team2_gamelles}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default MatchList;
