import React from 'react';

/**
 * Composant d'affichage du classement
 * Affiche le classement des équipes en temps réel
 */
function Rankings({ rankings, loading }) {
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading"></div>
        <p>Chargement du classement...</p>
      </div>
    );
  }

  if (!rankings || rankings.length === 0) {
    return (
      <div className="no-rankings">
        <p>Aucun classement disponible.</p>
      </div>
    );
  }

  return (
    <div id="live-rankings">
      <table className="ranking-table">
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
          {rankings.map((team, index) => {
            const diff = team.difference || (team.buts - team.gamelles);
            return (
              <tr key={team.id}>
                <td className="ranking-position">{index + 1}</td>
                <td className="team-name-cell">{team.nom}</td>
                <td className="score-cell">{team.points}</td>
                <td>{team.buts}</td>
                <td>{team.gamelles}</td>
                <td className="score-cell">
                  {diff > 0 ? '+' : ''}{diff}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default Rankings;
