const supabase = require('../config/supabase');

async function getTableSchema() {
    const tables = ['clients', 'commandes', 'commerciaux', 'factures', 'lignes_commande'];
    
    try {
        for (const tableName of tables) {
            console.log(`\n=== Structure de la table ${tableName} ===`);
            
            // Récupérer un enregistrement pour voir la structure
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);

            if (error) {
                console.error(`Erreur pour ${tableName}:`, error);
                continue;
            }

            if (data && data.length > 0) {
                console.log('Colonnes:');
                const columns = Object.keys(data[0]);
                columns.forEach(column => {
                    const value = data[0][column];
                    const type = typeof value;
                    console.log(`- ${column}: ${type} ${value === null ? '(nullable)' : ''}`);
                });
            } else {
                console.log('Table vide, impossible de déterminer la structure');
            }
        }
    } catch (error) {
        console.error('Erreur générale:', error.message);
    }
}

getTableSchema();
