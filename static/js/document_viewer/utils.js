// static/js/document_viewer/utils.js

/**
 * Utility functions for the document viewer
 */
(function (DocumentViewer) {
  /**
     * Format a date string
     * @param {string} dateString - The date string to format
     * @returns {string} - The formatted date
     */
  DocumentViewer.prototype.formatDate = function (dateString) {
    if (!dateString) return '';
    const date = new Date (dateString);
    return date.toLocaleDateString ('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  /**
     * Format a file size
     * @param {number} bytes - The size in bytes
     * @returns {string} - Formatted size with units
     */
  DocumentViewer.prototype.formatFileSize = function (bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor (Math.log (bytes) / Math.log (k));
    return parseFloat ((bytes / Math.pow (k, i)).toFixed (2)) + ' ' + sizes[i];
  };

  /**
     * Sanitize HTML to prevent XSS
     * @param {string} html - The HTML string to sanitize
     * @returns {string} - Sanitized HTML
     */
  DocumentViewer.prototype.sanitizeHtml = function (html) {
    return html
      .replace (/&/g, '&amp;')
      .replace (/</g, '&lt;')
      .replace (/>/g, '&gt;')
      .replace (/"/g, '&quot;')
      .replace (/'/g, '&#039;');
  };
}) (window.DocumentViewer);
