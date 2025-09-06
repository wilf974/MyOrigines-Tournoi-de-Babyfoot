import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTournament } from '../contexts/TournamentContext';

/**
 * Composant de gestion des matchs
 * Permet de sauvegarder, restaurer et régénérer les matchs
 */
function MatchManagement() {
  const { getAuthHeaders } = useAuth();
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
   * Sauvegarde les matchs actuels
   */
  const handleBackupMatches = async () => {
    if (!confirm('Voulez-vous sauvegarder les matchs actuels ?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/matches/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });

      const data = await response.json();

      if (response.ok) {
        showMessage(`✅ ${data.message} (${data.count} matchs sauvegardés)`, 'success');
      } else {
        showMessage(`❌ Erreur: ${data.error}`, 'error');
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      showMessage('❌ Erreur de connexion lors de la sauvegarde', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Restaure les matchs sauvegardés
   */
  const handleRestoreMatches = async () => {
    if (!confirm('Voulez-vous restaurer les matchs sauvegardés ? Cela remplacera les matchs actuels.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/matches/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });

      const data = await response.json();

      if (response.ok) {
        showMessage(`✅ ${data.message} (${data.count} matchs restaurés)`, 'success');
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
          'Content-Type': 'application/json',
          ...getAuthHeaders()
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
          <h3>Sauvegarde & Restauration</h3>
          <div className="action-buttons">
            <button 
              className="btn btn--primary"
              onClick={handleBackupMatches}
              disabled={loading}
            >
              {loading ? 'Sauvegarde...' : '💾 Sauvegarder les Matchs'}
            </button>
            <button 
              className="btn btn--secondary"
              onClick={handleRestoreMatches}
              disabled={loading}
            >
              {loading ? 'Restauration...' : '🔄 Restaurer les Matchs'}
            </button>
          </div>
          <p className="action-description">
            Sauvegardez les matchs actuels ou restaurez une sauvegarde précédente.
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
