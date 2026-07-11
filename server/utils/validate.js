const NAME_RE = /^[\p{L}\p{M} .'-]{2,80}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+233\d{9}$/;

function clean(value) {
  return typeof value === 'string' ? value.replace(/[<>]/g, '').trim() : '';
}

function normalizePhone(value) {
  const raw = clean(value);
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 10 && digits.startsWith('0')) {
    return `+233${digits.slice(1)}`;
  }

  if (digits.length === 12 && digits.startsWith('233')) {
    return `+${digits}`;
  }

  return null;
}

function validateRegistration(body) {
  const errors = {};

  const name = clean(body.name).replace(/\s+/g, ' ');
  const email = clean(body.email).toLowerCase();
  const phone = normalizePhone(body.phone);
  const agree = body.agree === true;

  if (!name || !NAME_RE.test(name)) {
    errors.name = 'Enter a full name (letters only, 2-80 characters).';
  }

  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    errors.email = 'Enter a valid email address.';
  }

  if (!phone || !PHONE_RE.test(phone)) {
    errors.phone = 'Enter a valid Ghanaian phone number (10 digits starting with 0).';
  }

  if (!agree) {
    errors.agree = 'You must agree to the Terms & Privacy Policy.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: { name, email, phone, agree },
  };
}

module.exports = { validateRegistration };
