import React, { useState, useEffect } from 'react';
import { useTournament } from '../contexts/TournamentContext';

/**
 * Composant de gestion manuelle complète des matchs
 * Permet de modifier les équipes pour n'importe quel jour
 */
function ManualMatchManagement() {
  const { teams, matches, currentDay, refreshData, fetchMatches } = useTournament();
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [selectedDay, setSelectedDay] = useState('lundi');
  const [dayMatches, setDayMatches] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
    // Le contexte TournamentContext stocke les matchs par jour dans un objet
    const dayMatchesList = matches[selectedDay] || [];
    
    if (!Array.isArray(dayMatchesList)) {
      console.warn('dayMatchesList is not an array:', dayMatchesList);
      setDayMatches([]);
      return;
    }
    
    console.log(`📅 Chargement des matchs du ${selectedDay}:`, dayMatchesList);
    
    // Trier les matchs par heure
    const sortedMatches = dayMatchesList.sort((a, b) => {
      return a.heure.localeCompare(b.heure);
    });
    
    setDayMatches(sortedMatches);
    
    // Log détaillé pour le débogage
    const ongoingMatches = sortedMatches.filter(match => !match.finished);
    const finishedMatches = sortedMatches.filter(match => match.finished);
    console.log(`📊 ${selectedDay}: ${sortedMatches.length} total, ${ongoingMatches.length} en cours, ${finishedMatches.length} terminés`);
    
    // Réinitialiser l'état des modifications non sauvegardées
    setHasUnsavedChanges(false);
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
   * Charge les matchs du jour sélectionné depuis l'API si nécessaire
   */
  useEffect(() => {
    if (selectedDay && (!matches[selectedDay] || matches[selectedDay].length === 0)) {
      console.log(`🔄 Chargement des matchs du ${selectedDay} depuis l'API...`);
      fetchMatches(selectedDay);
    }
  }, [selectedDay, matches, fetchMatches]);

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
    setHasUnsavedChanges(true);
    showMessage('⚠️ Modifications non sauvegardées - Cliquez sur "Sauvegarder" pour confirmer', 'info');
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
      
      // Recharger les matchs depuis l'API pour s'assurer d'avoir les bonnes données
      await fetchMatches(selectedDay);
      
      // Réinitialiser l'état des modifications non sauvegardées
      setHasUnsavedChanges(false);
      
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

  /**
   * Obtient le statut d'un match avec plus de détails
   * @param {Object} match - Objet match
   * @returns {Object} Statut du match avec icône et classe CSS
   */
  const getMatchStatus = (match) => {
    if (match.finished) {
      return {
        text: 'Terminé',
        icon: '✅',
        className: 'status-finished',
        description: `Score: ${match.team1_goals || 0}-${match.team2_goals || 0}`,
        canEdit: false,
        color: '#28a745'
      };
    } else if (match.team1_goals > 0 || match.team2_goals > 0 || match.team1_gamelles > 0 || match.team2_gamelles > 0) {
      return {
        text: 'En cours',
        icon: '⏳',
        className: 'status-ongoing',
        description: `Score actuel: ${match.team1_goals || 0}-${match.team2_goals || 0}`,
        canEdit: true,
        color: '#ffc107'
      };
    } else {
      return {
        text: 'À venir',
        icon: '📅',
        className: 'status-upcoming',
        description: 'Match non commencé',
        canEdit: true,
        color: '#17a2b8'
      };
    }
  };

  /**
   * Obtient les statistiques globales de tous les matchs
   * @returns {Object} Statistiques des matchs
   */
  const getGlobalStats = () => {
    let totalMatches = 0;
    let finishedMatches = 0;
    let ongoingMatches = 0;
    let upcomingMatches = 0;

    days.forEach(day => {
      const dayMatches = matches[day] || [];
      totalMatches += dayMatches.length;
      dayMatches.forEach(match => {
        if (match.finished) {
          finishedMatches++;
        } else if (match.team1_goals > 0 || match.team2_goals > 0 || match.team1_gamelles > 0 || match.team2_gamelles > 0) {
          ongoingMatches++;
        } else {
          upcomingMatches++;
        }
      });
    });

    return { totalMatches, finishedMatches, ongoingMatches, upcomingMatches };
  };

  const globalStats = getGlobalStats();

  return (
    <div className="manual-match-management">
      <div className="management-header">
        <h2>⚽ Gestion Manuelle des Matchs</h2>
        <p>Modifiez les équipes pour n'importe quel jour du tournoi.</p>
      </div>

      {/* Vue d'ensemble globale */}
      <div className="global-overview">
        <h3>📊 Vue d'Ensemble du Tournoi</h3>
        <div className="global-stats">
          <div className="stat-card">
            <div className="stat-number">{globalStats.totalMatches}</div>
            <div className="stat-label">Total Matchs</div>
          </div>
          <div className="stat-card finished">
            <div className="stat-number">{globalStats.finishedMatches}</div>
            <div className="stat-label">Terminés</div>
          </div>
          <div className="stat-card ongoing">
            <div className="stat-number">{globalStats.ongoingMatches}</div>
            <div className="stat-label">En cours</div>
          </div>
          <div className="stat-card upcoming">
            <div className="stat-number">{globalStats.upcomingMatches}</div>
            <div className="stat-label">À venir</div>
          </div>
        </div>
      </div>

      {/* Message de feedback */}
      {message && (
        <div className={`alert alert-${messageType}`}>
          {message}
        </div>
      )}

      {/* Vue d'ensemble de tous les matchs */}
      <div className="all-matches-overview">
        <h3>📋 Vue d'Ensemble de Tous les Matchs</h3>
        <div className="week-matches">
          {days.map(day => {
            const dayMatches = matches[day] || [];
            const dayStats = {
              total: dayMatches.length,
              finished: dayMatches.filter(m => m.finished).length,
              ongoing: dayMatches.filter(m => !m.finished && (m.team1_goals > 0 || m.team2_goals > 0 || m.team1_gamelles > 0 || m.team2_gamelles > 0)).length,
              upcoming: dayMatches.filter(m => !m.finished && m.team1_goals === 0 && m.team2_goals === 0 && m.team1_gamelles === 0 && m.team2_gamelles === 0).length
            };
            
            return (
              <div key={day} className="day-overview">
                <div className="day-header">
                  <h4>{day.charAt(0).toUpperCase() + day.slice(1)}</h4>
                  <div className="day-stats">
                    <span className="stat-badge total">{dayStats.total}</span>
                    <span className="stat-badge finished">{dayStats.finished}</span>
                    <span className="stat-badge ongoing">{dayStats.ongoing}</span>
                    <span className="stat-badge upcoming">{dayStats.upcoming}</span>
                  </div>
                </div>
                <div className="day-matches-list">
                  {dayMatches.length === 0 ? (
                    <p className="no-matches-day">Aucun match programmé</p>
                  ) : (
                    dayMatches.map(match => {
                      const status = getMatchStatus(match);
                      return (
                        <div key={match.id} className={`match-overview-item ${match.finished ? 'finished' : ''}`}>
                          <span className="match-time">{match.heure}</span>
                          <span className="match-teams">
                            {getTeamName(match.equipe1_id)} vs {getTeamName(match.equipe2_id)}
                          </span>
                          <span className={`match-status-badge ${status.className}`}>
                            {status.icon} {status.text}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sélection du jour */}
      <div className="day-selection">
        <h3>📅 Sélection du Jour pour Modification</h3>
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
          className={`btn btn--success ${hasUnsavedChanges ? 'btn--pulse' : ''}`}
          onClick={saveDayMatches}
          disabled={loading}
        >
          {loading ? 'Sauvegarde...' : '💾 Sauvegarder'}
          {hasUnsavedChanges && !loading && <span className="unsaved-indicator">⚠️</span>}
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
        
        {/* Statistiques des matchs */}
        {Array.isArray(dayMatches) && dayMatches.length > 0 && (
          <div className="matches-stats">
            <div className="stat-item">
              <span className="stat-label">Total:</span>
              <span className="stat-value">{dayMatches.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">En cours:</span>
              <span className="stat-value ongoing">{dayMatches.filter(m => !m.finished).length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Terminés:</span>
              <span className="stat-value finished">{dayMatches.filter(m => m.finished).length}</span>
            </div>
          </div>
        )}
        
        {!Array.isArray(dayMatches) || dayMatches.length === 0 ? (
          <div className="no-matches">
            <p>Aucun match programmé pour le {selectedDay}.</p>
            <p>Cliquez sur "Ajouter un Match" pour commencer.</p>
          </div>
        ) : (
          <div className="matches-list">
            {dayMatches.map((match, index) => {
              const status = getMatchStatus(match);
              return (
                <div key={match.id} className={`match-config ${match.finished ? 'match-finished' : ''}`}>
                  <div className="match-header">
                    <div className="match-time">
                      <strong>{match.heure}</strong>
                    </div>
                    <div className={`match-status ${status.className}`}>
                      <span className="status-icon">{status.icon}</span>
                      <span className="status-text">{status.text}</span>
                      {match.finished && (
                        <span className="status-score">{status.description}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="match-teams">
                    <select
                      value={match.equipe1_id || ''}
                      onChange={(e) => updateMatchTeam(match.id, 'equipe1_id', e.target.value)}
                      className={`team-select ${!status.canEdit ? 'disabled' : ''}`}
                      disabled={loading || !status.canEdit}
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
                      className={`team-select ${!status.canEdit ? 'disabled' : ''}`}
                      disabled={loading || !status.canEdit}
                    >
                      <option value="">-- Équipe 2 --</option>
                      {availableTeams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="match-actions">
                    <button
                      className="btn btn--small btn--danger"
                      onClick={() => removeMatch(match.id)}
                      disabled={loading || !status.canEdit}
                      title={!status.canEdit ? "Impossible de supprimer un match terminé" : "Supprimer ce match"}
                    >
                      ✕
                    </button>
                    {!status.canEdit && (
                      <span className="locked-note" title="Ce match est terminé et ne peut pas être modifié">
                        🔒 Verrouillé
                      </span>
                    )}
                    {status.canEdit && (match.team1_goals > 0 || match.team2_goals > 0 || match.team1_gamelles > 0 || match.team2_gamelles > 0) && (
                      <span className="ongoing-note" title="Ce match est en cours - les équipes peuvent encore être modifiées">
                        ⚠️ En cours
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
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
              .map((match, index) => {
                const status = getMatchStatus(match);
                return (
                  <div key={index} className={`preview-item ${match.finished ? 'preview-finished' : ''}`}>
                    <span className="time">{match.heure}</span>
                    <span className="teams">
                      {getTeamName(match.equipe1_id)} vs {getTeamName(match.equipe2_id)}
                    </span>
                    <span className={`preview-status ${status.className}`}>
                      {status.icon} {status.text}
                      {match.finished && (
                        <span className="preview-score"> ({status.description})</span>
                      )}
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
          <li><strong>Sélection du jour</strong> : Choisissez le jour à modifier avec les onglets</li>
          <li><strong>Ajouter un match</strong> : Crée un nouveau match au prochain créneau disponible</li>
          <li><strong>Modifier les équipes</strong> : Utilisez les menus déroulants pour changer les équipes</li>
          <li><strong>Sauvegarder</strong> : ⚠️ <strong>IMPORTANT</strong> - Cliquez sur "Sauvegarder" après chaque modification pour que les changements soient pris en compte</li>
          <li><strong>Vider le jour</strong> : Supprime tous les matchs du jour sélectionné</li>
        </ul>
        
        {hasUnsavedChanges && (
          <div className="warning-box">
            <strong>⚠️ Attention :</strong> Vous avez des modifications non sauvegardées. 
            Cliquez sur le bouton "Sauvegarder" pour confirmer vos changements.
          </div>
        )}
      </div>
    </div>
  );
}

export default ManualMatchManagement;
