#!/bin/bash

echo "========================================"
echo "  MyOrigines Tournoi de Babyfoot"
echo "  Démarrage du serveur API"
echo "========================================"
echo

echo "Vérification de Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERREUR: Node.js n'est pas installé ou pas dans le PATH"
    exit 1
fi

node --version

echo
echo "Démarrage du serveur sur le port 2001..."
echo
echo "Pour arrêter le serveur, appuyez sur Ctrl+C"
echo

node server.js
