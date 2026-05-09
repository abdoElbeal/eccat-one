/**
 * sidebar-toggle.js
 * Shared sidebar hamburger menu toggle for admin & user portals.
 * Uses event delegation to support dynamic HTML injection.
 */
(function () {
  'use strict';

  function initSidebarToggle() {
    // We attach listeners to the document so they work even if 
    // the sidebar/hamburger are injected dynamically later.
    
    function getSidebar() { return document.querySelector('.sidebar'); }
    function getBackdrop() { return document.getElementById('sidebarBackdrop'); }
    function getHamburger() { return document.getElementById('hamburgerBtn'); }

    function openSidebar() {
      const sidebar = getSidebar();
      const backdrop = getBackdrop();
      const hamburger = getHamburger();
      if (sidebar) sidebar.classList.add('open');
      if (backdrop) backdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (hamburger) hamburger.setAttribute('aria-expanded', 'true');
    }

    function closeSidebar() {
      const sidebar = getSidebar();
      const backdrop = getBackdrop();
      const hamburger = getHamburger();
      if (sidebar) sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('active');
      document.body.style.overflow = '';
      if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    }

    document.addEventListener('click', function (e) {
      // Check if click is on hamburger or inside it
      const hamburger = e.target.closest('#hamburgerBtn');
      if (hamburger) {
        const sidebar = getSidebar();
        if (sidebar && sidebar.classList.contains('open')) {
          closeSidebar();
        } else {
          openSidebar();
        }
        return;
      }

      // Check if click is on backdrop
      if (e.target.closest('#sidebarBackdrop')) {
        closeSidebar();
        return;
      }

      // Check if click is on a nav link on mobile
      const navItem = e.target.closest('.sidebar .nav-item');
      if (navItem && window.innerWidth < 900) {
        closeSidebar();
      }
    });

    // Close on ESC
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSidebar();
    });

    // On resize: if desktop, clean up open state
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 900) {
        const sidebar = getSidebar();
        const backdrop = getBackdrop();
        if (sidebar) sidebar.classList.remove('open');
        if (backdrop) backdrop.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  // We can initialize immediately since event delegation attaches to document
  initSidebarToggle();
})();
