#!/bin/bash

# Script de déploiement Docker pour VPS
# MyOrigines Tournoi de Babyfoot

set -e  # Arrêter en cas d'erreur

echo "🐳 Déploiement Docker de MyOrigines Tournoi de Babyfoot"
echo "====================================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
REPO_URL="https://github.com/wilf974/MyOrigines-Tournoi-de-Babyfoot.git"
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

# Vérifier Docker
check_docker() {
    print_status "Vérification de Docker..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker n'est pas installé"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose n'est pas installé"
        exit 1
    fi
    
    print_success "Docker et Docker Compose sont installés"
}

# Cloner ou mettre à jour le repository
setup_repository() {
    print_status "Configuration du repository..."
    
    if [ -d "$APP_DIR" ]; then
        print_status "Repository existant détecté. Mise à jour..."
        cd "$APP_DIR"
        git pull origin main
    else
        print_status "Clonage du repository..."
        git clone "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
    fi
    
    print_success "Repository configuré"
}

# Arrêter les conteneurs existants
stop_containers() {
    print_status "Arrêt des conteneurs existants..."
    
    if [ -f "$COMPOSE_FILE" ]; then
        docker-compose down 2>/dev/null || true
        print_success "Conteneurs arrêtés"
    else
        print_warning "Fichier docker-compose.yml non trouvé"
    fi
}

# Construire et démarrer les conteneurs
start_containers() {
    print_status "Construction et démarrage des conteneurs..."
    
    # Construire les images
    docker-compose build --no-cache
    
    # Démarrer les services
    docker-compose up -d
    
    print_success "Conteneurs démarrés"
}

# Vérifier le statut des conteneurs
check_status() {
    print_status "Vérification du statut des conteneurs..."
    
    sleep 10  # Attendre que les conteneurs démarrent
    
    echo ""
    echo "📊 Statut des conteneurs :"
    docker-compose ps
    
    echo ""
    echo "📋 Logs récents :"
    docker-compose logs --tail=10
}

# Configurer le firewall
setup_firewall() {
    print_status "Configuration du firewall..."
    
    # Vérifier si ufw est installé
    if command -v ufw &> /dev/null; then
        ufw allow 2000 2>/dev/null || true
        ufw allow 2001 2>/dev/null || true
        ufw allow 2002 2>/dev/null || true
        print_success "Ports ouverts dans le firewall"
    else
        print_warning "UFW non installé, configurez manuellement les ports 2000-2002"
    fi
}

# Afficher les informations de déploiement
show_deployment_info() {
    echo ""
    echo "🎉 Déploiement Docker terminé avec succès !"
    echo "=========================================="
    echo ""
    echo "🐳 Conteneurs Docker :"
    echo "  • Frontend React:  Port 2000"
    echo "  • Backend API:     Port 2001"
    echo "  • Nginx Proxy:     Port 2002"
    echo "  • PostgreSQL:      Port 2003"
    echo ""
    echo "🌐 URLs d'accès :"
    echo "  • Frontend:        http://$(curl -s ifconfig.me):2000"
    echo "  • API:             http://$(curl -s ifconfig.me):2001"
    echo "  • Application:     http://$(curl -s ifconfig.me):2002"
    echo ""
    echo "🔧 Commandes Docker utiles :"
    echo "  • Voir les logs:     docker-compose logs -f"
    echo "  • Redémarrer:        docker-compose restart"
    echo "  • Arrêter:           docker-compose down"
    echo "  • Statut:            docker-compose ps"
    echo "  • Logs spécifiques:  docker-compose logs [service]"
    echo ""
    echo "🔄 Pour mettre à jour :"
    echo "  cd $APP_DIR && git pull && docker-compose down && docker-compose up -d --build"
    echo ""
}

# Fonction principale
main() {
    print_status "Début du déploiement Docker..."
    
    check_docker
    setup_repository
    stop_containers
    start_containers
    setup_firewall
    check_status
    show_deployment_info
    
    print_success "Déploiement Docker terminé !"
}

# Exécuter le script
main "$@"
