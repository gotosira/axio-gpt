(function() {
  // Wait for React hydration to complete before applying theme
  // This prevents hydration mismatch errors
  
  function applyTheme() {
    try {
      var saved = localStorage.getItem('theme');
      var theme = saved || 'system';
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      var isDark = theme === 'dark' || (theme === 'system' && prefersDark);
      document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    } catch(e) {
      // Keep light theme if localStorage access fails
    }
  }
  
  // Wait for DOM to be ready and React to hydrate
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      // Additional delay to ensure React hydration is complete
      setTimeout(applyTheme, 100);
    });
  } else {
    // DOM is already ready, wait a bit for React hydration
    setTimeout(applyTheme, 200);
  }
})();
