const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Récupérer les statistiques du dashboard
router.get('/stats', async (req, res) => {
    try {
        // Commandes en attente
        const { data: pendingOrders, error: pendingError } = await supabase
            .from('commandes')
            .select('id')
            .eq('statut', 'en_attente');

        // Total des paiements (commandes complétées)
        const { data: completedOrders, error: completedError } = await supabase
            .from('commandes')
            .select('total_ttc')
            .eq('statut', 'complete');

        // Nombre total de clients
        const { data: totalClients, error: clientsError } = await supabase
            .from('clients')
            .select('id');

        if (pendingError || completedError || clientsError) {
            throw new Error('Erreur lors de la récupération des statistiques');
        }

        const totalPayments = completedOrders?.reduce((sum, order) => sum + order.total_ttc, 0) || 0;

        res.json({
            pendingOrders: pendingOrders?.length || 0,
            totalPayments,
            totalClients: totalClients?.length || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Récupérer les dernières commandes
router.get('/recent-orders', async (req, res) => {
    try {
        const { data: orders, error } = await supabase
            .from('commandes')
            .select(`
                *,
                clients (nom)
            `)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Récupérer les dernières notifications
router.get('/notifications', async (req, res) => {
    try {
        const { data: recentOrders, error: ordersError } = await supabase
            .from('commandes')
            .select(`
                id,
                created_at,
                numero_commande,
                clients (nom),
                statut
            `)
            .order('created_at', { ascending: false })
            .limit(5);

        if (ordersError) throw ordersError;

        const notifications = recentOrders.map(order => ({
            type: 'commande',
            title: 'Nouvelle commande',
            message: `${order.numero_commande} créée par ${order.clients.nom}`,
            date: order.created_at,
            icon: 'plus',
            color: 'blue',
            status: order.statut
        }));

        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
