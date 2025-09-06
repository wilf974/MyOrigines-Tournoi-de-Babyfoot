#!/bin/bash

# Script de déploiement automatisé pour VPS Debian
# MyOrigines Tournoi de Babyfoot

set -e  # Arrêter en cas d'erreur

echo "🚀 Déploiement de MyOrigines Tournoi de Babyfoot sur VPS Debian"
echo "=============================================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
REPO_URL="https://github.com/wilf974/MyOrigines-Tournoi-de-Babyfoot.git"
APP_DIR="MyOrigines-Tournoi-de-Babyfoot"
APP_NAME="tournoi-babyfoot"
PORTS=(2000 2001 2002)

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

# Vérifier si on est root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "Ce script ne doit pas être exécuté en tant que root"
        print_status "Utilisez: sudo ./deploy-vps.sh"
        exit 1
    fi
}

# Installer les dépendances système
install_system_deps() {
    print_status "Installation des dépendances système..."
    
    sudo apt update
    sudo apt install -y curl git nodejs npm ufw
    
    # Vérifier la version de Node.js
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_warning "Node.js version $NODE_VERSION détectée. Installation de Node.js 18..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
    fi
    
    print_success "Dépendances système installées"
}

# Installer PM2
install_pm2() {
    print_status "Installation de PM2..."
    
    if ! command -v pm2 &> /dev/null; then
        sudo npm install -g pm2
        print_success "PM2 installé"
    else
        print_status "PM2 déjà installé"
    fi
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

# Installer les dépendances Node.js
install_dependencies() {
    print_status "Installation des dépendances Node.js..."
    npm install
    print_success "Dépendances installées"
}

# Configurer le firewall
setup_firewall() {
    print_status "Configuration du firewall..."
    
    for port in "${PORTS[@]}"; do
        sudo ufw allow "$port"
        print_status "Port $port ouvert"
    done
    
    # Activer le firewall si pas déjà fait
    sudo ufw --force enable
    
    print_success "Firewall configuré"
}

# Démarrer l'application avec PM2
start_application() {
    print_status "Démarrage de l'application..."
    
    # Arrêter l'application si elle tourne déjà
    pm2 stop "$APP_NAME" 2>/dev/null || true
    pm2 delete "$APP_NAME" 2>/dev/null || true
    
    # Démarrer l'application
    pm2 start server.js --name "$APP_NAME"
    
    # Sauvegarder la configuration PM2
    pm2 save
    pm2 startup
    
    print_success "Application démarrée avec PM2"
}

# Afficher les informations de déploiement
show_deployment_info() {
    echo ""
    echo "🎉 Déploiement terminé avec succès !"
    echo "=================================="
    echo ""
    echo "📱 URLs d'accès :"
    echo "  • Frontend React: http://$(curl -s ifconfig.me):2000"
    echo "  • Backend API:    http://$(curl -s ifconfig.me):2001"
    echo "  • Application:    http://$(curl -s ifconfig.me):2002"
    echo ""
    echo "🔧 Commandes utiles :"
    echo "  • Voir les logs:     pm2 logs $APP_NAME"
    echo "  • Redémarrer:        pm2 restart $APP_NAME"
    echo "  • Arrêter:           pm2 stop $APP_NAME"
    echo "  • Statut:            pm2 status"
    echo ""
    echo "🔄 Pour mettre à jour :"
    echo "  cd $APP_DIR && git pull && npm install && pm2 restart $APP_NAME"
    echo ""
}

# Fonction principale
main() {
    print_status "Début du déploiement..."
    
    check_root
    install_system_deps
    install_pm2
    setup_repository
    install_dependencies
    setup_firewall
    start_application
    show_deployment_info
    
    print_success "Déploiement terminé !"
}

# Exécuter le script
main "$@"
