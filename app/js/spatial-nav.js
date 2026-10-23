/**
 * Spatial Navigation for LG webOS Smart TV
 * Tailored for Magic Remote (air mouse / pointer) and D-Pad (Up, Down, Left, Right, OK, Back)
 */

var SpatialNav = (function() {
  var focusableSelector = 'button, [tabindex="0"], select, input:not([type="checkbox"]), textarea, .nav-btn, .server-item-card, .routing-card, .btn, .btn-sub-action, .toggle-switch, .setting-item-toggle, .setting-item';

  function isVisible(el) {
    if (!el || el.disabled || el.offsetParent === null) return false;
    var style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  function getSidebarButtons() {
    return Array.from(document.querySelectorAll('.sidebar .nav-btn')).filter(isVisible);
  }

  function getActiveTabContentFocusables() {
    var activeTab = document.querySelector('.tab-page.active');
    if (!activeTab) return [];
    return Array.from(activeTab.querySelectorAll(focusableSelector)).filter(function(el) {
      if (!isVisible(el)) return false;

      // In Subscriptions tab: focus action buttons, NOT the card wrapper
      if (el.classList.contains('sub-item-card')) return false;

      // In Settings tab:
      // If setting-item is a toggle row (.setting-item-toggle or contains toggle-switch), keep the row itself as focusable
      if (el.classList.contains('setting-item')) {
        if (el.classList.contains('setting-item-toggle') || el.querySelector('.toggle-switch')) {
          return true;
        }
        var innerControl = el.querySelector('.btn, input, select');
        if (innerControl && isVisible(innerControl)) return false;
      }

      // If toggle-switch is inside a focusable setting-item, avoid duplicate tab stops
      if (el.classList.contains('toggle-switch') && el.closest('.setting-item-toggle, .setting-item[tabindex="0"]')) {
        return false;
      }

      return true;
    });
  }

  function setFocus(el) {
    if (!el) return;

    // Guaranteed removal of focus state from all elements
    document.querySelectorAll('.focus').forEach(function(item) {
      item.classList.remove('focus');
    });
    document.querySelectorAll('.setting-item-focused').forEach(function(item) {
      item.classList.remove('setting-item-focused');
    });

    el.focus();
    el.classList.add('focus');

    // Emphasize setting row when a toggle switch or control inside is focused
    var settingRow = el.closest('.setting-item');
    if (settingRow) {
      settingRow.classList.add('setting-item-focused');
      var toggle = settingRow.querySelector('.toggle-switch');
      if (toggle) {
        toggle.classList.add('focus');
      }
    }

    if (typeof el.scrollIntoView === 'function') {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (e) {
        el.scrollIntoView(false);
      }
    }
  }

  function getTabEntryElement(activeTab) {
    if (!activeTab) return null;
    var id = activeTab.id;

    if (id === 'tab-dashboard') {
      return activeTab.querySelector('#main-power-btn') || activeTab.querySelector('#dash-switch-server-btn');
    }
    if (id === 'tab-servers') {
      var refreshBtn = activeTab.querySelector('#servers-refresh-sub-btn');
      if (refreshBtn && isVisible(refreshBtn)) return refreshBtn;
      var pingBtn = activeTab.querySelector('#ping-all-btn');
      if (pingBtn && isVisible(pingBtn)) return pingBtn;
      var activeServer = activeTab.querySelector('.server-item-card.active');
      if (activeServer && isVisible(activeServer)) return activeServer;
      var firstServer = activeTab.querySelector('.server-item-card');
      if (firstServer && isVisible(firstServer)) return firstServer;
      return activeTab.querySelector('#btn-goto-subs');
    }
    if (id === 'tab-subs') {
      return activeTab.querySelector('#sub-add-url-input') || activeTab.querySelector('#btn-add-sub') || activeTab.querySelector('.btn-sub-action');
    }
    if (id === 'tab-routing') {
      return activeTab.querySelector('.routing-card.active') || activeTab.querySelector('.routing-card');
    }
    if (id === 'tab-settings') {
      return activeTab.querySelector('#theme-btn-dark') || activeTab.querySelector('#row-setting-autostart') || activeTab.querySelector('.btn');
    }
    if (id === 'tab-logs') {
      return activeTab.querySelector('#btn-refresh-logs') || activeTab.querySelector('#logs-terminal');
    }

    return activeTab.querySelector(focusableSelector);
  }

  function moveWithinContent(current, direction) {
    var items = getActiveTabContentFocusables();
    var curRect = current.getBoundingClientRect();
    var activeTab = document.querySelector('.tab-page.active');
    var tabId = activeTab ? activeTab.id : '';

    // ==========================================
    // SPECIAL RULES: TAB SERVERS HEADER & GRID
    // ==========================================
    if (tabId === 'tab-servers') {
      var isRefreshSub = current.id === 'servers-refresh-sub-btn';
      var isPingAll = current.id === 'ping-all-btn';

      if (isRefreshSub) {
        if (direction === 'right') {
          var pBtn = document.getElementById('ping-all-btn');
          if (pBtn && isVisible(pBtn)) return pBtn;
        } else if (direction === 'left') {
          return document.querySelector('.sidebar .nav-btn.active') || document.querySelector('.sidebar .nav-btn');
        } else if (direction === 'down') {
          var activeCard = activeTab.querySelector('.server-item-card.active') || activeTab.querySelector('.server-item-card');
          if (activeCard && isVisible(activeCard)) return activeCard;
        }
      }

      if (isPingAll) {
        if (direction === 'left') {
          var rBtn = document.getElementById('servers-refresh-sub-btn');
          if (rBtn && isVisible(rBtn)) return rBtn;
          return document.querySelector('.sidebar .nav-btn.active') || document.querySelector('.sidebar .nav-btn');
        } else if (direction === 'down') {
          var sCards = activeTab.querySelectorAll('.server-item-card');
          if (sCards.length > 1 && isVisible(sCards[1])) return sCards[1];
          if (sCards.length > 0 && isVisible(sCards[0])) return sCards[0];
        }
      }

      var isServerCard = current.classList.contains('server-item-card');
      if (isServerCard) {
        if (direction === 'up') {
          // Find card directly above current
          var serverAbove = null;
          var minDy = Infinity;
          items.forEach(function(el) {
            if (!el.classList.contains('server-item-card') || el === current) return;
            var r = el.getBoundingClientRect();
            if (r.bottom <= curRect.top + 15) {
              var dy = curRect.top - r.bottom;
              if (dy < minDy && Math.abs((r.left + r.width / 2) - (curRect.left + curRect.width / 2)) < (curRect.width * 0.75)) {
                minDy = dy;
                serverAbove = el;
              }
            }
          });
          if (serverAbove) return serverAbove;

          // Top row: return to corresponding header button
          var curCenterX = curRect.left + curRect.width / 2;
          var windowHalf = window.innerWidth / 2;
          if (curCenterX < windowHalf) {
            var rBtn = document.getElementById('servers-refresh-sub-btn');
            if (rBtn && isVisible(rBtn)) return rBtn;
          }
          var pBtn = document.getElementById('ping-all-btn');
          if (pBtn && isVisible(pBtn)) return pBtn;
          return document.getElementById('servers-refresh-sub-btn');
        } else if (direction === 'left') {
          // Check if there is a server card to the left (e.g. column 1 -> column 0)
          var cardLeft = null;
          var minDx = Infinity;
          items.forEach(function(el) {
            if (!el.classList.contains('server-item-card') || el === current) return;
            var r = el.getBoundingClientRect();
            if (r.right <= curRect.left + 15) {
              var dx = curRect.left - r.right;
              var dy = Math.abs((r.top + r.height / 2) - (curRect.top + curRect.height / 2));
              if (dx < minDx && dy < 70) {
                minDx = dx;
                cardLeft = el;
              }
            }
          });
          if (cardLeft) return cardLeft;

          // Leftmost column card: return to sidebar
          return document.querySelector('.sidebar .nav-btn.active') || document.querySelector('.sidebar .nav-btn');
        }
      }
    }

    // ==========================================
    // SPECIAL RULES: TAB DASHBOARD
    // ==========================================
    if (tabId === 'tab-dashboard') {
      if (current.id === 'main-power-btn') {
        if (direction === 'left') {
          return document.querySelector('.sidebar .nav-btn.active') || document.querySelector('.sidebar .nav-btn');
        }
        if (direction === 'right') {
          return document.getElementById('dash-switch-server-btn') || document.getElementById('dash-test-conn-btn');
        }
      }
    }

    // ==========================================
    // SPECIAL RULES: TAB SUBSCRIPTIONS
    // ==========================================
    if (tabId === 'tab-subs') {
      if (current.id === 'sub-add-url-input') {
        if (direction === 'right') {
          var addBtn = document.getElementById('btn-add-sub');
          if (addBtn && isVisible(addBtn)) return addBtn;
        } else if (direction === 'left') {
          return document.querySelector('.sidebar .nav-btn.active') || document.querySelector('.sidebar .nav-btn');
        } else if (direction === 'down') {
          var firstSubBtn = activeTab.querySelector('.subs-cards-container .btn-sub-action');
          if (firstSubBtn && isVisible(firstSubBtn)) return firstSubBtn;
        }
      }

      if (current.id === 'btn-add-sub') {
        if (direction === 'left') {
          var addInput = document.getElementById('sub-add-url-input');
          if (addInput && isVisible(addInput)) return addInput;
        } else if (direction === 'down') {
          var firstSubBtn = activeTab.querySelector('.subs-cards-container .btn-sub-action');
          if (firstSubBtn && isVisible(firstSubBtn)) return firstSubBtn;
        }
      }

      if (current.classList.contains('btn-sub-action')) {
        var curCard = current.closest('.sub-item-card');
        var cardButtons = curCard ? Array.from(curCard.querySelectorAll('.btn-sub-action')).filter(isVisible) : [];
        var btnIdx = cardButtons.indexOf(current);

        if (direction === 'left') {
          if (btnIdx > 0) {
            return cardButtons[btnIdx - 1];
          }
          return document.querySelector('.sidebar .nav-btn.active') || document.querySelector('.sidebar .nav-btn');
        }

        if (direction === 'right') {
          if (btnIdx >= 0 && btnIdx < cardButtons.length - 1) {
            return cardButtons[btnIdx + 1];
          }
        }

        if (direction === 'up') {
          var allCards = Array.from(activeTab.querySelectorAll('.sub-item-card'));
          var curCardIdx = allCards.indexOf(curCard);
          if (curCardIdx > 0) {
            var prevCard = allCards[curCardIdx - 1];
            var prevBtns = Array.from(prevCard.querySelectorAll('.btn-sub-action')).filter(isVisible);
            if (prevBtns.length > 0) {
              return prevBtns[Math.min(btnIdx, prevBtns.length - 1)];
            }
          }
          var input = document.getElementById('sub-add-url-input');
          if (input && isVisible(input)) return input;
          return document.getElementById('btn-add-sub');
        }

        if (direction === 'down') {
          var allCards = Array.from(activeTab.querySelectorAll('.sub-item-card'));
          var curCardIdx = allCards.indexOf(curCard);
          if (curCardIdx >= 0 && curCardIdx < allCards.length - 1) {
            var nextCard = allCards[curCardIdx + 1];
            var nextBtns = Array.from(nextCard.querySelectorAll('.btn-sub-action')).filter(isVisible);
            if (nextBtns.length > 0) {
              return nextBtns[Math.min(btnIdx, nextBtns.length - 1)];
            }
          }
        }
      }
    }

    // ==========================================
    // GENERAL GEOMETRIC SPATIAL NAVIGATION
    // ==========================================
    var candidates = [];
    items.forEach(function(el) {
      if (el === current) return;
      var r = el.getBoundingClientRect();

      var match = false;
      var primaryDist = 0;
      var secDist = 0;
      var isDirectNeighbor = false;

      if (direction === 'left') {
        // Element must be positioned to the left
        if (r.right <= curRect.left + 8) {
          primaryDist = curRect.left - r.right;
          var curCenterY = curRect.top + curRect.height / 2;
          var candCenterY = r.top + r.height / 2;
          secDist = Math.abs(curCenterY - candCenterY);

          // Vertical overlap check
          var topOverlap = Math.max(curRect.top, r.top);
          var bottomOverlap = Math.min(curRect.bottom, r.bottom);
          if (bottomOverlap - topOverlap > 4) {
            isDirectNeighbor = true;
            match = true;
          } else if (secDist < Math.max(curRect.height, r.height) * 2.0 + 80) {
            match = true;
          }
        }
      } else if (direction === 'right') {
        if (r.left >= curRect.right - 8) {
          primaryDist = r.left - curRect.right;
          var curCenterY = curRect.top + curRect.height / 2;
          var candCenterY = r.top + r.height / 2;
          secDist = Math.abs(curCenterY - candCenterY);

          var topOverlap = Math.max(curRect.top, r.top);
          var bottomOverlap = Math.min(curRect.bottom, r.bottom);
          if (bottomOverlap - topOverlap > 4) {
            isDirectNeighbor = true;
            match = true;
          } else if (secDist < Math.max(curRect.height, r.height) * 2.0 + 80) {
            match = true;
          }
        }
      } else if (direction === 'up') {
        if (r.bottom <= curRect.top + 8) {
          primaryDist = curRect.top - r.bottom;
          var curCenterX = curRect.left + curRect.width / 2;
          var candCenterX = r.left + r.width / 2;
          secDist = Math.abs(curCenterX - candCenterX);

          var leftOverlap = Math.max(curRect.left, r.left);
          var rightOverlap = Math.min(curRect.right, r.right);
          if (rightOverlap - leftOverlap > 4) {
            isDirectNeighbor = true;
            match = true;
          } else if (secDist < Math.max(curRect.width, r.width) * 2.5 + 250) {
            match = true;
          }
        }
      } else if (direction === 'down') {
        if (r.top >= curRect.bottom - 8) {
          primaryDist = r.top - curRect.bottom;
          var curCenterX = curRect.left + curRect.width / 2;
          var candCenterX = r.left + r.width / 2;
          secDist = Math.abs(curCenterX - candCenterX);

          var leftOverlap = Math.max(curRect.left, r.left);
          var rightOverlap = Math.min(curRect.right, r.right);
          if (rightOverlap - leftOverlap > 4) {
            isDirectNeighbor = true;
            match = true;
          } else if (secDist < Math.max(curRect.width, r.width) * 2.5 + 250) {
            match = true;
          }
        }
      }

      if (match) {
        var score = isDirectNeighbor ? primaryDist : (primaryDist + secDist * 2.5 + 300);
        candidates.push({ el: el, score: score });
      }
    });

    if (candidates.length > 0) {
      candidates.sort(function(a, b) { return a.score - b.score; });
      return candidates[0].el;
    }

    // Fallback: If pressing LEFT and there is NO content element to the left, smoothly return to sidebar
    if (direction === 'left') {
      return document.querySelector('.sidebar .nav-btn.active') || document.querySelector('.sidebar .nav-btn');
    }

    return null;
  }

  function moveFocus(direction) {
    var qrModal = document.getElementById('qr-modal');
    if (qrModal && qrModal.style.display !== 'none') {
      var btnClose = document.getElementById('btn-close-qr');
      if (btnClose) setFocus(btnClose);
      return;
    }

    var current = document.activeElement;
    var sidebarButtons = getSidebarButtons();
    var isCurrentInSidebar = current && current.closest('.sidebar');

    if (!current || (!isCurrentInSidebar && !current.closest('.content-area'))) {
      var activeTab = document.querySelector('.tab-page.active');
      var entry = getTabEntryElement(activeTab) || sidebarButtons[0];
      setFocus(entry);
      return;
    }

    if (isCurrentInSidebar) {
      var curIdx = sidebarButtons.indexOf(current);
      if (direction === 'up') {
        if (curIdx > 0) {
          var prevBtn = sidebarButtons[curIdx - 1];
          setFocus(prevBtn);
          prevBtn.click();
        }
      } else if (direction === 'down') {
        if (curIdx >= 0 && curIdx < sidebarButtons.length - 1) {
          var nextBtn = sidebarButtons[curIdx + 1];
          setFocus(nextBtn);
          nextBtn.click();
        }
      } else if (direction === 'right') {
        var activeTabNow = document.querySelector('.tab-page.active');
        var entryEl = getTabEntryElement(activeTabNow);
        if (entryEl) setFocus(entryEl);
      }
      return;
    }

    // Inside content area
    var next = moveWithinContent(current, direction);
    if (next) {
      setFocus(next);
    }
  }

  var lastNavTime = 0;

  function handleKeyDown(e) {
    var code = e.keyCode || e.which;

    // Throttle fast bounce on D-Pad navigation keys (Left, Up, Right, Down)
    if (code >= 37 && code <= 40) {
      var now = Date.now();
      if (now - lastNavTime < 65) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
      lastNavTime = now;
    }

    var VK_LEFT = 37;
    var VK_UP = 38;
    var VK_RIGHT = 39;
    var VK_DOWN = 40;
    var VK_ENTER = 13;
    var VK_BACK = 461; // webOS remote BACK key
    var VK_ESC = 27;
    var VK_RED = 403;    // Red / 1 dot: Toggle VPN
    var VK_GREEN = 404;  // Green / 2 dots: Ping Server
    var VK_YELLOW = 405; // Yellow / 3 dots: Go to Servers
    var VK_BLUE = 406;   // Blue / 4 dots: Go to Settings

    switch (code) {
      case VK_RED:
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (window.AppController && window.AppController.togglePower) {
          window.AppController.togglePower();
        }
        break;
      case VK_GREEN:
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (window.AppController && window.AppController.pingCurrent) {
          window.AppController.pingCurrent();
        }
        break;
      case VK_YELLOW:
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (window.AppController && window.AppController.switchTab) {
          window.AppController.switchTab('tab-servers', true);
        }
        break;
      case VK_BLUE:
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (window.AppController && window.AppController.switchTab) {
          window.AppController.switchTab('tab-settings', true);
        }
        break;
      case VK_LEFT:
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        moveFocus('left');
        break;
      case VK_UP:
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        moveFocus('up');
        break;
      case VK_RIGHT:
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        moveFocus('right');
        break;
      case VK_DOWN:
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        moveFocus('down');
        break;
      case VK_ENTER:
        var cur = document.activeElement;
        if (cur) {
          var chk = null;
          if (cur.classList.contains('toggle-switch')) {
            chk = cur.querySelector('input[type="checkbox"]');
          } else if (cur.classList.contains('setting-item-toggle')) {
            chk = cur.querySelector('input[type="checkbox"]');
          } else if (cur.classList.contains('setting-item')) {
            chk = cur.querySelector('input[type="checkbox"]');
          } else if (cur.closest('.setting-item-toggle')) {
            chk = cur.closest('.setting-item-toggle').querySelector('input[type="checkbox"]');
          } else if (cur.closest('.setting-item')) {
            if (!cur.classList.contains('btn') && cur.tagName !== 'INPUT' && cur.tagName !== 'BUTTON') {
              chk = cur.closest('.setting-item').querySelector('input[type="checkbox"]');
            }
          }

          if (chk) {
            e.preventDefault();
            chk.checked = !chk.checked;
            try {
              chk.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (err) {
              var evt = document.createEvent('HTMLEvents');
              evt.initEvent('change', true, true);
              chk.dispatchEvent(evt);
            }
            return;
          }

          if (cur.id === 'btn-close-qr') {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.closeQrModal === 'function') {
              window.closeQrModal();
            }
            return;
          }

          if (cur.classList.contains('nav-btn')) {
            e.preventDefault();
            cur.click();
            setTimeout(function() {
              var activeTab = document.querySelector('.tab-page.active');
              var entryEl = getTabEntryElement(activeTab);
              if (entryEl) setFocus(entryEl);
            }, 60);
          } else {
            cur.click();
          }
        }
        break;
      case VK_BACK:
      case VK_ESC:
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        var qrModal = document.getElementById('qr-modal');
        if (qrModal && (qrModal.style.display === 'flex' || qrModal.style.display === 'block' || window.getComputedStyle(qrModal).display !== 'none')) {
          if (typeof window.closeQrModal === 'function') {
            window.closeQrModal();
          }
          return false;
        }

        var current = document.activeElement;
        var inContent = current && current.closest('.content-area');
        if (inContent) {
          // If inside content, return focus to active sidebar tab
          var activeNav = document.querySelector('.sidebar .nav-btn.active') || document.querySelector('.sidebar .nav-btn');
          setFocus(activeNav);
        } else {
          // In sidebar: return to first tab (Dashboard)
          var dashBtn = document.querySelector('.nav-btn[data-tab="tab-dashboard"]');
          if (dashBtn && !dashBtn.classList.contains('active')) {
            dashBtn.click();
            setFocus(dashBtn);
          } else {
            // Already at root dashboard, let webOS exit if needed or close
            if (window.webOS && typeof window.webOS.platformBack === 'function') {
              window.webOS.platformBack();
            } else if (typeof window.close === 'function') {
              window.close();
            }
          }
        }
        return false;
    }
  }

  function handleKeyUp(e) {
    var code = e.keyCode || e.which;
    if (code === 461 || code === 27) {
      var qrModal = document.getElementById('qr-modal');
      if (qrModal && (qrModal.style.display === 'flex' || qrModal.style.display === 'block' || window.getComputedStyle(qrModal).display !== 'none')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    }
  }

  var isInitialized = false;

  function init() {
    if (isInitialized) return;
    isInitialized = true;

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    // Pointer hover for LG Magic Remote air mouse
    document.addEventListener('mouseover', function(e) {
      var target = e.target.closest(focusableSelector);
      if (target && isVisible(target)) {
        setFocus(target);
      }
    });

    setTimeout(function() {
      var activeTab = document.querySelector('.tab-page.active');
      var initialFocus = getTabEntryElement(activeTab) || document.querySelector('.sidebar .nav-btn.active');
      setFocus(initialFocus);
    }, 250);
  }

  return {
    init: init,
    focus: setFocus,
    focusTabEntry: function(tabEl) {
      var el = getTabEntryElement(tabEl || document.querySelector('.tab-page.active'));
      if (el) setFocus(el);
    },
    scan: function() {
      var cur = document.activeElement;
      if (!cur || !cur.closest('.app-layout') || cur.offsetParent === null) {
        var activeTab = document.querySelector('.tab-page.active');
        var entryEl = getTabEntryElement(activeTab);
        if (entryEl) setFocus(entryEl);
      }
    }
  };
})();

window.SpatialNav = SpatialNav;
