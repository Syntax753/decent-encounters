const files = import.meta.glob('../../public/encounters/**/*.md', { query: '?raw', import: 'default' });
console.log(files);
