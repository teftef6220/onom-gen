const fs = require('fs');
const path = require('path');

const dir = './';

// 1. Process all HTML files
const files = fs.readdirSync(dir);
const htmlFiles = files.filter(f => f.startsWith('sketch') && f.endsWith('.html'));

htmlFiles.forEach(file => {
    let content = fs.readFileSync(path.join(dir, file), 'utf8');
    
    // Add mp4-muxer and export_module if not present
    let modified = false;
    
    // Cleanup old mp4_exporter.js if it exists
    if (content.includes('mp4_exporter.js')) {
        content = content.replace(/<script src="mp4_exporter\.js"><\/script>\s*<!-- Shared Export Module -->\n?/g, '');
        modified = true;
    }
    
    if (!content.includes('export_module.js')) {
        content = content.replace(
            /<script src="gui_handler\.js"><\/script>/,
            '<script src="https://unpkg.com/mp4-muxer/build/mp4-muxer.js"></script> <!-- MP4 Export -->\n  <script src="export_module.js"></script> <!-- Shared Export Module -->\n  <script src="gui_handler.js"></script>'
        );
        modified = true;
    }
    
    // Fix sketch001 if it has double mp4-muxer from previous tests
    const muxerMatch = content.match(/<script src="https:\/\/unpkg\.com\/mp4-muxer\/build\/mp4-muxer\.js"><\/script>/g);
    if (muxerMatch && muxerMatch.length > 1) {
        content = content.replace(/<script src="https:\/\/unpkg\.com\/mp4-muxer\/build\/mp4-muxer\.js"><\/script>[\s\S]*?<script src="https:\/\/unpkg\.com\/mp4-muxer\/build\/mp4-muxer\.js"><\/script>/, '<script src="https://unpkg.com/mp4-muxer/build/mp4-muxer.js"></script>');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(path.join(dir, file), content, 'utf8');
        console.log('Updated HTML:', file);
    }
});

// 2. Process all JS files
const jsFiles = files.filter(f => f.startsWith('sketch') && f.endsWith('.js'));

jsFiles.forEach(file => {
    // Skip already modified ones by the AI or User during testing
    if (file === 'sketch001.js' || file === 'sketch002.js' || file === 'sketch003.js' || file === 'sketch004.js' || file === 'sketch005.js' || file === 'sketch006.js') return;

    let content = fs.readFileSync(path.join(dir, file), 'utf8');

    // Make sure it has the old export variables or the startExport function before doing anything
    if (!content.includes('exportSessionID') && !content.includes('startExport()')) return;

    let modified = false;

    // 1. Replace Variables at top level
    const varRegex1 = /let isExporting = false;\s*let exportCount = 0;\s*let exportMax = 0;\s*let exportSessionID = "";/g;
    const varRegex2 = /var isExporting = false;\s*var exportCount = 0;\s*var exportMax = 0;\s*var exportSessionID = "";/g;
    
    if (varRegex1.test(content)) {
        content = content.replace(varRegex1, `let isExporting = false;\nlet exportMax = 0;`);
        modified = true;
    } else if (varRegex2.test(content)) {
        content = content.replace(varRegex2, `let isExporting = false;\nlet exportMax = 0;`);
        modified = true;
    } else if (content.includes('var isExporting = false;')) {
        // Fallback for older var definitions scattered
        content = content.replace(/var exportCount = 0;\n?/, '');
        content = content.replace(/var exportSessionID = "";\n?/, '');
        modified = true;
    }

    // 2. GUI setup replace
    const guiRegexOld = /\{\s*object:\s*params,\s*variable:\s*'exportStart',\s*name:\s*'Start Export',\s*type:\s*'function'\s*\}/;
    if (guiRegexOld.test(content)) {
        content = content.replace(guiRegexOld, `{ object: params, variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },\n    { object: params, variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }`);
        modified = true;
    }
    
    // For older sketches missing folders configs like guiConfig = [ { variable: 'startExport' ...
    const guiRegexOlder = /\{\s*variable:\s*'startExport',\s*name:\s*'Start Export',\s*type:\s*'function'\s*\}/;
    if (guiRegexOlder.test(content)) {
        content = content.replace(guiRegexOlder, `{ variable: 'exportMP4', name: 'Start MP4 Export', type: 'function' },\n  { variable: 'exportPNG', name: 'Start PNG Sequence', type: 'function' }`);
        modified = true;
    }
    
    // For params object
    const paramsRegex = /exportStart:\s*\(\)\s*=>\s*startExport\(\),?/;
    if (paramsRegex.test(content)) {
        content = content.replace(paramsRegex, `exportMP4: () => startExportMP4(),\n  exportPNG: () => startExportPNG(),`);
        modified = true;
    }

    // Extract Prefix for files
    let prefix = file.replace('.js', '');
    const saveCanvasMatch = content.match(/saveCanvas\('([^']+)' \+/);
    if(saveCanvasMatch) {
       prefix = saveCanvasMatch[1];
       if(prefix.endsWith('_')) prefix = prefix.slice(0, -1);
    }

    // 3. Replace Draw loop logic
    const exportBlockRegex = /\s*\/\/\s*書き出し処理\s*if\s*\(isExporting\)\s*\{[\s\S]*?saveCanvas\([^)]+\);[\s\S]*?exportCount\+\+;[\s\S]*?if\s*\(exportCount\s*>=\s*exportMax\)\s*\{[\s\S]*?isExporting\s*=\s*false;[\s\S]*?console\.log\("[^"]+"\);[\s\S]*?\}[\s\S]*?\}/;
    const fallbackExportRegex = /\s*\/\/\s*書き出し処理[\s\S]*?if\s*\(isExporting\)\s*\{[\s\S]*?saveCanvas[\s\S]*?\}\s*\}/;
    
    const newExportBlock = `
  // 書き出し処理
  if (isExporting) {
    window.exporter.captureFrame(document.querySelector('canvas'));
    if (!window.exporter.isExporting) {
      isExporting = false;
    }
  }`;

    if (exportBlockRegex.test(content)) {
        content = content.replace(exportBlockRegex, newExportBlock);
        modified = true;
    } else if (fallbackExportRegex.test(content)) {
        content = content.replace(fallbackExportRegex, newExportBlock);
        modified = true;
    }
    
    // 4. Replace Start Export & Keypressed
    const startExportRegex = /function startExport\(\) \{[\s\S]*?console\.log\(`Export started: \$\{exportSessionID\}`\);\n\}/;
    
    const newStartExport = `async function startExportMP4() {
  if (isExporting || window.exporter.isExporting) return;
  
  exportMax = typeof params !== 'undefined' ? params.exportFrames : exportMax;
  let suggestedName = \`${prefix}_\${year()}\${nf(month(), 2)}\${nf(day(), 2)}_\${nf(hour(), 2)}\${nf(minute(), 2)}.mp4\`;
  await window.exporter.startMP4(width, height, 30, exportMax, suggestedName);
  
  isExporting = true;
}

async function startExportPNG() {
  if (isExporting || window.exporter.isExporting) return;
  
  exportMax = typeof params !== 'undefined' ? params.exportFrames : exportMax;
  let prefixName = \`${prefix}_\${year()}\${nf(month(), 2)}\${nf(day(), 2)}_\${nf(hour(), 2)}\${nf(minute(), 2)}\`;
  await window.exporter.startPNG(30, exportMax, prefixName);
  
  isExporting = true;
}`;

    if (startExportRegex.test(content)) {
        content = content.replace(startExportRegex, newStartExport);
        modified = true;
    }
    
    // KeyPressed function update (s -> m & p)
    const keypressedRegex = /if\s*\(\s*key\s*===\s*'s'\s*\|\|\s*key\s*===\s*'S'\s*\)\s*startExport\(\);/;
    if (keypressedRegex.test(content)) {
       content = content.replace(keypressedRegex, `if (key === 'm' || key === 'M') startExportMP4();\n  if (key === 'p' || key === 'P') startExportPNG();`);
       modified = true;
    }
    
    // Global assignment cleanup
    const globalExportRegex = /window\.startExport = startExport;/;
    if (globalExportRegex.test(content)) {
        content = content.replace(globalExportRegex, `window.exportMP4 = startExportMP4;\nwindow.exportPNG = startExportPNG;`);
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(path.join(dir, file), content, 'utf8');
        console.log('Updated JS:', file);
    }
});

console.log('Done bulk update process!');
