import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const WORLD_PATH = path.join(PROJECT_ROOT, 'public/encounters/world/genesis/world.json');
const SCENES_DIR = path.join(PROJECT_ROOT, 'public/encounters/world');
const CACHE_DIR = path.join(PROJECT_ROOT, 'public/encounters/world/cache');

// Ensure cache dir exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

console.log(`Reading world from: ${WORLD_PATH}`);
const worldDef = JSON.parse(fs.readFileSync(WORLD_PATH, 'utf-8'));

// Placeholder for LLM interaction
// In a real deployment, you would connect this to an OpenAI/Anthropic API or local model
async function generateAsciiArt(sceneName: string, description: string): Promise<string[]> {
    console.log(`[Generating] ${sceneName}...`);

    // TODO: Replace with actual LLM call
    // Example: const response = await openai.chat.completions.create({...})

    return [
        '         .          +-------+            .',
        '    .        /\\     | [===] |     .   ',
        '            /  \\    |  ART  |       __',
        '           /____\\   |_______|      /  \\',
        '             ||     |_______|      |__|',
        '             ||      _______        ||',
        '        .....||...../       \\.......||....',
        `                    |${sceneName.substring(0, 7).padEnd(7)}|`
    ];
}

async function main() {
    const scenes = worldDef.scenes;
    let count = 0;
    let generated = 0;

    for (const key of Object.keys(scenes)) {
        count++;
        const artPath = path.join(CACHE_DIR, `${key}.art`);

        if (fs.existsSync(artPath)) {
            // console.log(`[Skipping] ${key} - already exists`);
            continue;
        }

        // Find the .md file to get description
        // Attempt to find in genesis/ or parent (logic simplified here)
        let mdPath = path.join(SCENES_DIR, `${key}.md`);
        if (!fs.existsSync(mdPath)) { // try genesis subfolder if applicable or just direct
            mdPath = path.join(SCENES_DIR, 'genesis', `${key}.md`);
        }

        let description = key;
        if (fs.existsSync(mdPath)) {
            const content = fs.readFileSync(mdPath, 'utf-8');
            // Naive extraction of Start section
            const match = content.match(/# Start\s+([\s\S]*?)(?=#|$)/);
            if (match) {
                description = match[1].replace(/_/g, '').trim();
            }
        }

        const artLines = await generateAsciiArt(key, description);
        fs.writeFileSync(artPath, artLines.join('\n'));
        generated++;
    }

    console.log(`Processed ${count} scenes. Generated ${generated} new art files.`);
}

main().catch(console.error);
