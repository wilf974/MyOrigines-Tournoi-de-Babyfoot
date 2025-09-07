import React from 'react';

/**
 * Composant compact pour afficher les règles dans la barre du haut
 * Version simplifiée pour la vitrine live
 */
function CompactRules({ rules = null }) {
  // Règles par défaut
  const defaultRules = [
    { icon: '⚽', title: 'Gamelle = -1 point' },
    { icon: '🚫', title: 'Les demis ne comptent pas' },
    { icon: '⚡', title: 'Pas de tirs « pissette »' },
    { icon: '🏆', title: 'Points = Buts - Gamelles adverses' },
    { icon: '🎯', title: '3 matchs par équipe' }
  ];

  const currentRules = rules || defaultRules;

  return (
    <div className="compact-rules">
      <div className="compact-rules-label">Règles :</div>
      <div className="compact-rules-list">
        {currentRules.map((rule, index) => (
          <div key={rule.id || index} className="compact-rule-item">
            <span className="compact-rule-icon">{rule.icon}</span>
            <span className="compact-rule-text">{rule.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CompactRules;
