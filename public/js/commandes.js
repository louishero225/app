// Éléments du DOM
const ordersList = document.getElementById('ordersList');
const addOrderBtn = document.getElementById('addOrderBtn');
const orderModal = document.getElementById('orderModal');
const orderForm = document.getElementById('orderForm');
const cancelOrderBtn = document.getElementById('cancelOrderBtn');
const clientSelect = document.getElementById('clientSelect');
const commercialSelect = document.getElementById('commercialSelect');
const addLineBtn = document.getElementById('addLineBtn');
const orderLines = document.getElementById('orderLines');
const searchOrder = document.getElementById('searchOrder');
const filterStatus = document.getElementById('filterStatus');
const sortBy = document.getElementById('sortBy');

// Variables globales
let orders = [];
let clients = [];
let commerciaux = [];
let currentOrderId = null;

// Constantes pour les calculs
const TVA_RATE = 0.15255;
const DECIMAL_PRECISION = 2;
const MAX_QUANTITY = 9999;
const MIN_QUANTITY = 1;
const CURRENCY = 'XOF';

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        loadClients(),
        loadCommerciaux(),
        loadOrders()
    ]);
    setupEventListeners();
    setupPrixUnitaireFormatting();
    // Définir la date d'aujourd'hui par défaut
    document.getElementById('dateEmission').valueAsDate = new Date();
});

// Chargement des données
async function loadClients() {
    console.log('Tentative de chargement des clients...');
    try {
        const response = await fetch('/api/clients');
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        const data = await response.json();
        
        if (!Array.isArray(data)) {
            throw new Error('Format de données invalide');
        }
        
        clients = data;
        
        if (clients.length === 0) {
            showNotification('Aucun client disponible dans la base de données', 'warning');
            return;
        }
        
        populateClientSelect();
        console.log(`${clients.length} clients chargés avec succès`);
    } catch (error) {
        console.error('Erreur détaillée lors du chargement des clients:', error);
        showNotification('Erreur lors du chargement des clients. Veuillez rafraîchir la page.', 'error');
    }
}

async function loadCommerciaux() {
    try {
        const response = await fetch('/api/commerciaux');
        const commerciaux = await response.json();
        
        // Trier les commerciaux par nom
        commerciaux.sort((a, b) => a.nom.localeCompare(b.nom));
        
        // Stocker les commerciaux pour une utilisation ultérieure
        window.commerciaux = commerciaux;
        
        // Mettre à jour le select des commerciaux
        populateCommercialSelect();
    } catch (error) {
        console.error('Erreur lors du chargement des commerciaux:', error);
        showNotification('Erreur lors du chargement des commerciaux', 'error');
    }
}

function populateCommercialSelect() {
    const select = document.getElementById('commercialSelect');
    select.innerHTML = '<option value="">Sélectionner un commercial</option>';
    
    if (window.commerciaux && window.commerciaux.length > 0) {
        window.commerciaux.forEach(commercial => {
            const option = document.createElement('option');
            option.value = commercial.id;
            option.textContent = commercial.nom;
            select.appendChild(option);
        });
    }
}

async function loadOrders() {
    try {
        const response = await fetch('/api/commandes');
        if (!response.ok) throw new Error('Erreur lors du chargement des commandes');
        orders = await response.json();
        renderOrders();
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors du chargement des commandes', 'error');
    }
}

// Gestion des événements
function setupEventListeners() {
    addOrderBtn.addEventListener('click', () => showOrderModal());
    cancelOrderBtn.addEventListener('click', () => hideOrderModal());
    orderForm.addEventListener('submit', handleOrderSubmit);
    addLineBtn.addEventListener('click', addOrderLine);
    searchOrder.addEventListener('input', filterOrders);
    filterStatus.addEventListener('change', filterOrders);
    sortBy.addEventListener('change', filterOrders);
    document.getElementById('remiseSelect').addEventListener('change', updateTotals);
}

// Affichage des données
function renderOrders() {
    const filteredOrders = filterOrdersList();
    ordersList.innerHTML = filteredOrders.map(order => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${order.numero_commande}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${getClientName(order.client_id)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">${formatDate(order.date_emission)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${formatMontant(order.total_ttc)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${renderStatus(order.statut)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="editOrder('${order.id}')" class="text-blue-600 hover:text-blue-900 mr-3">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteOrder('${order.id}')" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderStatus(status) {
    const statusClasses = {
        en_attente: 'bg-yellow-100 text-yellow-800',
        en_cours: 'bg-blue-100 text-blue-800',
        complete: 'bg-green-100 text-green-800',
        annule: 'bg-red-100 text-red-800'
    };

    const statusLabels = {
        en_attente: 'En attente',
        en_cours: 'En cours',
        complete: 'Complété',
        annule: 'Annulé'
    };

    return `
        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status]}">
            ${statusLabels[status]}
        </span>
    `;
}

// Gestion du modal
function showOrderModal(orderId = null) {
    currentOrderId = orderId;
    orderModal.classList.remove('hidden');
    orderModal.classList.add('flex');
    
    if (orderId) {
        // Mode édition
        const order = orders.find(o => o.id === orderId);
        if (order) {
            populateOrderForm(order);
        }
    } else {
        // Mode création
        orderForm.reset();
        orderLines.innerHTML = '';
        addOrderLine();
    }
}

function hideOrderModal() {
    orderModal.classList.add('hidden');
    orderModal.classList.remove('flex');
    currentOrderId = null;
    orderForm.reset();
}

// Gestion des lignes de commande
function addOrderLine() {
    const lineDiv = document.createElement('div');
    lineDiv.className = 'grid grid-cols-12 gap-2 items-center';
    
    lineDiv.innerHTML = `
        <div class="col-span-1">
            <input type="text" name="code[]" required
                   class="w-full border rounded px-2 py-1 text-sm"
                   placeholder="Code">
        </div>
        <div class="col-span-3">
            <input type="text" name="nom_produit[]" required
                   class="w-full border rounded px-2 py-1 text-sm"
                   placeholder="Nom du produit">
        </div>
        <div class="col-span-2">
            <input type="number" name="quantite[]" required
                   min="${MIN_QUANTITY}" max="${MAX_QUANTITY}"
                   class="w-full border rounded px-2 py-1 text-sm"
                   placeholder="Quantité"
                   oninput="validateQuantity(this) && updateTotals()">
        </div>
        <div class="col-span-2">
            <input type="number" name="prix_unitaire[]" required
                   step="0.01" min="0.01"
                   class="w-full border rounded px-2 py-1 text-sm"
                   placeholder="Prix unitaire"
                   oninput="validateAmount(this) && updateTotals()">
        </div>
        <div class="col-span-3">
            <input type="text" readonly
                   class="w-full border rounded px-2 py-1 text-sm bg-gray-50"
                   value="0.00 XOF">
        </div>
        <div class="col-span-1 text-center">
            <button type="button" onclick="removeLine(this)"
                    class="text-red-500 hover:text-red-700">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    orderLines.appendChild(lineDiv);
    updateTotals();
}

function removeLine(button) {
    button.closest('.grid').remove();
    updateTotals();
}

// Calculs et mises à jour
function updateTotals() {
    let total_ttc = 0;
    const lines = orderLines.querySelectorAll('.grid');
    
    // Calculer le total TTC avant remise
    lines.forEach(line => {
        const quantite = parseFloat(line.querySelector('input[name="quantite[]"]').value) || 0;
        const prixUnitaire = parseFloat(line.querySelector('input[name="prix_unitaire[]"]').value) || 0;
        const ligneTotal = roundToDecimal(quantite * prixUnitaire);
        total_ttc += ligneTotal;
        line.querySelector('input[readonly]').value = formatMontant(ligneTotal);
    });

    // Récupérer le pourcentage de remise
    const remise = parseFloat(document.getElementById('remiseSelect').value) || 0;
    document.getElementById('pourcentageRemise').textContent = remise;

    // Calculer le montant de la remise
    const montantRemise = roundToDecimal((total_ttc * remise) / 100);

    // Calculer le montant après remise
    const totalApresRemise = roundToDecimal(total_ttc - montantRemise);

    // Calculer le montant de TVA (sur le montant après remise)
    const montantTVA = roundToDecimal(totalApresRemise * TVA_RATE);

    // Calculer le total HT (montant après remise - montant TVA)
    const totalHT = roundToDecimal(totalApresRemise - montantTVA);

    // Mettre à jour l'affichage
    document.getElementById('totalTTCAvantRemise').textContent = formatMontant(total_ttc);
    document.getElementById('montantRemise').textContent = formatMontant(-montantRemise);
    document.getElementById('montantTVA').textContent = formatMontant(montantTVA);
    document.getElementById('totalHT').textContent = formatMontant(totalHT);
    document.getElementById('montantAPayer').textContent = formatMontant(totalApresRemise);
}

// Fonction pour arrondir les nombres selon les normes comptables
function roundToDecimal(number, decimals = DECIMAL_PRECISION) {
    return Number(Math.round(number + 'e' + decimals) + 'e-' + decimals);
}

// Fonction pour valider un montant
function validateAmount(input) {
    const value = input.value.replace(',', '.');
    const number = parseFloat(value);
    
    if (isNaN(number) || number <= 0) {
        input.setCustomValidity('Veuillez entrer un montant valide supérieur à 0');
        return false;
    }
    
    // Formater avec exactement 2 décimales
    input.value = number.toFixed(DECIMAL_PRECISION);
    input.setCustomValidity('');
    return true;
}

// Fonction pour valider une quantité
function validateQuantity(input) {
    const value = parseInt(input.value);
    
    if (isNaN(value) || value < MIN_QUANTITY || value > MAX_QUANTITY) {
        input.setCustomValidity(`La quantité doit être entre ${MIN_QUANTITY} et ${MAX_QUANTITY}`);
        return false;
    }
    
    input.setCustomValidity('');
    return true;
}

// Fonction pour formater les montants en Franc CFA
function formatMontant(montant) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(montant);
}

// Fonction pour convertir un montant en entiers (centimes)
function toInteger(amount) {
    // Remplacer les virgules par des points si nécessaire
    const cleanAmount = String(amount).replace(',', '.');
    // Convertir en nombre et multiplier par 100, puis arrondir
    return Math.round(parseFloat(cleanAmount) * 100);
}

// Fonction pour formater les montants en Franc CFA
function formatMontant(montant) {
    // Convertir de centimes à euros/francs avant formatage
    const amount = montant / 100;
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Validation et conversion du prix unitaire
function validateAndConvertPrixUnitaire(input) {
    // Nettoyer l'input 
    const cleanInput = cleanPrixInput(input);
    
    // Convertir en nombre
    const prix = parseFloat(cleanInput);
    
    // Vérifier si c'est un nombre valide
    if (isNaN(prix)) {
        throw new Error('Prix unitaire invalide');
    }
    
    // Vérifier les bornes
    if (prix < 0) {
        throw new Error('Le prix doit être positif');
    }
    
    if (prix > 1000000) {
        throw new Error('Le prix est trop élevé');
    }
    
    // Convertir en centimes (entier)
    return toInteger(prix);
}

// Fonction de nettoyage avancée pour les prix
function cleanPrixInput(input) {
    // Convertir en chaîne si ce n'est pas déjà le cas
    let cleanInput = String(input);

    // Supprimer les caractères non désirés
    cleanInput = cleanInput
        // Supprimer les espaces insécables et autres espaces étranges
        .replace(/[\u00A0\u2002-\u200B\u2028-\u2029\u202F\u205F\u3000]/g, ' ')
        // Supprimer les caractères non numériques sauf . et ,
        .replace(/[^\d.,\s]/g, '')
        // Supprimer les espaces
        .replace(/\s/g, '')
        // Remplacer la virgule par un point (garder le premier point)
        .replace(/,/g, '.')
        // S'assurer qu'il n'y a qu'un seul point
        .replace(/(\..*)\./g, '$1');

    return cleanInput.trim();
}

// Ajout d'un écouteur d'événements pour formater en temps réel
function setupPrixUnitaireFormatting() {
    const orderLines = document.getElementById('orderLines');
    
    orderLines.addEventListener('input', function(event) {
        const target = event.target;
        
        // Vérifier si c'est un champ de prix unitaire
        if (target.name === 'prix_unitaire[]') {
            try {
                const prix = validateAndConvertPrixUnitaire(target.value);
                const prixFormate = formatMontant(prix);
                
                // Mettre à jour le champ avec le montant formaté
                target.value = prixFormate.replace('XOF', '').trim();
                
                // Réinitialiser les classes d'erreur
                target.classList.remove('border-red-500');
                target.classList.add('border-green-500');
                
                // Mettre à jour les totaux
                updateTotals();
            } catch (error) {
                // Afficher l'erreur et styliser le champ
                target.classList.remove('border-green-500');
                target.classList.add('border-red-500');
                showNotification(error.message, 'error');
            }
        }
    });
}

// Ajouter une validation supplémentaire lors de la soumission
function validatePrixUnitaireLignes() {
    const lignes = document.querySelectorAll('#orderLines .grid');
    
    lignes.forEach((ligne, index) => {
        const prixInput = ligne.querySelector('input[name="prix_unitaire[]"]');
        
        try {
            validateAndConvertPrixUnitaire(prixInput.value);
        } catch (erreur) {
            prixInput.classList.add('border-red-500');
            throw new Error(`Ligne ${index + 1}: ${erreur.message}`);
        }
    });
}

// Gestion du formulaire
async function handleOrderSubmit(event) {
    event.preventDefault();
    
    // Récupération du bouton de soumission
    const submitButton = orderForm.querySelector('button[type="submit"]');
    
    try {
        // Désactivation du bouton pendant le traitement
        submitButton.disabled = true;
        
        // Validation des prix unitaires avant toute autre opération
        validatePrixUnitaireLignes();
        
        const formData = new FormData(orderForm);
        const orderData = {
            client_id: formData.get('client_id'),
            commercial_id: formData.get('commercial_id'),
            date_emission: formData.get('date_emission'),
            remise: toInteger(formData.get('remise')) || 0
        };

        // Validation des champs obligatoires avec messages d'erreur détaillés
        const erreursDeSaisie = [];
        if (!orderData.client_id) erreursDeSaisie.push('Veuillez sélectionner un client');
        if (!orderData.commercial_id) erreursDeSaisie.push('Veuillez sélectionner un commercial');
        if (!orderData.date_emission) erreursDeSaisie.push('Veuillez sélectionner une date d\'émission');
        
        if (erreursDeSaisie.length > 0) {
            throw new Error(erreursDeSaisie.join('\n'));
        }

        // Validation des lignes de commande
        const lignesFormulaire = Array.from(orderLines.querySelectorAll('.grid'));
        if (lignesFormulaire.length === 0) {
            throw new Error('Veuillez ajouter au moins une ligne de commande');
        }

        // Traitement et validation des lignes de commande
        const lignes = [];
        const erreursLignes = [];

        lignesFormulaire.forEach((ligne, index) => {
            const numeroLigne = index + 1;
            try {
                const code = ligne.querySelector('input[name="code[]"]').value.trim();
                const nom_produit = ligne.querySelector('input[name="nom_produit[]"]').value.trim();
                const quantite = parseInt(ligne.querySelector('input[name="quantite[]"]').value);
                const prixUnitaireInput = ligne.querySelector('input[name="prix_unitaire[]"]').value;
                
                // Validation détaillée de chaque champ de la ligne
                if (!code) erreursLignes.push(`Ligne ${numeroLigne}: Le code produit est obligatoire`);
                if (!nom_produit) erreursLignes.push(`Ligne ${numeroLigne}: Le nom du produit est obligatoire`);
                if (isNaN(quantite) || quantite <= 0) erreursLignes.push(`Ligne ${numeroLigne}: La quantité doit être un nombre positif`);
                
                // Conversion et validation du prix unitaire
                const prix_unitaire = validateAndConvertPrixUnitaire(prixUnitaireInput);

                // Ajout de la ligne si elle est valide
                lignes.push({
                    code,
                    nom_produit,
                    quantite,
                    prix_unitaire
                });
            } catch (erreur) {
                erreursLignes.push(`Ligne ${numeroLigne}: ${erreur.message}`);
            }
        });

        if (erreursLignes.length > 0) {
            throw new Error(erreursLignes.join('\n'));
        }

        // Ajout des lignes validées aux données de la commande
        orderData.lignes = lignes;

        // Calcul des totaux
        let total_ttc = 0;
        lignes.forEach(ligne => {
            total_ttc += ligne.quantite * ligne.prix_unitaire;
        });

        // Calcul de la remise
        const montantRemise = Math.round((total_ttc * orderData.remise) / 100);
        const totalApresRemise = total_ttc - montantRemise;

        // Calcul de la TVA et du total HT
        const montantTVA = Math.round(totalApresRemise * TVA_RATE);
        const totalHT = totalApresRemise - montantTVA;

        // Ajout des totaux aux données de la commande (en entiers)
        orderData.total_ht = Math.round(totalHT);
        orderData.total_ttc = Math.round(totalApresRemise);
        orderData.montant_tva = Math.round(montantTVA);

        // Journal des données avant envoi
        console.log('Données de la commande à envoyer:', orderData);

        // Envoi au serveur avec gestion d'erreurs complète
        const response = await fetch('/api/commandes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        // Analyse de la réponse du serveur
        const resultat = await response.json();

        if (!response.ok) {
            // Gestion des différents codes d'erreur HTTP
            let messageErreur = '';
            switch (response.status) {
                case 400:
                    messageErreur = 'Données invalides: ' + (resultat.details || resultat.error || 'Erreur de validation');
                    break;
                case 401:
                    messageErreur = 'Session expirée: Veuillez vous reconnecter';
                    break;
                case 403:
                    messageErreur = 'Accès refusé: Droits insuffisants';
                    break;
                case 404:
                    messageErreur = 'Ressource introuvable';
                    break;
                case 409:
                    messageErreur = 'Conflit: Cette commande existe déjà';
                    break;
                case 500:
                    messageErreur = 'Erreur serveur: ' + (resultat.details || 'Veuillez réessayer ultérieurement');
                    break;
                default:
                    messageErreur = resultat.details || resultat.error || 'Erreur lors de l\'enregistrement';
            }
            throw new Error(messageErreur);
        }

        // Traitement en cas de succès
        console.log('Commande enregistrée avec succès:', resultat);
        hideOrderModal();
        await loadOrders();
        showNotification('Commande enregistrée avec succès', 'success');
        
    } catch (erreur) {
        console.error('Erreur détaillée:', erreur);
        showNotification(erreur.message, 'error');
    } finally {
        // Réactivation du bouton de soumission
        submitButton.disabled = false;
    }
}

// Fonction utilitaire pour la validation des nombres
function validerNombre(valeur, nomChamp) {
    const nombre = parseFloat(valeur);
    if (isNaN(nombre) || nombre <= 0) {
        throw new Error(`${nomChamp} doit être un nombre positif`);
    }
    return nombre;
}

// Fonction pour charger les clients
async function loadClients() {
    try {
        const response = await fetch('/api/clients');
        const clients = await response.json();
        
        // Trier les clients par nom
        clients.sort((a, b) => a.nom.localeCompare(b.nom));
        
        // Stocker les clients pour une utilisation ultérieure
        window.clients = clients;
        
        // Mettre à jour le select des clients
        populateClientSelect();
    } catch (error) {
        console.error('Erreur lors du chargement des clients:', error);
        showNotification('Erreur lors du chargement des clients', 'error');
    }
}

// Fonction pour peupler le select des clients
function populateClientSelect() {
    const clientSelect = document.getElementById('clientSelect');
    clientSelect.innerHTML = '<option value="">Sélectionnez un client</option>';
    
    if (window.clients && window.clients.length > 0) {
        window.clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.nom} (${client.code || 'Sans code'})`;
            clientSelect.appendChild(option);
        });
    }
}

// Fonctions utilitaires
function getClientName(clientId) {
    const client = window.clients.find(c => c.id === clientId);
    return client ? client.nom : 'Client inconnu';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function filterOrdersList() {
    let filtered = [...orders];
    
    // Filtre de recherche
    const searchTerm = searchOrder.value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(order => 
            order.numero_commande.toLowerCase().includes(searchTerm) ||
            getClientName(order.client_id).toLowerCase().includes(searchTerm)
        );
    }

    // Filtre par statut
    const statusFilter = filterStatus.value;
    if (statusFilter) {
        filtered = filtered.filter(order => order.statut === statusFilter);
    }

    // Tri
    const sortValue = sortBy.value;
    filtered.sort((a, b) => {
        switch (sortValue) {
            case 'recent':
                return new Date(b.date_emission) - new Date(a.date_emission);
            case 'ancien':
                return new Date(a.date_emission) - new Date(b.date_emission);
            case 'montant_desc':
                return b.total_ttc - a.total_ttc;
            case 'montant_asc':
                return a.total_ttc - b.total_ttc;
            default:
                return 0;
        }
    });

    return filtered;
}

function filterOrders() {
    renderOrders();
}

function showNotification(message, type = 'info') {
    const types = {
        success: { icon: '✓', color: 'bg-green-500' },
        error: { icon: '✕', color: 'bg-red-500' },
        warning: { icon: '⚠', color: 'bg-yellow-500' },
        info: { icon: 'ℹ', color: 'bg-blue-500' }
    };

    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${types[type].color} text-white px-6 py-4 rounded-lg shadow-lg z-50 flex items-center`;
    notification.innerHTML = `
        <span class="mr-2">${types[type].icon}</span>
        ${message}
    `;

    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Fonctions d'édition et de suppression
async function editOrder(orderId) {
    showOrderModal(orderId);
}

async function deleteOrder(orderId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) return;

    try {
        const response = await fetch(`/api/commandes/${orderId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Erreur lors de la suppression');

        await loadOrders();
        showNotification('Commande supprimée avec succès', 'success');
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

function populateOrderForm(order) {
    clientSelect.value = order.client_id;
    commercialSelect.value = order.commercial_id;
    document.getElementById('dateEmission').value = order.date_emission;
    orderLines.innerHTML = '';
    
    order.lignes.forEach(ligne => {
        addOrderLine();
        const lastLine = orderLines.lastElementChild;
        lastLine.querySelector('input[name="code[]"]').value = ligne.code;
        lastLine.querySelector('input[name="nom_produit[]"]').value = ligne.nom_produit;
        lastLine.querySelector('input[name="quantite[]"]').value = ligne.quantite;
        lastLine.querySelector('input[name="prix_unitaire[]"]').value = ligne.prix_unitaire;
    });

    updateTotals();
}
