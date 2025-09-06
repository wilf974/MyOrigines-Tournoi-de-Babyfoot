import React, { useState, useEffect } from 'react';
import { useTournament } from '../contexts/TournamentContext';
import MatchList from './MatchList';
import Rankings from './Rankings';

/**
 * Composant de la vue vitrine
 * Affichage public des scores en temps réel
 */
function DisplayView({ onBack }) {
  const { 
    matches, 
    rankings, 
    currentDay, 
    loading, 
    changeDay, 
    refreshData 
  } = useTournament();
  
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  /**
   * Met à jour le temps de dernière mise à jour
   */
  useEffect(() => {
    setLastUpdate(new Date());
  }, [matches, rankings]);

  /**
   * Auto-refresh toutes les 5 secondes
   */
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      await refreshData();
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshData]);

  /**
   * Gère le changement de jour
   * @param {string} day - Nouveau jour
   */
  const handleDayChange = async (day) => {
    await changeDay(day);
  };

  /**
   * Bascule l'auto-refresh
   */
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const currentMatches = matches[currentDay] || [];

  return (
    <div id="display-view" className="view">
      <div className="display-header">
        <div className="container">
          <div className="display-title">
            <h1>MyOrigines - Tournoi de Babyfoot</h1>
            <div className="live-info">
              <div className="live-indicator">
                <span className={`live-dot ${autoRefresh ? 'pulsing' : ''}`}></span>
                {autoRefresh ? 'LIVE' : 'PAUSÉ'}
              </div>
              <div className="last-update" id="last-update">
                Dernière mise à jour: {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>
          <div className="display-controls">
            <button 
              className="btn btn--outline" 
              onClick={toggleAutoRefresh}
            >
              {autoRefresh ? 'Pause' : 'Reprendre'}
            </button>
            <button className="btn btn--outline" onClick={onBack}>
              Retour
            </button>
          </div>
        </div>
      </div>

      <div className="display-content">
        <div className="container">
          <div className="display-grid">
            {/* Matchs en cours */}
            <div className="current-matches-section">
              <h2>Matchs du Jour</h2>
              <div className="day-selector">
                {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'].map(day => (
                  <button
                    key={day}
                    className={`day-tab ${currentDay === day ? 'active' : ''}`}
                    onClick={() => handleDayChange(day)}
                  >
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </button>
                ))}
              </div>
              <div id="current-day-display" className="current-day">
                {currentDay.charAt(0).toUpperCase() + currentDay.slice(1)}
              </div>
              <MatchList
                matches={currentMatches}
                selectedMatch={null}
                onMatchSelect={() => {}} // Pas de sélection en mode vitrine
                loading={loading}
                displayMode={true}
              />
            </div>

            {/* Classement global */}
            <div className="display-rankings-section">
              <h2>Classement Général</h2>
              <Rankings rankings={rankings} loading={loading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DisplayView;
