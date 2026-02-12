import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.resolve(__dirname, '../public/encounters/world/cache');

function getMinIndent(lines: string[]): number {
    let minIndent = Infinity;
    for (const line of lines) {
        if (line.trim().length === 0) continue; // Skip empty lines
        const match = line.match(/^(\s*)/);
        const indent = match ? match[1].length : 0;
        if (indent < minIndent) {
            minIndent = indent;
        }
    }
    return minIndent === Infinity ? 0 : minIndent;
}

function processFile(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // remove trailing empty lines
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
        lines.pop();
    }
    // remove leading empty lines
    while (lines.length > 0 && lines[0].trim() === '') {
        lines.shift();
    }

    const minIndent = getMinIndent(lines);
    const newLines = lines.map(line => {
        if (line.trim().length === 0) return '';
        // Remove minIndent, then add 2 spaces
        const trimmed = line.slice(minIndent);
        return '  ' + trimmed;
    });

    // Ensure one trailing newline
    const newContent = newLines.join('\n') + '\n';
    fs.writeFileSync(filePath, newContent);
    console.log(`Processed ${path.basename(filePath)} (shifted -${minIndent} +2)`);
}

function main() {
    if (!fs.existsSync(CACHE_DIR)) {
        console.error(`Cache dir not found: ${CACHE_DIR}`);
        return;
    }

    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.art'));
    console.log(`Found ${files.length} art files.`);

    for (const file of files) {
        processFile(path.join(CACHE_DIR, file));
    }
}

main();
