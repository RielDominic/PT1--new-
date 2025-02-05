
// Dark Mode Toggle
const darkModeToggle = document.getElementById('darkModeToggle');
const body = document.body;

darkModeToggle.addEventListener('click', function() {
    body.classList.toggle('dark-mode');
    const icon = darkModeToggle.querySelector('.material-symbols-outlined');

    // Add animation class
    icon.classList.add('icon-animation');

    // Change the icon text content based on dark mode status
    if (body.classList.contains('dark-mode')) {
        icon.textContent = 'light_mode';  // Change icon to 'light_mode'
    } else {
        icon.textContent = 'dark_mode';   // Change icon back to 'dark_mode'
    }

    // Remove the animation class after animation duration to reset
    setTimeout(() => {
        icon.classList.remove('icon-animation');
    }, 300); // 300ms should match the duration of your animation
});