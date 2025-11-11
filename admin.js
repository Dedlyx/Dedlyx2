// Admin JavaScript for Delyks Accounts

document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin panel loading...');

    // Initialize particles
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', particlesConfig);
        console.log('Particles initialized');
    }

    // Enhanced admin access check
    function checkAdminAccess() {
        const adminAuth = localStorage.getItem('adminAuthenticated');
        console.log('Admin auth status:', adminAuth);
        
        if (!adminAuth || adminAuth !== 'true') {
            console.log('Access denied, redirecting to main page...');
            // Multiple redirect methods for reliability
            setTimeout(() => {
                try {
                    window.location.href = 'index.html';
                } catch (error) {
                    console.error('Redirect failed:', error);
                    window.location.replace('index.html');
                }
            }, 1000);
            return false;
        }
        return true;
    }

    // Check admin access immediately
    if (!checkAdminAccess()) {
        return;
    }

    console.log('Admin access granted - loading admin panel');

    // Elements
    const logoutBtn = document.getElementById('logoutAdmin');
    const ordersTableBody = document.getElementById('ordersTableBody');
    const usersTableBody = document.getElementById('usersTableBody');
    const promoList = document.getElementById('promoList');
    const totalOrdersElem = document.getElementById('totalOrders');
    const pendingOrdersElem = document.getElementById('pendingOrders');
    const completedOrdersElem = document.getElementById('completedOrders');
    const totalRevenueElem = document.getElementById('totalRevenue');
    const activePromosElem = document.getElementById('activePromos');
    const totalReferralsElem = document.getElementById('totalReferrals');
    const screenshotModal = document.getElementById('screenshotModal');
    const screenshotImage = document.getElementById('screenshotImage');
    const screenshotProduct = document.getElementById('screenshotProduct');
    const screenshotPrice = document.getElementById('screenshotPrice');
    const screenshotPromo = document.getElementById('screenshotPromo');
    const screenshotTelegram = document.getElementById('screenshotTelegram');
    const screenshotDate = document.getElementById('screenshotDate');
    const closeScreenshot = document.querySelector('.close-screenshot');
    const channelLinkInput = document.getElementById('channelLinkInput');
    const priceStandard = document.getElementById('priceStandard');
    const pricePro = document.getElementById('pricePro');
    const priceEnterprise = document.getElementById('priceEnterprise');
    const referralPercent = document.getElementById('referralPercent');
    const newPromoCode = document.getElementById('newPromoCode');
    const newPromoDiscount = document.getElementById('newPromoDiscount');
    const newPromoUses = document.getElementById('newPromoUses');

    let orders = [];
    let users = [];
    let promoCodes = [];
    let referralSettings = { percent: 20 };

    // Initialize data
    function initializeData() {
        try {
            orders = JSON.parse(localStorage.getItem('orders')) || [];
            users = JSON.parse(localStorage.getItem('users')) || [];
            promoCodes = JSON.parse(localStorage.getItem('promoCodes')) || [];
            referralSettings = JSON.parse(localStorage.getItem('referralSettings')) || { percent: 20 };
            console.log('Admin data loaded:', {
                orders: orders.length,
                users: users.length,
                promoCodes: promoCodes.length
            });
        } catch (error) {
            console.error('Error loading admin data:', error);
            orders = [];
            users = [];
            promoCodes = [];
            referralSettings = { percent: 20 };
        }
    }

    // Load settings
    function loadSettings() {
        // Load channel link
        const savedChannelLink = localStorage.getItem('channelLink');
        if (savedChannelLink && channelLinkInput) {
            channelLinkInput.value = savedChannelLink;
        }

        // Load prices
        const prices = JSON.parse(localStorage.getItem('productPrices')) || {
            standard: 50,
            pro: 65,
            enterprise: 55
        };

        if (priceStandard) priceStandard.value = prices.standard;
        if (pricePro) pricePro.value = prices.pro;
        if (priceEnterprise) priceEnterprise.value = prices.enterprise;

        // Load referral settings
        const savedReferralSettings = JSON.parse(localStorage.getItem('referralSettings'));
        if (savedReferralSettings && referralPercent) {
            referralSettings = savedReferralSettings;
            referralPercent.value = referralSettings.percent;
        }
    }

    function loadPromoCodes() {
        if (!promoList) return;
        
        promoList.innerHTML = '';
        
        if (promoCodes.length === 0) {
            promoList.innerHTML = '<div class="no-promos">Нет активных промокодов</div>';
            return;
        }

        // Sort promoCodes by creation date (newest first)
        promoCodes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        promoCodes.forEach(promo => {
            const promoItem = document.createElement('div');
            promoItem.className = 'promo-item';
            promoItem.innerHTML = `
                <div class="promo-info">
                    <div class="promo-code">${promo.code}</div>
                    <div class="promo-details">
                        <span>Скидка: ${promo.discount}%</span>
                        <span>Использовано: ${promo.used}/${promo.maxUses}</span>
                        <span>Статус: ${promo.active ? 'Активен' : 'Неактивен'}</span>
                    </div>
                </div>
                <div class="promo-actions">
                    <button class="btn-delete" onclick="deletePromoCode('${promo.code}')">Удалить</button>
                </div>
            `;
            promoList.appendChild(promoItem);
        });
    }

    function loadOrders() {
        if (!ordersTableBody) return;
        
        ordersTableBody.innerHTML = '';
        
        if (orders.length === 0) {
            ordersTableBody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; color: var(--text-secondary);">
                        Нет заказов
                    </td>
                </tr>
            `;
            return;
        }

        // Sort orders by date (newest first)
        orders.sort((a, b) => new Date(b.date) - new Date(a.date));

        orders.forEach(order => {
            const row = document.createElement('tr');
            const date = new Date(order.date).toLocaleDateString('ru-RU');
            const time = new Date(order.date).toLocaleTimeString('ru-RU');
            const promoInfo = order.appliedPromo ? 
                `${order.appliedPromo.code} (-${order.appliedPromo.discount}%)` : 
                '—';
            
            row.innerHTML = `
                <td>#${order.id}</td>
                <td>${order.product}</td>
                <td>${order.amount}₽${order.originalAmount !== order.amount ? ` <small style="color: var(--text-secondary); text-decoration: line-through;">${order.originalAmount}₽</small>` : ''}</td>
                <td>${promoInfo}</td>
                <td>${order.telegram || 'Не указан'}</td>
                <td>${order.isReferral ? '✅' : '—'}</td>
                <td>${date} ${time}</td>
                <td class="status-${order.status}">${getStatusText(order.status)}</td>
                <td>
                    <button class="btn-view" onclick="viewScreenshot(${order.id})">
                        Просмотр
                    </button>
                </td>
                <td>
                    ${order.status === 'pending' ? 
                        `<button class="btn-complete" onclick="completeOrder(${order.id})">
                            Выполнено
                        </button>` : 
                        '<span style="color: var(--success);">✓ Завершено</span>'
                    }
                </td>
            `;
            
            ordersTableBody.appendChild(row);
        });
    }

    function loadUsers() {
        if (!usersTableBody) return;
        
        usersTableBody.innerHTML = '';
        
        if (users.length === 0) {
            usersTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-secondary);">
                        Нет пользователей
                    </td>
                </tr>
            `;
            return;
        }

        // Sort users by registration date (newest first)
        users.sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate));

        users.forEach(user => {
            const row = document.createElement('tr');
            const date = new Date(user.registrationDate).toLocaleDateString('ru-RU');
            const referrer = user.referredBy ? 
                users.find(u => u.id === user.referredBy)?.name || 'Неизвестно' : 
                '—';
            
            row.innerHTML = `
                <td>#${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.referralCode}</td>
                <td>${referrer}</td>
                <td>${user.referrals ? user.referrals.length : 0}</td>
                <td>${user.earnings || 0}₽</td>
                <td>${date}</td>
            `;
            
            usersTableBody.appendChild(row);
        });
    }

    function updateStats() {
        const total = orders.length;
        const pending = orders.filter(order => order.status === 'pending').length;
        const completed = orders.filter(order => order.status === 'completed').length;
        const revenue = orders.reduce((sum, order) => sum + order.amount, 0);
        const activePromos = promoCodes.filter(promo => promo.active).length;
        const totalReferrals = users.reduce((sum, user) => sum + (user.referrals ? user.referrals.length : 0), 0);

        if (totalOrdersElem) totalOrdersElem.textContent = total;
        if (pendingOrdersElem) pendingOrdersElem.textContent = pending;
        if (completedOrdersElem) completedOrdersElem.textContent = completed;
        if (totalRevenueElem) totalRevenueElem.textContent = revenue + '₽';
        if (activePromosElem) activePromosElem.textContent = activePromos;
        if (totalReferralsElem) totalReferralsElem.textContent = totalReferrals;
    }

    function getStatusText(status) {
        const statusMap = {
            'pending': 'Ожидает',
            'completed': 'Выполнено'
        };
        return statusMap[status] || status;
    }

    function handleLogout() {
        localStorage.removeItem('adminAuthenticated');
        showNotification('Выход из админ-панели...', 'info');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    // Make functions global for onclick handlers
    window.viewScreenshot = function(orderId) {
        const order = orders.find(o => o.id === orderId);
        if (order && order.screenshot && screenshotModal) {
            if (screenshotImage) screenshotImage.src = order.screenshot;
            if (screenshotProduct) screenshotProduct.textContent = order.product;
            if (screenshotPrice) screenshotPrice.textContent = order.amount + '₽' + (order.originalAmount !== order.amount ? ` (было ${order.originalAmount}₽)` : '');
            if (screenshotPromo) screenshotPromo.textContent = order.appliedPromo ? `${order.appliedPromo.code} (-${order.appliedPromo.discount}%)` : '—';
            if (screenshotTelegram) screenshotTelegram.textContent = order.telegram || 'Не указан';
            if (screenshotDate) screenshotDate.textContent = new Date(order.date).toLocaleString('ru-RU');
            screenshotModal.style.display = 'block';
        }
    };

    window.completeOrder = function(orderId) {
        const orderIndex = orders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            orders[orderIndex].status = 'completed';
            localStorage.setItem('orders', JSON.stringify(orders));
            loadOrders();
            updateStats();
            
            // Show notification
            showNotification('Заказ отмечен как выполненный', 'success');
        }
    };

    window.saveChannelLink = function() {
        if (!channelLinkInput) return;
        const link = channelLinkInput.value.trim();
        if (link) {
            localStorage.setItem('channelLink', link);
            showNotification('Ссылка на канал сохранена', 'success');
        } else {
            showNotification('Введите корректную ссылку', 'error');
        }
    };

    window.savePrices = function() {
        if (!priceStandard || !pricePro || !priceEnterprise) return;
        
        const prices = {
            standard: parseInt(priceStandard.value) || 50,
            pro: parseInt(pricePro.value) || 65,
            enterprise: parseInt(priceEnterprise.value) || 55
        };

        localStorage.setItem('productPrices', JSON.stringify(prices));
        showNotification('Цены успешно обновлены', 'success');
    };

    window.saveReferralSettings = function() {
        if (!referralPercent) return;
        const percent = parseInt(referralPercent.value) || 20;
        referralSettings.percent = percent;
        localStorage.setItem('referralSettings', JSON.stringify(referralSettings));
        showNotification('Настройки реферальной программы сохранены', 'success');
    };

    window.createPromoCode = function() {
        if (!newPromoCode || !newPromoDiscount || !newPromoUses) return;
        
        const code = newPromoCode.value.trim().toUpperCase();
        const discount = parseInt(newPromoDiscount.value);
        const maxUses = parseInt(newPromoUses.value);

        if (!code) {
            showNotification('Введите код промокода', 'error');
            return;
        }

        if (!discount || discount < 1 || discount > 100) {
            showNotification('Введите корректную скидку (1-100%)', 'error');
            return;
        }

        if (!maxUses || maxUses < 1) {
            showNotification('Введите корректное количество использований', 'error');
            return;
        }

        // Check if promo code already exists
        if (promoCodes.find(p => p.code === code)) {
            showNotification('Промокод с таким кодом уже существует', 'error');
            return;
        }

        const newPromo = {
            code: code,
            discount: discount,
            maxUses: maxUses,
            used: 0,
            active: true,
            createdAt: new Date().toISOString()
        };

        promoCodes.push(newPromo);
        localStorage.setItem('promoCodes', JSON.stringify(promoCodes));

        // Reset form
        newPromoCode.value = '';
        newPromoDiscount.value = '';
        newPromoUses.value = '1';

        // Reload promo codes
        loadPromoCodes();
        updateStats();
        showNotification('Промокод успешно создан', 'success');
    };

    window.deletePromoCode = function(code) {
        if (confirm('Вы уверены, что хотите удалить этот промокод?')) {
            promoCodes = promoCodes.filter(p => p.code !== code);
            localStorage.setItem('promoCodes', JSON.stringify(promoCodes));
            loadPromoCodes();
            updateStats();
            showNotification('Промокод удален', 'success');
        }
    };

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'linear-gradient(45deg, #4cc9f0, #4361ee)' : 
                         type === 'error' ? 'linear-gradient(45deg, #ef476f, #7209b7)' : 
                         'linear-gradient(45deg, #00f3ff, #9d4edd)'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);

        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.remove();
            });
        }
    }

    // Initialize admin panel
    function init() {
        console.log('Initializing admin panel...');
        
        // Initialize data
        initializeData();
        loadSettings();
        loadPromoCodes();

        // Load data
        loadOrders();
        loadUsers();
        updateStats();

        // Event listeners
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
        if (closeScreenshot) {
            closeScreenshot.addEventListener('click', () => {
                if (screenshotModal) screenshotModal.style.display = 'none';
            });
        }

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === screenshotModal) {
                screenshotModal.style.display = 'none';
            }
        });

        // Periodic access check (every 30 seconds)
        setInterval(checkAdminAccess, 30000);

        console.log('Admin panel initialized successfully');
    }

    // Start admin panel
    init();
});

// Admin particles configuration
const particlesConfig = {
    particles: {
        number: { value: 80, density: { enable: true, value_area: 800 } },
        color: { value: "#9d4edd" },
        shape: { type: "circle" },
        opacity: { value: 0.4, random: true },
        size: { value: 2, random: true },
        line_linked: {
            enable: true,
            distance: 150,
            color: "#00f3ff",
            opacity: 0.3,
            width: 1
        },
        move: {
            enable: true,
            speed: 1,
            direction: "none",
            random: true,
            out_mode: "out"
        }
    }
};