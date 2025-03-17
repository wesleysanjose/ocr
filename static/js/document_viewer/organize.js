// static/js/document_viewer/organize.js

/**
 * Organize tab functionality for DocumentViewer
 * Responsible for field organization and categorization
 */
(function (DocumentViewer) {
  /**
     * Bind events for the organize tab
     */
  DocumentViewer.prototype.bindOrganizeEvents = function () {
    if (this.elements.fieldCategoryTabs) {
      this.elements.fieldCategoryTabs.forEach (tab => {
        tab.addEventListener ('click', () => {
          const category = tab.dataset.category;
          this.switchFieldCategory (category);
        });
      });
    }

    if (this.elements.categoryHeaders) {
      this.elements.categoryHeaders.forEach ((header, index) => {
        header.addEventListener ('click', () => {
          this.toggleCategoryContent (index);
        });
      });
    }

    if (this.elements.addCustomFieldBtn) {
      this.elements.addCustomFieldBtn.addEventListener ('click', () => {
        this.showAddCustomFieldModal ();
      });
    }

    if (this.elements.copyAllFieldsBtn) {
      this.elements.copyAllFieldsBtn.addEventListener ('click', () => {
        this.copyAllFields ();
      });
    }

    if (this.elements.applyToReportBtn) {
      this.elements.applyToReportBtn.addEventListener ('click', () => {
        this.applyFieldsToReport ();
        this.switchTab ('report-tab');
      });
    }
  };

  /**
     * Save the key-value pair from the modal
     */
  DocumentViewer.prototype.saveKeyValue = function () {
    const key = this.elements.keyInput.value.trim ();
    if (!key) {
      alert ('请输入字段名称');
      return;
    }

    const value = this.elements.valueInput.value.trim ();
    const category = this.elements.categorySelect.value;

    // Store in the key-value map with category
    this.keyValueMap.set (key, {
      value: value,
      category: category,
    });

    // Update display
    this.updateKVDisplay ();

    // Clear selection after adding
    if (typeof this.clearSelection === 'function') {
      this.clearSelection ();
    }

    // Hide modal
    this.hideModal ();
  };

  /**
     * Guess category for a field based on its key
     * @param {string} key - The field key
     * @returns {string} - The guessed category
     */
  DocumentViewer.prototype.guessCategory = function (key) {
    const personalKeys = ['姓名', '性别', '年龄', '电话', '地址', '工作单位', '身份证'];
    const medicalKeys = ['医院', '诊断', '医师', '治疗', '病历', '住院', '伤情', '检查'];
    const incidentKeys = ['事故', '日期', '时间', '地点', '经过', '过程', '造成'];
    const legalKeys = ['鉴定', '法律', '责任', '条款', '标准', '伤残等级', '结论'];

    key = key.toLowerCase ();

    for (const personalKey of personalKeys) {
      if (key.includes (personalKey.toLowerCase ())) return 'personal';
    }

    for (const medicalKey of medicalKeys) {
      if (key.includes (medicalKey.toLowerCase ())) return 'medical';
    }

    for (const incidentKey of incidentKeys) {
      if (key.includes (incidentKey.toLowerCase ())) return 'incident';
    }

    for (const legalKey of legalKeys) {
      if (key.includes (legalKey.toLowerCase ())) return 'legal';
    }

    return 'personal'; // Default category
  };

  /**
     * Update the key-value display
     */
  DocumentViewer.prototype.updateKVDisplay = function () {
    if (!this.elements.kvDisplay) {
      console.error ('KV display element not found');
      return;
    }

    // Get active category from tab
    const activeCategory = this.getActiveFieldCategory ();

    // Filter fields by category if needed
    let fields = Array.from (this.keyValueMap.entries ());
    if (activeCategory !== 'all') {
      fields = fields.filter (([_, data]) => data.category === activeCategory);
    }

    if (fields.length === 0) {
      this.elements.kvDisplay.innerHTML =
        '<div class="empty-state text-center text-gray-500 py-4">未提取关键信息</div>';
      return;
    }

    const html = fields
      .map (([key, data]) => {
        const categoryClass = this.getCategoryBadgeClass (data.category);
        return `
          <div class="flex flex-wrap gap-2 mb-2 p-2 hover:bg-gray-50 border-b" data-key="${key}" data-category="${data.category}" draggable="true">
            <div class="flex-grow flex items-center">
              <span class="field-badge ${categoryClass}">${this.getCategoryLabel (data.category)}</span>
              <span class="font-semibold">${key}:</span>
              <span class="ml-2">${data.value}</span>
            </div>
            <div class="flex gap-1">
              <button class="edit-kv px-2 text-blue-500 hover:bg-blue-50 rounded" data-key="${key}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                </svg>
              </button>
              <button class="remove-kv px-2 text-red-500 hover:bg-red-50 rounded" data-key="${key}">×</button>
            </div>
          </div>
        `;
      })
      .join ('');

    this.elements.kvDisplay.innerHTML = html;

    // Attach event handlers
    this.attachKVHandlers ();

    // Update field categories for the organization panel
    this.updateFieldCategories ();

    // Enable analyze button if there are key-value pairs
    if (this.elements.analyzeBtn) {
      this.elements.analyzeBtn.disabled = false;
    }

    // Enable apply to report button
    if (this.elements.applyToReportBtn) {
      this.elements.applyToReportBtn.disabled = false;
    }
  };

  /**
     * Get CSS class for category badge
     * @param {string} category - The category name
     * @returns {string} - The CSS class
     */
  DocumentViewer.prototype.getCategoryBadgeClass = function (category) {
    switch (category) {
      case 'personal':
        return 'field-badge-personal';
      case 'medical':
        return 'field-badge-medical';
      case 'incident':
        return 'field-badge-incident';
      case 'legal':
        return 'field-badge-legal';
      default:
        return 'field-badge-personal';
    }
  };

  /**
     * Get human-readable label for category
     * @param {string} category - The category name
     * @returns {string} - The label
     */
  DocumentViewer.prototype.getCategoryLabel = function (category) {
    switch (category) {
      case 'personal':
        return '个人';
      case 'medical':
        return '医疗';
      case 'incident':
        return '事故';
      case 'legal':
        return '法律';
      default:
        return '其他';
    }
  };

  /**
     * Get the active field category
     * @returns {string} - The active category
     */
  DocumentViewer.prototype.getActiveFieldCategory = function () {
    const activeTab = Array.from (this.elements.fieldCategoryTabs).find (tab =>
      tab.classList.contains ('active')
    );
    return activeTab ? activeTab.dataset.category : 'all';
  };

  /**
     * Switch field category
     * @param {string} category - The category to switch to
     */
  DocumentViewer.prototype.switchFieldCategory = function (category) {
    // Update tabs
    this.elements.fieldCategoryTabs.forEach (tab => {
      if (tab.dataset.category === category) {
        tab.classList.add (
          'active',
          'border-b-2',
          'border-blue-500',
          'text-blue-600'
        );
        tab.classList.remove ('text-gray-600');
      } else {
        tab.classList.remove (
          'active',
          'border-b-2',
          'border-blue-500',
          'text-blue-600'
        );
        tab.classList.add ('text-gray-600');
      }
    });

    // Update displayed fields
    this.updateKVDisplay ();
  };

  /**
     * Toggle category content visibility
     * @param {number} index - The index of the category to toggle
     */
  DocumentViewer.prototype.toggleCategoryContent = function (index) {
    const content = this.elements.categoryContents[index];
    if (!content) return;

    content.classList.toggle ('hidden');

    // Update arrow icon
    const header = this.elements.categoryHeaders[index];
    if (header) {
      const arrow = header.querySelector ('svg');
      if (arrow) {
        if (content.classList.contains ('hidden')) {
          arrow.innerHTML =
            '<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />';
        } else {
          arrow.innerHTML =
            '<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />';
        }
      }
    }
  };

  /**
     * Update field categories in the UI
     */
  DocumentViewer.prototype.updateFieldCategories = function () {
    // Reset field categories
    this.fieldCategories = {
      personal: [],
      medical: [],
      incident: [],
      legal: [],
    };

    // Group fields by category
    for (const [key, data] of this.keyValueMap.entries ()) {
      const category = data.category || 'personal';
      if (this.fieldCategories[category]) {
        this.fieldCategories[category].push ({
          key: key,
          value: data.value,
        });
      }
    }

    // Update category content in the UI
    this.elements.categoryContents.forEach ((content, index) => {
      // Get category from index
      const categories = ['personal', 'medical', 'incident', 'legal'];
      const category = categories[index];

      if (!category || !this.fieldCategories[category]) return;

      const fields = this.fieldCategories[category];

      if (fields.length === 0) {
        content.innerHTML =
          '<div class="p-2 bg-gray-50 rounded text-sm">拖拽字段到此处添加到分类</div>';
        return;
      }

      content.innerHTML = fields
        .map (
          field => `
          <div class="p-2 bg-gray-50 rounded mb-1 flex justify-between items-center text-sm">
            <span class="font-medium">${field.key}:</span>
            <span class="text-gray-600">${field.value}</span>
          </div>
        `
        )
        .join ('');
    });
  };

  /**
     * Attach event handlers to key-value elements
     */
  DocumentViewer.prototype.attachKVHandlers = function () {
    if (!this.elements.kvDisplay) return;

    // Attach edit handlers
    const editButtons = this.elements.kvDisplay.querySelectorAll ('.edit-kv');
    editButtons.forEach (btn => {
      btn.addEventListener ('click', () => {
        const key = btn.dataset.key;
        const data = this.keyValueMap.get (key);
        if (data) {
          this.editKeyValue (key, data.value, data.category);
        }
      });
    });

    // Attach remove handlers
    const removeButtons = this.elements.kvDisplay.querySelectorAll (
      '.remove-kv'
    );
    removeButtons.forEach (btn => {
      btn.addEventListener ('click', () => {
        const key = btn.dataset.key;
        if (confirm (`确定要删除"${key}"吗？`)) {
          this.keyValueMap.delete (key);
          this.updateKVDisplay ();
        }
      });
    });

    // Make fields draggable
    const fieldItems = this.elements.kvDisplay.querySelectorAll ('[data-key]');
    fieldItems.forEach (item => {
      item.addEventListener ('dragstart', e => {
        e.dataTransfer.setData ('text/plain', item.dataset.key);
        e.dataTransfer.effectAllowed = 'move';
        item.classList.add ('bg-gray-100');
      });

      item.addEventListener ('dragend', () => {
        item.classList.remove ('bg-gray-100');
      });
    });

    // Set up drop targets
    const categoryContents = this.elements.categoryContents;
    if (categoryContents) {
      categoryContents.forEach ((content, index) => {
        // Get category
        const categories = ['personal', 'medical', 'incident', 'legal'];
        const category = categories[index];

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

          const key = e.dataTransfer.getData ('text/plain');
          const data = this.keyValueMap.get (key);

          if (data) {
            data.category = category;
            this.keyValueMap.set (key, data);
            this.updateKVDisplay ();
          }
        });
      });
    }
  };

  /**
     * Show the modal to edit a key-value pair
     * @param {string} key - The key to edit
     * @param {string} value - The value to edit
     * @param {string} category - The category of the field
     */
  DocumentViewer.prototype.editKeyValue = function (key, value, category) {
    // Setup modal
    if (this.elements.modalText) {
      this.elements.modalText.textContent = '';
    }

    if (this.elements.keyInput) {
      this.elements.keyInput.value = key;
    }

    if (this.elements.valueInput) {
      this.elements.valueInput.value = value;
    }

    if (this.elements.categorySelect) {
      this.elements.categorySelect.value = category || 'personal';
    }

    // Show modal
    this.showModal ();
  };

  /**
     * Show modal to add a custom field
     */
  DocumentViewer.prototype.showAddCustomFieldModal = function () {
    // Clear modal
    if (this.elements.modalText) {
      this.elements.modalText.textContent = '自定义字段';
    }

    if (this.elements.keyInput) {
      this.elements.keyInput.value = '';
    }

    if (this.elements.valueInput) {
      this.elements.valueInput.value = '';
    }

    if (this.elements.categorySelect) {
      this.elements.categorySelect.value = 'personal';
    }

    // Show modal
    this.showModal ();
  };

  /**
     * Copy all fields to clipboard
     */
  DocumentViewer.prototype.copyAllFields = function () {
    // Create formatted text of all fields
    let text = '';

    // Group by category
    const categories = {
      personal: [],
      medical: [],
      incident: [],
      legal: [],
    };

    for (const [key, data] of this.keyValueMap.entries ()) {
      const category = data.category || 'personal';
      if (categories[category]) {
        categories[category].push (`${key}: ${data.value}`);
      }
    }

    // Add each category
    if (categories.personal.length > 0) {
      text += '【个人信息】\n' + categories.personal.join ('\n') + '\n\n';
    }

    if (categories.medical.length > 0) {
      text += '【医疗信息】\n' + categories.medical.join ('\n') + '\n\n';
    }

    if (categories.incident.length > 0) {
      text += '【事故信息】\n' + categories.incident.join ('\n') + '\n\n';
    }

    if (categories.legal.length > 0) {
      text += '【法律信息】\n' + categories.legal.join ('\n') + '\n\n';
    }

    // Copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText (text)
        .then (() => {
          alert ('已复制到剪贴板');
        })
        .catch (err => {
          console.error ('复制失败:', err);
          this.fallbackCopy (text);
        });
    } else {
      this.fallbackCopy (text);
    }
  };

  /**
     * Fallback method for copying text
     * @param {string} text - The text to copy
     */
  DocumentViewer.prototype.fallbackCopy = function (text) {
    const textArea = document.createElement ('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild (textArea);
    textArea.focus ();
    textArea.select ();

    try {
      const successful = document.execCommand ('copy');
      if (successful) {
        alert ('已复制到剪贴板');
      } else {
        console.error ('复制失败');
        alert ('复制失败，请手动复制');
      }
    } catch (err) {
      console.error ('复制失败:', err);
      alert ('复制失败，请手动复制');
    }

    document.body.removeChild (textArea);
  };
}) (window.DocumentViewer);
