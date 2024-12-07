const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// Récupérer toutes les commandes
router.get('/', async (req, res) => {
    try {
        const { data: commandes, error } = await supabase
            .from('commandes')
            .select(`
                *,
                client:clients(nom),
                commercial:commerciaux(nom)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(commandes);
    } catch (error) {
        console.error('Erreur lors de la récupération des commandes:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des commandes' });
    }
});

// Récupérer une commande par ID
router.get('/:id', async (req, res) => {
    try {
        const { data: commande, error } = await supabase
            .from('commandes')
            .select(`
                *,
                client:clients(nom),
                commercial:commerciaux(nom),
                lignes_commande(*)
            `)
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!commande) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }

        res.json(commande);
    } catch (error) {
        console.error('Erreur lors de la récupération de la commande:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération de la commande' });
    }
});

// Créer une nouvelle commande
router.post('/', async (req, res) => {
    const { client_id, commercial_id, date_emission, remise = 0, lignes = [] } = req.body;

    try {
        // Validation des données requises
        if (!client_id || !commercial_id || !date_emission) {
            return res.status(400).json({
                error: 'Données manquantes',
                details: 'client_id, commercial_id et date_emission sont requis'
            });
        }

        // Vérifier que le client existe
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('id')
            .eq('id', client_id)
            .single();

        if (clientError || !client) {
            console.error('Erreur client:', clientError);
            return res.status(400).json({
                error: 'Client invalide',
                details: clientError?.message || 'Client non trouvé'
            });
        }

        // Vérifier que le commercial existe
        const { data: commercial, error: commercialError } = await supabase
            .from('commerciaux')
            .select('id')
            .eq('id', commercial_id)
            .single();

        if (commercialError || !commercial) {
            console.error('Erreur commercial:', commercialError);
            return res.status(400).json({
                error: 'Commercial invalide',
                details: commercialError?.message || 'Commercial non trouvé'
            });
        }

        // Validation des lignes
        if (!Array.isArray(lignes) || lignes.length === 0) {
            return res.status(400).json({
                error: 'Lignes invalides',
                details: 'Au moins une ligne est requise'
            });
        }

        // Calcul des totaux
        const TVA_RATE = 0.15255; // Taux de TVA à 15.255%
        let total_ttc = 0;

        // Calculer le total TTC avant remise
        lignes.forEach(ligne => {
            const quantite = parseFloat(ligne.quantite) || 0;
            const prix_unitaire = parseFloat(ligne.prix_unitaire) || 0;
            const ligneTTC = quantite * prix_unitaire;
            total_ttc += ligneTTC;
        });

        // S'assurer que les valeurs sont des nombres
        total_ttc = parseFloat(total_ttc.toFixed(2));
        const remiseNumber = parseFloat(remise) || 0;

        // Appliquer la remise
        const montant_remise = (total_ttc * remiseNumber) / 100;
        const total_apres_remise = total_ttc - montant_remise;

        // Calculer la TVA sur le montant après remise
        const montant_tva = parseFloat((total_apres_remise * TVA_RATE).toFixed(2));

        // Calculer le total HT (montant après remise - montant TVA)
        const total_ht = parseFloat((total_apres_remise - montant_tva).toFixed(2));

        // Arrondir les montants à 2 décimales et s'assurer qu'ils ne sont pas null
        const commandeData = {
            numero_commande: '',
            client_id: client.id,
            commercial_id: commercial.id,
            date_emission,
            remise: remiseNumber,
            total_ht: total_ht || 0,
            total_ttc: parseFloat(total_apres_remise.toFixed(2)) || 0,
            statut: 'en_attente'
        };

        console.log('Données de la commande:', {
            total_ht,
            total_ttc: total_apres_remise,
            montant_tva,
            remise: remiseNumber
        });

        // Générer le numéro de commande
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        
        // Récupérer la dernière séquence pour aujourd'hui
        const { data: lastCommand, error: seqError } = await supabase
            .from('commandes')
            .select('numero_commande')
            .ilike('numero_commande', `CMD-${dateStr}-%`)
            .order('numero_commande', { ascending: false })
            .limit(1);

        if (seqError) {
            console.error('Erreur séquence:', seqError);
            return res.status(500).json({
                error: 'Erreur lors de la génération du numéro de commande',
                details: seqError.message
            });
        }

        let sequence = 1;
        if (lastCommand && lastCommand.length > 0) {
            const lastSeq = parseInt(lastCommand[0].numero_commande.split('-')[2]);
            sequence = lastSeq + 1;
        }

        commandeData.numero_commande = `CMD-${dateStr}-${String(sequence).padStart(3, '0')}`;

        // Créer la commande
        const { data: commande, error: commandeError } = await supabase
            .from('commandes')
            .insert(commandeData)
            .select()
            .single();

        if (commandeError) {
            console.error('Erreur création commande:', commandeError);
            return res.status(500).json({
                error: 'Erreur lors de la création de la commande',
                details: commandeError.message
            });
        }

        // Créer les lignes de commande
        const lignesData = lignes.map(ligne => ({
            commande_id: commande.id,
            code: ligne.code,
            nom_produit: ligne.nom_produit,
            quantite: ligne.quantite,
            prix_unitaire: ligne.prix_unitaire
        }));

        const { error: lignesError } = await supabase
            .from('lignes_commande')
            .insert(lignesData);

        if (lignesError) {
            console.error('Erreur création lignes:', lignesError);
            // Supprimer la commande en cas d'erreur
            await supabase
                .from('commandes')
                .delete()
                .eq('id', commande.id);

            return res.status(500).json({
                error: 'Erreur lors de la création des lignes de commande',
                details: lignesError.message
            });
        }

        // Succès
        res.json({
            message: 'Commande créée avec succès',
            commande: {
                ...commande,
                lignes: lignesData
            }
        });

    } catch (error) {
        console.error('Erreur inattendue:', error);
        res.status(500).json({
            error: 'Erreur inattendue lors de la création de la commande',
            details: error.message
        });
    }
});

// Mettre à jour une commande
router.put('/:id', async (req, res) => {
    const { client_id, commercial_id, date_emission, remise, lignes } = req.body;

    try {
        // Calcul des totaux
        const TVA_RATE = 0.15255; // Taux de TVA à 15.255%
        let total_ttc = 0;

        // Calculer le total TTC avant remise
        lignes.forEach(ligne => {
            const quantite = parseFloat(ligne.quantite) || 0;
            const prix_unitaire = parseFloat(ligne.prix_unitaire) || 0;
            const ligneTTC = quantite * prix_unitaire;
            total_ttc += ligneTTC;
        });

        // S'assurer que les valeurs sont des nombres
        total_ttc = parseFloat(total_ttc.toFixed(2));
        const remiseNumber = parseFloat(remise) || 0;

        // Appliquer la remise
        const montant_remise = (total_ttc * remiseNumber) / 100;
        const total_apres_remise = total_ttc - montant_remise;

        // Calculer la TVA sur le montant après remise
        const montant_tva = parseFloat((total_apres_remise * TVA_RATE).toFixed(2));

        // Calculer le total HT (montant après remise - montant TVA)
        const total_ht = parseFloat((total_apres_remise - montant_tva).toFixed(2));

        // Mettre à jour la commande
        const { data: commande, error: commandeError } = await supabase
            .from('commandes')
            .update({
                client_id,
                commercial_id,
                date_emission,
                total_ht: total_ht || 0,
                total_ttc: parseFloat(total_apres_remise.toFixed(2)) || 0,
                remise: remiseNumber
            })
            .eq('id', req.params.id)
            .select()
            .single();

        if (commandeError) throw commandeError;

        // Supprimer les anciennes lignes
        const { error: deleteError } = await supabase
            .from('lignes_commande')
            .delete()
            .eq('commande_id', req.params.id);

        if (deleteError) throw deleteError;

        // Ajouter les nouvelles lignes
        const lignesWithCommandeId = lignes.map(ligne => ({
            commande_id: req.params.id,
            ...ligne
        }));

        const { error: lignesError } = await supabase
            .from('lignes_commande')
            .insert(lignesWithCommandeId);

        if (lignesError) throw lignesError;

        res.json(commande);
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la commande:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour de la commande' });
    }
});

// Supprimer une commande
router.delete('/:id', async (req, res) => {
    try {
        // Supprimer d'abord les lignes de commande
        const { error: lignesError } = await supabase
            .from('lignes_commande')
            .delete()
            .eq('commande_id', req.params.id);

        if (lignesError) throw lignesError;

        // Puis supprimer la commande
        const { error: commandeError } = await supabase
            .from('commandes')
            .delete()
            .eq('id', req.params.id);

        if (commandeError) throw commandeError;

        res.status(204).send();
    } catch (error) {
        console.error('Erreur lors de la suppression de la commande:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression de la commande' });
    }
});

// Mettre à jour le statut d'une commande
router.patch('/:id/statut', async (req, res) => {
    const { statut } = req.body;

    try {
        const { data: commande, error } = await supabase
            .from('commandes')
            .update({ statut })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        res.json(commande);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du statut' });
    }
});

module.exports = router;
