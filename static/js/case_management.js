// static/js/case_management.js

/**
 * Case Management Module Loader
 * This file loads all case management modules in the correct order
 */

// Self-executing function to encapsulate module loading
(function () {
  // Helper to load a script
  function loadScript (src, callback) {
    const script = document.createElement ('script');
    script.src = src;
    script.onload = callback;
    script.onerror = function () {
      console.error ('Error loading script:', src);
    };
    document.head.appendChild (script);
  }

  // Array of modules to load in order
  const modules = [
    'js/case_management/main.js', // Core functionality
    'js/case_management/ui.js', // UI rendering
    'js/case_management/documents.js', // Document handling
    'js/case_management/operations.js', // Case operations
    'js/case_management/init.js', // Initialization
  ];

  // Load modules in sequence
  function loadModules (index) {
    if (index >= modules.length) {
      console.log ('All case management modules loaded successfully');
      return;
    }

    loadScript (modules[index], function () {
      console.log (`Loaded module: ${modules[index]}`);
      loadModules (index + 1);
    });
  }

  // Start loading modules
  loadModules (0);
}) ();
