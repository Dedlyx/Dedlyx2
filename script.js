// Данные о платежах (в реальном приложении это должно быть на сервере)
let payments = JSON.parse(localStorage.getItem('payments')) || [];

// Функции для модального окна
function openPaymentModal() {
    document.getElementById('paymentModal').style.display = 'block';
}

function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
    // Очистка формы
    document.getElementById('screenshotUpload').value = '';
    document.getElementById('telegramUsername').value = '';
}

function copyCardNumber() {
    const cardNumber = document.getElementById('cardNumber').textContent;
    navigator.clipboard.writeText(cardNumber.replace(/\s/g, '')).then(() => {
        alert('Номер карты скопирован!');
    });
}

function submitPayment() {
    const screenshot = document.getElementById('screenshotUpload').files[0];
    const telegramUsername = document.getElementById('telegramUsername').value;
    
    if (!screenshot) {
        alert('Пожалуйста, прикрепите скриншот чека');
        return;
    }
    
    if (!telegramUsername) {
        alert('Пожалуйста, укажите ваш Telegram username');
        return;
    }
    
    // Создаем объект платежа
    const payment = {
        id: Date.now(),
        telegramUsername: telegramUsername,
        screenshot: screenshot.name,
        amount: 52,
        timestamp: new Date().toLocaleString(),
        status: 'pending'
    };
    
    // Сохраняем в localStorage
    payments.push(payment);
    localStorage.setItem('payments', JSON.stringify(payments));
    
    alert('Данные успешно отправлены! Менеджер свяжется с вами в Telegram в течение 15 минут.');
    closePaymentModal();
}

function scrollToProducts() {
    document.getElementById('products').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Закрытие модального окна при клике вне его
window.onclick = function(event) {
    const modal = document.getElementById('paymentModal');
    if (event.target === modal) {
        closePaymentModal();
    }
}

// Функция для админ-панели
function getPayments() {
    return JSON.parse(localStorage.getItem('payments')) || [];
}

function updatePayments(payments) {
    localStorage.setItem('payments', JSON.stringify(payments));
}