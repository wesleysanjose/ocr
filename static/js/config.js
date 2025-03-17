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
    baseUrl: '/api',
    aiEndpoint: 'http://10.0.0.100:11434/v1/chat/completions',
  },

  // AI analysis settings
  analysis: {
    maxTokens: 8192,
    model: 'any-model',
  },

  // default system messages and user messages
  defaultChatCompletionMessages: {
    system: '你是一个有经验的医生',
    user: `基于报告扫描的内容，请仔细检查确认报告是正确的，没有错误用语，错别字，特别是医学用语和药品名称。报告首先给个整体的结果，是否有错误。`,
  },
};
