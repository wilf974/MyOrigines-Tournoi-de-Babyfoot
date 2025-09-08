import React, { useState, useEffect } from 'react';
import { useTournament } from '../contexts/TournamentContext';

/**
 * Composant de gestion manuelle des matchs du vendredi pour l'équipe I
 * Permet de définir manuellement quelles équipes jouent contre l'équipe I
 */
function FridayTeamIManagement() {
  const { teams, refreshData } = useTournament();
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [fridayMatches, setFridayMatches] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);

  // Horaires disponibles pour le vendredi
  const fridayTimes = ['12:00', '13:00', '13:30'];

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
   * Charge les matchs du vendredi existants
   */
  const loadFridayMatches = async () => {
    try {
      const response = await fetch('/api/matches/vendredi');
      if (response.ok) {
        const matches = await response.json();
        const teamIMatches = matches.filter(match => 
          match.equipe1_id === 'I' || match.equipe2_id === 'I'
        );
        setFridayMatches(teamIMatches);
      }
    } catch (error) {
      console.error('Erreur chargement matchs vendredi:', error);
    }
  };

  /**
   * Initialise les équipes disponibles (exclut l'équipe I)
   */
  useEffect(() => {
    const teamI = teams.find(team => team.id === 'I');
    if (teamI) {
      const otherTeams = teams.filter(team => team.id !== 'I');
      setAvailableTeams(otherTeams);
    }
  }, [teams]);

  /**
   * Charge les matchs du vendredi au montage du composant
   */
  useEffect(() => {
    loadFridayMatches();
  }, []);

  /**
   * Met à jour un match du vendredi
   * @param {number} index - Index du match à modifier
   * @param {string} opponentId - ID de l'équipe adverse
   */
  const updateMatch = (index, opponentId) => {
    const newMatches = [...fridayMatches];
    if (newMatches[index]) {
      newMatches[index].equipe2_id = opponentId;
    } else {
      // Créer un nouveau match
      newMatches[index] = {
        id: `vendredi_teamI_${index + 1}`,
        jour: 'vendredi',
        heure: fridayTimes[index],
        equipe1_id: 'I',
        equipe2_id: opponentId,
        team1_goals: 0,
        team1_gamelles: 0,
        team2_goals: 0,
        team2_gamelles: 0,
        finished: false
      };
    }
    setFridayMatches(newMatches);
  };

  /**
   * Supprime un match du vendredi
   * @param {number} index - Index du match à supprimer
   */
  const removeMatch = (index) => {
    const newMatches = [...fridayMatches];
    newMatches.splice(index, 1);
    setFridayMatches(newMatches);
  };

  /**
   * Sauvegarde tous les matchs du vendredi
   */
  const saveFridayMatches = async () => {
    setLoading(true);
    try {
      // Supprimer tous les matchs du vendredi existants pour l'équipe I
      await fetch('/api/matches/delete-friday-team-i', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // Créer les nouveaux matchs
      for (const match of fridayMatches) {
        if (match.equipe2_id) {
          await fetch('/api/matches', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: match.id,
              jour: match.jour,
              heure: match.heure,
              equipe1_id: match.equipe1_id,
              equipe2_id: match.equipe2_id
            })
          });
        }
      }

      showMessage(
        `✅ ${fridayMatches.length} matchs du vendredi sauvegardés avec succès`,
        'success'
      );
      
      // Actualiser les données
      await refreshData();
      await loadFridayMatches();
      
    } catch (error) {
      console.error('Erreur sauvegarde matchs vendredi:', error);
      showMessage('❌ Erreur lors de la sauvegarde des matchs du vendredi', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Génère automatiquement les matchs avec les 3 équipes perdantes
   */
  const generateAutomaticMatches = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/matches/generate-friday-team-i', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok) {
        showMessage(
          `✅ Matchs générés automatiquement: ${data.opponents.join(', ')}`,
          'success'
        );
        await refreshData();
        await loadFridayMatches();
      } else {
        showMessage(`❌ Erreur: ${data.error}`, 'error');
      }
    } catch (error) {
      console.error('Erreur génération automatique:', error);
      showMessage('❌ Erreur lors de la génération automatique', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Vide tous les matchs du vendredi
   */
  const clearFridayMatches = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer tous les matchs du vendredi pour l\'équipe I ?')) {
      return;
    }

    setLoading(true);
    try {
      await fetch('/api/matches/delete-friday-team-i', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      showMessage('✅ Matchs du vendredi supprimés', 'success');
      setFridayMatches([]);
      await refreshData();
      
    } catch (error) {
      console.error('Erreur suppression matchs:', error);
      showMessage('❌ Erreur lors de la suppression des matchs', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="friday-team-i-management">
      <div className="management-header">
        <h2>🏆 Gestion Manuelle des Matchs du Vendredi - Équipe I</h2>
        <p>Définissez manuellement quelles équipes affronteront l'équipe I le vendredi.</p>
      </div>

      {/* Message de feedback */}
      {message && (
        <div className={`alert alert-${messageType}`}>
          {message}
        </div>
      )}

      {/* Actions rapides */}
      <div className="quick-actions">
        <button
          className="btn btn--primary"
          onClick={generateAutomaticMatches}
          disabled={loading}
        >
          {loading ? 'Génération...' : '🤖 Génération Automatique'}
        </button>
        <button
          className="btn btn--success"
          onClick={saveFridayMatches}
          disabled={loading}
        >
          {loading ? 'Sauvegarde...' : '💾 Sauvegarder'}
        </button>
        <button
          className="btn btn--danger"
          onClick={clearFridayMatches}
          disabled={loading}
        >
          {loading ? 'Suppression...' : '🗑️ Vider le Vendredi'}
        </button>
      </div>

      {/* Gestion manuelle des matchs */}
      <div className="manual-matches">
        <h3>📅 Configuration Manuelle des Matchs</h3>
        
        {fridayTimes.map((time, index) => {
          const match = fridayMatches.find(m => m.heure === time);
          const opponentId = match ? match.equipe2_id : '';
          
          return (
            <div key={index} className="match-config">
              <div className="match-time">
                <strong>{time}</strong>
              </div>
              <div className="match-teams">
                <span className="team-i">Équipe I</span>
                <span className="vs">vs</span>
                <select
                  value={opponentId}
                  onChange={(e) => updateMatch(index, e.target.value)}
                  className="opponent-select"
                  disabled={loading}
                >
                  <option value="">-- Sélectionner une équipe --</option>
                  {availableTeams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.nom}
                    </option>
                  ))}
                </select>
              </div>
              {match && (
                <button
                  className="btn btn--small btn--danger"
                  onClick={() => removeMatch(index)}
                  disabled={loading}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Aperçu des matchs configurés */}
      {fridayMatches.length > 0 && (
        <div className="matches-preview">
          <h3>👀 Aperçu des Matchs Configurés</h3>
          <div className="matches-list">
            {fridayMatches.map((match, index) => {
              const opponent = teams.find(t => t.id === match.equipe2_id);
              return (
                <div key={index} className="match-preview">
                  <span className="time">{match.heure}</span>
                  <span className="teams">
                    Équipe I vs {opponent ? opponent.nom : 'Non défini'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="instructions">
        <h4>📝 Instructions</h4>
        <ul>
          <li><strong>Génération Automatique</strong> : Sélectionne automatiquement les 3 équipes perdantes les mieux notées</li>
          <li><strong>Configuration Manuelle</strong> : Choisissez manuellement quelles équipes affronteront l'équipe I</li>
          <li><strong>Sauvegarde</strong> : Enregistre la configuration actuelle</li>
          <li><strong>Vider</strong> : Supprime tous les matchs du vendredi</li>
        </ul>
      </div>
    </div>
  );
}

export default FridayTeamIManagement;
