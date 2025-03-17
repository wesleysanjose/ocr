// static/js/document_viewer.js

/**
 * Document Viewer Module Loader
 * This file loads all document viewer modules in the correct order
 */

// Self-executing function to encapsulate module loading
(function () {
  console.log ('Initializing Document Viewer module loader...');

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
    'js/document_viewer/main.js', // Core functionality
    'js/document_viewer/preview.js', // Preview tab
    'js/document_viewer/ocr.js', // OCR text tab
    'js/document_viewer/organize.js', // Field organization tab
    'js/document_viewer/report.js', // Report generation tab
    'js/document_viewer/analysis.js', // AI analysis tab
    'js/document_viewer/utils.js', // Utility functions
    'js/document_viewer/init.js', // Initialization
  ];

  // Load modules in sequence
  function loadModules (index) {
    if (index >= modules.length) {
      console.log ('All document viewer modules loaded successfully');
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
