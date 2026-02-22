const bcrypt = require('bcrypt');

const newPassword = 'Vani@321';  // Change this!

bcrypt.hash(newPassword, 10).then(hash => {
  console.log('Copy this hash to MySQL:', hash);
}).catch(err => console.error(err));

