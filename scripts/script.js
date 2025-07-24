// Создание частиц для фона
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        // Случайные параметры для частиц
        const size = Math.random() * 8 + 2;
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const animationDuration = Math.random() * 20 + 10;
        const animationDelay = Math.random() * 5;
        const hue = Math.random() * 60 + 180; // Оттенки синего и фиолетового
        
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${posX}%`;
        particle.style.top = `${posY}%`;
        particle.style.animationDuration = `${animationDuration}s`;
        particle.style.animationDelay = `${animationDelay}s`;
        particle.style.backgroundColor = `hsl(${hue}, 100%, 70%)`;
        
        particlesContainer.appendChild(particle);
    }
}

// Анимация при скролле
function animateOnScroll() {
    const elements = document.querySelectorAll('.feature-card, .phone-mockup');
    
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        if (elementTop < windowHeight - 100) {
            element.style.opacity = 1;
            element.style.transform = 'translateY(0)';
        }
    });
}

// Mobile menu toggle
function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
    
    // Закрытие меню при клике на пункт
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
}

// Плавная прокрутка для якорных ссылок
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    setupMobileMenu();
    setupSmoothScrolling();
    
    // Начальная настройка для анимации
    document.querySelectorAll('.feature-card, .phone-mockup').forEach(el => {
        el.style.opacity = 0;
        el.style.transform = 'translateY(50px)';
        el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    });
    
    // Анимация при загрузке
    setTimeout(() => {
        document.querySelector('.hero h1').style.animation = 'fadeIn 1s forwards';
        document.querySelector('.hero p').style.animation = 'fadeIn 1s 0.3s forwards';
        document.querySelector('.hero-buttons').style.animation = 'fadeIn 1s 0.6s forwards';
    }, 500);
    
    // Слушатель скролла
    window.addEventListener('scroll', animateOnScroll);
    // Инициализация при загрузке
    animateOnScroll();
});
