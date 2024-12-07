// Fonction pour formater les nombres en euros
function formatEuro(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

// Fonction pour formater les dates
function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Fonction pour calculer le temps écoulé
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'À l\'instant';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    
    const days = Math.floor(hours / 24);
    if (days < 30) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    
    const months = Math.floor(days / 30);
    return `Il y a ${months} mois`;
}

// Mettre à jour les statistiques
async function updateStats() {
    try {
        const response = await fetch('/api/dashboard/stats');
        const stats = await response.json();

        document.querySelector('.stats-pending').textContent = stats.pendingOrders;
        document.querySelector('.stats-payments').textContent = formatEuro(stats.totalPayments);
        document.querySelector('.stats-clients').textContent = stats.newClients;
    } catch (error) {
        console.error('Erreur lors de la mise à jour des statistiques:', error);
    }
}

// Mettre à jour les commandes récentes
async function updateRecentOrders() {
    try {
        const response = await fetch('/api/dashboard/recent-orders');
        const orders = await response.json();
        const ordersList = document.querySelector('.recent-orders');

        ordersList.innerHTML = orders.map(order => `
            <div class="flex items-center justify-between border-b pb-2">
                <div>
                    <p class="font-semibold">${order.numero_commande}</p>
                    <p class="text-sm text-gray-500">Client: ${order.clients.nom}</p>
                </div>
                <span class="px-2 py-1 ${getStatusClass(order.statut)} rounded-full text-sm">
                    ${getStatusLabel(order.statut)}
                </span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erreur lors de la mise à jour des commandes récentes:', error);
    }
}

// Mettre à jour les notifications
async function updateNotifications() {
    try {
        const response = await fetch('/api/dashboard/notifications');
        const notifications = await response.json();
        const notificationsList = document.querySelector('.notifications-list');

        notificationsList.innerHTML = notifications.map(notif => `
            <div class="flex items-start space-x-3">
                <div class="bg-${notif.color}-100 p-2 rounded-full">
                    <i class="fas fa-${notif.icon} text-${notif.color}-500"></i>
                </div>
                <div>
                    <p class="font-semibold">${notif.title}</p>
                    <p class="text-sm text-gray-500">${notif.message}</p>
                    <p class="text-xs text-gray-400">${timeAgo(notif.date)}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erreur lors de la mise à jour des notifications:', error);
    }
}

// Fonctions utilitaires pour le statut des commandes
function getStatusClass(status) {
    const statusClasses = {
        'en_attente': 'bg-yellow-100 text-yellow-800',
        'complete': 'bg-green-100 text-green-800',
        'en_cours': 'bg-blue-100 text-blue-800',
        'annule': 'bg-red-100 text-red-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
}

function getStatusLabel(status) {
    const statusLabels = {
        'en_attente': 'En attente',
        'complete': 'Complété',
        'en_cours': 'En cours',
        'annule': 'Annulé'
    };
    return statusLabels[status] || status;
}

// Navigation active state
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            navLinks.forEach(l => l.classList.remove('active'));
            e.target.closest('.nav-link').classList.add('active');
        });
    });

    // Initialiser les données
    updateStats();
    updateRecentOrders();
    updateNotifications();

    // Mettre à jour les données toutes les 5 minutes
    setInterval(() => {
        updateStats();
        updateRecentOrders();
        updateNotifications();
    }, 300000);
});

// Notification handling
let notifications = [];

function addNotification(notification) {
    notifications.unshift(notification);
    updateNotificationBadge();
    // Add to notification list if it exists
    const notificationList = document.querySelector('.notifications-list');
    if (notificationList) {
        const notificationElement = createNotificationElement(notification);
        notificationList.insertBefore(notificationElement, notificationList.firstChild);
    }
}

function updateNotificationBadge() {
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

function createNotificationElement(notification) {
    // Create notification element based on type
    // This will be implemented when we add the notifications panel
}
