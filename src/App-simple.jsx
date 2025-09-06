import React, { useState, useEffect } from 'react';

/**
 * Version simplifiée de l'application pour tester la connexion API
 */
function AppSimple() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teams');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des équipes');
      }
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

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Chargement...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h1>Erreur</h1>
        <p>{error}</p>
        <button onClick={fetchTeams}>Réessayer</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Tournoi MyOrigines - Test Simple</h1>
      <h2>Équipes ({teams.length})</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
        {teams.map(team => (
          <div key={team.id} style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
            <h3>{team.nom}</h3>
            <p>Points: {team.points}</p>
            <p>Buts: {team.buts}</p>
            <p>Gamelles: {team.gamelles}</p>
            <p>Joueurs: {team.joueurs.join(', ')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AppSimple;
