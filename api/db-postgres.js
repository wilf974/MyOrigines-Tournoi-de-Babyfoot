import pkg from 'pg';
const { Pool } = pkg;

/**
 * Configuration de la base de données PostgreSQL
 */
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 2003, // Port Docker PostgreSQL
  database: process.env.DB_NAME || 'tournoi_babyfoot',
  user: process.env.DB_USER || 'myorigines',
  password: process.env.DB_PASSWORD || 'tournoi2024',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Initialise et configure la base de données PostgreSQL
 * @returns {Promise<Object>} Pool de connexions PostgreSQL
 */
export async function initDatabase() {
  try {
    console.log('🔄 Connexion à PostgreSQL...');
    
    // Tester la connexion
    const client = await pool.connect();
    console.log('✅ Connexion PostgreSQL établie');
    
    // Créer les tables
    await createTables(client);
    
    // Initialiser les données par défaut
    await initializeDefaultData(client);
    
    client.release();
    
    console.log('✅ Base de données PostgreSQL initialisée');
    return pool;
  } catch (error) {
    console.error('❌ Erreur de connexion PostgreSQL:', error);
    throw error;
  }
}

/**
 * Crée les tables de la base de données
 * @param {Object} client - Client PostgreSQL
 */
async function createTables(client) {
  console.log('🔄 Création des tables...');
  
  // Table des équipes
  await client.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id VARCHAR(10) PRIMARY KEY,
      nom VARCHAR(100) NOT NULL,
      joueurs JSONB NOT NULL,
      points INTEGER DEFAULT 0,
      buts INTEGER DEFAULT 0,
      gamelles INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table des matchs
  await client.query(`
    CREATE TABLE IF NOT EXISTS matches (
      id VARCHAR(50) PRIMARY KEY,
      jour VARCHAR(20) NOT NULL,
      heure VARCHAR(10) NOT NULL,
      equipe1_id VARCHAR(10) NOT NULL,
      equipe2_id VARCHAR(10) NOT NULL,
      team1_goals INTEGER DEFAULT 0,
      team1_gamelles INTEGER DEFAULT 0,
      team2_goals INTEGER DEFAULT 0,
      team2_gamelles INTEGER DEFAULT 0,
      finished BOOLEAN DEFAULT FALSE,
      last_updated TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (equipe1_id) REFERENCES teams(id),
      FOREIGN KEY (equipe2_id) REFERENCES teams(id)
    )
  `);

  // Table des administrateurs
  await client.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Trigger pour mettre à jour updated_at
  await client.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  await client.query(`
    DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
    CREATE TRIGGER update_teams_updated_at
        BEFORE UPDATE ON teams
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `);
}

/**
 * Initialise les données par défaut
 * @param {Object} client - Client PostgreSQL
 */
async function initializeDefaultData(client) {
  console.log('🔄 Initialisation des données par défaut...');
  
  // Vérifier si des équipes existent déjà
  const teamCount = await client.query('SELECT COUNT(*) as count FROM teams');
  
  if (parseInt(teamCount.rows[0].count) === 0) {
    console.log('📝 Création des équipes par défaut...');
    
    // Insérer les équipes par défaut
    const teams = [
      { id: "A", nom: "Équipe A", joueurs: ["Mercier Vincent", "Rossini Laora"] },
      { id: "B", nom: "Équipe B", joueurs: ["Duponchel Mathias", "Raffalli Sandrine"] },
      { id: "C", nom: "Équipe C", joueurs: ["Lamarque Frédéric", "Aiazzi Elodie"] },
      { id: "D", nom: "Équipe D", joueurs: ["Fauré Léa", "Gueoguieff Stéphan"] },
      { id: "E", nom: "Équipe E", joueurs: ["Clémence Loviconi", "Durand Gregory"] },
      { id: "F", nom: "Équipe F", joueurs: ["Carré Emmanuel", "Guyenot Benjamin"] },
      { id: "G", nom: "Équipe G", joueurs: ["Caroline Stolfi", "Maillot Wilfred"] },
      { id: "H", nom: "Équipe H", joueurs: ["Stella Michelacci", "Grosjean Cédric"] }
    ];

    for (const team of teams) {
      await client.query(`
        INSERT INTO teams (id, nom, joueurs) 
        VALUES ($1, $2, $3)
      `, [team.id, team.nom, JSON.stringify(team.joueurs)]);
    }

    console.log('✅ Équipes par défaut créées (sans matchs automatiques)');
    console.log('ℹ️  Les matchs peuvent être générés manuellement via l\'interface admin');
  }

  // Vérifier si un admin existe déjà
  const adminCount = await client.query('SELECT COUNT(*) as count FROM admins');
  
  if (parseInt(adminCount.rows[0].count) === 0) {
    // Créer l'admin par défaut avec le mot de passe 123456
    const bcrypt = await import('bcryptjs');
    const passwordHash = bcrypt.default.hashSync('123456', 10);
    
    await client.query(`
      INSERT INTO admins (username, password_hash) 
      VALUES ($1, $2)
    `, ['admin', passwordHash]);
  }
}

/**
 * Obtient une instance de la base de données
 * @returns {Promise<Object>} Pool de connexions PostgreSQL
 */
export async function getDatabase() {
  return pool;
}

/**
 * Exécute une requête avec gestion d'erreurs
 * @param {string} text - Requête SQL
 * @param {Array} params - Paramètres de la requête
 * @returns {Promise<Object>} Résultat de la requête
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Requête exécutée:', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ Erreur requête PostgreSQL:', error);
    throw error;
  }
}
