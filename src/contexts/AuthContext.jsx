import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

/**
 * Fournisseur de contexte d'authentification
 * Gère l'état de connexion et les tokens
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Vérifie si l'utilisateur est connecté au chargement
   */
  useEffect(() => {
    // TEMPORAIRE: Forcer la déconnexion pour résoudre le problème d'authentification
    // Supprimer les tokens existants pour forcer la reconnexion
    localStorage.removeItem('tournoi_token');
    localStorage.removeItem('tournoi_user');
    console.log('🔐 Tokens supprimés pour forcer la reconnexion');
    
    // Vérifier si un token existe dans le localStorage
    const savedToken = localStorage.getItem('tournoi_token');
    const savedUser = localStorage.getItem('tournoi_user');
    
    if (savedToken && savedUser) {
      try {
        // Vérifier si le token est encore valide
        const tokenData = JSON.parse(atob(savedToken.split('.')[1]));
        const currentTime = Date.now() / 1000;
        
        if (tokenData.exp && tokenData.exp > currentTime) {
          // Token valide, restaurer la session
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          console.log('🔐 Session restaurée depuis le localStorage');
        } else {
          // Token expiré, nettoyer
          localStorage.removeItem('tournoi_token');
          localStorage.removeItem('tournoi_user');
          console.log('🔐 Token expiré, reconnexion requise');
        }
      } catch (error) {
        // Token invalide, nettoyer
        localStorage.removeItem('tournoi_token');
        localStorage.removeItem('tournoi_user');
        console.log('🔐 Token invalide, reconnexion requise');
      }
    } else {
      console.log('🔐 Aucune session sauvegardée, connexion requise');
    }
    
    setLoading(false);
  }, []);

  /**
   * Connecte l'utilisateur
   * @param {string} username - Nom d'utilisateur
   * @param {string} password - Mot de passe
   * @returns {Promise<boolean>} - Succès de la connexion
   */
  const login = async (username, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Identifiants invalides');
      }

      const data = await response.json();
      
      setToken(data.token);
      setUser(data.user);
      
      // Sauvegarder en localStorage
      localStorage.setItem('tournoi_token', data.token);
      localStorage.setItem('tournoi_user', JSON.stringify(data.user));
      
      return true;
    } catch (error) {
      console.error('Erreur de connexion:', error);
      return false;
    }
  };

  /**
   * Déconnecte l'utilisateur
   */
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('tournoi_token');
    localStorage.removeItem('tournoi_user');
    console.log('🔐 Utilisateur déconnecté');
  };

  /**
   * Vérifie si l'utilisateur est authentifié
   * @returns {boolean}
   */
  const isAuthenticated = () => {
    return !!token && !!user;
  };

  /**
   * Obtient les headers d'authentification pour les requêtes API
   * @returns {Object} - Headers avec token
   */
  const getAuthHeaders = () => {
    if (!token) {
      console.log('🔐 Aucun token disponible');
      return {
        'Content-Type': 'application/json',
      };
    }

    // Vérifier si le token est encore valide
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      if (tokenData.exp && tokenData.exp <= currentTime) {
        // Token expiré, déconnecter l'utilisateur
        console.log('🔐 Token expiré lors de la requête, déconnexion automatique');
        logout();
        return {
          'Content-Type': 'application/json',
        };
      }
    } catch (error) {
      // Token invalide, déconnecter l'utilisateur
      console.log('🔐 Token invalide lors de la requête, déconnexion automatique');
      logout();
      return {
        'Content-Type': 'application/json',
      };
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated,
    getAuthHeaders,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook pour utiliser le contexte d'authentification
 * @returns {Object} - Valeurs du contexte d'authentification
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
}
