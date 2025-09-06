import React from 'react';

/**
 * Composant de la vue de sélection
 * Affiche les options pour accéder à l'interface admin ou à la vitrine
 */
function SelectionView({ onViewChange }) {
  return (
    <div id="selection-view" className="view active">
      <div className="container">
        <div className="selection-container">
          <div className="logo-section">
            <h1 className="main-title">MyOrigines</h1>
            <h2 className="subtitle">Tournoi de Babyfoot</h2>
            <div className="live-badge">
              <span className="live-dot"></span>
              LIVE
            </div>
          </div>
          
          <div className="selection-cards">
            <div className="selection-card" id="admin-card">
              <div className="card-icon">⚙️</div>
              <h3>Interface Admin</h3>
              <p>Gestion des scores et matchs en temps réel</p>
              <button 
                className="btn btn--primary" 
                onClick={() => onViewChange('admin')}
              >
                Accéder
              </button>
            </div>
            
            <div className="selection-card" id="display-card">
              <div className="card-icon">📺</div>
              <h3>Vitrine Live</h3>
              <p>Affichage public des scores mis à jour automatiquement</p>
              <button 
                className="btn btn--primary" 
                onClick={() => onViewChange('display')}
              >
                Accéder
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SelectionView;
