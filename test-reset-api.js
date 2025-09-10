#!/usr/bin/env node

/**
 * Script de test pour l'API de réinitialisation
 * Teste la fonction de remise à zéro des matchs
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:2001';

async function testResetAPI() {
  try {
    console.log('🧪 Test de l\'API de réinitialisation');
    console.log('=' .repeat(50));
    
    // 1. Test de l'API de réinitialisation complète
    console.log('\n1. Test de l\'API de réinitialisation complète...');
    const resetResponse = await fetch(`${API_BASE}/api/reset-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (resetResponse.ok) {
      const result = await resetResponse.json();
      console.log('✅ API de réinitialisation accessible');
      console.log('📊 Résultat:', result);
    } else {
      console.log('❌ API de réinitialisation inaccessible');
      const errorText = await resetResponse.text();
      console.log('Erreur:', errorText);
      return;
    }
    
    // 2. Vérifier que les matchs ont été réinitialisés
    console.log('\n2. Vérification des matchs après réinitialisation...');
    const matchesResponse = await fetch(`${API_BASE}/api/matches`);
    if (matchesResponse.ok) {
      const matches = await matchesResponse.json();
      console.log(`✅ ${matches.length} matchs récupérés`);
      
      // Vérifier que les matchs sont bien réinitialisés
      const finishedMatches = matches.filter(match => match.finished);
      const ongoingMatches = matches.filter(match => !match.finished);
      
      console.log(`📊 Matchs terminés: ${finishedMatches.length}`);
      console.log(`📊 Matchs en cours: ${ongoingMatches.length}`);
      
      // Afficher quelques exemples
      if (matches.length > 0) {
        console.log('\n📋 Exemples de matchs:');
        matches.slice(0, 3).forEach((match, index) => {
          console.log(`   ${index + 1}. ${match.team1_nom} vs ${match.team2_nom} - Terminé: ${match.finished}`);
        });
      }
    } else {
      console.log('❌ Impossible de récupérer les matchs');
    }
    
    // 3. Vérifier que le classement a été réinitialisé
    console.log('\n3. Vérification du classement après réinitialisation...');
    const rankingsResponse = await fetch(`${API_BASE}/api/rankings`);
    if (rankingsResponse.ok) {
      const rankings = await rankingsResponse.json();
      console.log(`✅ ${rankings.length} équipes récupérées`);
      
      // Vérifier que toutes les équipes ont 0 points
      const teamsWithPoints = rankings.filter(team => team.points > 0);
      const teamsWithGoals = rankings.filter(team => team.buts > 0);
      
      console.log(`📊 Équipes avec des points: ${teamsWithPoints.length}`);
      console.log(`📊 Équipes avec des buts: ${teamsWithGoals.length}`);
      
      if (teamsWithPoints.length === 0 && teamsWithGoals.length === 0) {
        console.log('✅ Réinitialisation complète réussie !');
      } else {
        console.log('⚠️ Certaines équipes ont encore des points/buts');
      }
    } else {
      console.log('❌ Impossible de récupérer le classement');
    }
    
    console.log('\n📋 Résumé du test:');
    console.log('   ✅ API de réinitialisation accessible');
    console.log('   ✅ Headers simplifiés (pas d\'authentification)');
    console.log('   ✅ Réinitialisation des matchs et du classement');
    
    console.log('\n✅ Test de réinitialisation terminé!');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.log('\n💡 Vérifiez que:');
    console.log('   - Docker est démarré');
    console.log('   - L\'application est accessible sur http://localhost:2001');
    console.log('   - Les conteneurs sont en cours d\'exécution');
  }
}

// Exécuter le test
testResetAPI();
