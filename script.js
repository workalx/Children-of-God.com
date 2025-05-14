let currentLang = 'en';

function setInitialLanguage() {
    // Оновлюємо всі елементи з data-uk/data-en/data-ru
    document.querySelectorAll('[data-uk]').forEach(element => {
        const text = element.getAttribute('data-en');
        if (text) element.textContent = text;
    });
    document.documentElement.lang = 'en';
    document.querySelector('.logo-uk').style.display = 'none';
    document.querySelector('.logo-en').style.display = 'none';
    document.querySelector('.logo-en-white').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', function() {
    setInitialLanguage && setInitialLanguage();
    animateOnScroll && animateOnScroll();

    // Плавний скрол до блоку about (content-box) з відступом 50px від верху
    const aboutLink = document.querySelector('a[href="#about"]');
    const aboutBlock = document.getElementById('about');
    if (aboutLink && aboutBlock) {
        aboutLink.addEventListener('click', function(e) {
            e.preventDefault();
            const rect = aboutBlock.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const targetScroll = rect.top + scrollTop - 50;
            window.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
        });
    }

    // Плавний скрол до блоку media з відступом 50px від верху
    const mediaLinks = document.querySelectorAll('a[href="#media"]');
    const mediaBlock = document.getElementById('media');
    if (mediaLinks.length && mediaBlock) {
        mediaLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const rect = mediaBlock.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const targetScroll = rect.top + scrollTop - 50;
                window.scrollTo({
                    top: targetScroll,
                    behavior: 'smooth'
                });
            });
        });
    }
});

function toggleLanguage() {
    if (currentLang === 'uk') {
        currentLang = 'en';
        document.querySelector('.logo-uk').style.display = 'none';
        document.querySelector('.logo-en').style.display = 'none';
        document.querySelector('.logo-en-white').style.display = 'block';
    } else if (currentLang === 'en') {
        currentLang = 'ru';
        document.querySelector('.logo-en-white').style.display = 'none';
        document.querySelector('.logo-uk').style.display = 'block';
    } else {
        currentLang = 'uk';
        document.querySelector('.logo-uk').style.display = 'block';
        document.querySelector('.logo-en-white').style.display = 'none';
    }

    // Оновлюємо всі елементи з data-uk/data-en/data-ru
    document.querySelectorAll('[data-uk]').forEach(element => {
        const text = element.getAttribute(`data-${currentLang}`);
        if (text) element.textContent = text;
    });

    // Оновлюємо мову документа
    document.documentElement.lang = currentLang;
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
    document.body.classList.add('modal-open');
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.classList.remove('modal-open');
}

// Анімація появи при скролі
function animateOnScroll() {
    const elements = document.querySelectorAll('.animate-on-scroll');
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    elements.forEach(el => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', animateOnScroll); 