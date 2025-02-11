const CONFIG = {
  // UI configuration
  zoom: {
    min: 25,
    max: 300,
    step: 25,
    default: 100,
  },

  // Upload limits
  upload: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
  },

  // API endpoints
  api: {
    aiEndpoint: 'http://10.0.0.100:5000/v1/chat/completions',
  },

  // AI analysis settings
  analysis: {
    maxTokens: 8192,
    model: 'any-model',
  },
};
