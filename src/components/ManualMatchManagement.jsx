import React, { useState, useEffect } from 'react';
import { useTournament } from '../contexts/TournamentContext';

/**
 * Composant de gestion manuelle complète des matchs
 * Permet de modifier les équipes pour n'importe quel jour
 */
function ManualMatchManagement() {
  const { teams, matches, refreshData } = useTournament();
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [selectedDay, setSelectedDay] = useState('lundi');
  const [dayMatches, setDayMatches] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);

  // Jours disponibles
  const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
  
  // Horaires disponibles
  const timeSlots = ['12:00', '13:00', '13:30', '14:00', '14:30'];

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
   * Charge les matchs du jour sélectionné
   */
  const loadDayMatches = () => {
    if (!Array.isArray(matches)) {
      console.warn('matches is not an array:', matches);
      setDayMatches([]);
      return;
    }
    const dayMatchesList = matches.filter(match => match.jour === selectedDay);
    console.log(`📅 Chargement des matchs du ${selectedDay}:`, dayMatchesList);
    setDayMatches(dayMatchesList);
  };

  /**
   * Initialise les équipes disponibles
   */
  useEffect(() => {
    if (!Array.isArray(teams)) {
      console.warn('teams is not an array:', teams);
      setAvailableTeams([]);
      return;
    }
    setAvailableTeams(teams);
  }, [teams]);

  /**
   * Charge les matchs quand le jour change
   */
  useEffect(() => {
    loadDayMatches();
  }, [selectedDay, matches]);

  /**
   * Met à jour une équipe dans un match
   * @param {string} matchId - ID du match
   * @param {string} teamPosition - Position de l'équipe (equipe1_id ou equipe2_id)
   * @param {string} newTeamId - Nouvel ID d'équipe
   */
  const updateMatchTeam = (matchId, teamPosition, newTeamId) => {
    if (!Array.isArray(dayMatches)) {
      console.warn('dayMatches is not an array:', dayMatches);
      setDayMatches([]);
      return;
    }
    
    const updatedMatches = dayMatches.map(match => {
      if (match.id === matchId) {
        return {
          ...match,
          [teamPosition]: newTeamId
        };
      }
      return match;
    });
    setDayMatches(updatedMatches);
  };

  /**
   * Ajoute un nouveau match au jour sélectionné
   */
  const addNewMatch = () => {
    if (!Array.isArray(dayMatches)) {
      console.warn('dayMatches is not an array:', dayMatches);
      setDayMatches([]);
      return;
    }

    const nextTimeSlot = timeSlots.find(time => 
      !dayMatches.some(match => match.heure === time)
    );
    
    if (!nextTimeSlot) {
      showMessage('❌ Tous les créneaux horaires sont occupés pour ce jour', 'error');
      return;
    }

    const newMatch = {
      id: `${selectedDay}_${nextTimeSlot.replace(':', '')}_manual_${Date.now()}`,
      jour: selectedDay,
      heure: nextTimeSlot,
      equipe1_id: '',
      equipe2_id: '',
      team1_goals: 0,
      team1_gamelles: 0,
      team2_goals: 0,
      team2_gamelles: 0,
      finished: false
    };

    setDayMatches([...dayMatches, newMatch]);
  };

  /**
   * Supprime un match
   * @param {string} matchId - ID du match à supprimer
   */
  const removeMatch = (matchId) => {
    if (!Array.isArray(dayMatches)) {
      console.warn('dayMatches is not an array:', dayMatches);
      setDayMatches([]);
      return;
    }
    setDayMatches(dayMatches.filter(match => match.id !== matchId));
  };

  /**
   * Sauvegarde tous les matchs du jour
   */
  const saveDayMatches = async () => {
    setLoading(true);
    setMessage('');
    setMessageType('');
    
    try {
      console.log(`💾 Début de la sauvegarde pour le ${selectedDay}`);
      console.log('📋 Matchs à sauvegarder:', dayMatches);

      // Vérifier qu'il y a des matchs valides à sauvegarder
      const validMatches = dayMatches.filter(match => match.equipe1_id && match.equipe2_id);
      if (validMatches.length === 0) {
        showMessage('⚠️ Aucun match valide à sauvegarder', 'error');
        return;
      }

      // Supprimer tous les matchs existants pour ce jour
      console.log(`🗑️ Suppression des matchs existants pour le ${selectedDay}`);
      const deleteResponse = await fetch(`/api/matches/delete-day/${selectedDay}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!deleteResponse.ok) {
        const deleteError = await deleteResponse.text();
        console.error('❌ Erreur suppression matchs:', deleteError);
        throw new Error(`Erreur lors de la suppression des anciens matchs: ${deleteError}`);
      }
      console.log('✅ Anciens matchs supprimés avec succès');

      // Créer les nouveaux matchs
      console.log(`⚽ Création de ${validMatches.length} nouveaux matchs`);
      let successCount = 0;
      
      for (const match of validMatches) {
        try {
          console.log(`📝 Création du match: ${match.heure} - ${match.equipe1_id} vs ${match.equipe2_id}`);
          
          const createResponse = await fetch('/api/matches', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id: match.id,
              jour: match.jour,
              heure: match.heure,
              equipe1_id: match.equipe1_id,
              equipe2_id: match.equipe2_id
            })
          });

          if (!createResponse.ok) {
            const createError = await createResponse.text();
            console.error(`❌ Erreur création match ${match.id}:`, createError);
            throw new Error(`Erreur création match ${match.heure}: ${createError}`);
          }
          
          successCount++;
          console.log(`✅ Match créé: ${match.heure} - ${match.equipe1_id} vs ${match.equipe2_id}`);
          
        } catch (matchError) {
          console.error(`❌ Erreur sur le match ${match.heure}:`, matchError);
          throw matchError;
        }
      }

      console.log(`🎉 ${successCount} matchs sauvegardés avec succès pour le ${selectedDay}`);
      
      showMessage(
        `✅ ${successCount} matchs du ${selectedDay} sauvegardés avec succès`,
        'success'
      );
      
      // Actualiser les données
      console.log('🔄 Actualisation des données...');
      await refreshData();
      console.log('🔄 Rechargement des matchs du jour...');
      loadDayMatches();
      
    } catch (error) {
      console.error('❌ Erreur générale lors de la sauvegarde:', error);
      showMessage(`❌ Erreur lors de la sauvegarde: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Vide tous les matchs du jour
   */
  const clearDayMatches = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer tous les matchs du ${selectedDay} ?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/matches/delete-day/${selectedDay}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Erreur suppression matchs:', error);
        throw new Error(`Erreur suppression: ${error}`);
      }

      showMessage(`✅ Matchs du ${selectedDay} supprimés`, 'success');
      setDayMatches([]);
      await refreshData();
      
    } catch (error) {
      console.error('Erreur suppression matchs:', error);
      showMessage('❌ Erreur lors de la suppression des matchs', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtient le nom d'une équipe par son ID
   * @param {string} teamId - ID de l'équipe
   * @returns {string} Nom de l'équipe
   */
  const getTeamName = (teamId) => {
    if (!Array.isArray(teams)) {
      console.warn('teams is not an array:', teams);
      return 'Non sélectionné';
    }
    const team = teams.find(t => t.id === teamId);
    return team ? team.nom : 'Non sélectionné';
  };

  return (
    <div className="manual-match-management">
      <div className="management-header">
        <h2>⚽ Gestion Manuelle des Matchs</h2>
        <p>Modifiez les équipes pour n'importe quel jour du tournoi.</p>
      </div>

      {/* Message de feedback */}
      {message && (
        <div className={`alert alert-${messageType}`}>
          {message}
        </div>
      )}

      {/* Sélection du jour */}
      <div className="day-selection">
        <h3>📅 Sélection du Jour</h3>
        <div className="day-tabs">
          {days.map(day => (
            <button
              key={day}
              className={`day-tab ${selectedDay === day ? 'active' : ''}`}
              onClick={() => setSelectedDay(day)}
            >
              {day.charAt(0).toUpperCase() + day.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="quick-actions">
        <button
          className="btn btn--primary"
          onClick={addNewMatch}
          disabled={loading}
        >
          ➕ Ajouter un Match
        </button>
        <button
          className="btn btn--success"
          onClick={saveDayMatches}
          disabled={loading}
        >
          {loading ? 'Sauvegarde...' : '💾 Sauvegarder'}
        </button>
        <button
          className="btn btn--danger"
          onClick={clearDayMatches}
          disabled={loading}
        >
          {loading ? 'Suppression...' : '🗑️ Vider le Jour'}
        </button>
      </div>

      {/* Gestion des matchs du jour */}
      <div className="day-matches">
        <h3>🏆 Matchs du {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}</h3>
        
        {!Array.isArray(dayMatches) || dayMatches.length === 0 ? (
          <div className="no-matches">
            <p>Aucun match programmé pour le {selectedDay}.</p>
            <p>Cliquez sur "Ajouter un Match" pour commencer.</p>
          </div>
        ) : (
          <div className="matches-list">
            {dayMatches.map((match, index) => (
              <div key={match.id} className="match-config">
                <div className="match-time">
                  <strong>{match.heure}</strong>
                </div>
                
                <div className="match-teams">
                  <select
                    value={match.equipe1_id || ''}
                    onChange={(e) => updateMatchTeam(match.id, 'equipe1_id', e.target.value)}
                    className="team-select"
                    disabled={loading}
                  >
                    <option value="">-- Équipe 1 --</option>
                    {availableTeams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.nom}
                      </option>
                    ))}
                  </select>
                  
                  <span className="vs">vs</span>
                  
                  <select
                    value={match.equipe2_id || ''}
                    onChange={(e) => updateMatchTeam(match.id, 'equipe2_id', e.target.value)}
                    className="team-select"
                    disabled={loading}
                  >
                    <option value="">-- Équipe 2 --</option>
                    {availableTeams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  className="btn btn--small btn--danger"
                  onClick={() => removeMatch(match.id)}
                  disabled={loading}
                  title="Supprimer ce match"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aperçu des matchs configurés */}
      {Array.isArray(dayMatches) && dayMatches.length > 0 && (
        <div className="matches-preview">
          <h3>👀 Aperçu des Matchs Configurés</h3>
          <div className="preview-list">
            {dayMatches
              .filter(match => match.equipe1_id && match.equipe2_id)
              .map((match, index) => (
                <div key={index} className="preview-item">
                  <span className="time">{match.heure}</span>
                  <span className="teams">
                    {getTeamName(match.equipe1_id)} vs {getTeamName(match.equipe2_id)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="instructions">
        <h4>📝 Instructions</h4>
        <ul>
          <li><strong>Sélection du jour</strong> : Choisissez le jour à modifier avec les onglets</li>
          <li><strong>Ajouter un match</strong> : Crée un nouveau match au prochain créneau disponible</li>
          <li><strong>Modifier les équipes</strong> : Utilisez les menus déroulants pour changer les équipes</li>
          <li><strong>Sauvegarder</strong> : Enregistre tous les matchs du jour sélectionné</li>
          <li><strong>Vider le jour</strong> : Supprime tous les matchs du jour sélectionné</li>
        </ul>
      </div>
    </div>
  );
}

export default ManualMatchManagement;
