# 🚀 Déploiement sur VPS Debian

Guide de déploiement automatisé pour MyOrigines Tournoi de Babyfoot sur VPS Debian.

## 📋 Prérequis

- VPS Debian/Ubuntu
- Accès SSH avec privilèges sudo
- Ports 2000, 2001, 2002 ouverts

## 🎯 Déploiement initial

### 1. Télécharger les scripts

```bash
# Télécharger le script de déploiement
wget https://raw.githubusercontent.com/wilf974/MyOrigines-Tournoi-de-Babyfoot/main/deploy-vps.sh

# Rendre le script exécutable
chmod +x deploy-vps.sh
```

### 2. Exécuter le déploiement

```bash
# Déploiement complet (recommandé)
sudo ./deploy-vps.sh
```

Le script va automatiquement :
- ✅ Installer Node.js 18+ et npm
- ✅ Installer PM2 pour la gestion des processus
- ✅ Cloner le repository GitHub
- ✅ Installer les dépendances
- ✅ Configurer le firewall
- ✅ Démarrer l'application

## 🔄 Mises à jour

### Script de mise à jour automatique

```bash
# Télécharger le script de mise à jour
wget https://raw.githubusercontent.com/wilf974/MyOrigines-Tournoi-de-Babyfoot/main/update-vps.sh

# Rendre exécutable
chmod +x update-vps.sh

# Exécuter la mise à jour
./update-vps.sh
```

### Mise à jour manuelle

```bash
cd MyOrigines-Tournoi-de-Babyfoot
git pull
npm install
pm2 restart tournoi-babyfoot
```

## 🌐 Accès à l'application

Après le déploiement, votre application sera accessible sur :

- **Frontend React** : `http://VOTRE_IP:2000`
- **Backend API** : `http://VOTRE_IP:2001`
- **Application complète** : `http://VOTRE_IP:2002`

## 🔧 Commandes PM2 utiles

```bash
# Voir le statut
pm2 status

# Voir les logs
pm2 logs tournoi-babyfoot

# Redémarrer l'application
pm2 restart tournoi-babyfoot

# Arrêter l'application
pm2 stop tournoi-babyfoot

# Démarrer l'application
pm2 start tournoi-babyfoot

# Supprimer l'application
pm2 delete tournoi-babyfoot
```

## 🛠️ Dépannage

### Problème de ports

```bash
# Vérifier les ports utilisés
sudo netstat -tlnp | grep :200

# Ouvrir les ports dans le firewall
sudo ufw allow 2000
sudo ufw allow 2001
sudo ufw allow 2002
```

### Problème de permissions

```bash
# Vérifier les permissions
ls -la MyOrigines-Tournoi-de-Babyfoot/

# Corriger les permissions si nécessaire
sudo chown -R $USER:$USER MyOrigines-Tournoi-de-Babyfoot/
```

### Logs d'erreur

```bash
# Voir les logs détaillés
pm2 logs tournoi-babyfoot --lines 50

# Voir les logs en temps réel
pm2 logs tournoi-babyfoot --follow
```

## 📊 Monitoring

### Surveillance des performances

```bash
# Monitoring en temps réel
pm2 monit

# Informations système
pm2 info tournoi-babyfoot
```

### Sauvegarde automatique

Le script de mise à jour sauvegarde automatiquement la base de données avant chaque mise à jour dans :
`MyOrigines-Tournoi-de-Babyfoot/data/tournoi.db.backup.YYYYMMDD_HHMMSS`

## 🔒 Sécurité

### Configuration recommandée

1. **Changer le mot de passe admin par défaut**
2. **Configurer un reverse proxy (nginx)**
3. **Utiliser HTTPS avec Let's Encrypt**
4. **Configurer un pare-feu strict**

### Exemple de configuration nginx

```nginx
server {
    listen 80;
    server_name votre-domaine.com;
    
    location / {
        proxy_pass http://localhost:2002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📞 Support

En cas de problème :

1. Vérifiez les logs : `pm2 logs tournoi-babyfoot`
2. Vérifiez le statut : `pm2 status`
3. Redémarrez l'application : `pm2 restart tournoi-babyfoot`

---

**Note** : Ce guide suppose que vous avez un VPS Debian/Ubuntu avec accès SSH et privilèges sudo.
