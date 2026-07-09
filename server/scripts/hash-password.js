// Generates a bcrypt hash for the admin password, so the plain password
// never has to be written into the .env file.
//
// Usage:
//   npm run hash-password -- "your-real-password"

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run hash-password -- "your-real-password"');
  process.exit(1);
}

if (password.length < 8) {
  console.error('Choose a password with at least 8 characters.');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log('\nAdd this line to your .env file:\n');
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
