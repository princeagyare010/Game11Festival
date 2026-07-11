(function () {
  'use strict';

  // ---------- Footer year ----------
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------- Respect reduced motion for the background video ----------
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var video = document.querySelector('.video-stage__el');
  function applyMotionPreference() {
    if (!video) return;
    if (reduceMotion.matches) {
      video.pause();
      video.removeAttribute('autoplay');
    }
  }
  applyMotionPreference();
  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', applyMotionPreference);
  }

  // ---------- Validation (mirrors the server) ----------
  var NAME_RE = /^[\p{L}\p{M} .'-]{2,80}$/u;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_RE = /^\+233\d{9}$/;

  function normalizePhone(value) {
    var raw = (value || '').trim();
    var digits = raw.replace(/\D/g, '');

    if (digits.length === 10 && digits.charAt(0) === '0') {
      return '+233' + digits.slice(1);
    }

    if (digits.length === 12 && digits.indexOf('233') === 0) {
      return '+' + digits;
    }

    return null;
  }

  function validate(data) {
    var errors = {};

    if (!data.name || !NAME_RE.test(data.name)) {
      errors.name = 'Enter a full name (letters only, 2-80 characters).';
    }
    if (!data.email || !EMAIL_RE.test(data.email)) {
      errors.email = 'Enter a valid email address.';
    }

    var normalizedPhone = normalizePhone(data.phone);
    if (!data.phone || !normalizedPhone || !PHONE_RE.test(normalizedPhone)) {
      errors.phone = 'Enter a valid Ghanaian phone number (10 digits starting with 0).';
    }
    if (!data.agree) {
      errors.agree = 'You need to agree to continue.';
    }
    return errors;
  }

  // ---------- Form wiring ----------
  var form = document.getElementById('registerForm');
  var submitBtn = document.getElementById('submitBtn');
  var submitLabel = document.getElementById('submitLabel');
  var formStatus = document.getElementById('formStatus');

  var fields = ['name', 'email', 'phone'];

  function setFieldError(field, message) {
    var wrap = document.getElementById('field-' + field);
    var msg = document.getElementById('err-' + field);
    if (!wrap || !msg) return;
    if (message) {
      wrap.classList.add('has-error');
      msg.textContent = message;
    } else {
      wrap.classList.remove('has-error');
      msg.textContent = '';
    }
  }

  function setAgreeError(message) {
    var msg = document.getElementById('err-agree');
    if (msg) msg.textContent = message || '';
  }

  function clearErrors() {
    fields.forEach(function (f) {
      setFieldError(f, '');
    });
    setAgreeError('');
    formStatus.textContent = '';
    formStatus.classList.remove('is-success');
  }

  fields.forEach(function (f) {
    var input = document.getElementById(f);
    if (input) {
      input.addEventListener('input', function (evt) {
        setFieldError(f, '');
        if (f === 'phone') {
          var digits = evt.target.value.replace(/\D/g, '').slice(0, 10);
          var displayValue = digits;
          if (digits.length > 3) {
            displayValue = digits.slice(0, 3) + ' ' + digits.slice(3, 6) + ' ' + digits.slice(6);
          }
          evt.target.value = displayValue;
        }
      });
    }
  });

  var agreeInput = document.getElementById('agree');
  if (agreeInput) {
    agreeInput.addEventListener('change', function () {
      setAgreeError('');
    });
  }

  if (form) {
    form.addEventListener('submit', function (evt) {
      evt.preventDefault();
      clearErrors();

      var phoneValue = document.getElementById('phone').value.trim();
      var normalizedPhone = normalizePhone(phoneValue);
      var data = {
        name: document.getElementById('name').value.trim().replace(/\s+/g, ' '),
        email: document.getElementById('email').value.trim(),
        phone: normalizedPhone || phoneValue,
        agree: document.getElementById('agree').checked,
        company_website: document.getElementById('company_website').value,
      };

      var errors = validate(data);
      if (Object.keys(errors).length > 0) {
        fields.forEach(function (f) {
          if (errors[f]) setFieldError(f, errors[f]);
        });
        if (errors.agree) setAgreeError(errors.agree);
        formStatus.textContent = 'Please check the highlighted fields.';
        return;
      }

      submitBtn.disabled = true;
      submitLabel.textContent = 'Joining…';

      fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
        .then(function (res) {
          return res.json().then(function (payload) {
            return { status: res.status, payload: payload };
          });
        })
        .then(function (result) {
          if (result.status === 201) {
            showPass(result.payload);
            return;
          }

          var fieldErrors = (result.payload && result.payload.fields) || {};
          Object.keys(fieldErrors).forEach(function (f) {
            if (fields.indexOf(f) !== -1) setFieldError(f, fieldErrors[f]);
          });
          formStatus.textContent =
            (result.payload && result.payload.error) || 'Something went wrong. Try again.';
        })
        .catch(function () {
          formStatus.textContent = 'Network error — check your connection and try again.';
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitLabel.textContent = 'Join the Festival';
        });
    });
  }

  // ---------- Form face -> ticket-stub confirmation transition ----------
  var panel = document.getElementById('registerPanel');
  var formFace = document.getElementById('formFace');
  var passFace = document.getElementById('passFace');
  var passName = document.getElementById('passName');
  var passCode = document.getElementById('passCode');
  var registerAnother = document.getElementById('registerAnother');

  function crossFade(hideEl, showEl, fillFn) {
    if (!hideEl || !showEl) return;
    var startHeight = panel.offsetHeight;
    panel.style.height = startHeight + 'px';

    hideEl.classList.add('is-leaving');

    setTimeout(function () {
      hideEl.hidden = true;
      hideEl.classList.remove('is-leaving');

      if (fillFn) fillFn();

      showEl.hidden = false;
      showEl.classList.add('is-entering');

      var endHeight = showEl.scrollHeight;
      panel.style.height = endHeight + 'px';

      requestAnimationFrame(function () {
        showEl.classList.remove('is-entering');
      });

      setTimeout(function () {
        panel.style.height = '';
      }, 340);
    }, 180);
  }

  function showPass(payload) {
    crossFade(formFace, passFace, function () {
      passName.textContent = payload.name || '';
      passCode.textContent = payload.refCode || '';
    });
  }

  if (registerAnother) {
    registerAnother.addEventListener('click', function () {
      crossFade(passFace, formFace, function () {
        form.reset();
        clearErrors();
      });
    });
  }
})();
