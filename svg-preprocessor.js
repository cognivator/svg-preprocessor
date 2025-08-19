#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs').promises;
const path = require('path');
const SVGProcessor = require('./lib/svg-processor');

const program = new Command();

program
  .name('svg-preprocess')
  .description('Preprocess SVG files to resolve CSS variables and convert colors for print compatibility')
  .version('1.0.0')
  .argument('[files...]', 'SVG files to process')
  .option('-i, --input-list <file>', 'file containing list of SVG paths')
  .option('-o, --output-dir <dir>', 'output directory')  
  .option('-s, --steps <steps>', 'processing steps: vars,colors,apply,cleanup or all', 'all')
  .option('--suffix <suffix>', 'output file suffix', '_processed')
  .option('--dry-run', 'show what would be processed without executing')
  .action(async (files, options) => {
    try {
      const inputFiles = await getInputFiles(files, options.inputList);
      const processor = new SVGProcessor(options);
      
      if (options.dryRun) {
        console.log('Dry run - would process:');
        inputFiles.forEach(file => console.log(`  ${file}`));
        return;
      }

      const results = await processor.processFiles(inputFiles, options.steps);
      
      console.log(`\nProcessed ${results.length} files:`);
      results.forEach(result => {
        console.log(result.success ? 
          `✓ ${result.input} → ${result.output}` : 
          `✗ ${result.input}: ${result.error}`);
      });
      
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

async function getInputFiles(cliFiles, inputListFile) {
  let files = [...cliFiles];
  
  if (inputListFile) {
    const listContent = await fs.readFile(inputListFile, 'utf8');
    const listFiles = listContent.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    files.push(...listFiles);
  }
  
  if (files.length === 0) {
    throw new Error('No input files specified');
  }
  
  for (const file of files) {
    try { await fs.access(file); } 
    catch { throw new Error(`File not found: ${file}`); }
  }
  
  return files;
}

if (require.main === module) program.parse();