// Éléments du DOM
const clientsList = document.getElementById('clientsList');
const searchInput = document.getElementById('searchClient');
const sortSelect = document.getElementById('sortBy');
const addClientBtn = document.getElementById('addClientBtn');
const clientModal = document.getElementById('clientModal');
const clientForm = document.getElementById('clientForm');
const cancelClientBtn = document.getElementById('cancelClientBtn');
const modalTitle = document.getElementById('modalTitle');

// État de l'application
let clients = [];
let currentClientId = null;

// Gestionnaires d'événements
document.addEventListener('DOMContentLoaded', () => {
    loadClients();
    setupEventListeners();
});

function setupEventListeners() {
    addClientBtn.addEventListener('click', () => openModal());
    cancelClientBtn.addEventListener('click', closeModal);
    clientForm.addEventListener('submit', handleClientSubmit);
    searchInput.addEventListener('input', filterClients);
    sortSelect.addEventListener('change', sortClients);

    // Fermer le modal en cliquant en dehors
    clientModal.addEventListener('click', (e) => {
        if (e.target === clientModal) closeModal();
    });
}

// Fonctions de gestion des clients
async function loadClients() {
    try {
        const response = await fetch('/api/clients');
        if (!response.ok) throw new Error('Erreur lors du chargement des clients');
        
        clients = await response.json();
        renderClients(clients);
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors du chargement des clients', 'error');
    }
}

function renderClients(clientsToRender) {
    clientsList.innerHTML = clientsToRender.map(client => `
        <tr class="hover:bg-gray-50 cursor-pointer" onclick="showClientDetails('${client.id}')">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${client.nom}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">${client.email || '-'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">${client.telephone}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-500">${client.adresse}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="editClient('${client.id}'); event.stopPropagation();" class="text-blue-600 hover:text-blue-900 mr-3">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteClient('${client.id}'); event.stopPropagation();" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function filterClients() {
    const searchTerm = searchInput.value.toLowerCase();
    const filtered = clients.filter(client => 
        client.nom.toLowerCase().includes(searchTerm) ||
        client.email.toLowerCase().includes(searchTerm) ||
        client.telephone.includes(searchTerm)
    );
    renderClients(filtered);
}

function sortClients() {
    const sortValue = sortSelect.value;
    const sorted = [...clients].sort((a, b) => {
        switch (sortValue) {
            case 'nom':
                return a.nom.localeCompare(b.nom);
            case 'recent':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'ancien':
                return new Date(a.created_at) - new Date(b.created_at);
            default:
                return 0;
        }
    });
    renderClients(sorted);
}

// Gestion du modal
function openModal(clientId = null) {
    currentClientId = clientId;
    modalTitle.textContent = clientId ? 'Modifier le Client' : 'Nouveau Client';
    clientModal.classList.remove('hidden');
    clientModal.classList.add('flex');

    if (clientId) {
        const client = clients.find(c => c.id === clientId);
        if (client) {
            document.getElementById('clientName').value = client.nom;
            document.getElementById('clientEmail').value = client.email;
            document.getElementById('clientPhone').value = client.telephone;
            document.getElementById('clientAddress').value = client.adresse;
        }
    } else {
        clientForm.reset();
    }
}

function closeModal() {
    clientModal.classList.add('hidden');
    clientModal.classList.remove('flex');
    currentClientId = null;
    clientForm.reset();
}

// Gestion des formulaires
async function handleClientSubmit(e) {
    e.preventDefault();

    const formData = new FormData(clientForm);
    const clientData = {
        nom: formData.get('nom'),
        email: formData.get('email'),
        telephone: formData.get('telephone'),
        adresse: formData.get('adresse')
    };

    try {
        const url = currentClientId 
            ? `/api/clients/${currentClientId}`
            : '/api/clients';
        
        const method = currentClientId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clientData)
        });

        if (!response.ok) throw new Error('Erreur lors de la sauvegarde');

        await loadClients();
        closeModal();
        showNotification(
            `Client ${currentClientId ? 'modifié' : 'ajouté'} avec succès`,
            'success'
        );
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la sauvegarde du client', 'error');
    }
}

async function deleteClient(clientId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;

    try {
        const response = await fetch(`/api/clients/${clientId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Erreur lors de la suppression');

        await loadClients();
        showNotification('Client supprimé avec succès', 'success');
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la suppression du client', 'error');
    }
}

// Fonction pour afficher les détails d'un client
async function showClientDetails(clientId) {
    try {
        const response = await fetch(`/api/clients/${clientId}/details`);
        if (!response.ok) throw new Error('Erreur lors du chargement des détails');
        
        const data = await response.json();
        
        // Masquer le message "pas de client sélectionné"
        document.getElementById('noClientSelected').classList.add('hidden');
        document.getElementById('clientInfo').classList.remove('hidden');

        // Mettre à jour les informations du client
        document.getElementById('detailClientName').textContent = data.client.nom;
        document.getElementById('detailClientEmail').textContent = data.client.email || 'Non renseigné';
        document.getElementById('detailClientPhone').textContent = data.client.telephone;
        document.getElementById('detailClientAddress').textContent = data.client.adresse;

        // Mettre à jour les statistiques
        document.getElementById('totalOrders').textContent = data.stats.totalOrders;
        document.getElementById('totalAmount').textContent = formatMontant(data.stats.totalAmount);
        document.getElementById('lastOrderDate').textContent = data.stats.lastOrderDate 
            ? formatDate(data.stats.lastOrderDate) 
            : 'Aucune commande';
        document.getElementById('averageOrder').textContent = formatMontant(data.stats.averageOrder);

        // Afficher les dernières transactions
        const transactionsHtml = data.stats.recentTransactions.map(transaction => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                    <p class="font-medium">${transaction.numero_commande}</p>
                    <p class="text-sm text-gray-500">${formatDate(transaction.created_at)}</p>
                </div>
                <div class="text-right">
                    <p class="font-medium">${formatMontant(transaction.total_ttc)}</p>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(transaction.statut)}">
                        ${transaction.statut}
                    </span>
                </div>
            </div>
        `).join('');
        
        document.getElementById('recentTransactions').innerHTML = transactionsHtml || 
            '<p class="text-gray-500 text-center">Aucune transaction récente</p>';

        // Afficher le graphique d'activité
        renderActivityChart(data.stats.monthlyActivity);
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors du chargement des détails du client', 'error');
    }
}

// Fonction pour formater les dates
function formatDate(dateString) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
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

// Fonction pour obtenir la classe CSS selon le statut
function getStatusClass(status) {
    const statusClasses = {
        'en_attente': 'bg-yellow-100 text-yellow-800',
        'en_cours': 'bg-blue-100 text-blue-800',
        'complete': 'bg-green-100 text-green-800',
        'annule': 'bg-red-100 text-red-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
}

// Fonction pour afficher le graphique d'activité
function renderActivityChart(monthlyActivity) {
    const chartContainer = document.getElementById('activityChart');
    
    // Calculer la hauteur maximale pour le graphique
    const maxTotal = Math.max(...monthlyActivity.map(m => m.total));
    
    const barsHtml = monthlyActivity.map(month => {
        const height = maxTotal > 0 ? (month.total / maxTotal) * 100 : 0;
        const monthName = new Date(month.month + '-01').toLocaleDateString('fr-FR', { month: 'short' });
        
        return `
            <div class="flex flex-col items-center">
                <div class="relative w-8 bg-gray-200 rounded-t" style="height: 120px;">
                    <div class="absolute bottom-0 w-full bg-orange-500 rounded-t" 
                         style="height: ${height}%;" 
                         title="${formatMontant(month.total)}"></div>
                </div>
                <span class="text-xs mt-2">${monthName}</span>
            </div>
        `;
    }).join('');

    chartContainer.innerHTML = `
        <div class="flex justify-between items-end h-full p-4">
            ${barsHtml}
        </div>
    `;
}

// Utilitaires
function showNotification(message, type = 'info') {
    // Implémenter le système de notification ici
    alert(message);
}
