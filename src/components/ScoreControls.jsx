import React, { useState, useEffect } from 'react';
import AnimatedScore from './AnimatedScore';

/**
 * Composant de contrôle des scores
 * Interface pour modifier les scores d'un match sélectionné
 */
function ScoreControls({ match, onScoreUpdate, onMatchReset, onMatchSave, loading }) {
  const [scores, setScores] = useState({
    team1Goals: 0,
    team1Gamelles: 0,
    team2Goals: 0,
    team2Gamelles: 0
  });

  /**
   * Met à jour les scores locaux quand le match change
   */
  useEffect(() => {
    if (match) {
      setScores({
        team1Goals: match.team1_goals || 0,
        team1Gamelles: match.team1_gamelles || 0,
        team2Goals: match.team2_goals || 0,
        team2Gamelles: match.team2_gamelles || 0
      });
    }
  }, [match]);

  /**
   * Met à jour un score spécifique
   * @param {string} team - Équipe (team1 ou team2)
   * @param {string} type - Type de score (goals ou gamelles)
   * @param {number} delta - Variation du score
   */
  const updateScore = (team, type, delta) => {
    const field = `${team}${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const newValue = Math.max(0, scores[field] + delta);
    
    const newScores = {
      ...scores,
      [field]: newValue
    };
    
    setScores(newScores);
    
    // Mettre à jour immédiatement via l'API (sans modifier le statut finished)
    onScoreUpdate({
      team1Goals: newScores.team1Goals,
      team1Gamelles: newScores.team1Gamelles,
      team2Goals: newScores.team2Goals,
      team2Gamelles: newScores.team2Gamelles
    });
  };

  /**
   * Calcule le score final d'une équipe
   * @param {number} goals - Nombre de buts
   * @param {number} opponentGamelles - Nombre de gamelles de l'adversaire
   * @returns {number} Score final (peut être négatif)
   */
  const calculateFinalScore = (goals, opponentGamelles) => {
    return goals - opponentGamelles;
  };

  if (!match) {
    return null;
  }

  const team1Final = calculateFinalScore(scores.team1Goals, scores.team2Gamelles);
  const team2Final = calculateFinalScore(scores.team2Goals, scores.team1Gamelles);

  return (
    <div id="current-match" className="current-match">
      <div className="match-header">
        <h3 id="match-title">
          {match.team1_nom} vs {match.team2_nom}
        </h3>
        <div className="match-time" id="match-time">
          {match.jour.charAt(0).toUpperCase() + match.jour.slice(1)} - {match.heure}
        </div>
      </div>
      
      <div className="score-controls">
        {/* Équipe 1 */}
        <div className="team-control">
          <h4 id="team1-name">{match.team1_nom}</h4>
          
          <div className="score-display">
            <span className="score-label">Buts</span>
            <div className="score-input">
              <button 
                className="score-btn minus" 
                onClick={() => updateScore('team1', 'goals', -1)}
                disabled={loading}
              >
                -
              </button>
              <AnimatedScore 
                value={scores.team1Goals} 
                type="goal" 
                className="score-value" 
              />
              <button 
                className="score-btn plus" 
                onClick={() => updateScore('team1', 'goals', 1)}
                disabled={loading}
              >
                +
              </button>
            </div>
          </div>
          
          <div className="score-display">
            <span className="score-label">Gamelles</span>
            <div className="score-input">
              <button 
                className="score-btn minus" 
                onClick={() => updateScore('team1', 'gamelles', -1)}
                disabled={loading}
              >
                -
              </button>
              <AnimatedScore 
                value={scores.team1Gamelles} 
                type="gamelle" 
                className="score-value" 
              />
              <button 
                className="score-btn plus" 
                onClick={() => updateScore('team1', 'gamelles', 1)}
                disabled={loading}
              >
                +
              </button>
            </div>
          </div>
          
          <div className="final-score">
            Score final: <span>{team1Final}</span>
          </div>
        </div>

        <div className="vs-divider">VS</div>

        {/* Équipe 2 */}
        <div className="team-control">
          <h4 id="team2-name">{match.team2_nom}</h4>
          
          <div className="score-display">
            <span className="score-label">Buts</span>
            <div className="score-input">
              <button 
                className="score-btn minus" 
                onClick={() => updateScore('team2', 'goals', -1)}
                disabled={loading}
              >
                -
              </button>
              <AnimatedScore 
                value={scores.team2Goals} 
                type="goal" 
                className="score-value" 
              />
              <button 
                className="score-btn plus" 
                onClick={() => updateScore('team2', 'goals', 1)}
                disabled={loading}
              >
                +
              </button>
            </div>
          </div>
          
          <div className="score-display">
            <span className="score-label">Gamelles</span>
            <div className="score-input">
              <button 
                className="score-btn minus" 
                onClick={() => updateScore('team2', 'gamelles', -1)}
                disabled={loading}
              >
                -
              </button>
              <AnimatedScore 
                value={scores.team2Gamelles} 
                type="gamelle" 
                className="score-value" 
              />
              <button 
                className="score-btn plus" 
                onClick={() => updateScore('team2', 'gamelles', 1)}
                disabled={loading}
              >
                +
              </button>
            </div>
          </div>
          
          <div className="final-score">
            Score final: <span>{team2Final}</span>
          </div>
        </div>
      </div>
      
      <div className="match-actions">
        <button 
          className="btn btn--secondary" 
          onClick={onMatchReset}
          disabled={loading}
        >
          Réinitialiser
        </button>
        <button 
          className="btn btn--primary" 
          onClick={onMatchSave}
          disabled={loading}
        >
          Sauvegarder
        </button>
      </div>
    </div>
  );
}

export default ScoreControls;
