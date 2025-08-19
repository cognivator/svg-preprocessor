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

**Why These Specific Transformations?**

The pipeline supports every possible combination of **indirection levels** and **color models**:

**Indirection Levels:**
- **Literal attributes**: `<path fill="#ff0000" />` (direct color values)
- **Direct var attributes**: `<path fill="var(--primary)" />` (single variable reference)  
- **Nested var attributes**: `<path fill="var(--brand)" />` where `--brand: var(--theme)` and `--theme: var(--palette)`

**Color Models:**
- **Direct colors**: `#ff0000`, `red` (simple formats)
- **Parameterized colors**: `hsla(0,100%,50%,1)`, `rgb(255,0,0)` (complex formats with parameters)

By controlling variable flattening, color conversion, and attribute application independently, you can test any combination to discover exactly which features each tool supports, while maintaining complete thematic control.

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
   - Input: `:root { --brand: var(--theme); --theme: var(--palette); --palette: hsla(0,100%,50%,1); }`
   - Output: `:root { --brand: hsla(0,100%,50%,1); --theme: hsla(0,100%,50%,1); --palette: hsla(0,100%,50%,1); }`

2. **svg-convert-colors**: Converts color formats to HEX in CSS variable definitions (preserves alpha channels)
   - Input: `:root { --brand: var(--theme); --theme: var(--palette) --pralette: hsla(0,100%,50%,1); }`
   - Output: `:root { --brand: var(--theme); --theme: var(--palette) --pralette: #ff0000; }`

3. **svg-apply-styles**: Applies CSS variables to SVG attributes via reverse resolution
   - Input: `<path fill="var(--brand)" />` + `:root { --brand: var(--theme); --theme: var(--palette); --palette: #ff0000; }`
   - Output: `<path fill="#ff0000" />` (CSS unchanged, full chain resolved)

4. **svg-cleanup**: Removes `<style>` elements and CSS classes

## Transformation States
Starting from **BASE** (nested vars, parameterized colors, var attributes), reach any state:

| State | CSS Variables | Color Format | Attributes | Pipeline |
|-------|---------------|--------------|------------|----------|
| **BASE** | nested | parameterized | var() | *none* |
| **flat vars** | flat | parameterized | var() | `svg-resolve-vars` |
| **direct colors** | nested | direct (hex) | var() | `svg-convert-colors` |
| **literal attrs** | nested | parameterized | literal | `svg-apply-styles` |
| **flat + direct** | flat | direct (hex) | var() | `svg-resolve-vars \| svg-convert-colors` |
| **flat + literal** | flat | parameterized | literal | `svg-resolve-vars \| svg-apply-styles` |
| **direct + literal** | nested | direct (hex) | literal | `svg-convert-colors \| svg-apply-styles` |
| **full transform** | flat | direct (hex) | literal | `svg-resolve-vars \| svg-convert-colors \| svg-apply-styles` |

**Compatibility Matrix**: Every combination of indirection level (literal/direct var/nested var) × color model (direct/parameterized) is achievable, allowing systematic testing of tool capabilities.

## Features
- **Flexible pipeline**: Steps can run in any combination or order
- **CSS-based architecture**: `<style>` content is the single source of truth
- **Complete compatibility matrix**: Test every combination of indirection levels and color models
- **Tool compatibility testing**: Incrementally transform to find tool limitations
- **Nested variable resolution**: Handles unlimited levels of variable chains
- **Reverse resolution**: Attributes always resolve to final literal values through any nesting depth
- **Print compatibility**: Alpha channels preserved as 8-digit HEX (#RRGGBBAA), fully compatible with modern browsers
- **Unix pipeline**: Individual tools can be piped together
- **Original preservation**: Input files unchanged when using pipes/redirection
- **Theme management**: Easy color changes across multiple SVG files

## Example
Input BASE condition (nested vars, parameterized colors, var attributes):
```xml
<style>:root { --palette-red: hsla(0,100%,50%,1); --theme-primary: var(--palette-red); --brand-primary: var(--theme-primary); }</style>
<path fill="var(--brand-primary)" />
```

Various transformations:
```bash
# Flatten variables only (nested → flat)
svg-resolve-vars input.svg
# → :root { --palette-red: hsla(0,100%,50%,1); --theme-primary: hsla(0,100%,50%,1); --brand-primary: hsla(0,100%,50%,1); }

# Convert colors only (parameterized → direct)
svg-convert-colors input.svg
# → :root { --palette-red: #ff0000; --theme-primary: var(--palette-red); --brand-primary: var(--theme-primary); }
# Note: Alpha channels preserved as 8-digit HEX, e.g., hsla(0,100%,50%,0.5) → #ff000080

# Apply to attributes only (var → literal, with reverse resolution)
svg-apply-styles input.svg  
# → <path fill="hsla(0,100%,50%,1)" /> (resolves through full chain)

# Full transformation (nested parameterized var → flat direct literal)
svg-resolve-vars input.svg | svg-convert-colors | svg-apply-styles | svg-cleanup
# → <path fill="#ff0000" />
```

**Testing Tool Compatibility**: By incrementally applying transformations, you can pinpoint exactly where each tool's support ends—whether it's nested variables, parameterized colors, or var() references in attributes.