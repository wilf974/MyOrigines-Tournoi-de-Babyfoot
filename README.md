# Tournoi de Babyfoot MyOrigines

Application de gestion de tournoi de babyfoot en temps réel avec interface React et base de données SQLite.

## 🚀 Fonctionnalités

- **Interface Admin** : Gestion des scores et matchs en temps réel
- **Vitrine Live** : Affichage public des scores mis à jour automatiquement
- **Base de données SQLite** : Persistance des données en local
- **Authentification** : Système de connexion admin sécurisé
- **Temps réel** : Mise à jour automatique des scores et classements

## 📋 Prérequis

- Node.js 18+ 
- npm ou yarn

## 🛠️ Installation

1. **Cloner le projet**
   ```bash
   git clone <url-du-repo>
   cd tournoi-babyfoot-myorigines
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Démarrer le serveur de base de données**
   ```bash
   npm run server
   ```
   Le serveur API sera disponible sur `http://localhost:2001`

4. **Démarrer l'application React (dans un autre terminal)**
   ```bash
   npm run dev:vite
   ```
   L'application sera disponible sur `http://localhost:2000`

## 🔐 Connexion Admin

- **Utilisateur** : `admin`
- **Mot de passe** : `123456`

## 📊 Structure du projet

```
├── src/
│   ├── components/          # Composants React
│   │   ├── AdminView.jsx    # Interface admin
│   │   ├── DisplayView.jsx  # Vitrine publique
│   │   ├── LoginModal.jsx   # Modal de connexion
│   │   ├── MatchList.jsx    # Liste des matchs
│   │   ├── ScoreControls.jsx # Contrôles de score
│   │   └── Rankings.jsx     # Classement
│   ├── contexts/            # Contextes React
│   │   ├── AuthContext.jsx  # Gestion authentification
│   │   └── TournamentContext.jsx # Gestion tournoi
│   ├── App.jsx              # Composant principal
│   ├── main.jsx             # Point d'entrée
│   └── index.css            # Styles
├── api/
│   └── db.js                # Configuration base de données
├── data/                    # Base de données SQLite (créée automatiquement)
├── server.js                # Serveur Express
├── package.json
└── vite.config.js
```

## 🎮 Utilisation

### Interface Admin
1. Accéder à `http://localhost:2000`
2. Cliquer sur "Interface Admin"
3. Se connecter avec les identifiants admin
4. Sélectionner un match dans le planning
5. Modifier les scores en temps réel
6. Sauvegarder le match terminé

### Vitrine Live
1. Accéder à `http://localhost:2000`
2. Cliquer sur "Vitrine Live"
3. Voir les scores mis à jour automatiquement
4. Changer de jour avec les onglets

## 🗄️ Base de données

La base de données SQLite est créée automatiquement dans le dossier `data/` avec :
- **Équipes** : 8 équipes pré-configurées (A à H)
- **Matchs** : Planning sur 4 jours (lundi à jeudi)
- **Admin** : Compte administrateur par défaut

## 🐳 Déploiement Docker

### Démarrage rapide avec Docker
```bash
# Windows PowerShell
.\docker-start.ps1

# Linux/Mac
./docker-start.sh

# Ou manuellement
docker-compose up --build -d
```

### URLs d'accès Docker (Local)
- **Frontend React** : http://localhost:2000
- **Backend API** : http://localhost:2001
- **Application complète** : http://localhost:2002

## 🌐 Accès Public (Internet)

### Configuration automatique
```bash
# Windows PowerShell (en tant qu'administrateur)
.\setup-public-access.ps1
```

### Configuration manuelle

#### 1. Configuration du pare-feu Windows
```bash
# Exécuter en tant qu'administrateur
.\configure-firewall.ps1
```

#### 2. Configuration du routeur (Port Forwarding)
Accédez à l'interface d'administration de votre routeur (généralement http://192.168.1.1) et configurez :

| Port Externe | Port Interne | IP Locale | Service |
|--------------|--------------|-----------|---------|
| 2000 | 2000 | VOTRE_IP_LOCALE | Frontend React |
| 2001 | 2001 | VOTRE_IP_LOCALE | Backend API |
| 2002 | 2002 | VOTRE_IP_LOCALE | Nginx Reverse Proxy |
| 2003 | 2003 | VOTRE_IP_LOCALE | PostgreSQL Database |

#### 3. URLs d'accès public
- **Frontend React** : http://VOTRE_IP_PUBLIQUE:2000
- **Backend API** : http://VOTRE_IP_PUBLIQUE:2001
- **Application complète** : http://VOTRE_IP_PUBLIQUE:2002

### 🔒 Sécurité pour l'accès public

⚠️ **IMPORTANT** : Rendre votre application accessible depuis Internet expose votre serveur à des risques de sécurité.

**Mesures de sécurité recommandées :**
- Changez le mot de passe admin par défaut (`123456`)
- Configurez un pare-feu strict
- Utilisez HTTPS avec un certificat SSL
- Surveillez les accès et logs
- Mettez à jour régulièrement les composants

### Gestion des conteneurs
```bash
# Arrêter les conteneurs
docker-compose down

# Voir les logs
docker-compose logs -f

# Redémarrer
docker-compose restart
```

## 🔧 Scripts disponibles

- `npm run dev:vite` : Démarre le serveur de développement React
- `npm run server` : Démarre le serveur API Express
- `npm run build` : Compile l'application pour la production
- `npm run preview` : Prévisualise la version de production
- `npm run docker:build` : Construit les images Docker
- `npm run docker:start` : Démarre les conteneurs Docker
- `npm run docker:stop` : Arrête les conteneurs Docker

## 🌐 Ports utilisés

### Développement local
- **Frontend React** : `2000`
- **API Express** : `2001`

### Docker (production)
- **Frontend React** : `2000`
- **API Express** : `2001`
- **Nginx Reverse Proxy** : `2002`

## 📱 Responsive

L'application est entièrement responsive et s'adapte aux écrans mobiles et tablettes.

## 🎨 Personnalisation

Les couleurs et styles peuvent être modifiés dans `src/index.css` en utilisant les variables CSS définies.

## 🔒 Sécurité

- Authentification par JWT
- Mots de passe hashés avec bcrypt
- Validation des données côté serveur
- CORS configuré pour le développement local

## 🐛 Dépannage

### Problème de connexion à la base de données
- Vérifier que le serveur Express est démarré sur le port 2001
- Vérifier les permissions d'écriture dans le dossier `data/`

### Problème de proxy Vite
- Vérifier que le serveur Express est accessible sur `http://localhost:2001`
- Redémarrer le serveur de développement Vite

### Problème d'authentification
- Vérifier que l'utilisateur `admin` existe dans la base de données
- Le mot de passe par défaut est `123456`

## 📝 Notes de développement

- La base de données est réinitialisée à chaque redémarrage du serveur
- Les données sont persistantes entre les sessions
- L'auto-refresh de la vitrine est configuré à 5 secondes
- Les scores sont calculés automatiquement (Buts - Gamelles adverses)
