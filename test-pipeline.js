const fs = require('fs').promises;
const { execSync } = require('child_process');

async function testPipeline() {
  const testSVG = `<svg xmlns="http://www.w3.org/2000/svg">
  <style>:root { --palette-red: hsla(0,100%,50%,1); --theme-primary: var(--palette-red); --brand-primary: var(--palette-red); }</style>
  <path fill="var(--brand-primary)" d="M20,60 L40,60 L30,80 Z"/>
</svg>`;

  await fs.writeFile('test-input.svg', testSVG);
  
  try {
    const result = execSync(
      'node bin/svg-resolve-vars test-input.svg | node bin/svg-convert-colors | node bin/svg-apply-styles | node bin/svg-cleanup',
      { encoding: 'utf8' }
    );
    
    const checks = [
      { test: !result.includes('var('), msg: 'CSS var() removed' },
      { test: !result.includes('<style>'), msg: 'Style blocks removed' },
      { test: result.includes('#ff0000'), msg: 'Red converted to #ff0000' },
      { test: result.includes('fill="#ff0000"'), msg: 'Direct fill attribute applied' }
    ];
    
    console.log('Pipeline Test Results:');
    checks.forEach(({ test, msg }) => console.log(`${test ? '✓' : '✗'} ${msg}`));
    
    await fs.writeFile('test-output.svg', result);
    console.log('\nTest files: test-input.svg → test-output.svg');
    
  } catch (error) {
    console.error('Pipeline failed:', error.message);
  }
}

if (require.main === module) testPipeline();