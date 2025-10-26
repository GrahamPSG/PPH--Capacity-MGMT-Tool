#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 PPH Capacity Management Tool - Setup Script\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '..', '.env.local');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env.local from .env.example...');
  fs.copyFileSync(envExamplePath, envPath);
  console.log('✅ .env.local created. Please update it with your configuration.\n');
} else {
  console.log('✅ .env.local already exists\n');
}

// Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed\n');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Generate Prisma client
console.log('🔧 Generating Prisma client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated\n');
} catch (error) {
  console.error('❌ Failed to generate Prisma client:', error.message);
  process.exit(1);
}

// Setup database
console.log('🗄️  Setting up database...');
console.log('   Run these commands to set up your database:');
console.log('   1. npx prisma migrate dev    (to create tables)');
console.log('   2. npx prisma db seed        (to add sample data)\n');

// Final instructions
console.log('📋 Next Steps:');
console.log('1. Update .env.local with your database credentials');
console.log('2. Run: npx prisma migrate dev');
console.log('3. Run: npx prisma db seed');
console.log('4. Run: npm run dev');
console.log('\n✨ Setup script complete!');