const files = import.meta.glob('/public/encounters/**/*.md', { query: '?url', eager: true });
console.log(files);
