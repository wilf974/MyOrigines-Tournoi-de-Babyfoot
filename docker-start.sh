#!/bin/bash

# Script Bash pour démarrer l'application Docker
echo "🐳 Démarrage de l'application Tournoi MyOrigines avec Docker..."

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé"
    echo "Veuillez installer Docker depuis: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker détecté"

# Vérifier si Docker Compose est disponible
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas disponible"
    exit 1
fi

echo "✅ Docker Compose détecté"

# Arrêter les conteneurs existants
echo "🛑 Arrêt des conteneurs existants..."
docker-compose down

# Construire et démarrer les conteneurs
echo "🔨 Construction et démarrage des conteneurs..."
docker-compose up --build -d

# Attendre que les services soient prêts
echo "⏳ Attente du démarrage des services..."
sleep 10

# Vérifier le statut des conteneurs
echo "📊 Statut des conteneurs:"
docker-compose ps

# Afficher les URLs d'accès
echo ""
echo "🌐 URLs d'accès:"
echo "   Frontend React: http://localhost:2000"
echo "   Backend API: http://localhost:2001"
echo "   Application complète: http://localhost:2002"

echo ""
echo "📝 Informations:"
echo "   - Mot de passe admin: 123456"
echo "   - Base de données: SQLite persistante"
echo "   - Auto-refresh: 3 secondes"

echo ""
echo "🔧 Commandes utiles:"
echo "   Arrêter: docker-compose down"
echo "   Logs: docker-compose logs -f"
echo "   Redémarrer: docker-compose restart"

echo ""
echo "✅ Application démarrée avec succès!"
