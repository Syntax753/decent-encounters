const fs = require('fs');
const path = require('path');

const worldPath = 'public/encounters/world/genesis/world.json';
const world = JSON.parse(fs.readFileSync(worldPath, 'utf8'));

for (const key of Object.keys(world.scenes)) {
    let mdPath = `public/encounters/world/${key}.md`;
    if (!fs.existsSync(mdPath)) {
        mdPath = `public/encounters/world/genesis/${key}.md`;
    }

    if (fs.existsSync(mdPath)) {
        const content = fs.readFileSync(mdPath, 'utf8');
        const match = content.match(/# Start\s+([\s\S]*?)(?=#|$)/);
        if (match) {
            console.log(`---SCENE: ${key}---`);
            console.log(match[1].replace(/_/g, '').trim());
            console.log('---END---');
        }
    }
}
