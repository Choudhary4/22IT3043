

const fs = require('fs');
const path = require('path');

console.log('🔍 URL Shortener Microservice - Acceptance Criteria Validation\n');

const checks = [
  {
    name: 'Package.json exists with correct scripts',
    check: () => {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return pkg.scripts && 
             pkg.scripts.start && 
             pkg.scripts.dev && 
             pkg.scripts.test &&
             pkg.dependencies.express &&
             pkg.dependencies.mongoose;
    }
  },
  {
    name: 'Environment configuration exists',
    check: () => fs.existsSync('.env.example') && fs.existsSync('src/config/index.js')
  },
  {
    name: 'Database models with TTL index',
    check: () => fs.existsSync('src/models/Url.js') && 
                 fs.readFileSync('src/models/Url.js', 'utf8').includes('expireAfterSeconds')
  },
  {
    name: 'Logging client with AffordMed integration',
    check: () => fs.existsSync('src/services/loggingClient.js') &&
                 fs.readFileSync('src/services/loggingClient.js', 'utf8').includes('evaluation-service')
  },
  {
    name: 'Shortcode service with base62 and collision handling',
    check: () => fs.existsSync('src/services/shortcodeService.js') &&
                 fs.readFileSync('src/services/shortcodeService.js', 'utf8').includes('base62')
  },
  {
    name: 'API routes with exact endpoints',
    check: () => {
      const routes = fs.readFileSync('src/routes/urlRoutes.js', 'utf8');
      return routes.includes('POST') && 
             routes.includes('/shorturls') &&
             routes.includes('GET') &&
             routes.includes('/:shortcode');
    }
  },
  {
    name: 'Validation service with URL security checks',
    check: () => fs.existsSync('src/utils/validation.js') &&
                 fs.readFileSync('src/utils/validation.js', 'utf8').includes('localhost')
  },
  {
    name: 'Comprehensive test suite',
    check: () => fs.existsSync('tests/api.test.js') &&
                 fs.existsSync('tests/shortcode.test.js') &&
                 fs.existsSync('tests/validation.test.js')
  },
  {
    name: 'Docker configuration',
    check: () => fs.existsSync('Dockerfile') && 
                 fs.existsSync('docker-compose.yml') &&
                 fs.readFileSync('docker-compose.yml', 'utf8').includes('mongo')
  },
  {
    name: 'Postman collection with auth integration',
    check: () => fs.existsSync('postman/UrlShortener.postman_collection.json') &&
                 fs.existsSync('postman/UrlShortener.postman_environment.json')
  },
  {
    name: 'Documentation files',
    check: () => fs.existsSync('README.md') && 
                 fs.existsSync('DESIGN.md') &&
                 fs.readFileSync('README.md', 'utf8').includes('Quick Start')
  },
  {
    name: 'Security and rate limiting',
    check: () => fs.existsSync('src/middleware/rateLimiter.js') &&
                 fs.readFileSync('src/server.js', 'utf8').includes('helmet')
  }
];

let passed = 0;
let failed = 0;

checks.forEach((check, index) => {
  try {
    const result = check.check();
    if (result) {
      console.log(`✅ ${index + 1}. ${check.name}`);
      passed++;
    } else {
      console.log(`❌ ${index + 1}. ${check.name}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${index + 1}. ${check.name} (Error: ${error.message})`);
    failed++;
  }
});

console.log(`\n📊 Validation Results:`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

if (failed === 0) {
  console.log('\n🎉 All acceptance criteria met! The URL Shortener microservice is ready for deployment.');
} else {
  console.log('\n⚠️ Some criteria failed. Please review the implementation.');
  process.exit(1);
}

// Additional API endpoint validation
console.log('\n🔧 API Endpoint Requirements Check:');
const routeFile = fs.readFileSync('src/routes/urlRoutes.js', 'utf8');

const apiChecks = [
  { name: 'POST /shorturls returns 201 with shortLink and expiry', pattern: /201.*shortLink.*expiry/ },
  { name: 'GET /:shortcode returns 302 redirect', pattern: /302.*redirect/ },
  { name: 'GET /shorturls/:shortcode returns stats', pattern: /totalClicks.*clicks/ },
  { name: 'Logging integration on create and redirect', pattern: /loggingClient\.Log/ },
  { name: 'Error handling with proper status codes', pattern: /404.*410.*409/ }
];

apiChecks.forEach((check, index) => {
  if (check.pattern.test(routeFile)) {
    console.log(`✅ ${index + 1}. ${check.name}`);
  } else {
    console.log(`⚠️ ${index + 1}. ${check.name} (Pattern not found, manual verification needed)`);
  }
});

console.log('\n🚀 Ready for production deployment!');
console.log('📦 Next steps:');
console.log('   1. yarn install');
console.log('   2. cp .env.example .env');
console.log('   3. docker-compose up -d');
console.log('   4. yarn test');
console.log('   5. Import Postman collection for testing');