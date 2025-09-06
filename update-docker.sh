#!/bin/bash

# Script de mise à jour Docker pour VPS
# MyOrigines Tournoi de Babyfoot

set -e  # Arrêter en cas d'erreur

echo "🔄 Mise à jour Docker de MyOrigines Tournoi de Babyfoot"
echo "====================================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
APP_DIR="MyOrigines-Tournoi-de-Babyfoot"
COMPOSE_FILE="docker-compose.yml"

# Fonction pour afficher les messages colorés
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier si le répertoire existe
check_directory() {
    if [ ! -d "$APP_DIR" ]; then
        print_error "Répertoire $APP_DIR non trouvé"
        print_status "Exécutez d'abord deploy-docker.sh"
        exit 1
    fi
}

# Sauvegarder la base de données
backup_database() {
    print_status "Sauvegarde de la base de données..."
    
    # Créer un dump de la base de données PostgreSQL
    docker-compose exec -T database pg_dump -U myorigines tournoi_babyfoot > "backup_$(date +%Y%m%d_%H%M%S).sql" 2>/dev/null || {
        print_warning "Impossible de sauvegarder la base de données (conteneur non démarré)"
    }
    
    print_success "Base de données sauvegardée"
}

# Mettre à jour le code
update_code() {
    print_status "Mise à jour du code depuis GitHub..."
    
    cd "$APP_DIR"
    
    # Sauvegarder les modifications locales
    git stash push -m "Sauvegarde avant mise à jour $(date)" 2>/dev/null || true
    
    # Récupérer les dernières modifications
    git pull origin main
    
    print_success "Code mis à jour"
}

# Redémarrer les conteneurs
restart_containers() {
    print_status "Redémarrage des conteneurs..."
    
    # Arrêter les conteneurs
    docker-compose down
    
    # Reconstruire et redémarrer
    docker-compose up -d --build
    
    print_success "Conteneurs redémarrés"
}

# Vérifier le statut
check_status() {
    print_status "Vérification du statut..."
    
    sleep 10  # Attendre que les conteneurs démarrent
    
    echo ""
    echo "📊 Statut des conteneurs :"
    docker-compose ps
    
    echo ""
    print_status "Logs récents :"
    docker-compose logs --tail=10
}

# Nettoyer les images inutilisées
cleanup() {
    print_status "Nettoyage des images Docker inutilisées..."
    
    docker image prune -f
    
    print_success "Nettoyage terminé"
}

# Fonction principale
main() {
    print_status "Début de la mise à jour Docker..."
    
    check_directory
    backup_database
    update_code
    restart_containers
    check_status
    cleanup
    
    print_success "Mise à jour Docker terminée !"
    echo ""
    echo "🌐 Application accessible sur :"
    echo "  • http://$(curl -s ifconfig.me):2000 (Frontend)"
    echo "  • http://$(curl -s ifconfig.me):2001 (API)"
    echo "  • http://$(curl -s ifconfig.me):2002 (Complet)"
}

# Exécuter le script
main "$@"
