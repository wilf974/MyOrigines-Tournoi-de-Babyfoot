import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTournament } from '../contexts/TournamentContext';

/**
 * Composant de gestion des phases de tournoi
 * Permet de valider les semaines et gérer les qualifications
 */
function PhaseManagement() {
  const { getAuthHeaders } = useAuth();
  const { teams, rankings, refreshData } = useTournament();
  
  const [phases, setPhases] = useState([]);
  const [currentPhase, setCurrentPhase] = useState(null);
  const [qualifications, setQualifications] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [activeTab, setActiveTab] = useState('phases');

  /**
   * Affiche un message de feedback
   * @param {string} text - Texte du message
   * @param {string} type - Type du message (success, error, info)
   */
  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  /**
   * Charge les phases du tournoi
   */
  const fetchPhases = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/phases');
      if (!response.ok) throw new Error('Erreur lors du chargement des phases');
      
      const data = await response.json();
      setPhases(data);
      
      // Trouver la phase active
      const activePhase = data.find(phase => phase.is_active);
      setCurrentPhase(activePhase);
    } catch (error) {
      console.error('Erreur fetchPhases:', error);
      showMessage('Erreur lors du chargement des phases', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Charge les qualifications pour la phase actuelle
   */
  const fetchQualifications = async (phaseNumber) => {
    if (!phaseNumber) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/qualifications?phase_number=${phaseNumber}`);
      if (!response.ok) throw new Error('Erreur lors du chargement des qualifications');
      
      const data = await response.json();
      setQualifications(data);
      
      // Pré-sélectionner les équipes déjà qualifiées
      const qualifiedTeams = data.filter(team => team.qualified).map(team => team.id);
      setSelectedTeams(qualifiedTeams);
    } catch (error) {
      console.error('Erreur fetchQualifications:', error);
      showMessage('Erreur lors du chargement des qualifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Valide la phase actuelle et passe à la suivante
   */
  const validateCurrentPhase = async () => {
    if (!currentPhase || selectedTeams.length === 0) {
      showMessage('Veuillez sélectionner au moins une équipe qualifiée', 'error');
      return;
    }

    if (!confirm(`Valider la phase ${currentPhase.phase_number} avec ${selectedTeams.length} équipes qualifiées ?`)) {
      return;
    }

    try {
      setLoading(true);
      
      // Sauvegarder les qualifications
      const response = await fetch('/api/qualifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          phase_number: currentPhase.phase_number,
          qualified_teams: selectedTeams
        })
      });

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde des qualifications');

      // Marquer la phase comme terminée
      const phaseResponse = await fetch('/api/phases', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          phase_number: currentPhase.phase_number,
          is_completed: true,
          is_active: false
        })
      });

      if (!phaseResponse.ok) throw new Error('Erreur lors de la validation de la phase');

      // Créer la phase suivante
      const nextPhaseResponse = await fetch('/api/phases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          phase_name: `Phase ${currentPhase.phase_number + 1} - Semaine ${currentPhase.phase_number + 1}`
        })
      });

      if (!nextPhaseResponse.ok) throw new Error('Erreur lors de la création de la phase suivante');

      showMessage(`Phase ${currentPhase.phase_number} validée ! ${selectedTeams.length} équipes qualifiées.`, 'success');
      
      // Recharger les données
      await Promise.all([
        fetchPhases(),
        refreshData()
      ]);
      
    } catch (error) {
      console.error('Erreur validateCurrentPhase:', error);
      showMessage('Erreur lors de la validation de la phase', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Génère les matchs pour la phase suivante
   */
  const generateNextPhaseMatches = async (phaseNumber) => {
    if (!confirm(`Générer les matchs pour la phase ${phaseNumber} avec les équipes qualifiées ?`)) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/matches/generate-next-phase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          phase_number: phaseNumber,
          matchesPerTeam: 3
        })
      });

      if (!response.ok) throw new Error('Erreur lors de la génération des matchs');

      const data = await response.json();
      showMessage(`${data.matches_generated} matchs générés pour la phase ${phaseNumber}`, 'success');
      
      // Recharger les données
      await refreshData();
      
    } catch (error) {
      console.error('Erreur generateNextPhaseMatches:', error);
      showMessage('Erreur lors de la génération des matchs', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Active une phase
   */
  const activatePhase = async (phaseNumber) => {
    try {
      setLoading(true);
      
      // Désactiver toutes les phases
      await fetch('/api/phases', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          phase_number: 'all',
          is_active: false
        })
      });

      // Activer la phase sélectionnée
      const response = await fetch('/api/phases', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          phase_number: phaseNumber,
          is_active: true
        })
      });

      if (!response.ok) throw new Error('Erreur lors de l\'activation de la phase');

      showMessage(`Phase ${phaseNumber} activée`, 'success');
      await fetchPhases();
      
    } catch (error) {
      console.error('Erreur activatePhase:', error);
      showMessage('Erreur lors de l\'activation de la phase', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gère la sélection/désélection d'une équipe
   */
  const toggleTeamSelection = (teamId) => {
    setSelectedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  /**
   * Initialise les données au chargement
   */
  useEffect(() => {
    fetchPhases();
  }, []);

  /**
   * Charge les qualifications quand la phase change
   */
  useEffect(() => {
    if (currentPhase) {
      fetchQualifications(currentPhase.phase_number);
    }
  }, [currentPhase]);

  return (
    <div className="phase-management">
      <div className="phase-header">
        <h2>🏆 Gestion des Phases de Tournoi</h2>
        <p>Validez les semaines et gérez les qualifications pour les phases suivantes</p>
      </div>

      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}

      <div className="phase-tabs">
        <button 
          className={activeTab === 'phases' ? 'active' : ''}
          onClick={() => setActiveTab('phases')}
        >
          📋 Phases
        </button>
        <button 
          className={activeTab === 'qualifications' ? 'active' : ''}
          onClick={() => setActiveTab('qualifications')}
        >
          🎯 Qualifications
        </button>
      </div>

      {activeTab === 'phases' && (
        <div className="phases-section">
          <h3>Phases du Tournoi</h3>
          
          <div className="phases-list">
            {phases.map(phase => (
              <div key={phase.id} className={`phase-card ${phase.is_active ? 'active' : ''} ${phase.is_completed ? 'completed' : ''}`}>
                <div className="phase-info">
                  <h4>Phase {phase.phase_number}</h4>
                  <p>{phase.phase_name}</p>
                  <div className="phase-status">
                    {phase.is_active && <span className="status active">🟢 Active</span>}
                    {phase.is_completed && <span className="status completed">✅ Terminée</span>}
                    {!phase.is_active && !phase.is_completed && <span className="status pending">⏳ En attente</span>}
                  </div>
                  <div className="phase-stats">
                    <span>Équipes qualifiées: {phase.qualified_teams_count || 0}</span>
                  </div>
                </div>
                
                <div className="phase-actions">
                  {!phase.is_active && !phase.is_completed && (
                    <button 
                      onClick={() => activatePhase(phase.phase_number)}
                      disabled={loading}
                      className="btn-activate"
                    >
                      Activer
                    </button>
                  )}
                  
                  {phase.is_completed && phase.phase_number > 1 && (
                    <button 
                      onClick={() => generateNextPhaseMatches(phase.phase_number)}
                      disabled={loading}
                      className="btn-generate"
                    >
                      Générer Matchs
                    </button>
                  )}
                  
                  {phase.is_completed && (
                    <span className="completed-date">
                      Terminée le {new Date(phase.completed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'qualifications' && currentPhase && (
        <div className="qualifications-section">
          <h3>Qualifications - {currentPhase.phase_name}</h3>
          
          <div className="qualification-info">
            <p>Sélectionnez les équipes qualifiées pour la phase suivante :</p>
            <div className="selection-summary">
              <strong>{selectedTeams.length} équipe(s) sélectionnée(s)</strong>
            </div>
          </div>

          <div className="teams-grid">
            {qualifications.map(team => (
              <div 
                key={team.id} 
                className={`team-card ${selectedTeams.includes(team.id) ? 'selected' : ''}`}
                onClick={() => toggleTeamSelection(team.id)}
              >
                <div className="team-header">
                  <h4>{team.nom}</h4>
                  {selectedTeams.includes(team.id) && <span className="selected-badge">✓</span>}
                </div>
                
                <div className="team-stats">
                  <div className="stat">
                    <span className="label">Points:</span>
                    <span className="value">{team.points}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Buts:</span>
                    <span className="value">{team.buts}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Gamelles:</span>
                    <span className="value">{team.gamelles}</span>
                  </div>
                </div>
                
                <div className="team-players">
                  {JSON.parse(team.joueurs).map((player, index) => (
                    <span key={index} className="player">{player}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="qualification-actions">
            <button 
              onClick={validateCurrentPhase}
              disabled={loading || selectedTeams.length === 0}
              className="btn-validate"
            >
              {loading ? 'Validation...' : `Valider la Phase ${currentPhase.phase_number}`}
            </button>
          </div>
        </div>
      )}

      {!currentPhase && activeTab === 'qualifications' && (
        <div className="no-phase-message">
          <p>Aucune phase active. Veuillez d'abord activer une phase.</p>
        </div>
      )}
    </div>
  );
}

export default PhaseManagement;
