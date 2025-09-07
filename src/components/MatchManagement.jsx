import React, { useState } from 'react';
import { useTournament } from '../contexts/TournamentContext';

/**
 * Composant de gestion des matchs
 * Permet de sauvegarder, restaurer et régénérer les matchs
 */
function MatchManagement() {
  const { refreshData } = useTournament();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [matchesPerTeam, setMatchesPerTeam] = useState(3);

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
   * Restaure le planning standard prédéfini
   */
  const handleRestoreMatches = async () => {
    if (!confirm('Voulez-vous restaurer le planning standard ? Cela remplacera les matchs actuels.')) {
      return;
    }

    setLoading(true);
    try {
      // Planning standard basé sur l'image fournie
      const standardMatches = [
        // Lundi
        { id: 'lundi-1', jour: 'lundi', heure: '12:00', equipe1_id: 'A', equipe2_id: 'B' },
        { id: 'lundi-2', jour: 'lundi', heure: '13:00', equipe1_id: 'C', equipe2_id: 'D' },
        { id: 'lundi-3', jour: 'lundi', heure: '13:30', equipe1_id: 'E', equipe2_id: 'F' },
        
        // Mardi
        { id: 'mardi-1', jour: 'mardi', heure: '12:00', equipe1_id: 'A', equipe2_id: 'C' },
        { id: 'mardi-2', jour: 'mardi', heure: '13:00', equipe1_id: 'B', equipe2_id: 'D' },
        { id: 'mardi-3', jour: 'mardi', heure: '13:30', equipe1_id: 'G', equipe2_id: 'H' },
        
        // Mercredi
        { id: 'mercredi-1', jour: 'mercredi', heure: '12:00', equipe1_id: 'A', equipe2_id: 'E' },
        { id: 'mercredi-2', jour: 'mercredi', heure: '13:00', equipe1_id: 'B', equipe2_id: 'F' },
        { id: 'mercredi-3', jour: 'mercredi', heure: '13:30', equipe1_id: 'C', equipe2_id: 'G' },
        
        // Jeudi
        { id: 'jeudi-1', jour: 'jeudi', heure: '12:00', equipe1_id: 'D', equipe2_id: 'H' },
        { id: 'jeudi-2', jour: 'jeudi', heure: '13:00', equipe1_id: 'E', equipe2_id: 'G' },
        { id: 'jeudi-3', jour: 'jeudi', heure: '13:30', equipe1_id: 'F', equipe2_id: 'H' }
      ];

      const response = await fetch('/api/matches/restore-standard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          matches: standardMatches
        })
      });

      const data = await response.json();

      if (response.ok) {
        showMessage(`✅ Planning standard restauré avec succès (${data.count} matchs)`, 'success');
        await refreshData(); // Rafraîchir les données
      } else {
        showMessage(`❌ Erreur: ${data.error}`, 'error');
      }
    } catch (error) {
      console.error('Erreur restauration:', error);
      showMessage('❌ Erreur de connexion lors de la restauration', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Régénère les matchs automatiquement
   */
  const handleRegenerateMatches = async () => {
    if (!confirm(`Voulez-vous régénérer les matchs automatiquement ? Cela créera de nouveaux matchs basés sur les équipes actuelles avec ${matchesPerTeam} matchs par équipe et remplacera les matchs existants.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/matches/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          matchesPerTeam: matchesPerTeam
        })
      });

      const data = await response.json();

      if (response.ok) {
        showMessage(`✅ ${data.message} (${data.count} nouveaux matchs générés)`, 'success');
        await refreshData(); // Rafraîchir les données
      } else {
        showMessage(`❌ Erreur: ${data.error}`, 'error');
      }
    } catch (error) {
      console.error('Erreur régénération:', error);
      showMessage('❌ Erreur de connexion lors de la régénération', 'error');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="match-management">
      <div className="match-management-header">
        <h2>Gestion des Matchs</h2>
        <p>Gérez les matchs du tournoi : sauvegardez, restaurez ou régénérez automatiquement les matchs.</p>
      </div>

      {/* Message de feedback */}
      {message && (
        <div className={`alert alert-${messageType}`}>
          {message}
        </div>
      )}

      {/* Actions de gestion des matchs */}
      <div className="match-actions">
        <div className="action-group">
          <h3>Restauration du Planning Standard</h3>
          <div className="action-buttons">
            <button 
              className="btn btn--secondary"
              onClick={handleRestoreMatches}
              disabled={loading}
            >
              {loading ? 'Restauration...' : '🔄 Restaurer le Planning Standard'}
            </button>
          </div>
          <p className="action-description">
            Restaure le planning standard avec 12 matchs répartis sur 4 jours (Lundi-Jeudi).
          </p>
        </div>

                <div className="action-group">
                  <h3>Régénération Automatique</h3>
                  
                  {/* Sélecteur du nombre de matchs par équipe */}
                  <div className="matches-per-team-selector">
                    <label htmlFor="matchesPerTeam">
                      <strong>Nombre de matchs par équipe :</strong>
                    </label>
                    <select
                      id="matchesPerTeam"
                      value={matchesPerTeam}
                      onChange={(e) => setMatchesPerTeam(parseInt(e.target.value))}
                      className="matches-select"
                      disabled={loading}
                    >
                      <option value={1}>1 match par équipe</option>
                      <option value={2}>2 matchs par équipe</option>
                      <option value={3}>3 matchs par équipe</option>
                      <option value={4}>4 matchs par équipe</option>
                      <option value={5}>5 matchs par équipe</option>
                      <option value={6}>6 matchs par équipe</option>
                    </select>
                  </div>

                  <div className="action-buttons">
                    <button
                      className="btn btn--warning"
                      onClick={handleRegenerateMatches}
                      disabled={loading}
                    >
                      {loading ? 'Génération...' : '⚡ Régénérer les Matchs'}
                    </button>
                  </div>
                  <p className="action-description">
                    Génère automatiquement de nouveaux matchs basés sur les équipes actuelles.
                    Chaque équipe jouera exactement {matchesPerTeam} match{matchesPerTeam > 1 ? 's' : ''}, répartis sur les jours disponibles.
                  </p>
                </div>
      </div>

      {/* Informations sur la régénération */}
      <div className="regeneration-info">
        <h4>Comment fonctionne la régénération ?</h4>
        <ul>
          <li>📊 <strong>Analyse des équipes</strong> : Le système récupère toutes les équipes disponibles</li>
          <li>🎯 <strong>Nombre de matchs configurable</strong> : Chaque équipe joue le nombre de matchs sélectionné contre des adversaires différents</li>
          <li>🔄 <strong>Génération intelligente</strong> : Évite les doublons, assure l'équité entre toutes les équipes et empêche qu'une équipe joue plusieurs fois le même jour</li>
          <li>📅 <strong>Répartition temporelle</strong> : Répartit automatiquement les matchs selon le nombre d'équipes. Avec 8 équipes : 3 matchs/jour sur 4 jours. Avec 9 équipes : 3 matchs/jour du lundi au jeudi + 2 matchs le vendredi (14 matchs total).</li>
          <li>⏰ <strong>Créneaux horaires</strong> : Utilise les créneaux 12:00, 13:00, 13:30, 14:00 et 14:30 selon les besoins</li>
          <li>💾 <strong>Sauvegarde automatique</strong> : Les matchs actuels sont automatiquement sauvegardés avant remplacement</li>
        </ul>
      </div>
    </div>
  );
}

export default MatchManagement;
