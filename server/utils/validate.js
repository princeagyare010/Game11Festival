const NAME_RE = /^[\p{L}\p{M} .'-]{2,80}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;

function clean(value) {
  return typeof value === 'string' ? value.replace(/[<>]/g, '').trim() : '';
}

function validateRegistration(body) {
  const errors = {};

  const name = clean(body.name).replace(/\s+/g, ' ');
  const email = clean(body.email).toLowerCase();
  const phone = clean(body.phone);
  const agree = body.agree === true;

  if (!name || !NAME_RE.test(name)) {
    errors.name = 'Enter a full name (letters only, 2-80 characters).';
  }

  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    errors.email = 'Enter a valid email address.';
  }

  const digitCount = (phone.match(/\d/g) || []).length;
  if (!phone || !PHONE_RE.test(phone) || digitCount < 7) {
    errors.phone = 'Enter a valid phone number, digits only plus optional + ( ) -.';
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
