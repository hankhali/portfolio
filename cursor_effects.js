// ==================== SPECTACULAR CURSOR TRAIL EFFECT ====================

class CursorTrail {
    constructor() {
        this.dots = [];
        this.mouse = { x: 0, y: 0 };
        this.init();
    }

    init() {
        // Create 12 trail dots
        for (let i = 0; i < 12; i++) {
            const dot = document.createElement('div');
            dot.className = 'cursor-dot';
            dot.style.cssText = `
                position: fixed;
                width: ${8 - i * 0.5}px;
                height: ${8 - i * 0.5}px;
                background: rgba(139, 92, 246, ${1 - i * 0.08});
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
                transition: transform 0.1s ease;
                box-shadow: 0 0 10px rgba(139, 92, 246, ${0.8 - i * 0.06});
                mix-blend-mode: screen;
            `;
            document.body.appendChild(dot);
            this.dots.push({
                element: dot,
                x: 0,
                y: 0,
                currentX: 0,
                currentY: 0
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

        document.addEventListener('mouseenter', () => {
            this.dots.forEach(dot => {
                dot.element.style.opacity = '1';
            });
        });

        document.addEventListener('mouseleave', () => {
            this.dots.forEach(dot => {
                dot.element.style.opacity = '0';
            });
        });
    }

    animate() {
        let x = this.mouse.x;
        let y = this.mouse.y;

        this.dots.forEach((dot, index) => {
            // Smooth interpolation
            dot.currentX += (x - dot.currentX) * (0.3 - index * 0.02);
            dot.currentY += (y - dot.currentY) * (0.3 - index * 0.02);
            
            dot.element.style.left = `${dot.currentX - dot.element.offsetWidth / 2}px`;
            dot.element.style.top = `${dot.currentY - dot.element.offsetHeight / 2}px`;
            
            // Set next position for the following dot
            x = dot.currentX;
            y = dot.currentY;
        });

        requestAnimationFrame(() => this.animate());
    }
}

// Initialize cursor trail when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only create cursor trail on desktop (not mobile)
    if (window.innerWidth > 768) {
        new CursorTrail();
    }
});

// ==================== ENHANCED HOVER EFFECTS ====================

// Add magnetic effect to buttons
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.btn, .btn-cv, .footer-link');
    
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transition = 'transform 0.1s ease';
        });
        
        button.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const deltaX = (x - centerX) * 0.1;
            const deltaY = (y - centerY) * 0.1;
            
            this.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.05)`;
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transition = 'transform 0.3s ease';
            this.style.transform = 'translate(0, 0) scale(1)';
        });
    });
});

// Add sparkle effect on click
document.addEventListener('click', (e) => {
    createSparkles(e.clientX, e.clientY);
});

function createSparkles(x, y) {
    for (let i = 0; i < 6; i++) {
        const sparkle = document.createElement('div');
        sparkle.style.cssText = `
            position: fixed;
            width: 4px;
            height: 4px;
            background: rgba(139, 92, 246, 0.8);
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            left: ${x}px;
            top: ${y}px;
            box-shadow: 0 0 6px rgba(139, 92, 246, 0.8);
        `;
        
        document.body.appendChild(sparkle);
        
        // Animate sparkle
        const angle = (i / 6) * Math.PI * 2;
        const distance = 30 + Math.random() * 20;
        const duration = 600 + Math.random() * 300;
        
        sparkle.animate([
            {
                transform: 'translate(0, 0) scale(1)',
                opacity: 1
            },
            {
                transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`,
                opacity: 0
            }
        ], {
            duration: duration,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }).onfinish = () => {
            sparkle.remove();
        };
    }
}