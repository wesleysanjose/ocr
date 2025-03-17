// static/js/document_viewer/init.js

/**
 * Initialization for the DocumentViewer
 * Creates the document viewer instance and sets up global handlers
 */
(function () {
  /**
     * Initialize the document viewer when the DOM is loaded
     */
  function initDocumentViewer () {
    console.log ('Initializing document viewer...');

    // Create document viewer instance
    window.documentViewer = new DocumentViewer ();

    // Bind events for each module
    if (typeof window.documentViewer.bindPreviewEvents === 'function') {
      window.documentViewer.bindPreviewEvents ();
    }

    if (typeof window.documentViewer.bindOcrEvents === 'function') {
      window.documentViewer.bindOcrEvents ();
    }

    if (typeof window.documentViewer.bindOrganizeEvents === 'function') {
      window.documentViewer.bindOrganizeEvents ();
    }

    if (typeof window.documentViewer.bindReportEvents === 'function') {
      window.documentViewer.bindReportEvents ();
    }

    if (typeof window.documentViewer.bindAnalysisEvents === 'function') {
      window.documentViewer.bindAnalysisEvents ();
    }

    if (typeof window.documentViewer.bindModalEvents === 'function') {
      window.documentViewer.bindModalEvents ();
    }

    // Setup drag and drop for field organization
    setupDragAndDrop ();

    console.log ('Document viewer initialization complete');
  }

  /**
     * Setup drag and drop functionality for field organization
     */
  function setupDragAndDrop () {
    console.log ('Setting up drag and drop functionality...');

    // Setup drag and drop for category sections
    const categoryContents = document.querySelectorAll ('.category-content');
    if (!categoryContents.length) {
      console.warn ('No category content elements found for drag and drop');
      return;
    }

    categoryContents.forEach ((content, index) => {
      // Make it a drop target
      content.addEventListener ('dragover', e => {
        e.preventDefault ();
        content.classList.add ('bg-blue-50', 'border-blue-300');
      });

      content.addEventListener ('dragleave', () => {
        content.classList.remove ('bg-blue-50', 'border-blue-300');
      });

      content.addEventListener ('drop', e => {
        e.preventDefault ();
        content.classList.remove ('bg-blue-50', 'border-blue-300');

        // Get the key from the drag data
        const key = e.dataTransfer.getData ('text/plain');

        // Update category if document viewer is available
        if (window.documentViewer && window.documentViewer.keyValueMap) {
          const data = window.documentViewer.keyValueMap.get (key);
          if (data) {
            // Get category from index
            const categories = ['personal', 'medical', 'incident', 'legal'];
            const category = categories[index];

            // Update category
            data.category = category;
            window.documentViewer.keyValueMap.set (key, data);

            // Update display
            if (typeof window.documentViewer.updateKVDisplay === 'function') {
              window.documentViewer.updateKVDisplay ();
            }
          }
        }
      });
    });

    console.log ('Drag and drop setup complete');
  }

  /**
     * Make field placeholders in the report editable
     */
  function setupFieldPlaceholders () {
    console.log ('Setting up field placeholders...');

    const placeholders = document.querySelectorAll ('.field-placeholder');
    if (!placeholders.length) {
      console.warn ('No field placeholders found');
      return;
    }

    placeholders.forEach (placeholder => {
      // Make clickable to edit
      placeholder.addEventListener ('click', () => {
        const fieldName = placeholder.dataset.field;
        const currentValue = placeholder.textContent;

        // Prompt for a new value
        const newValue = prompt (`请输入${fieldName}的值:`, currentValue);

        if (newValue !== null && newValue.trim () !== '') {
          placeholder.textContent = newValue;
          placeholder.classList.add ('text-blue-800');

          // Update in keyValueMap if available
          updateFieldInKeyValueMap (fieldName, newValue);
        }
      });

      // Add tooltip
      placeholder.title = '点击编辑';
    });

    console.log ('Field placeholders setup complete');
  }

  /**
     * Update a field in the keyValueMap
     * @param {string} fieldName - The field name
     * @param {string} newValue - The new value
     */
  function updateFieldInKeyValueMap (fieldName, newValue) {
    if (!window.documentViewer || !window.documentViewer.keyValueMap) return;

    // Map field names to likely key names
    const fieldMapping = {
      name: ['姓名', '名字', '被鉴定人'],
      gender: ['性别'],
      age: ['年龄', '岁数'],
      workUnit: ['工作单位', '单位', '就职单位'],
      accidentDate: ['事故日期', '事故时间', '日期'],
      accidentLocation: ['事故地点', '地点', '位置'],
      accidentDetails: ['事故经过', '事故描述', '经过', '描述'],
      hospital: ['医院', '就诊医院', '住院医院'],
      diagnosis: ['诊断', '诊断结果', '伤情'],
      hospitalDays: ['住院天数', '住院时间'],
      conclusion: ['结论', '鉴定结论', '伤残等级'],
      assessmentOrg: ['鉴定机构', '鉴定单位'],
      assessmentDate: ['鉴定日期', '鉴定时间'],
      assessor: ['鉴定人', '鉴定专家'],
      certNumber: ['证书编号', '执业证号', '编号'],
    };

    // Get potential key names for this field
    const potentialKeys = fieldMapping[fieldName] || [fieldName];

    // First, check if the field already exists
    for (const [key, data] of window.documentViewer.keyValueMap.entries ()) {
      for (const potentialKey of potentialKeys) {
        if (
          key === potentialKey ||
          key.includes (potentialKey) ||
          potentialKey.includes (key)
        ) {
          // Update existing field
          data.value = newValue;
          window.documentViewer.keyValueMap.set (key, data);

          // Update display if function is available
          if (typeof window.documentViewer.updateKVDisplay === 'function') {
            window.documentViewer.updateKVDisplay ();
          }

          return;
        }
      }
    }

    // If not found, create a new entry with the first potential key
    const category = guessFieldCategory (fieldName);
    window.documentViewer.keyValueMap.set (potentialKeys[0], {
      value: newValue,
      category: category,
    });

    // Update display if function is available
    if (typeof window.documentViewer.updateKVDisplay === 'function') {
      window.documentViewer.updateKVDisplay ();
    }
  }

  /**
     * Guess the category for a field
     * @param {string} fieldName - The field name
     * @returns {string} - The guessed category
     */
  function guessFieldCategory (fieldName) {
    const personalFields = ['name', 'gender', 'age', 'workUnit'];
    const medicalFields = ['hospital', 'diagnosis', 'hospitalDays'];
    const incidentFields = [
      'accidentDate',
      'accidentLocation',
      'accidentDetails',
    ];
    const legalFields = [
      'conclusion',
      'assessmentOrg',
      'assessmentDate',
      'assessor',
      'certNumber',
    ];

    if (personalFields.includes (fieldName)) return 'personal';
    if (medicalFields.includes (fieldName)) return 'medical';
    if (incidentFields.includes (fieldName)) return 'incident';
    if (legalFields.includes (fieldName)) return 'legal';

    return 'personal'; // Default
  }

  // Initialize on DOM content loaded
  document.addEventListener ('DOMContentLoaded', () => {
    initDocumentViewer ();
    setupFieldPlaceholders ();
  });
}) ();
