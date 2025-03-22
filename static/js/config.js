// static/js/config.js

const CONFIG = {
  // API endpoints
  api: {
    cases: '/api/cases',
    documents: '/api/documents',
    documentPreview: '/api/documents/{documentId}/preview',
    reports: '/api/reports',
    reportAnalyze: '/api/reports/{reportId}/analyze',
    clients: '/api/clients',
    files: '/api/files',
  },

  // Document preview settings
  preview: {
    zoom: {
      min: 25,
      max: 300,
      step: 25,
      default: 100,
    },
  },

  // Upload settings
  upload: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
  },

  // Analysis settings
  analysis: {
    defaultPrompt: 'Based on the forensic document report, please identify any errors, inconsistencies, or issues in the following categories:\n\n1. Factual accuracy\n2. Medical terminology\n3. Date and time consistency\n4. Patient identification consistency\n5. Logical flow and completeness\n\nProvide specific recommendations for corrections and improvements.',
  },
};
