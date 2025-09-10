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
   * Authentification simplifiée : mot de passe demandé une seule fois
   */
  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté (session simple)
    const isAdminConnected = localStorage.getItem('admin_connected');
    
    if (isAdminConnected === 'true') {
      // Utilisateur connecté, restaurer la session
      setUser({ username: 'admin', isAdmin: true });
      setToken('admin_session'); // Token simple pour l'interface
      console.log('🔐 Session admin restaurée');
    } else {
      console.log('🔐 Connexion admin requise');
    }
    
    setLoading(false);
  }, []);

  /**
   * Connecte l'utilisateur avec authentification simplifiée
   * @param {string} username - Nom d'utilisateur
   * @param {string} password - Mot de passe
   * @returns {Promise<boolean>} - Succès de la connexion
   */
  const login = async (username, password) => {
    try {
      // Authentification simple : vérifier le mot de passe admin
      if (username === 'admin' && password === '123456') {
        // Connexion réussie, sauvegarder la session
        localStorage.setItem('admin_connected', 'true');
        
        setUser({ username: 'admin', isAdmin: true });
        setToken('admin_session');
        
        console.log('🔐 Connexion admin réussie');
        return true;
      } else {
        console.error('❌ Mot de passe incorrect');
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur de connexion:', error);
      return false;
    }
  };

  /**
   * Déconnecte l'utilisateur
   */
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('admin_connected');
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
   * Obtient les headers pour les requêtes API (authentification simplifiée)
   * @returns {Object} - Headers simples
   */
  const getAuthHeaders = () => {
    // Authentification simplifiée : pas de token requis pour l'API
    return {
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
