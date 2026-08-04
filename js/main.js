document.addEventListener('DOMContentLoaded', () => {
    // 1. Select the root element (<html>) and the navigation bar
    const root = document.documentElement;
    const nav = document.getElementById('main-nav');
    
    // 2. Check for saved theme in localStorage OR system preferences
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let currentTheme = savedTheme ? savedTheme : (systemPrefersDark ? 'dark' : 'light');
    
    // Apply the initial theme immediately
    root.setAttribute('data-theme', currentTheme);

    // 3. Create the Theme Toggle Button dynamically
    const themeBtn = document.createElement('button');
    themeBtn.id = 'theme-toggle';
    themeBtn.setAttribute('aria-label', 'Toggle Dark/Light Mode');
    
    // Inline styles to make it look good in the navbar without needing extra CSS
    themeBtn.style.background = 'none';
    themeBtn.style.border = 'none';
    themeBtn.style.cursor = 'pointer';
    themeBtn.style.fontSize = '1.2rem';
    themeBtn.style.marginLeft = '15px';
    themeBtn.style.padding = '5px';
    themeBtn.style.transition = 'transform 0.2s';
    
    // Set the initial icon based on the current theme
    themeBtn.innerText = currentTheme === 'dark' ? '☀️' : '🌙';

    // Hover effect
    themeBtn.addEventListener('mouseenter', () => themeBtn.style.transform = 'scale(1.1)');
    themeBtn.addEventListener('mouseleave', () => themeBtn.style.transform = 'scale(1)');

    // 4. Inject the button into the navigation bar
    if (nav) {
        nav.appendChild(themeBtn);
    }

    // 5. Handle the click event to switch themes
    themeBtn.addEventListener('click', () => {
        // Toggle the theme variable
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        // Update the HTML attribute for CSS variables
        root.setAttribute('data-theme', currentTheme);
        
        // Save the user's preference to their browser
        localStorage.setItem('theme', currentTheme);
        
        // Swap the icon
        themeBtn.innerText = currentTheme === 'dark' ? '☀️' : '🌙';
    });
});
