import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTournament } from '../contexts/TournamentContext';
import MatchList from './MatchList';
import ScoreControls from './ScoreControls';
import Rankings from './Rankings';
import TeamManagement from './TeamManagement';
import MatchManagement from './MatchManagement';

/**
 * Composant de la vue admin
 * Interface de gestion des scores et matchs
 */
function AdminView({ onBack }) {
  const { user, logout, getAuthHeaders } = useAuth();
  const { 
    teams, 
    matches, 
    rankings, 
    currentDay, 
    loading, 
    changeDay, 
    updateMatch, 
    resetMatch,
    refreshData 
  } = useTournament();
  
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeTab, setActiveTab] = useState('matches');

  /**
   * Met à jour le temps de dernière synchronisation
   */
  useEffect(() => {
    setLastUpdate(new Date());
  }, [matches, rankings]);

  /**
   * Gère la sélection d'un match
   * @param {Object} match - Match sélectionné
   */
  const handleMatchSelect = (match) => {
    setSelectedMatch(match);
  };

  /**
   * Met à jour les scores d'un match
   * @param {Object} matchData - Nouvelles données du match
   */
  const handleScoreUpdate = async (matchData) => {
    if (!selectedMatch) return;
    
    const success = await updateMatch(selectedMatch.id, matchData, getAuthHeaders());
    if (success) {
      setLastUpdate(new Date());
    }
  };

  /**
   * Réinitialise un match
   */
  const handleMatchReset = async () => {
    if (!selectedMatch) return;
    
    if (confirm('Êtes-vous sûr de vouloir réinitialiser les scores de ce match ?')) {
      const success = await resetMatch(selectedMatch.id, getAuthHeaders());
      if (success) {
        setLastUpdate(new Date());
        setSelectedMatch(null);
      }
    }
  };

  /**
   * Sauvegarde un match comme terminé
   */
  const handleMatchSave = async () => {
    if (!selectedMatch) return;
    
    const matchData = {
      team1Goals: selectedMatch.team1_goals,
      team1Gamelles: selectedMatch.team1_gamelles,
      team2Goals: selectedMatch.team2_goals,
      team2Gamelles: selectedMatch.team2_gamelles,
      finished: true
    };
    
    const success = await updateMatch(selectedMatch.id, matchData, getAuthHeaders());
    if (success) {
      setLastUpdate(new Date());
      setSelectedMatch(null);
    }
  };

  /**
   * Gère la déconnexion
   */
  const handleLogout = () => {
    logout();
    onBack();
  };

  /**
   * Rafraîchit les données
   */
  const handleRefresh = async () => {
    await refreshData();
    setLastUpdate(new Date());
  };

  const currentMatches = matches[currentDay] || [];

  return (
    <div id="admin-view" className="view">
      <div className="admin-header">
        <div className="container">
          <div className="header-content">
            <div>
              <h1>MyOrigines - Interface Admin</h1>
              <div className="live-indicator">
                <span className="live-dot pulsing"></span>
                Mise à jour en temps réel
              </div>
            </div>
            <div className="header-actions">
              <div className="sync-status" id="sync-status">
                <span className="sync-icon">✓</span>
                Synchronisé
              </div>
              <div className="user-info">
                <span>Connecté en tant que: <strong>{user?.username}</strong></span>
              </div>
              <button className="btn btn--outline" onClick={handleRefresh} disabled={loading}>
                {loading ? 'Actualisation...' : 'Actualiser'}
              </button>
              <button className="btn btn--outline" onClick={handleLogout}>
                Déconnexion
              </button>
              <button className="btn btn--outline" onClick={onBack}>
                Retour
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-content">
        <div className="container">
          {/* Onglets de navigation */}
          <div className="admin-tabs">
            <button 
              className={`admin-tab ${activeTab === 'matches' ? 'active' : ''}`}
              onClick={() => setActiveTab('matches')}
            >
              Gestion des Matchs
            </button>
            <button 
              className={`admin-tab ${activeTab === 'match-management' ? 'active' : ''}`}
              onClick={() => setActiveTab('match-management')}
            >
              Organisation des Matchs
            </button>
            <button 
              className={`admin-tab ${activeTab === 'teams' ? 'active' : ''}`}
              onClick={() => setActiveTab('teams')}
            >
              Gestion des Équipes
            </button>
          </div>

          {/* Contenu des onglets */}
          {activeTab === 'matches' && (
            <div className="admin-grid">
              {/* Planning des matchs */}
              <div className="schedule-section">
                <h2>Planning des Matchs</h2>
                <div className="day-tabs">
                  {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'].map(day => (
                    <button
                      key={day}
                      className={`day-tab ${currentDay === day ? 'active' : ''}`}
                      onClick={() => changeDay(day)}
                    >
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </button>
                  ))}
                </div>
                <MatchList
                  matches={currentMatches}
                  selectedMatch={selectedMatch}
                  onMatchSelect={handleMatchSelect}
                  loading={loading}
                />
              </div>

              {/* Gestion des scores */}
              <div className="scoring-section">
                <h2>Gestion des Scores</h2>
                {selectedMatch ? (
                  <ScoreControls
                    match={selectedMatch}
                    onScoreUpdate={handleScoreUpdate}
                    onMatchReset={handleMatchReset}
                    onMatchSave={handleMatchSave}
                    loading={loading}
                  />
                ) : (
                  <div id="no-match" className="no-match">
                    <p>Sélectionnez un match dans le planning pour commencer la saisie des scores.</p>
                  </div>
                )}
              </div>

              {/* Classement temps réel */}
              <div className="rankings-section">
                <h2>Classement Temps Réel</h2>
                <Rankings rankings={rankings} loading={loading} />
              </div>
            </div>
          )}

          {activeTab === 'match-management' && (
            <div className="match-management-section">
              <MatchManagement />
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="teams-management-section">
              <TeamManagement />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminView;
