# SVG CSS Preprocessor

Resolves CSS variables and converts colors in SVG files for print/Inkscape compatibility.

## Problem
SVG files with nested CSS variables fail in print services:
```xml
<style>:root { --palette-red: hsla(0,100%,50%,1); --theme-primary: var(--palette-red); --brand-primary: var(--theme-primary); }</style>
<path fill="var(--brand-primary)" />
```
Result: Black rectangles instead of proper rendering.

## Solution
Flexible pipeline transforms SVG files to any compatible state. Each step modifies the `<style>` content directly, enabling:
- Steps to run in any combination
- Original files remain unchanged when using pipes
- Incremental transformation to test tool compatibility
- Easy theme changes across multiple SVG files

Final output example:
```xml
<path fill="#ff0000" />
```

## Installation
```bash
cd ~/svg-css-preprocessor
npm install
chmod +x bin/*  # Make CLI tools executable
```

## CLI Pipeline Tools
Each tool reads from stdin/file and outputs to stdout for Unix-style piping:

### Individual Steps
```bash
svg-resolve-vars input.svg     # Extract and resolve CSS variables
svg-convert-colors             # Convert colors to HEX  
svg-apply-styles               # Apply styles to attributes
svg-cleanup                    # Remove style blocks and cleanup
```

### Complete Pipeline
```bash
# Full processing chain
svg-resolve-vars input.svg | svg-convert-colors | svg-apply-styles | svg-cleanup > output.svg

# With intermediate files for debugging
svg-resolve-vars input.svg > step1.svg
svg-convert-colors step1.svg > step2.svg  
svg-apply-styles step2.svg > step3.svg
svg-cleanup step3.svg > output.svg
```

### All-in-One Tool
```bash
# Process multiple files
node svg-preprocessor.js file1.svg file2.svg --output-dir ./processed/
node svg-preprocessor.js --input-list files.txt --steps vars,colors,apply
```

## Testing
```bash
npm run test-pipeline  # Test the pipeline with sample data
```

## Processing Steps & Architecture
Each step modifies the `<style>` content as the single source of truth:

1. **svg-resolve-vars**: Flattens CSS variable dependency chains in the CSS
   - Input: `:root { --brand: var(--theme); --theme: var(--palette); --palette: red; }`
   - Output: `:root { --brand: red; --theme: red; --palette: red; }`

2. **svg-convert-colors**: Converts color formats to HEX in CSS variable definitions
   - Input: `:root { --primary: hsla(0,100%,50%,1); }`
   - Output: `:root { --primary: #ff0000; }`

3. **svg-apply-styles**: Applies CSS variables to SVG attributes, resolves var() references
   - Input: `<path fill="var(--primary)" />` + `:root { --primary: #ff0000; }`
   - Output: `<path fill="#ff0000" />` (CSS unchanged)

4. **svg-cleanup**: Removes `<style>` elements and CSS classes

## Transformation States
Starting from **BASE** (nested vars, non-hex colors, var attributes), reach any state:

| State | CSS Variables | Color Format | Attributes | Pipeline |
|-------|---------------|--------------|------------|----------|
| **BASE** | nested | non-hex | var() | *none* |
| **flat vars** | flat | non-hex | var() | `svg-resolve-vars` |
| **hex colors** | nested | hex | var() | `svg-convert-colors` |
| **literal attrs** | nested | non-hex | literal | `svg-apply-styles` |
| **flat + hex** | flat | hex | var() | `svg-resolve-vars \| svg-convert-colors` |
| **flat + literal** | flat | non-hex | literal | `svg-resolve-vars \| svg-apply-styles` |
| **hex + literal** | nested | hex | literal | `svg-convert-colors \| svg-apply-styles` |
| **full transform** | flat | hex | literal | `svg-resolve-vars \| svg-convert-colors \| svg-apply-styles` |

*Note: Some combinations are functionally equivalent (marked in original spec)*

## Features
- **Flexible pipeline**: Steps can run in any combination or order
- **CSS-based architecture**: `<style>` content is the single source of truth
- **Tool compatibility testing**: Incrementally transform to find tool limitations
- **Nested variable resolution**: Handles 3+ level chains (palette → theme → brand)
- **Print compatibility**: Alpha channels removed, HEX colors only
- **Unix pipeline**: Individual tools can be piped together
- **Original preservation**: Input files unchanged when using pipes/redirection
- **Theme management**: Easy color changes across multiple SVG files

## Example
Input BASE condition:
```xml
<style>:root { --palette-red: hsla(0,100%,50%,1); --theme-primary: var(--palette-red); --brand-primary: var(--theme-primary); }</style>
<path fill="var(--brand-primary)" />
```

Various transformations:
```bash
# Flatten variables only
svg-resolve-vars input.svg
# → :root { --palette-red: hsla(0,100%,50%,1); --theme-primary: hsla(0,100%,50%,1); --brand-primary: hsla(0,100%,50%,1); }

# Convert colors only  
svg-convert-colors input.svg
# → :root { --palette-red: #ff0000; --theme-primary: var(--palette-red); --brand-primary: var(--theme-primary); }

# Apply to attributes only
svg-apply-styles input.svg  
# → <path fill="var(--theme-primary)" /> (resolves one level)

# Full transformation
svg-resolve-vars input.svg | svg-convert-colors | svg-apply-styles | svg-cleanup
# → <path fill="#ff0000" />
```