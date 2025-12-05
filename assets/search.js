/**
 * GitBook Custom Search - Front-end search using FlexSearch
 */
(function () {
  'use strict';

  // FlexSearch CDN
  var FLEXSEARCH_CDN =
    'https://cdn.jsdelivr.net/npm/flexsearch@0.7.43/dist/flexsearch.bundle.min.js';

  var searchIndex = null;
  var searchPages = [];
  var searchInput = null;
  var searchResults = null;
  var searchWrapper = null;
  var isIndexLoaded = false;
  var isInitialized = false;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-initialize on GitBook page changes (AJAX navigation)
  if (typeof gitbook !== 'undefined') {
    gitbook.events.bind('page.change', function () {
      // Re-create UI after page change, but don't reload the index
      createSearchUI();
    });
  } else {
    // Wait for gitbook to be available
    var checkGitbook = setInterval(function () {
      if (typeof gitbook !== 'undefined') {
        clearInterval(checkGitbook);
        gitbook.events.bind('page.change', function () {
          createSearchUI();
        });
      }
    }, 100);
  }

  function init() {
    if (isInitialized) return;
    isInitialized = true;

    loadFlexSearch(function () {
      createSearchUI();
      loadSearchPages();
    });
  }

  function loadFlexSearch(callback) {
    if (typeof FlexSearch !== 'undefined') {
      callback();
      return;
    }

    var script = document.createElement('script');
    script.src = FLEXSEARCH_CDN;
    script.onload = callback;
    script.onerror = function () {
      console.error('[custom-search] Failed to load FlexSearch library');
    };
    document.head.appendChild(script);
  }

  function createSearchUI() {
    // Check if UI already exists
    var existingWrapper = document.querySelector('#custom-search-wrapper');
    var existingResults = document.querySelector('#custom-search-results');

    if (existingWrapper && existingResults) {
      // UI already exists, just update references
      searchWrapper = existingWrapper;
      searchInput = existingWrapper.querySelector('input');
      searchResults = existingResults;
      return;
    }

    // Find GitBook's search container or create our own
    var bookSearchInput = document.querySelector('#book-search-input input');

    if (bookSearchInput) {
      searchInput = bookSearchInput;
      searchWrapper = document.querySelector('#book-search-input');
    } else {
      // Remove any existing wrapper first
      if (existingWrapper) {
        existingWrapper.remove();
      }

      searchWrapper = document.createElement('div');
      searchWrapper.id = 'custom-search-wrapper';
      searchWrapper.innerHTML =
        '<input type="text" placeholder="Search..." id="custom-search-input">';
      searchInput = searchWrapper.querySelector('input');

      var sidebar = document.querySelector('.book-summary');
      if (sidebar) {
        sidebar.insertBefore(searchWrapper, sidebar.firstChild);
      } else {
        document.body.insertBefore(searchWrapper, document.body.firstChild);
      }
    }

    // Remove any existing results container
    if (existingResults) {
      existingResults.remove();
    }

    // Create results container
    searchResults = document.createElement('div');
    searchResults.id = 'custom-search-results';
    searchResults.className = 'search-results';
    searchResults.style.cssText =
      'display:none;position:absolute;background:#fff;border:1px solid #ddd;' +
      'max-height:400px;overflow-y:auto;width:100%;z-index:1000;box-shadow:0 2px 8px rgba(0,0,0,0.15);';

    if (searchWrapper) {
      searchWrapper.style.position = 'relative';
      searchWrapper.appendChild(searchResults);
    }

    // Bind events
    searchInput.addEventListener('input', debounce(performSearch, 200));
    searchInput.addEventListener('focus', function () {
      if (searchResults && searchResults.innerHTML) {
        searchResults.style.display = 'block';
      }
    });

    document.addEventListener('click', function (e) {
      if (searchWrapper && !searchWrapper.contains(e.target)) {
        if (searchResults) searchResults.style.display = 'none';
      }
    });

    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (searchResults) searchResults.style.display = 'none';
        searchInput.blur();
      }
    });
  }

  function loadSearchPages() {
    var basePath = getBasePath();
    var url = basePath + 'assets/search_pages.json';

    fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error('Not found: ' + url);
        return response.json();
      })
      .then(function (pages) {
        searchPages = pages;
        buildIndex(pages);
      })
      .catch(function (err) {
        console.warn(
          '[custom-search] Could not load search index:',
          err.message
        );
        console.warn(
          '[custom-search] Run "gitbook build" to generate the search index.'
        );
      });
  }

  function buildIndex(pages) {
    try {
      // Create FlexSearch Document index
      searchIndex = new FlexSearch.Document({
        document: {
          id: 'path',
          index: ['title', 'content'],
          store: ['title', 'path'],
        },
        tokenize: 'forward',
        charset: 'latin:advanced',
      });

      // Add all pages to the index
      pages.forEach(function (page) {
        searchIndex.add(page);
      });

      isIndexLoaded = true;
      console.log(
        '[custom-search] Search index built with',
        pages.length,
        'pages'
      );
    } catch (err) {
      console.error('[custom-search] Failed to build index:', err);
    }
  }

  function performSearch() {
    var query = searchInput.value.trim();

    if (!query) {
      searchResults.style.display = 'none';
      searchResults.innerHTML = '';
      return;
    }

    if (!isIndexLoaded) {
      searchResults.innerHTML =
        '<div class="search-result-item" style="padding:10px;color:#999;">Loading search index...</div>';
      searchResults.style.display = 'block';
      return;
    }

    try {
      var results = searchIndex.search(query, {
        limit: 20,
        enrich: true,
      });

      displayResults(results, query);
    } catch (err) {
      console.error('[custom-search] Search error:', err);
      searchResults.innerHTML =
        '<div class="search-result-item" style="padding:10px;color:#c00;">Search error</div>';
      searchResults.style.display = 'block';
    }
  }

  function displayResults(results, query) {
    // Flatten and dedupe results from different fields
    var seen = {};
    var items = [];

    results.forEach(function (fieldResult) {
      if (fieldResult.result) {
        fieldResult.result.forEach(function (item) {
          var doc = item.doc || item;
          var path = doc.path || item.id;

          if (!seen[path]) {
            seen[path] = true;
            items.push({
              path: path,
              title: doc.title || formatPath(path),
            });
          }
        });
      }
    });

    if (items.length === 0) {
      searchResults.innerHTML =
        '<div class="search-result-item" style="padding:10px 15px;color:#666;">No results found</div>';
      searchResults.style.display = 'block';
      return;
    }

    var html = items
      .map(function (item) {
        var href = getBasePath() + item.path.replace(/\.md$/, '.html');
        var title = highlightMatch(item.title || formatPath(item.path), query);

        return (
          '<a href="' +
          href +
          '" class="search-result-item" style="' +
          'display:block;padding:10px 15px;text-decoration:none;color:#333;' +
          'border-bottom:1px solid #eee;">' +
          '<div class="search-result-title" style="font-weight:500;">' +
          title +
          '</div>' +
          '<div class="search-result-path" style="font-size:12px;color:#999;margin-top:2px;">' +
          item.path +
          '</div>' +
          '</a>'
        );
      })
      .join('');

    searchResults.innerHTML = html;
    searchResults.style.display = 'block';

    // Add hover effects
    var resultItems = searchResults.querySelectorAll('.search-result-item');
    resultItems.forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        this.style.backgroundColor = '#f5f5f5';
      });
      el.addEventListener('mouseleave', function () {
        this.style.backgroundColor = '';
      });
    });
  }

  function highlightMatch(text, query) {
    if (!text || !query) return text || '';
    var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regex = new RegExp('(' + escaped + ')', 'gi');
    return text.replace(
      regex,
      '<mark style="background:#ff0;padding:0 2px;">$1</mark>'
    );
  }

  function formatPath(path) {
    return path
      .replace(/\.md$/, '')
      .replace(/[_-]/g, ' ')
      .replace(/\//g, ' › ')
      .replace(/\b\w/g, function (c) {
        return c.toUpperCase();
      });
  }

  function getBasePath() {
    var path = window.location.pathname;
    var depth = (path.match(/\//g) || []).length - 1;
    var base = '';
    for (var i = 0; i < depth; i++) {
      base += '../';
    }
    return base || './';
  }

  function debounce(fn, delay) {
    var timeout;
    return function () {
      var context = this;
      var args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function () {
        fn.apply(context, args);
      }, delay);
    };
  }
})();
