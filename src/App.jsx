import React, { useState, useEffect } from 'react';
import './styles.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TournamentProvider } from './contexts/TournamentContext';
import AdminView from './components/AdminView';
import TeamManagement from './components/TeamManagement';
import MatchManagement from './components/MatchManagement';
import CompactRules from './components/CompactRules';

/**
 * Composant principal de l'application MyOrigines Tournoi
 * Interface moderne avec design professionnel
 */
function AppContent() {
  const { user, token, login, logout, isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState('selection');
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [currentDay, setCurrentDay] = useState('lundi');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [adminSelectedDay, setAdminSelectedDay] = useState(() => {
    // Récupérer la date depuis localStorage ou utiliser 'lundi' par défaut
    return localStorage.getItem('adminSelectedDay') || 'lundi';
  });
  const [editingScores, setEditingScores] = useState({
    team1_goals: 0,
    team2_goals: 0,
    team1_gamelles: 0,
    team2_gamelles: 0
  });
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sqliteStatus, setSqliteStatus] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [autoNextDayMessage, setAutoNextDayMessage] = useState('');
  const [adminActiveTab, setAdminActiveTab] = useState('matches');

  // Charger les données au démarrage
  useEffect(() => {
    fetchTeams();
    fetchRankings();
    fetchMatches(currentDay); // Charger les matchs au démarrage
  }, []);

  // Synchroniser adminSelectedDay avec currentDay au démarrage
  useEffect(() => {
    const savedDay = localStorage.getItem('adminSelectedDay');
    if (savedDay && savedDay !== currentDay) {
      console.log(`🔄 Synchronisation: currentDay=${currentDay}, savedDay=${savedDay}`);
      setCurrentDay(savedDay);
      setAdminSelectedDay(savedDay);
    } else {
      setAdminSelectedDay(currentDay);
    }
  }, [currentDay]);

  // Sélectionner automatiquement le premier match quand les matchs sont chargés
  useEffect(() => {
    if (matches.length > 0 && !selectedMatch && isAuthenticated()) {
      // Sélectionner automatiquement le premier match non terminé
      const firstMatch = matches.find(match => !match.finished) || matches[0];
      if (firstMatch) {
        handleMatchSelect(firstMatch);
      }
    }
  }, [matches, isAuthenticated]);

  // Mise à jour de la date toutes les secondes
  useEffect(() => {
    const dateInterval = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    
    return () => clearInterval(dateInterval);
  }, []);

  // Écouter les changements de localStorage pour la synchronisation entre onglets
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'adminSelectedDay' && e.newValue) {
        console.log(`🔄 Changement localStorage détecté: ${e.newValue}`);
        setAdminSelectedDay(e.newValue);
        if (currentView === 'admin') {
          setCurrentDay(e.newValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentView]);

  // Auto-refresh pour la vitrine live - affichage du match en cours
  useEffect(() => {
    if (currentView === 'display') {
      console.log(`📺 Vitrine: Chargement du match en cours`);
      // Effacer le message de passage automatique quand on accède à la vitrine
      setAutoNextDayMessage('');
      
      // Rafraîchissement immédiat au chargement - tous les matchs
      fetchAllMatches(false);
      fetchRankings();
      testSQLiteConnection(); // Test de la connexion SQLite
      setLastUpdate(new Date());
      
      // Puis rafraîchissement automatique toutes les 3 secondes
      const interval = setInterval(() => {
        fetchAllMatches(true);
        fetchRankings();
        setLastUpdate(new Date());
      }, 3000); // Refresh optimisé (3 secondes)
      
      return () => clearInterval(interval);
    }
  }, [currentView]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teams');
      if (!response.ok) throw new Error('Erreur lors du chargement des équipes');
      const data = await response.json();
      setTeams(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Erreur fetchTeams:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllMatches = async (isAutoRefresh = false) => {
    try {
      if (!isAutoRefresh) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      // Récupérer tous les matchs de tous les jours
      const allMatches = [];
      const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
      
      for (const day of days) {
        const response = await fetch(`/api/matches/${day}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        if (response.ok) {
          const dayMatches = await response.json();
          allMatches.push(...dayMatches);
        }
      }
      
      console.log('📊 App.jsx - Tous les matchs reçus:', allMatches);
      setMatches(allMatches);
      setError(null);
      
    } catch (err) {
      setError(err.message);
      console.error('Erreur fetchAllMatches:', err);
    } finally {
      if (!isAutoRefresh) {
        setLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  };

  const fetchMatches = async (day = 'lundi', isAutoRefresh = false) => {
    try {
      if (!isAutoRefresh) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      const response = await fetch(`/api/matches/${day}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) {
        if (response.status === 0 || !response.status) {
          throw new Error('Impossible de se connecter au serveur. Vérifiez que le serveur API est démarré sur le port 2001.');
        }
        throw new Error(`Erreur serveur: ${response.status} - ${response.statusText}`);
      }
      const data = await response.json();
      console.log('📊 App.jsx - Données matchs reçues:', data);
      setMatches(data);
      setError(null);
      
      // Logique de passage automatique supprimée - la vitrine se synchronise avec l'admin
    } catch (err) {
      setError(err.message);
      console.error('Erreur fetchMatches:', err);
    } finally {
      if (!isAutoRefresh) {
        setLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  };

  // Fonction checkAndMoveToNextDay supprimée - remplacée par checkAndMoveToNextDayWithData

  // Fonction checkAndMoveToNextDayWithData supprimée - la vitrine se synchronise avec l'admin

  /**
   * Trouve le match en cours (premier match non terminé)
   * @returns {Object|null} Le match en cours ou null si tous sont terminés
   */
  const getCurrentMatch = () => {
    if (!matches || matches.length === 0) return null;
    
    // Trier les matchs par jour et heure
    const sortedMatches = [...matches].sort((a, b) => {
      const dayOrder = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
      const dayDiff = dayOrder.indexOf(a.jour) - dayOrder.indexOf(b.jour);
      if (dayDiff !== 0) return dayDiff;
      return a.heure.localeCompare(b.heure);
    });
    
    // Trouver le premier match non terminé
    return sortedMatches.find(match => !match.finished) || null;
  };

  /**
   * Trouve les matchs terminés récents (derniers 3 matchs terminés)
   * @returns {Array} Les matchs terminés récents
   */
  const getRecentFinishedMatches = () => {
    if (!matches || matches.length === 0) return [];
    
    // Trier les matchs terminés par jour et heure
    const finishedMatches = matches
      .filter(match => match.finished)
      .sort((a, b) => {
        const dayOrder = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
        const dayDiff = dayOrder.indexOf(a.jour) - dayOrder.indexOf(b.jour);
        if (dayDiff !== 0) return dayDiff;
        return a.heure.localeCompare(b.heure);
      });
    
    // Retourner les 3 derniers matchs terminés
    return finishedMatches.slice(-3);
  };

  const fetchRankings = async () => {
    try {
      // Ajouter un paramètre de cache-busting pour forcer le refresh
      const timestamp = Date.now();
      const response = await fetch(`/api/rankings?t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) {
        if (response.status === 0 || !response.status) {
          throw new Error('Impossible de se connecter au serveur pour le classement.');
        }
        throw new Error(`Erreur serveur classement: ${response.status}`);
      }
      const data = await response.json();
      console.log('📊 Données classement reçues:', data);
      setRankings(data);
    } catch (err) {
      console.error('Erreur fetchRankings:', err);
      // Ne pas afficher l'erreur pour le classement si c'est un problème de connexion
      if (!err.message.includes('Impossible de se connecter')) {
        setError(err.message);
      }
    }
  };

  /**
   * Teste la connexion SQLite et affiche le statut
   */
  const testSQLiteConnection = async () => {
    try {
      const response = await fetch('/api/sqlite-status');
      if (!response.ok) {
        if (response.status === 0 || !response.status) {
          throw new Error('Serveur API non accessible. Démarrez le serveur avec: node server.js');
        }
        throw new Error(`Erreur serveur: ${response.status} - ${response.statusText}`);
      }
      const data = await response.json();
      console.log('📊 Statut SQLite:', data);
      setSqliteStatus(data);
      return data;
    } catch (err) {
      console.error('❌ Erreur test SQLite:', err.message);
      // Ne pas afficher l'erreur dans l'interface si c'est un problème de serveur
      if (!err.message.includes('Serveur API non accessible')) {
        setError(err.message);
      }
      setSqliteStatus({ status: 'ERROR', message: err.message });
      return null;
    }
  };

  const handleViewChange = (view) => {
    if (view === 'admin') {
      if (isAuthenticated()) {
        setCurrentView('admin');
      } else {
        setShowLogin(true);
      }
    } else if (view === 'display') {
      fetchMatches(currentDay, false);
      setCurrentView(view);
    } else {
      setCurrentView(view);
    }
  };

  const handleLogin = async () => {
    try {
      const success = await login('admin', password);
      if (success) {
        setShowLogin(false);
        setCurrentView('admin');
        setPassword('');
        setError(null);
        fetchMatches(currentDay);
      } else {
        setError('Mot de passe incorrect');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    // Nettoyer le timeout de sauvegarde automatique
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
      setAutoSaveTimeout(null);
    }
    
    logout();
    setCurrentView('selection');
    setSelectedMatch(null);
    setIsAutoSaving(false);
  };

  const handleBackToSelection = () => {
    setCurrentView('selection');
    setSelectedMatch(null);
  };

  const handleDayChange = (day) => {
    console.log(`🔄 Changement de jour: ${currentDay} → ${day}`);
    setCurrentDay(day);
    setAdminSelectedDay(day); // Mettre à jour la date sélectionnée par l'admin
    localStorage.setItem('adminSelectedDay', day); // Sauvegarder dans localStorage
    setAutoNextDayMessage(''); // Effacer le message de passage automatique
    fetchMatches(day, false);
    console.log(`✅ adminSelectedDay mis à jour vers: ${day} et sauvegardé dans localStorage`);
  };

  const handleMatchSelect = (match) => {
    // Nettoyer le timeout de sauvegarde automatique précédent
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
      setAutoSaveTimeout(null);
    }
    
    setSelectedMatch(match);
    setEditingScores({
      team1_goals: match.team1_goals || 0,
      team2_goals: match.team2_goals || 0,
      team1_gamelles: match.team1_gamelles || 0,
      team2_gamelles: match.team2_gamelles || 0
    });
    setIsAutoSaving(false);
  };

  /**
   * Met à jour un score et déclenche la sauvegarde automatique
   * @param {string} field - Le champ à modifier (team1_goals, team2_goals, etc.)
   * @param {number} delta - La variation du score (+1 ou -1)
   */
  const updateScore = (field, delta) => {
    const newScores = {
      ...editingScores,
      [field]: Math.max(0, editingScores[field] + delta)
    };
    
    setEditingScores(newScores);
    
    // Déclencher la sauvegarde automatique avec debounce
    if (selectedMatch) {
      autoSaveScores(newScores);
    }
  };

  /**
   * Sauvegarde automatique des scores avec debounce (500ms)
   * @param {Object} scores - Les scores à sauvegarder
   */
  const autoSaveScores = (scores) => {
    // Annuler la sauvegarde précédente si elle existe
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    // Programmer une nouvelle sauvegarde
    const timeout = setTimeout(async () => {
      await performAutoSave(scores);
    }, 500); // Attendre 500ms après le dernier changement

    setAutoSaveTimeout(timeout);
  };

  /**
   * Effectue la sauvegarde automatique en base de données
   * @param {Object} scores - Les scores à sauvegarder
   */
  const performAutoSave = async (scores) => {
    if (!selectedMatch) return;
    
    // Pour la vitrine, on n'a pas besoin d'authentification
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      setIsAutoSaving(true);
      
      const response = await fetch(`/api/matches/${selectedMatch.id}`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({
          team1_goals: scores.team1_goals,
          team2_goals: scores.team2_goals,
          team1_gamelles: scores.team1_gamelles,
          team2_gamelles: scores.team2_gamelles,
          finished: selectedMatch.finished || false
        })
      });
      
      if (!response.ok) throw new Error('Erreur lors de la sauvegarde automatique');
      
      // Mettre à jour les données locales
      const updatedMatch = { ...selectedMatch, ...scores };
      setMatches(prev => prev.map(match => 
        match.id === selectedMatch.id 
          ? updatedMatch
          : match
      ));
      
      // Mettre à jour le match sélectionné
      setSelectedMatch(updatedMatch);
      
      // Rafraîchir le classement
      await fetchRankings();
      setLastUpdate(new Date());
      
    } catch (err) {
      console.error('Erreur sauvegarde automatique:', err);
      // Ne pas afficher l'erreur à l'utilisateur pour la sauvegarde auto
    } finally {
      setIsAutoSaving(false);
    }
  };

  const saveScores = async () => {
    if (!selectedMatch) return;
    
    console.log('🎯 App.jsx - saveScores appelée pour le match:', selectedMatch.id);
    console.log('🎯 App.jsx - Scores à sauvegarder:', editingScores);
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/matches/${selectedMatch.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          team1_goals: editingScores.team1_goals,
          team2_goals: editingScores.team2_goals,
          team1_gamelles: editingScores.team1_gamelles,
          team2_gamelles: editingScores.team2_gamelles,
          finished: true
        })
      });
      
      if (!response.ok) throw new Error('Erreur lors de la validation');
      
      // Mettre à jour les données locales avec le statut finished
      const updatedMatch = { ...selectedMatch, ...editingScores, finished: true };
      setMatches(prev => prev.map(match => 
        match.id === selectedMatch.id 
          ? updatedMatch
          : match
      ));
      
      // Mettre à jour le match sélectionné
      setSelectedMatch(updatedMatch);
      
      // Rafraîchir le classement et les matchs
      await fetchRankings();
      await fetchMatches(currentDay); // Recharger les matchs pour s'assurer de la synchronisation
      setLastUpdate(new Date());
      
      // Message de succès
      setError(null);
      
      // Optionnel : Désélectionner le match après validation
      setTimeout(() => {
        setSelectedMatch(null);
      }, 1000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remet à zéro tous les scores et le classement
   */
  const resetAllScores = async () => {
    try {
      setIsResetting(true);
      setError(null);
      
      const response = await fetch('/api/reset-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Erreur lors de la réinitialisation');
      
      const result = await response.json();
      console.log('✅ Réinitialisation réussie:', result);
      
      // Remettre le jour à lundi après la remise à zéro
      setCurrentDay('lundi');
      
      // Rafraîchir toutes les données
      await Promise.all([
        fetchMatches('lundi'), // Forcer le chargement du lundi
        fetchRankings(),
        fetchTeams()
      ]);
      
      // Réinitialiser l'état local
      setSelectedMatch(null);
      setEditingScores({
        team1_goals: 0,
        team2_goals: 0,
        team1_gamelles: 0,
        team2_gamelles: 0
      });
      setLastUpdate(new Date());
      
      // Fermer la modal de confirmation
      setShowResetConfirm(false);
      
    } catch (err) {
      setError(err.message);
      console.error('❌ Erreur réinitialisation:', err);
    } finally {
      setIsResetting(false);
    }
  };


  const formatTime = (date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getDayName = (day) => {
    const days = {
      'lundi': 'Lundi',
      'mardi': 'Mardi', 
      'mercredi': 'Mercredi',
      'jeudi': 'Jeudi'
    };
    return days[day] || day;
  };

  return (
    <div className="App">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1 className="app-title">MyOrigines - Tournoi de Babyfoot</h1>
          </div>
          {currentView === 'display' && (
            <div className="live-indicator">
              <div className="live-dot"></div>
              {isRefreshing ? 'Mise à jour...' : 'LIVE'}
            </div>
          )}
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <div className="error-title">⚠️ Erreur de connexion</div>
          <div className="error-details">{error}</div>
          {error.includes('Impossible de se connecter') && (
            <div className="error-help">
              <strong>Solution :</strong> Démarrez le serveur API avec la commande : <code>node server.js</code>
            </div>
          )}
        </div>
      )}

      {/* Selection View */}
      {currentView === 'selection' && (
        <div className="selection-container">
          <div className="selection-cards">
            <div className="selection-card admin" onClick={() => handleViewChange('admin')}>
              <div className="card-icon">⚙️</div>
              <h3 className="card-title">Interface Admin</h3>
              <p className="card-description">
                Gestion des scores et matchs en temps réel
              </p>
              <button className="card-button">Accéder</button>
            </div>
            
            <div className="selection-card live" onClick={() => handleViewChange('display')}>
              <div className="card-icon">📺</div>
              <h3 className="card-title">Vitrine Live</h3>
              <p className="card-description">
                Affichage public des scores mis à jour automatiquement
              </p>
              <button className="card-button">Accéder</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Interface */}
      {currentView === 'admin' && isAuthenticated() && (
        <div className="admin-container">
          <div className="d-flex justify-between align-center mb-3">
            <h2>MyOrigines - Interface Admin</h2>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-danger" 
                onClick={() => setShowResetConfirm(true)}
                title="Remettre à zéro tous les scores et le classement"
              >
                🔄 Remise à zéro
              </button>
              <button className="btn btn-secondary" onClick={handleLogout}>
                Déconnexion
              </button>
              <button className="btn btn-secondary" onClick={handleBackToSelection}>
                Retour
              </button>
            </div>
          </div>
          
          <div className="d-flex align-center gap-2 mb-3">
            <span>Mise à jour en temps réel</span>
            <div className="live-dot"></div>
          </div>

          {/* Onglets de navigation admin */}
          <div className="admin-tabs mb-3">
            <button 
              className={`admin-tab ${adminActiveTab === 'matches' ? 'active' : ''}`}
              onClick={() => setAdminActiveTab('matches')}
            >
              Gestion des Matchs
            </button>
            <button 
              className={`admin-tab ${adminActiveTab === 'match-management' ? 'active' : ''}`}
              onClick={() => setAdminActiveTab('match-management')}
            >
              Organisation des Matchs
            </button>
            <button 
              className={`admin-tab ${adminActiveTab === 'teams' ? 'active' : ''}`}
              onClick={() => setAdminActiveTab('teams')}
            >
              Gestion des Équipes
            </button>
          </div>

          {/* Contenu des onglets */}
          {adminActiveTab === 'matches' && (
            <div className="admin-grid">
            {/* Planning des Matchs */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Planning des Matchs</h3>
              </div>
              
              <div className="day-tabs">
                {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'].map(day => (
                  <button
                    key={day}
                    className={`day-tab ${currentDay === day ? 'active' : ''}`}
                    onClick={() => handleDayChange(day)}
                  >
                    {getDayName(day)}
                  </button>
                ))}
              </div>

              <div className="match-list">
                {loading ? (
                  <div className="loading">
                    <div className="spinner"></div>
                    Chargement...
                  </div>
                ) : (
                  matches.map(match => (
                    <div
                      key={match.id}
                      className={`match-item ${match.finished ? 'finished' : ''} ${selectedMatch?.id === match.id ? 'selected' : ''}`}
                      onClick={() => !match.finished && handleMatchSelect(match)}
                    >
                      <div className="match-time">{match.heure}</div>
                      <div className="match-teams">
                        <span className="team-name">{match.team1_nom}</span>
                        <span className="match-score">
                          {Math.max(0, match.team1_goals - match.team2_gamelles)} - {Math.max(0, match.team2_goals - match.team1_gamelles)}
                        </span>
                        <span className="team-name">{match.team2_nom}</span>
                      </div>
                      <div className="match-players">
                        {match.team1_joueurs.join(' & ')} vs {match.team2_joueurs.join(' & ')}
                      </div>
                      {match.finished && (
                        <div className="match-status">
                          <span className="status-badge finished">✓ Terminé</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Gestion des Scores */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Gestion des Scores</h3>
              </div>
              
              {selectedMatch ? (
                <div className="score-management">
                  <h4>{selectedMatch.team1_nom} vs {selectedMatch.team2_nom}</h4>
                  <p className="text-center mb-3">{selectedMatch.heure}</p>
                  
                  {/* Indicateur de sauvegarde automatique */}
                  {isAutoSaving && (
                    <div className="auto-save-indicator">
                      <div className="spinner-small"></div>
                      <span>Sauvegarde automatique en cours...</span>
                    </div>
                  )}
                  
                  {/* Scores */}
                  <div className="score-section">
                    <h5 className="score-section-title">Scores</h5>
                    <div className="score-controls">
                      <div className="score-team">
                        <div className="team-label">{selectedMatch.team1_nom}</div>
                        <div className="score-input-group">
                          <button 
                            className="score-btn score-btn-minus"
                            onClick={() => updateScore('team1_goals', -1)}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            className="score-input"
                            value={editingScores.team1_goals}
                            min="0"
                            max="99"
                            readOnly
                          />
                          <button 
                            className="score-btn score-btn-plus"
                            onClick={() => updateScore('team1_goals', 1)}
                          >
                            +
                          </button>
                        </div>
                        <div className="score-final">
                          Final: <span className="final-score">{Math.max(0, editingScores.team1_goals - editingScores.team2_gamelles)}</span>
                        </div>
                      </div>
                      
                      <span className="score-separator">-</span>
                      
                      <div className="score-team">
                        <div className="team-label">{selectedMatch.team2_nom}</div>
                        <div className="score-input-group">
                          <button 
                            className="score-btn score-btn-minus"
                            onClick={() => updateScore('team2_goals', -1)}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            className="score-input"
                            value={editingScores.team2_goals}
                            min="0"
                            max="99"
                            readOnly
                          />
                          <button 
                            className="score-btn score-btn-plus"
                            onClick={() => updateScore('team2_goals', 1)}
                          >
                            +
                          </button>
                        </div>
                        <div className="score-final">
                          Final: <span className="final-score">{Math.max(0, editingScores.team2_goals - editingScores.team1_gamelles)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gamelles */}
                  <div className="score-section">
                    <h5 className="score-section-title">Gamelles</h5>
                    <p className="gamelles-explanation">
                      Les gamelles d'une équipe réduisent le score de l'adversaire (-1 point par gamelle)
                    </p>
                    <div className="score-controls">
                      <div className="score-team">
                        <div className="team-label">{selectedMatch.team1_nom}</div>
                        <div className="score-input-group">
                          <button 
                            className="score-btn score-btn-minus"
                            onClick={() => updateScore('team1_gamelles', -1)}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            className="score-input"
                            value={editingScores.team1_gamelles}
                            min="0"
                            max="99"
                            readOnly
                          />
                          <button 
                            className="score-btn score-btn-plus"
                            onClick={() => updateScore('team1_gamelles', 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      <span className="score-separator">-</span>
                      
                      <div className="score-team">
                        <div className="team-label">{selectedMatch.team2_nom}</div>
                        <div className="score-input-group">
                          <button 
                            className="score-btn score-btn-minus"
                            onClick={() => updateScore('team2_gamelles', -1)}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            className="score-input"
                            value={editingScores.team2_gamelles}
                            min="0"
                            max="99"
                            readOnly
                          />
                          <button 
                            className="score-btn score-btn-plus"
                            onClick={() => updateScore('team2_gamelles', 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="score-buttons">
                    <button 
                      className="btn btn-success btn-lg" 
                      onClick={saveScores}
                      disabled={loading}
                    >
                      {loading ? 'Validation...' : 'Valider la victoire'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="score-management">
                  <div className="no-match-selected">
                    <div className="info-icon">ℹ️</div>
                    <h4>Comment modifier les scores :</h4>
                    <ol>
                      <li><strong>Cliquez sur un match</strong> dans le planning à gauche</li>
                      <li>Le match sélectionné apparaîtra ici</li>
                      <li>Utilisez les boutons + et - pour modifier les scores</li>
                      <li>Les scores se sauvegardent automatiquement</li>
                    </ol>
                    <p className="help-text">💡 <strong>Astuce :</strong> Le premier match est sélectionné automatiquement</p>
                  </div>
                </div>
              )}
            </div>

            {/* Classement Temps Réel */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Classement Temps Réel</h3>
              </div>
              
              <div className="rankings-container">
                <table className="rankings-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Équipe</th>
                      <th>Pts</th>
                      <th>Buts</th>
                      <th>Gamelles</th>
                      <th>Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((team, index) => (
                      <tr key={team.id}>
                        <td className="rank-number">{index + 1}</td>
                        <td className="team-name-cell">{team.nom}</td>
                        <td>{team.points || 0}</td>
                        <td>{team.buts || 0}</td>
                        <td>{team.gamelles || 0}</td>
                        <td>{team.difference || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          )}

          {/* Onglet Organisation des Matchs */}
          {adminActiveTab === 'match-management' && (
            <div className="match-management-section">
              <AuthProvider>
                <TournamentProvider>
                  <MatchManagement />
                </TournamentProvider>
              </AuthProvider>
            </div>
          )}

          {/* Onglet Gestion des Équipes */}
          {adminActiveTab === 'teams' && (
            <div className="teams-management-section">
              <AuthProvider>
                <TournamentProvider>
                  <TeamManagement />
                </TournamentProvider>
              </AuthProvider>
            </div>
          )}

        </div>
      )}

      {/* Live Display */}
      {currentView === 'display' && (
        <div className="live-container">
          <div className="live-header">
            <div className="live-header-content">
              <div></div>
              <button className="btn btn-secondary" onClick={handleBackToSelection}>
                Retour
              </button>
            </div>
            <div className="live-rules-section">
              <CompactRules />
            </div>
          </div>

          <div className="live-grid">
            {/* Match en cours et résultats */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Match en cours et résultats</h3>
                {isRefreshing && (
                  <div className="refresh-indicator">
                    <div className="spinner-small"></div>
                    <span>Mise à jour...</span>
                  </div>
                )}
              </div>
              
              {/* Message de passage automatique au jour suivant */}
              {autoNextDayMessage && (
                <div className="auto-next-day-message">
                  <div className="message-content">
                    <span className="message-icon">🔄</span>
                    <span className="message-text">{autoNextDayMessage}</span>
                  </div>
                  <div className="debug-info">
                    <small>
                      Jour affiché: {currentDay} | 
                      Date: {currentDate.toLocaleDateString('fr-FR')} | 
                      Heure: {currentDate.toLocaleTimeString('fr-FR')} |
                      Matchs: {matches.length} | 
                      Terminés: {matches.filter(m => m.finished).length}
                    </small>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="loading">
                  <div className="spinner"></div>
                  Chargement...
                </div>
              ) : error ? (
                <div className="error">
                  <span className="error-icon">⚠️</span>
                  {error}
                </div>
              ) : (
                <div className="current-match-container">
                  {/* Match en cours */}
                  {(() => {
                    const currentMatch = getCurrentMatch();
                    if (currentMatch) {
                      return (
                        <div className="current-match-section">
                          <div className="section-title">
                            <span className="live-indicator">🔴</span>
                            Match en cours - {getDayName(currentMatch.jour)} {currentMatch.heure}
                          </div>
                          <div className="match-item current">
                            <div className="match-teams">
                              <div className="team">
                                <span className="team-name">{currentMatch.team1_nom}</span>
                                <span className="team-players">
                                  {currentMatch.team1_joueurs.join(' & ')}
                                </span>
                              </div>
                              <div className="match-score">
                                <span className="score">
                                  {Math.max(0, currentMatch.team1_goals - currentMatch.team2_gamelles)} - {Math.max(0, currentMatch.team2_goals - currentMatch.team1_gamelles)}
                                </span>
                                <span className="match-status live">EN COURS</span>
                              </div>
                              <div className="team">
                                <span className="team-name">{currentMatch.team2_nom}</span>
                                <span className="team-players">
                                  {currentMatch.team2_joueurs.join(' & ')}
                                </span>
                              </div>
                            </div>
                            
                            {/* Affichage des gamelles pour le match en cours */}
                            {(currentMatch.team1_goals > 0 || currentMatch.team2_goals > 0 || currentMatch.team1_gamelles > 0 || currentMatch.team2_gamelles > 0) && (
                              <div className="match-details current-match-details">
                                <div className="detail-item">
                                  <span className="detail-label">Buts marqués:</span>
                                  <span className="detail-value">{currentMatch.team1_goals} - {currentMatch.team2_goals}</span>
                                </div>
                                <div className="detail-item">
                                  <span className="detail-label">Gamelles:</span>
                                  <span className="detail-value">{currentMatch.team1_gamelles} - {currentMatch.team2_gamelles}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="current-match-section">
                          <div className="section-title">
                            <span className="finished-indicator">🏁</span>
                            Tous les matchs sont terminés
                          </div>
                        </div>
                      );
                    }
                  })()}

                  {/* Résultats récents */}
                  {(() => {
                    const recentMatches = getRecentFinishedMatches();
                    if (recentMatches.length > 0) {
                      return (
                        <div className="recent-results-section">
                          <div className="section-title">
                            <span className="results-icon">📊</span>
                            Résultats récents
                          </div>
                          <div className="matches-list">
                            {recentMatches.map((match) => {
                              const team1Final = Math.max(0, match.team1_goals - match.team2_gamelles);
                              const team2Final = Math.max(0, match.team2_goals - match.team1_gamelles);
                              
                              return (
                                <div key={match.id} className="match-item finished">
                                  <div className="match-header">
                                    <span className="match-day">{getDayName(match.jour)}</span>
                                    <span className="match-time">{match.heure}</span>
                                  </div>
                                  <div className="match-teams">
                                    <div className="team">
                                      <span className="team-name">{match.team1_nom}</span>
                                      <span className="team-players">
                                        {match.team1_joueurs.join(' & ')}
                                      </span>
                                    </div>
                                    <div className="match-score">
                                      <span className="score">{team1Final} - {team2Final}</span>
                                      <span className="match-status finished">✓ TERMINÉ</span>
                                    </div>
                                    <div className="team">
                                      <span className="team-name">{match.team2_nom}</span>
                                      <span className="team-players">
                                        {match.team2_joueurs.join(' & ')}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="match-details">
                                    <div className="detail-item">
                                      <span className="detail-label">Buts marqués:</span>
                                      <span className="detail-value">{match.team1_goals} - {match.team2_goals}</span>
                                    </div>
                                    <div className="detail-item">
                                      <span className="detail-label">Gamelles:</span>
                                      <span className="detail-value">{match.team1_gamelles} - {match.team2_gamelles}</span>
                                    </div>
                                    <div className="detail-item">
                                      <span className="detail-label">Score final:</span>
                                      <span className="detail-value">{team1Final} - {team2Final}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>

            {/* Classement Général */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Classement Général</h3>
              </div>
              
              <div className="rankings-container">
                <table className="rankings-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Équipe</th>
                      <th>Pts</th>
                      <th>Buts</th>
                      <th>Gamelles</th>
                      <th>Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((team, index) => (
                      <tr key={team.id}>
                        <td className="rank-number">{index + 1}</td>
                        <td className="team-name-cell">{team.nom}</td>
                        <td>{team.points || 0}</td>
                        <td>{team.buts || 0}</td>
                        <td>{team.gamelles || 0}</td>
                        <td>{team.difference || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLogin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Connexion Admin</h3>
            </div>
            
            <div className="form-group">
              <label className="form-label">Mot de passe :</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Entrez le mot de passe admin"
                autoFocus
              />
            </div>
            
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleLogin}>
                Se connecter
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowLogin(false);
                  setPassword('');
                  setError(null);
                }}
              >
                Annuler
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">⚠️ Confirmation de remise à zéro</h3>
            </div>
            
            <div className="form-group">
              <div className="warning-message">
                <div className="warning-icon">🚨</div>
                <div className="warning-content">
                  <h4>Attention ! Cette action est irréversible</h4>
                  <p>Vous êtes sur le point de remettre à zéro :</p>
                  <ul>
                    <li><strong>Tous les scores</strong> de tous les matchs</li>
                    <li><strong>Toutes les gamelles</strong> de tous les matchs</li>
                    <li><strong>Le classement complet</strong> de toutes les équipes</li>
                    <li><strong>Toutes les statistiques</strong> (points, buts, gamelles)</li>
                  </ul>
                  <p className="warning-text">
                    <strong>Cette action ne peut pas être annulée !</strong>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn btn-danger" 
                onClick={resetAllScores}
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <div className="spinner-small"></div>
                    Réinitialisation...
                  </>
                ) : (
                  '🔄 Confirmer la remise à zéro'
                )}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
              >
                Annuler
              </button>
            </div>
            
            <div className="text-center mt-3">
              <small className="text-muted">
                Assurez-vous d'avoir sauvegardé les données importantes avant de continuer
              </small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Composant App principal avec les providers
 */
function App() {
  return (
    <AuthProvider>
      <TournamentProvider>
        <AppContent />
      </TournamentProvider>
    </AuthProvider>
  );
}

export default App;