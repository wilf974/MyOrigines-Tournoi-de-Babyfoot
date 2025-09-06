import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTournament } from '../contexts/TournamentContext';

/**
 * Composant de gestion des équipes
 * Permet d'ajouter, modifier et supprimer des équipes
 */
function TeamManagement() {
  const { getAuthHeaders } = useAuth();
  const { teams, fetchTeams } = useTournament();
  
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    joueurs: ['', '']
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  /**
   * Réinitialise le formulaire
   */
  const resetForm = () => {
    setFormData({
      nom: '',
      joueurs: ['', '']
    });
    setEditingTeam(null);
    setError(null);
    setSuccess(null);
  };

  /**
   * Gère l'ouverture du formulaire pour une nouvelle équipe
   */
  const handleAddTeam = () => {
    resetForm();
    setShowForm(true);
  };

  /**
   * Gère l'ouverture du formulaire pour modifier une équipe
   * @param {Object} team - Équipe à modifier
   */
  const handleEditTeam = (team) => {
    setFormData({
      nom: team.nom,
      joueurs: [...team.joueurs]
    });
    setEditingTeam(team);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  /**
   * Gère la suppression d'une équipe
   * @param {string} teamId - ID de l'équipe à supprimer
   */
  const handleDeleteTeam = async (teamId) => {
    setLoading(true);
    setError(null);

    try {
      // Première tentative de suppression normale
      const response = await fetch(`/api/teams?id=${teamId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });

      const data = await response.json();

      if (!response.ok) {
        // Si l'équipe a des matchs, proposer la suppression forcée
        if (data.matchCount && data.matchCount > 0) {
          const forceDelete = confirm(
            `Cette équipe a ${data.matchCount} match(s) associé(s).\n\n` +
            `Voulez-vous supprimer l'équipe ET tous ses matchs ?\n\n` +
            `⚠️ Cette action est irréversible !`
          );
          
          if (forceDelete) {
            // Suppression forcée
            const forceResponse = await fetch(`/api/teams?id=${teamId}&forceDelete=true`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
              }
            });

            const forceData = await forceResponse.json();

            if (!forceResponse.ok) {
              throw new Error(forceData.error || 'Erreur lors de la suppression forcée');
            }

            setSuccess(forceData.message);
            await fetchTeams();
          }
          // Si l'utilisateur annule, on ne fait rien
        } else {
          throw new Error(data.error || 'Erreur lors de la suppression');
        }
      } else {
        // Suppression normale réussie
        setSuccess(data.message);
        await fetchTeams();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gère la soumission du formulaire
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nom.trim()) {
      setError('Le nom de l\'équipe est requis');
      return;
    }

    const validJoueurs = formData.joueurs.filter(j => j.trim());
    if (validJoueurs.length === 0) {
      setError('Au moins un joueur est requis');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = editingTeam ? `/api/teams?id=${editingTeam.id}` : '/api/teams';
      const method = editingTeam ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          nom: formData.nom.trim(),
          joueurs: validJoueurs
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      setSuccess(data.message);
      await fetchTeams();
      setShowForm(false);
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gère le changement d'un champ du formulaire
   * @param {string} field - Nom du champ
   * @param {any} value - Nouvelle valeur
   */
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Gère le changement d'un joueur
   * @param {number} index - Index du joueur
   * @param {string} value - Nouveau nom du joueur
   */
  const handlePlayerChange = (index, value) => {
    const newJoueurs = [...formData.joueurs];
    newJoueurs[index] = value;
    setFormData(prev => ({
      ...prev,
      joueurs: newJoueurs
    }));
  };

  /**
   * Ajoute un nouveau champ joueur
   */
  const addPlayer = () => {
    setFormData(prev => ({
      ...prev,
      joueurs: [...prev.joueurs, '']
    }));
  };

  /**
   * Supprime un champ joueur
   * @param {number} index - Index du joueur à supprimer
   */
  const removePlayer = (index) => {
    if (formData.joueurs.length > 1) {
      const newJoueurs = formData.joueurs.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        joueurs: newJoueurs
      }));
    }
  };

  /**
   * Ferme le formulaire
   */
  const handleCloseForm = () => {
    setShowForm(false);
    resetForm();
  };

  return (
    <div className="team-management">
      <div className="team-management-header">
        <h2>Gestion des Équipes</h2>
        <button 
          className="btn btn--primary" 
          onClick={handleAddTeam}
          disabled={loading}
        >
          + Ajouter une équipe
        </button>
      </div>

      {/* Messages de statut */}
      {error && (
        <div className="alert alert--error">
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert--success">
          {success}
        </div>
      )}

      {/* Liste des équipes */}
      <div className="teams-list">
        {teams.map(team => (
          <div key={team.id} className="team-card">
            <div className="team-info">
              <h3>{team.nom}</h3>
              <div className="team-id">ID: {team.id}</div>
              <div className="team-players">
                <strong>Joueurs:</strong>
                <ul>
                  {team.joueurs.map((player, index) => (
                    <li key={index}>{player}</li>
                  ))}
                </ul>
              </div>
              <div className="team-stats">
                <span>Points: {team.points}</span>
                <span>Buts: {team.buts}</span>
                <span>Gamelles: {team.gamelles}</span>
              </div>
            </div>
            <div className="team-actions">
              <button 
                className="btn btn--outline btn--small"
                onClick={() => handleEditTeam(team)}
                disabled={loading}
              >
                Modifier
              </button>
              <button 
                className="btn btn--danger btn--small"
                onClick={() => handleDeleteTeam(team.id)}
                disabled={loading}
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Formulaire modal */}
      {showForm && (
        <div className="modal-overlay" onClick={handleCloseForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTeam ? 'Modifier l\'équipe' : 'Nouvelle équipe'}</h3>
              <button className="modal-close" onClick={handleCloseForm}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="team-form">
              <div className="form-group">
                <label htmlFor="nom">Nom de l'équipe *</label>
                <input
                  type="text"
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => handleInputChange('nom', e.target.value)}
                  placeholder="Ex: Équipe Alpha"
                  required
                />
              </div>

              <div className="form-group">
                <label>Joueurs *</label>
                {formData.joueurs.map((player, index) => (
                  <div key={index} className="player-input-group">
                    <input
                      type="text"
                      value={player}
                      onChange={(e) => handlePlayerChange(index, e.target.value)}
                      placeholder={`Joueur ${index + 1}`}
                      required
                    />
                    {formData.joueurs.length > 1 && (
                      <button
                        type="button"
                        className="btn btn--danger btn--small"
                        onClick={() => removePlayer(index)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn--outline btn--small"
                  onClick={addPlayer}
                >
                  + Ajouter un joueur
                </button>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={handleCloseForm}
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={loading}
                >
                  {loading ? 'Sauvegarde...' : (editingTeam ? 'Modifier' : 'Créer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamManagement;

