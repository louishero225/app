const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// Récupérer tous les commerciaux
router.get('/', async (req, res) => {
    console.log('Tentative de récupération des commerciaux...');
    try {
        // Vérifier la connexion à Supabase
        console.log('URL Supabase:', process.env.SUPABASE_URL);
        
        const { data: commerciaux, error } = await supabase
            .from('commerciaux')
            .select('*')
            .order('nom');

        if (error) {
            console.error('Erreur Supabase:', error);
            throw error;
        }

        console.log('Commerciaux récupérés:', commerciaux?.length || 0);
        res.json(commerciaux || []);
    } catch (error) {
        console.error('Erreur détaillée:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des commerciaux',
            details: error.message,
            code: error.code
        });
    }
});

// Récupérer un commercial par ID
router.get('/:id', async (req, res) => {
    console.log('Tentative de récupération du commercial avec l\'ID:', req.params.id);
    try {
        // Vérifier la connexion à Supabase
        console.log('URL Supabase:', process.env.SUPABASE_URL);
        
        const { data: commercial, error } = await supabase
            .from('commerciaux')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) {
            console.error('Erreur Supabase:', error);
            throw error;
        }

        if (!commercial) {
            console.log('Commercial non trouvé avec l\'ID:', req.params.id);
            return res.status(404).json({ error: 'Commercial non trouvé' });
        }

        console.log('Commercial récupéré:', commercial);
        res.json(commercial);
    } catch (error) {
        console.error('Erreur détaillée:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        res.status(500).json({ 
            error: 'Erreur lors de la récupération du commercial',
            details: error.message,
            code: error.code
        });
    }
});

// Créer un nouveau commercial
router.post('/', async (req, res) => {
    console.log('Tentative de création d\'un nouveau commercial...');
    try {
        // Vérifier la connexion à Supabase
        console.log('URL Supabase:', process.env.SUPABASE_URL);
        
        const { nom, email, telephone } = req.body;
        
        const { data: commercial, error } = await supabase
            .from('commerciaux')
            .insert([{ nom, email, telephone }])
            .select()
            .single();

        if (error) {
            console.error('Erreur Supabase:', error);
            throw error;
        }

        console.log('Commercial créé:', commercial);
        res.status(201).json(commercial);
    } catch (error) {
        console.error('Erreur détaillée:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        res.status(500).json({ 
            error: 'Erreur lors de la création du commercial',
            details: error.message,
            code: error.code
        });
    }
});

// Mettre à jour un commercial
router.put('/:id', async (req, res) => {
    console.log('Tentative de mise à jour du commercial avec l\'ID:', req.params.id);
    try {
        // Vérifier la connexion à Supabase
        console.log('URL Supabase:', process.env.SUPABASE_URL);
        
        const { nom, email, telephone } = req.body;
        
        const { data: commercial, error } = await supabase
            .from('commerciaux')
            .update({ nom, email, telephone })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) {
            console.error('Erreur Supabase:', error);
            throw error;
        }

        if (!commercial) {
            console.log('Commercial non trouvé avec l\'ID:', req.params.id);
            return res.status(404).json({ error: 'Commercial non trouvé' });
        }

        console.log('Commercial mis à jour:', commercial);
        res.json(commercial);
    } catch (error) {
        console.error('Erreur détaillée:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        res.status(500).json({ 
            error: 'Erreur lors de la mise à jour du commercial',
            details: error.message,
            code: error.code
        });
    }
});

// Supprimer un commercial
router.delete('/:id', async (req, res) => {
    console.log('Tentative de suppression du commercial avec l\'ID:', req.params.id);
    try {
        // Vérifier la connexion à Supabase
        console.log('URL Supabase:', process.env.SUPABASE_URL);
        
        const { error } = await supabase
            .from('commerciaux')
            .delete()
            .eq('id', req.params.id);

        if (error) {
            console.error('Erreur Supabase:', error);
            throw error;
        }

        console.log('Commercial supprimé avec succès');
        res.status(204).send();
    } catch (error) {
        console.error('Erreur détaillée:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        res.status(500).json({ 
            error: 'Erreur lors de la suppression du commercial',
            details: error.message,
            code: error.code
        });
    }
});

module.exports = router;
