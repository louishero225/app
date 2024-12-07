const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// Récupérer tous les clients
router.get('/', async (req, res) => {
    console.log('Tentative de récupération de tous les clients...');
    try {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('nom', { ascending: true });

        if (error) {
            console.error('Erreur Supabase:', error);
            throw error;
        }

        console.log(`${data?.length || 0} clients récupérés`);
        res.json(data || []);
    } catch (error) {
        console.error('Erreur détaillée:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des clients',
            details: error.message
        });
    }
});

// Récupérer un client spécifique
router.get('/:id', async (req, res) => {
    console.log('Tentative de récupération d\'un client spécifique...');
    try {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) {
            console.error('Erreur Supabase:', error);
            throw error;
        }

        if (!data) {
            return res.status(404).json({ error: 'Client non trouvé' });
        }

        console.log(`Client ${data.id} récupéré`);
        res.json(data);
    } catch (error) {
        console.error('Erreur détaillée:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        res.status(500).json({ 
            error: 'Erreur lors de la récupération du client',
            details: error.message
        });
    }
});

// Récupérer les détails d'un client avec ses statistiques
router.get('/:id/details', async (req, res) => {
    console.log('Tentative de récupération des détails d\'un client...');
    try {
        const clientId = req.params.id;

        // Récupérer les informations du client
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single();

        if (clientError) {
            console.error('Erreur Supabase:', clientError);
            throw clientError;
        }

        if (!client) {
            return res.status(404).json({ error: 'Client non trouvé' });
        }

        console.log(`Client ${client.id} récupéré`);

        // Récupérer toutes les commandes du client
        const { data: commandes, error: commandesError } = await supabase
            .from('commandes')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (commandesError) {
            console.error('Erreur Supabase:', commandesError);
            throw commandesError;
        }

        console.log(`${commandes.length} commandes récupérées pour le client ${client.id}`);

        // Calculer les statistiques
        const stats = {
            totalOrders: commandes.length,
            totalAmount: commandes.reduce((sum, cmd) => sum + (cmd.total_ttc || 0), 0),
            lastOrderDate: commandes.length > 0 ? commandes[0].created_at : null,
            averageOrder: commandes.length > 0 
                ? commandes.reduce((sum, cmd) => sum + (cmd.total_ttc || 0), 0) / commandes.length 
                : 0,
            recentTransactions: commandes.slice(0, 5), // 5 dernières commandes
            monthlyActivity: calculateMonthlyActivity(commandes)
        };

        console.log(`Statistiques calculées pour le client ${client.id}`);
        res.json({
            client,
            stats
        });
    } catch (error) {
        console.error('Erreur détaillée:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des détails du client',
            details: error.message
        });
    }
});

// Fonction utilitaire pour calculer l'activité mensuelle
function calculateMonthlyActivity(commandes) {
    const lastSixMonths = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
        lastSixMonths.push({
            month: month.toISOString().slice(0, 7),
            total: 0,
            count: 0
        });
    }

    commandes.forEach(cmd => {
        const cmdMonth = cmd.created_at.slice(0, 7);
        const monthData = lastSixMonths.find(m => m.month === cmdMonth);
        if (monthData) {
            monthData.total += cmd.total_ttc || 0;
            monthData.count += 1;
        }
    });

    return lastSixMonths;
}

// Créer un nouveau client
router.post('/', async (req, res) => {
    console.log('Tentative de création d\'un nouveau client...');
    try {
        const { nom, email, telephone, adresse } = req.body;
        
        // Validation basique
        if (!nom || !telephone || !adresse) {
            return res.status(400).json({ error: 'Le nom, le téléphone et l\'adresse sont requis' });
        }

        const clientData = {
            nom,
            telephone,
            adresse,
            email: email || null // Si email est une chaîne vide ou undefined, on met null
        };

        const { data, error } = await supabase
            .from('clients')
            .insert([clientData])
            .select()
            .single();

        if (error) {
            console.error('Erreur Supabase:', error);
            throw error;
        }

        console.log(`Client créé avec l'id ${data.id}`);
        res.status(201).json(data);
    } catch (error) {
        console.error('Erreur détaillée:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        res.status(500).json({ 
            error: 'Erreur lors de la création du client',
            details: error.message
        });
    }
});

// Mettre à jour un client
router.put('/:id', async (req, res) => {
    console.log('Tentative de mise à jour d\'un client...');
    try {
        const { nom, email, telephone, adresse } = req.body;
        
        // Validation basique
        if (!nom || !telephone || !adresse) {
            return res.status(400).json({ error: 'Le nom, le téléphone et l\'adresse sont requis' });
        }

        const clientData = {
            nom,
            telephone,
            adresse,
            email: email || null // Si email est une chaîne vide ou undefined, on met null
        };

        const { data, error } = await supabase
            .from('clients')
            .update(clientData)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) {
            console.error('Erreur Supabase:', error);
            throw error;
        }

        if (!data) {
            return res.status(404).json({ error: 'Client non trouvé' });
        }

        console.log(`Client mis à jour avec l'id ${data.id}`);
        res.json(data);
    } catch (error) {
        console.error('Erreur détaillée:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        res.status(500).json({ 
            error: 'Erreur lors de la mise à jour du client',
            details: error.message
        });
    }
});

// Supprimer un client
router.delete('/:id', async (req, res) => {
    console.log('Tentative de suppression d\'un client...');
    try {
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', req.params.id);

        if (error) {
            console.error('Erreur Supabase:', error);
            throw error;
        }

        console.log(`Client supprimé avec l'id ${req.params.id}`);
        res.status(204).send();
    } catch (error) {
        console.error('Erreur détaillée:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        res.status(500).json({ 
            error: 'Erreur lors de la suppression du client',
            details: error.message
        });
    }
});

module.exports = router;
