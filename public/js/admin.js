(function () {
  'use strict';

  var loginView = document.getElementById('loginView');
  var dashboardView = document.getElementById('dashboardView');

  var loginForm = document.getElementById('loginForm');
  var loginBtn = document.getElementById('loginBtn');
  var loginLabel = document.getElementById('loginLabel');
  var loginStatus = document.getElementById('loginStatus');

  var logoutBtn = document.getElementById('logoutBtn');
  var searchInput = document.getElementById('searchInput');
  var exportBtn = document.getElementById('exportBtn');
  var exportPdfBtn = document.getElementById('exportPdfBtn');
  var refreshBtn = document.getElementById('refreshBtn');

  var tableBody = document.getElementById('tableBody');
  var totalCount = document.getElementById('totalCount');
  var loadingState = document.getElementById('loadingState');
  var emptyState = document.getElementById('emptyState');
  var errorState = document.getElementById('errorState');

  var allRegistrations = [];

  var dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  function showLogin() {
    loginView.hidden = false;
    dashboardView.hidden = true;
  }

  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    loadRegistrations();
  }

  function checkSession() {
    fetch('/api/admin/me', { credentials: 'same-origin' })
      .then(function (res) {
        if (res.ok) {
          showDashboard();
        } else {
          showLogin();
        }
      })
      .catch(showLogin);
  }

  // ---------- Login ----------
  loginForm.addEventListener('submit', function (evt) {
    evt.preventDefault();
    loginStatus.textContent = '';
    loginBtn.disabled = true;
    loginLabel.textContent = 'Signing in…';

    var username = document.getElementById('username').value.trim();
    var password = document.getElementById('password').value;

    fetch('/api/admin/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password }),
    })
      .then(function (res) {
        return res.json().then(function (payload) {
          return { ok: res.ok, payload: payload };
        });
      })
      .then(function (result) {
        if (result.ok) {
          loginForm.reset();
          showDashboard();
        } else {
          loginStatus.textContent = (result.payload && result.payload.error) || 'Sign-in failed.';
        }
      })
      .catch(function () {
        loginStatus.textContent = 'Network error — check your connection and try again.';
      })
      .finally(function () {
        loginBtn.disabled = false;
        loginLabel.textContent = 'Sign in';
      });
  });

  // ---------- Logout ----------
  logoutBtn.addEventListener('click', function () {
    fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }).finally(showLogin);
  });

  // ---------- Load + render ----------
  function loadRegistrations() {
    loadingState.hidden = false;
    emptyState.hidden = true;
    errorState.hidden = true;
    tableBody.innerHTML = '';

    fetch('/api/admin/registrations', { credentials: 'same-origin' })
      .then(function (res) {
        if (res.status === 401) {
          showLogin();
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        allRegistrations = data.registrations || [];
        render();
      })
      .catch(function () {
        loadingState.hidden = true;
        errorState.hidden = false;
        errorState.textContent = 'Could not load registrations. Try refreshing.';
      });
  }

  function render() {
    var query = searchInput.value.trim().toLowerCase();
    var rows = allRegistrations;

    if (query) {
      rows = rows.filter(function (r) {
        return (
          r.name.toLowerCase().indexOf(query) !== -1 ||
          r.email.toLowerCase().indexOf(query) !== -1 ||
          r.phone.toLowerCase().indexOf(query) !== -1 ||
          r.ref_code.toLowerCase().indexOf(query) !== -1
        );
      });
    }

    totalCount.textContent = allRegistrations.length;
    loadingState.hidden = true;
    tableBody.innerHTML = '';

    if (rows.length === 0) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    rows.forEach(function (r) {
      tableBody.appendChild(buildRow(r));
    });
  }

  function buildRow(r) {
    var tr = document.createElement('tr');
    tr.dataset.id = r.id;

    var refTd = document.createElement('td');
    refTd.className = 'cell-ref';
    refTd.textContent = r.ref_code;

    var nameTd = document.createElement('td');
    nameTd.className = 'cell-name';
    nameTd.textContent = r.name;

    var emailTd = document.createElement('td');
    emailTd.textContent = r.email;

    var phoneTd = document.createElement('td');
    phoneTd.textContent = r.phone;

    var dateTd = document.createElement('td');
    var parsed = new Date(r.created_at);
    dateTd.textContent = isNaN(parsed.getTime()) ? r.created_at : dateFormatter.format(parsed);

    var actionTd = document.createElement('td');
    var delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'row-delete';
    delBtn.textContent = 'Delete';
    attachDeleteHandler(delBtn, r.id);
    actionTd.appendChild(delBtn);

    tr.appendChild(refTd);
    tr.appendChild(nameTd);
    tr.appendChild(emailTd);
    tr.appendChild(phoneTd);
    tr.appendChild(dateTd);
    tr.appendChild(actionTd);
    return tr;
  }

  function attachDeleteHandler(button, id) {
    var confirming = false;
    var resetTimer = null;

    button.addEventListener('click', function () {
      if (!confirming) {
        confirming = true;
        button.classList.add('is-confirming');
        button.textContent = 'Confirm?';
        resetTimer = setTimeout(function () {
          confirming = false;
          button.classList.remove('is-confirming');
          button.textContent = 'Delete';
        }, 3000);
        return;
      }

      clearTimeout(resetTimer);
      button.disabled = true;
      button.textContent = 'Removing…';

      fetch('/api/admin/registrations/' + id, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
        .then(function (res) {
          if (res.ok) {
            allRegistrations = allRegistrations.filter(function (r) {
              return r.id !== id;
            });
            render();
          } else {
            button.disabled = false;
            confirming = false;
            button.classList.remove('is-confirming');
            button.textContent = 'Delete';
          }
        })
        .catch(function () {
          button.disabled = false;
          confirming = false;
          button.classList.remove('is-confirming');
          button.textContent = 'Delete';
        });
    });
  }

  // ---------- Search ----------
  searchInput.addEventListener('input', render);

  // ---------- Export ----------
  exportBtn.addEventListener('click', function () {
    var query = searchInput.value.trim();
    var url = '/api/admin/export.csv';
    if (query) {
      url += '?search=' + encodeURIComponent(query);
    }
    window.location.href = url;
  });

  exportPdfBtn.addEventListener('click', function () {
    var query = searchInput.value.trim();
    var url = '/api/admin/export.pdf';
    if (query) {
      url += '?search=' + encodeURIComponent(query);
    }
    window.location.href = url;
  });

  // ---------- Refresh ----------
  refreshBtn.addEventListener('click', loadRegistrations);

  checkSession();
})();
