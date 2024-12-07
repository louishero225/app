const express = require('express');
const path = require('path');
const dashboardRoutes = require('./routes/dashboard');
const clientsRoutes = require('./routes/clients');
const commandesRoutes = require('./routes/commandes');
const commerciauxRoutes = require('./routes/commerciaux');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes API
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/commandes', commandesRoutes);
app.use('/api/commerciaux', commerciauxRoutes);

// Route pour servir l'application frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Une erreur est survenue !' });
});

app.listen(port, () => {
    console.log(`Serveur démarré sur le port ${port}`);
});
