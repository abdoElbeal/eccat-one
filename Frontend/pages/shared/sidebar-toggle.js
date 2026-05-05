/**
 * sidebar-toggle.js
 * Shared sidebar hamburger menu toggle for admin & user portals.
 * Requires: .hamburger-btn, .sidebar, .sidebar-backdrop elements in the DOM.
 */
(function () {
  'use strict';

  function initSidebarToggle() {
    const hamburger = document.getElementById('hamburgerBtn');
    const sidebar   = document.querySelector('.sidebar');
    const backdrop  = document.getElementById('sidebarBackdrop');

    if (!hamburger || !sidebar || !backdrop) return;

    function openSidebar() {
      sidebar.classList.add('open');
      backdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
      hamburger.setAttribute('aria-expanded', 'true');
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      backdrop.classList.remove('active');
      document.body.style.overflow = '';
      hamburger.setAttribute('aria-expanded', 'false');
    }

    hamburger.addEventListener('click', function () {
      if (sidebar.classList.contains('open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    backdrop.addEventListener('click', closeSidebar);

    // Close on ESC
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSidebar();
    });

    // Close when a nav link is clicked on mobile (navigates away)
    sidebar.querySelectorAll('.nav-item').forEach(function (item) {
      item.addEventListener('click', function () {
        if (window.innerWidth < 900) closeSidebar();
      });
    });

    // On resize: if desktop, clean up open state
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 900) {
        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarToggle);
  } else {
    initSidebarToggle();
  }
})();
