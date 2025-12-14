// ==================== MOBILE MENU TOGGLE ====================
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    
    // Animate hamburger icon
    const spans = hamburger.querySelectorAll('span');
    if (navMenu.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translateY(8px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translateY(-8px)';
    } else {
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
    }
});

// Close menu when clicking on a link
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        const spans = hamburger.querySelectorAll('span');
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
    });
});

// ==================== SMOOTH SCROLLING ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const navbarHeight = document.querySelector('.navbar').offsetHeight;
            const targetPosition = target.offsetTop - navbarHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ==================== NAVBAR SCROLL EFFECT ====================
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    // Add shadow on scroll
    if (currentScroll > 50) {
        navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    } else {
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    }
    
    lastScroll = currentScroll;
});

// ==================== ACTIVE SECTION HIGHLIGHT ====================
const sections = document.querySelectorAll('section[id]');

function highlightNavigation() {
    const scrollY = window.pageYOffset;
    
    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');
        const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
        
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            navLink?.classList.add('active');
        } else {
            navLink?.classList.remove('active');
        }
    });
}

window.addEventListener('scroll', highlightNavigation);

// ==================== CONTACT FORM HANDLING ====================
const contactForm = document.getElementById('contactForm');

contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;
    
    // Create mailto link with form data
    const subject = encodeURIComponent(`Portfolio Contact from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
    const mailtoLink = `mailto:haniehk43@gmail.com?subject=${subject}&body=${body}`;
    
    // Open default email client
    window.location.href = mailtoLink;
    
    // Show success message
    setTimeout(() => {
        alert('Your email client should open. If it doesn\'t, please email me directly at haniehk43@gmail.com');
        contactForm.reset();
    }, 500);
});

// ==================== CV VIEW BUTTONS ====================
const cvButtons = document.querySelectorAll('.btn-cv, .btn-secondary');

cvButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Open CV in a new window/tab
        window.open('Hanieh Khalid - Resume(fixed).pdf', '_blank');
    });
});

// ==================== TYPING EFFECT FOR HERO (OPTIONAL) ====================
// Uncomment if you want a typing effect on the hero title
/*
const heroTitle = document.querySelector('.hero-title');
const titleText = heroTitle.textContent;
heroTitle.textContent = '';

let charIndex = 0;
function typeWriter() {
    if (charIndex < titleText.length) {
        heroTitle.textContent += titleText.charAt(charIndex);
        charIndex++;
        setTimeout(typeWriter, 50);
    }
}

// Start typing effect when page loads
window.addEventListener('load', () => {
    setTimeout(typeWriter, 500);
});
*/

// ==================== SCROLL TO TOP BUTTON (OPTIONAL) ====================
// Create a scroll-to-top button
const scrollTopButton = document.createElement('button');
scrollTopButton.innerHTML = '↑';
scrollTopButton.className = 'scroll-to-top';
scrollTopButton.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 50px;
    height: 50px;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 50%;
    font-size: 24px;
    cursor: pointer;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    z-index: 999;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
`;

document.body.appendChild(scrollTopButton);

// Show/hide scroll button
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 500) {
        scrollTopButton.style.opacity = '1';
        scrollTopButton.style.visibility = 'visible';
    } else {
        scrollTopButton.style.opacity = '0';
        scrollTopButton.style.visibility = 'hidden';
    }
});

// Scroll to top on click
scrollTopButton.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Hover effect
scrollTopButton.addEventListener('mouseenter', () => {
    scrollTopButton.style.backgroundColor = 'var(--primary-dark)';
    scrollTopButton.style.transform = 'translateY(-5px)';
});

scrollTopButton.addEventListener('mouseleave', () => {
    scrollTopButton.style.backgroundColor = 'var(--primary-color)';
    scrollTopButton.style.transform = 'translateY(0)';
});

// ==================== PREVENT EMPTY FORM SUBMISSION ====================
document.querySelectorAll('input, textarea').forEach(field => {
    field.addEventListener('invalid', (e) => {
        e.preventDefault();
        field.style.borderColor = '#ef4444';
    });
    
    field.addEventListener('input', () => {
        field.style.borderColor = '';
    });
});

// ==================== MOUSE PARALLAX EFFECT ====================
document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX / window.innerWidth;
    const mouseY = e.clientY / window.innerHeight;
    
    const floatElements = document.querySelectorAll('.floating-element');
    floatElements.forEach((el, index) => {
        const speed = (index + 1) * 50;
        const x = (mouseX - 0.5) * speed;
        const y = (mouseY - 0.5) * speed;
        el.style.transform = `translate(${x}px, ${y}px)`;
    });
});

console.log('Portfolio website loaded successfully! 🚀');
