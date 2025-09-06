#!/bin/bash

# Script de mise à jour pour VPS Debian
# MyOrigines Tournoi de Babyfoot

set -e  # Arrêter en cas d'erreur

echo "🔄 Mise à jour de MyOrigines Tournoi de Babyfoot"
echo "=============================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
APP_DIR="MyOrigines-Tournoi-de-Babyfoot"
APP_NAME="tournoi-babyfoot"

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
        print_status "Exécutez d'abord deploy-vps.sh"
        exit 1
    fi
}

# Sauvegarder la base de données
backup_database() {
    print_status "Sauvegarde de la base de données..."
    
    if [ -f "$APP_DIR/data/tournoi.db" ]; then
        cp "$APP_DIR/data/tournoi.db" "$APP_DIR/data/tournoi.db.backup.$(date +%Y%m%d_%H%M%S)"
        print_success "Base de données sauvegardée"
    else
        print_warning "Base de données non trouvée"
    fi
}

# Mettre à jour le code
update_code() {
    print_status "Mise à jour du code depuis GitHub..."
    
    cd "$APP_DIR"
    
    # Sauvegarder les modifications locales
    git stash push -m "Sauvegarde avant mise à jour $(date)"
    
    # Récupérer les dernières modifications
    git pull origin main
    
    print_success "Code mis à jour"
}

# Mettre à jour les dépendances
update_dependencies() {
    print_status "Mise à jour des dépendances..."
    
    npm install
    
    print_success "Dépendances mises à jour"
}

# Redémarrer l'application
restart_application() {
    print_status "Redémarrage de l'application..."
    
    pm2 restart "$APP_NAME"
    
    print_success "Application redémarrée"
}

# Vérifier le statut
check_status() {
    print_status "Vérification du statut..."
    
    sleep 3
    pm2 status "$APP_NAME"
    
    echo ""
    print_status "Logs récents :"
    pm2 logs "$APP_NAME" --lines 10
}

# Fonction principale
main() {
    print_status "Début de la mise à jour..."
    
    check_directory
    backup_database
    update_code
    update_dependencies
    restart_application
    check_status
    
    print_success "Mise à jour terminée !"
    echo ""
    echo "🌐 Application accessible sur :"
    echo "  • http://$(curl -s ifconfig.me):2000 (Frontend)"
    echo "  • http://$(curl -s ifconfig.me):2001 (API)"
    echo "  • http://$(curl -s ifconfig.me):2002 (Complet)"
}

# Exécuter le script
main "$@"
