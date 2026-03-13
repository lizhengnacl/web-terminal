const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const db = new Database('terminal.db');

const user = db.prepare('SELECT * FROM users WHERE username = ?').get('lizheng');

if (user) {
  console.log('用户信息:');
  console.log('- ID:', user.id);
  console.log('- 用户名:', user.username);
  console.log('- 角色:', user.role);
  console.log('- 密码hash前缀:', user.password.substring(0, 20));
  
  const testPasswords = [
    'Lizheng123',
    'lizheng123',
    'Lizheng',
    'admin123',
    'Admin123'
  ];
  
  console.log('\n密码验证测试:');
  testPasswords.forEach(async (pwd) => {
    const isValid = await bcrypt.compare(pwd, user.password);
    console.log(`- "${pwd}": ${isValid ? '✅ 匹配' : '❌ 不匹配'}`);
  });
} else {
  console.log('用户不存在');
}

db.close();
