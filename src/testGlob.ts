const encountersGlob = import.meta.glob('/public/encounters/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
async function test() {
    for (const path in encountersGlob) {
        let text = await encountersGlob[path]();
        console.log(path, text.substring(0, 50));
    }
}
test();
