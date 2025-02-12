class PreviewHandler {
  constructor () {
    this.currentZoom = CONFIG.zoom.default;
    this.currentPage = 1;
    this.pagesData = [];
    this.initElements ();
    this.bindEvents ();
  }

  initElements () {
    this.elements = {
      section: document.getElementById ('preview-section'),
      image: document.getElementById ('preview-image'),
      zoomIn: document.getElementById ('zoom-in'),
      zoomOut: document.getElementById ('zoom-out'),
      zoomLevel: document.getElementById ('zoom-level'),
      pageNav: document.getElementById ('page-nav'),
      prevPage: document.getElementById ('prev-page'),
      nextPage: document.getElementById ('next-page'),
      pageInfo: document.getElementById ('page-info'),
    };
  }

  bindEvents () {
    this.elements.zoomIn.addEventListener ('click', () => this.zoom ('in'));
    this.elements.zoomOut.addEventListener ('click', () => this.zoom ('out'));
    this.elements.prevPage.addEventListener ('click', () =>
      this.changePage (-1)
    );
    this.elements.nextPage.addEventListener ('click', () =>
      this.changePage (1)
    );
  }

  updatePreview (data) {
    console.log ('Updating preview:', data);
    this.pagesData = data.pages;
    this.updatePageNavigation (data.totalPages);
    this.displayPage (1);

    this.elements.section.classList.remove ('hidden');
    this.resetZoom ();
  }

  zoom (direction) {
    if (direction === 'in') {
      this.currentZoom = Math.min (
        this.currentZoom + CONFIG.zoom.step,
        CONFIG.zoom.max
      );
    } else {
      this.currentZoom = Math.max (
        this.currentZoom - CONFIG.zoom.step,
        CONFIG.zoom.min
      );
    }
    this.updateZoomDisplay ();
  }

  updateZoomDisplay () {
    this.elements.image.style.transform = `scale(${this.currentZoom / 100})`;
    this.elements.image.style.transformOrigin = 'top left';
    this.elements.zoomLevel.textContent = `${this.currentZoom}%`;
    this.elements.zoomOut.disabled = this.currentZoom <= CONFIG.zoom.min;
    this.elements.zoomIn.disabled = this.currentZoom >= CONFIG.zoom.max;
  }

  updatePageNavigation (totalPages) {
    if (totalPages > 1) {
      this.elements.pageNav.classList.remove ('hidden');
      this.updatePageButtons ();
    } else {
      this.elements.pageNav.classList.add ('hidden');
    }
  }

  changePage (delta) {
    const newPage = this.currentPage + delta;
    if (newPage >= 1 && newPage <= this.pagesData.length) {
      this.displayPage (newPage);
    }
  }

  displayPage (pageNum) {
    const pageData = this.pagesData[pageNum - 1];
    this.elements.image.src = pageData.preview;
    this.currentPage = pageNum;
    this.updatePageButtons ();

    // Notify OCR processor of new page data
    if (window.app && window.app.ocr) {
      window.app.ocr.displayResults (pageData.raw);
    }
  }

  updatePageButtons () {
    this.elements.prevPage.disabled = this.currentPage === 1;
    this.elements.nextPage.disabled =
      this.currentPage === this.pagesData.length;
    this.elements.pageInfo.textContent = `第 ${this.currentPage} 页，共 ${this.pagesData.length} 页`;
  }

  resetZoom () {
    this.currentZoom = CONFIG.zoom.default;
    this.updateZoomDisplay ();
  }
}
