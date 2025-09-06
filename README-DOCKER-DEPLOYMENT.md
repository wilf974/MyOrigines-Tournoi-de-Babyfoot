# 🐳 Déploiement Docker sur VPS

Guide de déploiement Docker pour MyOrigines Tournoi de Babyfoot sur VPS avec Docker déjà installé.

## 📋 Prérequis

- VPS avec Docker et Docker Compose installés
- Ports 2000-2003 disponibles
- Accès SSH avec privilèges sudo

## 🚀 Déploiement initial

### Commande unique (recommandée)

```bash
wget https://raw.githubusercontent.com/wilf974/MyOrigines-Tournoi-de-Babyfoot/main/deploy-docker.sh && chmod +x deploy-docker.sh && ./deploy-docker.sh
```

### Déploiement manuel

```bash
# Cloner le repository
git clone https://github.com/wilf974/MyOrigines-Tournoi-de-Babyfoot.git
cd MyOrigines-Tournoi-de-Babyfoot

# Démarrer les conteneurs
docker-compose up -d --build
```

## 🔄 Mises à jour

### Script de mise à jour automatique

```bash
wget https://raw.githubusercontent.com/wilf974/MyOrigines-Tournoi-de-Babyfoot/main/update-docker.sh && chmod +x update-docker.sh && ./update-docker.sh
```

### Mise à jour manuelle

```bash
cd MyOrigines-Tournoi-de-Babyfoot
git pull
docker-compose down
docker-compose up -d --build
```

## 🐳 Architecture Docker

L'application utilise 4 conteneurs :

### 1. **Frontend** (Port 2000)
- **Image** : React + Nginx
- **Fonction** : Interface utilisateur
- **URL** : `http://VOTRE_IP:2000`

### 2. **Backend** (Port 2001)
- **Image** : Node.js + Express
- **Fonction** : API REST
- **URL** : `http://VOTRE_IP:2001`

### 3. **Nginx Proxy** (Port 2002)
- **Image** : Nginx
- **Fonction** : Reverse proxy
- **URL** : `http://VOTRE_IP:2002`

### 4. **Database** (Port 2003)
- **Image** : PostgreSQL 15
- **Fonction** : Base de données
- **Accès** : `VOTRE_IP:2003`

## 🔧 Commandes Docker utiles

### Gestion des conteneurs

```bash
# Voir le statut
docker-compose ps

# Voir les logs
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f database

# Redémarrer un service
docker-compose restart backend

# Arrêter tous les services
docker-compose down

# Démarrer tous les services
docker-compose up -d

# Reconstruire et redémarrer
docker-compose up -d --build
```

### Gestion des données

```bash
# Sauvegarder la base de données
docker-compose exec database pg_dump -U myorigines tournoi_babyfoot > backup.sql

# Restaurer la base de données
docker-compose exec -T database psql -U myorigines tournoi_babyfoot < backup.sql

# Accéder à la base de données
docker-compose exec database psql -U myorigines tournoi_babyfoot
```

### Nettoyage

```bash
# Supprimer les conteneurs arrêtés
docker-compose down

# Supprimer les images inutilisées
docker image prune -f

# Supprimer les volumes inutilisés
docker volume prune -f

# Nettoyage complet
docker system prune -f
```

## 🌐 Configuration réseau

### Ports utilisés

- **2000** : Frontend React
- **2001** : Backend API
- **2002** : Nginx Proxy
- **2003** : PostgreSQL

### Ouvrir les ports (si nécessaire)

```bash
# UFW
sudo ufw allow 2000
sudo ufw allow 2001
sudo ufw allow 2002
sudo ufw allow 2003

# iptables
sudo iptables -A INPUT -p tcp --dport 2000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 2001 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 2002 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 2003 -j ACCEPT
```

## 🔒 Sécurité

### Variables d'environnement

Modifiez les mots de passe par défaut dans `docker-compose.yml` :

```yaml
environment:
  POSTGRES_PASSWORD: votre_mot_de_passe_securise
  DB_PASSWORD: votre_mot_de_passe_securise
```

### Accès à la base de données

```bash
# Changer le mot de passe admin
docker-compose exec backend node -e "
const bcrypt = require('bcryptjs');
const newPassword = 'votre_nouveau_mot_de_passe';
const hash = bcrypt.hashSync(newPassword, 10);
console.log('Hash:', hash);
"
```

## 📊 Monitoring

### Surveillance des ressources

```bash
# Utilisation des ressources
docker stats

# Logs en temps réel
docker-compose logs -f

# Statut des services
docker-compose ps
```

### Logs et débogage

```bash
# Logs détaillés
docker-compose logs --tail=100

# Logs d'erreur uniquement
docker-compose logs | grep ERROR

# Entrer dans un conteneur
docker-compose exec backend bash
docker-compose exec frontend sh
docker-compose exec database psql -U myorigines tournoi_babyfoot
```

## 🛠️ Dépannage

### Problèmes courants

1. **Port déjà utilisé**
   ```bash
   # Vérifier les ports utilisés
   sudo netstat -tlnp | grep :200
   
   # Arrêter le service qui utilise le port
   sudo systemctl stop [service_name]
   ```

2. **Conteneur ne démarre pas**
   ```bash
   # Voir les logs d'erreur
   docker-compose logs [service_name]
   
   # Vérifier la configuration
   docker-compose config
   ```

3. **Base de données inaccessible**
   ```bash
   # Vérifier le statut de la base
   docker-compose exec database pg_isready -U myorigines
   
   # Redémarrer la base de données
   docker-compose restart database
   ```

### Redémarrage complet

```bash
# Arrêter tout
docker-compose down

# Supprimer les volumes (ATTENTION: perte de données)
docker-compose down -v

# Redémarrer
docker-compose up -d --build
```

## 🔄 Intégration avec n8n

Si n8n tourne déjà sur votre VPS, vous pouvez :

1. **Utiliser des ports différents** pour éviter les conflits
2. **Partager le réseau Docker** entre les applications
3. **Utiliser un reverse proxy** pour gérer plusieurs applications

### Exemple de configuration avec n8n

```yaml
# Dans docker-compose.yml, changer les ports
ports:
  - "3000:2000"  # Frontend sur port 3000
  - "3001:2001"  # Backend sur port 3001
  - "3002:2002"  # Proxy sur port 3002
```

---

**Note** : Ce guide suppose que Docker et Docker Compose sont déjà installés sur votre VPS.
