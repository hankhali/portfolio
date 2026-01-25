// ==================== ENHANCED SPECTACULAR JAVASCRIPT ====================

// ==================== PARTICLE SYSTEM ====================
class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: 0, y: 0 };
        this.resize();
        this.init();
        this.bindEvents();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    init() {
        const particleCount = Math.floor((this.canvas.width * this.canvas.height) / 10000);
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 3 + 1,
                speedX: (Math.random() - 0.5) * 2,
                speedY: (Math.random() - 0.5) * 2,
                color: this.getRandomColor(),
                opacity: Math.random() * 0.8 + 0.2,
                connections: []
            });
        }
    }

    getRandomColor() {
        const colors = [
            '139, 92, 246',   // Purple
            '236, 72, 153',   // Pink
            '6, 182, 212',    // Cyan
            '16, 185, 129',   // Emerald
            '245, 158, 11'    // Orange
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
    }

    update() {
        for (let particle of this.particles) {
            // Mouse attraction
            const dx = this.mouse.x - particle.x;
            const dy = this.mouse.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 100) {
                const force = (100 - distance) / 100;
                particle.speedX += (dx / distance) * force * 0.01;
                particle.speedY += (dy / distance) * force * 0.01;
            }

            // Update position
            particle.x += particle.speedX;
            particle.y += particle.speedY;

            // Boundary checking
            if (particle.x < 0 || particle.x > this.canvas.width) particle.speedX *= -1;
            if (particle.y < 0 || particle.y > this.canvas.height) particle.speedY *= -1;

            // Friction
            particle.speedX *= 0.99;
            particle.speedY *= 0.99;

            // Opacity animation
            particle.opacity += Math.sin(Date.now() * 0.001 + particle.x * 0.01) * 0.01;
            particle.opacity = Math.max(0.1, Math.min(0.8, particle.opacity));
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw connections
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 80) {
                    const opacity = (80 - distance) / 80 * 0.3;
                    this.ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.stroke();
                }
            }
        }

        // Draw particles
        for (let particle of this.particles) {
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.fillStyle = `rgba(${particle.color}, ${particle.opacity})`;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = `rgba(${particle.color}, 0.8)`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
        this.ctx.globalAlpha = 1;
    }

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// ==================== 3D TILT EFFECTS ====================
class TiltEffect {
    constructor(element) {
        this.element = element;
        this.elementRect = element.getBoundingClientRect();
        this.glareElement = null;
        this.createGlare();
        this.bindEvents();
    }

    createGlare() {
        this.glareElement = document.createElement('div');
        this.glareElement.className = 'tilt-glare';
        this.glareElement.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, rgba(255,255,255,0.1), transparent);
            opacity: 0;
            pointer-events: none;
            border-radius: inherit;
            transition: opacity 0.3s ease;
        `;
        this.element.appendChild(this.glareElement);
    }

    bindEvents() {
        this.element.addEventListener('mouseenter', () => this.onMouseEnter());
        this.element.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.element.addEventListener('mouseleave', () => this.onMouseLeave());
    }

    onMouseEnter() {
        this.elementRect = this.element.getBoundingClientRect();
        if (this.glareElement) {
            this.glareElement.style.opacity = '1';
        }
    }

    onMouseMove(e) {
        const x = e.clientX - this.elementRect.left;
        const y = e.clientY - this.elementRect.top;
        
        const centerX = this.elementRect.width / 2;
        const centerY = this.elementRect.height / 2;
        
        const rotateX = (y - centerY) / centerY * 10;
        const rotateY = (centerX - x) / centerX * 10;
        
        this.element.style.transform = `
            perspective(1000px) 
            rotateX(${rotateX}deg) 
            rotateY(${rotateY}deg) 
            translateZ(10px)
            scale3d(1.02, 1.02, 1.02)
        `;

        if (this.glareElement) {
            const glareX = (x / this.elementRect.width) * 100;
            const glareY = (y / this.elementRect.height) * 100;
            this.glareElement.style.background = `
                radial-gradient(circle at ${glareX}% ${glareY}%, 
                rgba(255,255,255,0.3) 0%, 
                rgba(255,255,255,0.1) 50%, 
                transparent 70%)
            `;
        }
    }

    onMouseLeave() {
        this.element.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0) scale3d(1, 1, 1)';
        if (this.glareElement) {
            this.glareElement.style.opacity = '0';
        }
    }
}

// ==================== MAGNETIC EFFECTS ====================
class MagneticEffect {
    constructor(element, strength = 0.3) {
        this.element = element;
        this.strength = strength;
        this.boundingRect = element.getBoundingClientRect();
        this.bindEvents();
    }

    bindEvents() {
        this.element.addEventListener('mouseenter', () => this.onMouseEnter());
        this.element.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.element.addEventListener('mouseleave', () => this.onMouseLeave());
    }

    onMouseEnter() {
        this.boundingRect = this.element.getBoundingClientRect();
        this.element.style.transition = 'transform 0.1s ease-out';
    }

    onMouseMove(e) {
        const x = e.clientX - this.boundingRect.left;
        const y = e.clientY - this.boundingRect.top;
        
        const centerX = this.boundingRect.width / 2;
        const centerY = this.boundingRect.height / 2;
        
        const deltaX = (x - centerX) * this.strength;
        const deltaY = (y - centerY) * this.strength;
        
        this.element.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.05)`;
    }

    onMouseLeave() {
        this.element.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0.2, 1)';
        this.element.style.transform = 'translate(0, 0) scale(1)';
    }
}

// ==================== ENHANCED MOBILE MENU ====================
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        
        // Animate hamburger icon with enhanced effects
        const spans = hamburger.querySelectorAll('span');
        if (navMenu.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translateY(8px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translateY(-8px)';
            
            // Add glow effect
            hamburger.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.6)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
            hamburger.style.boxShadow = 'none';
        }
    });

    // Close menu when clicking on a link with smooth animation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            const spans = hamburger.querySelectorAll('span');
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
            hamburger.style.boxShadow = 'none';
        });
    });
}

// ==================== ENHANCED SMOOTH SCROLLING ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const navbarHeight = document.querySelector('.navbar')?.offsetHeight || 0;
            const targetPosition = target.offsetTop - navbarHeight;
            
            // Smooth scroll with easing
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
            
            // Add temporary glow effect to target section
            target.style.transition = 'box-shadow 0.5s ease';
            target.style.boxShadow = '0 0 30px rgba(139, 92, 246, 0.3)';
            setTimeout(() => {
                target.style.boxShadow = 'none';
            }, 1000);
        }
    });
});

// ==================== ENHANCED NAVBAR SCROLL EFFECT ====================
let lastScrollY = window.scrollY;

window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    const currentScrollY = window.scrollY;
    
    if (navbar) {
        if (currentScrollY > 100) {
            navbar.style.background = 'rgba(10, 10, 10, 0.95)';
            navbar.style.backdropFilter = 'blur(20px) saturate(180%)';
            navbar.style.borderBottom = '1px solid rgba(139, 92, 246, 0.3)';
            navbar.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.5)';
        } else {
            navbar.style.background = 'rgba(10, 10, 10, 0.8)';
            navbar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
            navbar.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
        }
        
        // Hide/show navbar on scroll
        if (currentScrollY > lastScrollY && currentScrollY > 200) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }
    }
    
    lastScrollY = currentScrollY;
});

// ==================== TYPEWRITER EFFECT ====================
class TypeWriter {
    constructor(element, text, speed = 50) {
        this.element = element;
        this.text = text;
        this.speed = speed;
        this.currentIndex = 0;
        this.isDeleting = false;
        this.init();
    }

    init() {
        this.element.innerHTML = '';
        this.type();
    }

    type() {
        const currentText = this.text.substring(0, this.currentIndex);
        this.element.innerHTML = currentText + '<span class="cursor">|</span>';

        if (!this.isDeleting && this.currentIndex < this.text.length) {
            this.currentIndex++;
            setTimeout(() => this.type(), this.speed);
        } else if (this.isDeleting && this.currentIndex > 0) {
            this.currentIndex--;
            setTimeout(() => this.type(), this.speed / 2);
        } else if (!this.isDeleting && this.currentIndex === this.text.length) {
            setTimeout(() => {
                this.isDeleting = true;
                this.type();
            }, 2000);
        } else if (this.isDeleting && this.currentIndex === 0) {
            this.isDeleting = false;
            setTimeout(() => this.type(), 500);
        }
    }
}

// ==================== INTERSECTION OBSERVER ANIMATIONS ====================
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const fadeInObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            
            // Add stagger effect for child elements
            const children = entry.target.querySelectorAll('.holographic-card, .floating-card, .holographic-tag');
            children.forEach((child, index) => {
                setTimeout(() => {
                    child.style.opacity = '1';
                    child.style.transform = 'translateY(0)';
                }, index * 100);
            });
        }
    });
}, observerOptions);

// ==================== PARALLAX EFFECT ====================
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const parallaxElements = document.querySelectorAll('.parallax-section');
    
    parallaxElements.forEach((element, index) => {
        const rate = scrolled * -0.5 * (index + 1);
        element.style.transform = `translateY(${rate}px)`;
    });
});

// ==================== CURSOR TRAIL EFFECT ====================
class CursorTrail {
    constructor() {
        this.dots = [];
        this.mouse = { x: 0, y: 0 };
        this.init();
    }

    init() {
        // Create trail dots
        for (let i = 0; i < 15; i++) {
            const dot = document.createElement('div');
            dot.className = 'cursor-dot';
            dot.style.cssText = `
                position: fixed;
                width: 4px;
                height: 4px;
                background: rgba(139, 92, 246, ${1 - i * 0.06});
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
                transition: transform 0.1s ease;
                box-shadow: 0 0 5px rgba(139, 92, 246, 0.8);
            `;
            document.body.appendChild(dot);
            this.dots.push({
                element: dot,
                x: 0,
                y: 0
            });
        }

        this.bindEvents();
        this.animate();
    }

    bindEvents() {
        document.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
    }

    animate() {
        let x = this.mouse.x;
        let y = this.mouse.y;

        this.dots.forEach((dot, index) => {
            dot.element.style.left = `${x - 2}px`;
            dot.element.style.top = `${y - 2}px`;
            
            dot.x = x;
            dot.y = y;
            
            if (index < this.dots.length - 1) {
                const nextDot = this.dots[index + 1];
                x += (nextDot.x - x) * 0.3;
                y += (nextDot.y - y) * 0.3;
            }
        });

        requestAnimationFrame(() => this.animate());
    }
}

// ==================== HOLOGRAPHIC BUTTON EFFECTS ====================
function initHolographicButtons() {
    const holographicButtons = document.querySelectorAll('.holographic-btn');
    
    holographicButtons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            button.style.animationDuration = '0.5s';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.animationDuration = '4s';
        });
    });
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize particle system
    const canvas = document.getElementById('particle-canvas');
    if (canvas) {
        const particleSystem = new ParticleSystem(canvas);
        particleSystem.animate();
    }

    // Initialize 3D tilt effects
    const tiltElements = document.querySelectorAll('[data-tilt]');
    tiltElements.forEach(element => {
        new TiltEffect(element);
    });

    // Initialize magnetic effects
    const magneticElements = document.querySelectorAll('.magnetic-element, .magnetic-btn');
    magneticElements.forEach(element => {
        new MagneticEffect(element);
    });

    // Initialize fade-in animations
    const fadeElements = document.querySelectorAll('.holographic-card, .floating-card, .section');
    fadeElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        fadeInObserver.observe(element);
    });

    // Initialize holographic buttons
    initHolographicButtons();

    // Initialize cursor trail for desktop
    if (window.innerWidth > 768) {
        new CursorTrail();
    }

    // Add loading animation
    document.body.style.opacity = '0';
    document.body.style.transform = 'scale(0.95)';
    document.body.style.transition = 'opacity 1s ease, transform 1s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
        document.body.style.transform = 'scale(1)';
    }, 100);
});

// ==================== PERFORMANCE OPTIMIZATIONS ====================
let ticking = false;

function requestTick() {
    if (!ticking) {
        requestAnimationFrame(updateAnimations);
        ticking = true;
    }
}

function updateAnimations() {
    // Batch DOM updates here
    ticking = false;
}

// ==================== ACCESSIBILITY ENHANCEMENTS ====================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        document.body.classList.add('user-is-tabbing');
    }
});

document.addEventListener('mousedown', () => {
    document.body.classList.remove('user-is-tabbing');
});

// Add focus styles for accessibility
const style = document.createElement('style');
style.innerHTML = `
    .user-is-tabbing *:focus {
        outline: 3px solid rgba(139, 92, 246, 0.8) !important;
        outline-offset: 2px !important;
    }
`;
document.head.appendChild(style);

// ==================== ERROR HANDLING ====================
window.addEventListener('error', (e) => {
    console.warn('Non-critical error caught:', e.error);
});

// ==================== EXPORT FOR TESTING ====================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ParticleSystem,
        TiltEffect,
        MagneticEffect,
        TypeWriter,
        CursorTrail
    };
}