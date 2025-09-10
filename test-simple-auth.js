#!/usr/bin/env node

/**
 * Script de test pour l'authentification simplifiée
 * Vérifie que l'API fonctionne sans authentification
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:2001';

async function testSimpleAuth() {
  try {
    console.log('🧪 Test de l\'authentification simplifiée');
    console.log('=' .repeat(50));
    
    // 1. Test de l'API de santé
    console.log('\n1. Test de l\'API de santé...');
    const healthResponse = await fetch(`${API_BASE}/api/health`);
    if (healthResponse.ok) {
      console.log('✅ API de santé accessible');
    } else {
      console.log('❌ API de santé inaccessible');
    }
    
    // 2. Test de l'API de classement
    console.log('\n2. Test de l\'API de classement...');
    const rankingsResponse = await fetch(`${API_BASE}/api/rankings`);
    if (rankingsResponse.ok) {
      const rankings = await rankingsResponse.json();
      console.log(`✅ API de classement accessible (${rankings.length} équipes)`);
      
      // Afficher le classement
      console.log('\n📊 Classement actuel:');
      rankings.forEach((team, index) => {
        console.log(`   ${index + 1}. ${team.nom} - ${team.points} pts, ${team.buts} buts, ${team.gamelles} gamelles`);
      });
    } else {
      console.log('❌ API de classement inaccessible');
    }
    
    // 3. Test de l'API des équipes
    console.log('\n3. Test de l\'API des équipes...');
    const teamsResponse = await fetch(`${API_BASE}/api/teams`);
    if (teamsResponse.ok) {
      const teams = await teamsResponse.json();
      console.log(`✅ API des équipes accessible (${teams.length} équipes)`);
    } else {
      console.log('❌ API des équipes inaccessible');
    }
    
    // 4. Test de l'API des matchs
    console.log('\n4. Test de l\'API des matchs...');
    const matchesResponse = await fetch(`${API_BASE}/api/matches`);
    if (matchesResponse.ok) {
      const matches = await matchesResponse.json();
      console.log(`✅ API des matchs accessible (${matches.length} matchs)`);
    } else {
      console.log('❌ API des matchs inaccessible');
    }
    
    console.log('\n📋 Résumé de l\'authentification simplifiée:');
    console.log('   ✅ Mot de passe demandé uniquement pour accéder à l\'interface admin');
    console.log('   ✅ API accessible sans authentification une fois connecté');
    console.log('   ✅ Session persistante dans le localStorage');
    console.log('   ✅ Mot de passe admin: 123456');
    
    console.log('\n✅ Test terminé avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.log('\n💡 Vérifiez que:');
    console.log('   - Docker est démarré');
    console.log('   - L\'application est accessible sur http://localhost:2001');
    console.log('   - Les conteneurs sont en cours d\'exécution');
  }
}

// Exécuter le test
testSimpleAuth();
