// Portfolio Animation Controller
document.addEventListener('DOMContentLoaded', function() {
    const loadingScreen = document.getElementById('loading-screen');
    const portfolio = document.getElementById('portfolio');
    
    // Wait for the Sonic dash animation to complete (2.5 seconds)
    // Then transition to the portfolio
    setTimeout(function() {
        // Fade out loading screen
        loadingScreen.classList.add('fade-out');
        
        // Show portfolio after loading screen fades
        setTimeout(function() {
            loadingScreen.style.display = 'none';
            portfolio.classList.remove('hidden');
            
            // Trigger reflow to ensure transition works
            void portfolio.offsetWidth;
            
            portfolio.classList.add('visible');
        }, 500);
    }, 2500);
    
    // Add smooth scrolling for any anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Add intersection observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe skill cards for animation
    document.querySelectorAll('.skill-card').forEach(card => {
        observer.observe(card);
    });
    
    // Observe project cards for animation
    document.querySelectorAll('.project-card').forEach(card => {
        observer.observe(card);
    });
    
    // Observe timeline items for animation
    document.querySelectorAll('.timeline-item').forEach(item => {
        observer.observe(item);
    });
    
    // Add parallax effect to hero section on mouse move
    const hero = document.querySelector('.hero');
    const sonicHero = document.querySelector('.sonic-hero');
    
    if (hero && sonicHero) {
        hero.addEventListener('mousemove', function(e) {
            const rect = hero.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            
            sonicHero.style.transform = `translate(${x * 20}px, ${y * 20}px) rotate(${x * 10}deg)`;
        });
        
        hero.addEventListener('mouseleave', function() {
            sonicHero.style.transform = 'translate(0, 0) rotate(0deg)';
        });
    }
    
    // Add click effect to skill cards
    document.querySelectorAll('.skill-card').forEach(card => {
        card.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
    
    // Contact form handling
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value;
            
            // Simple validation
            if (!name || !email || !subject || !message) {
                alert('Please fill in all fields.');
                return;
            }
            
            // Create mailto link
            const mailtoLink = `mailto:michaelkingjr12@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`;
            
            // Open email client
            window.location.href = mailtoLink;
            
            // Reset form
            contactForm.reset();
            
            // Show success message (in a real app, you'd send this to a server)
            alert('Thank you for your message! I\'ll get back to you soon.');
        });
    }
    
    // Add hover effects to project cards
    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Add typing effect to hero subtitle
    const subtitle = document.querySelector('.subtitle');
    if (subtitle) {
        const text = subtitle.textContent;
        subtitle.textContent = '';
        
        let i = 0;
        const typeWriter = () => {
            if (i < text.length) {
                subtitle.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            }
        };
        
        setTimeout(typeWriter, 1000);
    }
    
    console.log('Portfolio loaded successfully!');
});
