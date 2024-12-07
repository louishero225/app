const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Vérification des variables d'environnement requises
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('Erreur: Variables d\'environnement Supabase manquantes');
    throw new Error('Configuration Supabase incomplète');
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('Initialisation de Supabase...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true
    }
});

// Vérifier la connexion
supabase.auth.getSession().then(() => {
    console.log('Connexion Supabase établie avec succès');
}).catch(error => {
    console.error('Erreur de connexion Supabase:', error);
});

module.exports = { supabase };
