import React, { createContext, useContext, useState, useEffect } from 'react';

const TournamentContext = createContext();

/**
 * Fournisseur de contexte du tournoi
 * Gère les données des équipes, matchs et classements
 */
export function TournamentProvider({ children }) {
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState({});
  const [rankings, setRankings] = useState([]);
  const [currentDay, setCurrentDay] = useState('lundi');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Charge les équipes depuis l'API
   */
  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teams');
      if (!response.ok) throw new Error('Erreur lors du chargement des équipes');
      
      const data = await response.json();
      setTeams(data);
    } catch (err) {
      setError(err.message);
      console.error('Erreur fetchTeams:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Charge les matchs pour un jour donné
   * @param {string} day - Jour de la semaine
   */
  const fetchMatches = async (day) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/matches/${day}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) throw new Error('Erreur lors du chargement des matchs');
      
      const data = await response.json();
      setMatches(prev => ({
        ...prev,
        [day]: data
      }));
    } catch (err) {
      setError(err.message);
      console.error('Erreur fetchMatches:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Charge le classement depuis l'API
   */
  const fetchRankings = async () => {
    try {
      setLoading(true);
      // Ajouter un paramètre de cache-busting pour forcer le refresh
      const timestamp = Date.now();
      const response = await fetch(`/api/rankings?t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) throw new Error('Erreur lors du chargement du classement');
      
      const data = await response.json();
      console.log('📊 TournamentContext - Données classement reçues:', data);
      setRankings(data);
    } catch (err) {
      setError(err.message);
      console.error('Erreur fetchRankings:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Met à jour un match
   * @param {string} matchId - ID du match
   * @param {Object} matchData - Données du match à mettre à jour
   * @param {Object} authHeaders - Headers d'authentification
   */
  const updateMatch = async (matchId, matchData, authHeaders) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(matchData),
      });

      if (!response.ok) throw new Error('Erreur lors de la mise à jour du match');
      
      // Recharger les données
      await Promise.all([
        fetchTeams(),
        fetchMatches(currentDay),
        fetchRankings()
      ]);
      
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Erreur updateMatch:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Réinitialise un match
   * @param {string} matchId - ID du match
   * @param {Object} authHeaders - Headers d'authentification
   */
  const resetMatch = async (matchId, authHeaders) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/matches/${matchId}/reset`, {
        method: 'POST',
        headers: authHeaders,
      });

      if (!response.ok) throw new Error('Erreur lors de la réinitialisation du match');
      
      // Recharger les données
      await Promise.all([
        fetchTeams(),
        fetchMatches(currentDay),
        fetchRankings()
      ]);
      
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Erreur resetMatch:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Change le jour actuel et charge les matchs correspondants
   * @param {string} day - Nouveau jour
   */
  const changeDay = async (day) => {
    setCurrentDay(day);
    if (!matches[day]) {
      await fetchMatches(day);
    }
  };

  /**
   * Recharge toutes les données
   */
  const refreshData = async () => {
    await Promise.all([
      fetchTeams(),
      fetchMatches(currentDay),
      fetchRankings()
    ]);
  };

  /**
   * Initialise les données au chargement
   */
  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([
          fetchTeams(),
          fetchMatches(currentDay),
          fetchRankings()
        ]);
      } catch (error) {
        console.error('Erreur lors de l\'initialisation des données:', error);
        setError('Erreur lors du chargement des données');
      }
    };

    initializeData();
  }, [currentDay]);

  /**
   * Recharge les matchs quand le jour change
   */
  useEffect(() => {
    if (currentDay && !matches[currentDay]) {
      fetchMatches(currentDay);
    }
  }, [currentDay]);

  const value = {
    // État
    teams,
    matches,
    rankings,
    currentDay,
    loading,
    error,
    
    // Actions
    setCurrentDay,
    changeDay,
    updateMatch,
    resetMatch,
    refreshData,
    fetchTeams,
    fetchMatches,
    fetchRankings,
  };

  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
}

/**
 * Hook pour utiliser le contexte du tournoi
 * @returns {Object} - Valeurs du contexte du tournoi
 */
export function useTournament() {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament doit être utilisé dans un TournamentProvider');
  }
  return context;
}
