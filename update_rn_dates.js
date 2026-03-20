const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let updated = false;

            // Simple pattern: replace `const formatDateTime = (dateString) => { ... }` logically
            // We use regex to match basic `const formatDateTime = (dateString) => {` ... `};` block
            const regex = /const\s+formatDateTime\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?return\s+[^;]+;\s*\};/g;

            content = content.replace(regex, (match) => {
                updated = true;
                return `const formatDateTime = (dateString) => {
    if (!dateString) return '';
    let cleanDate = typeof dateString === 'string' ? dateString.replace('Z', '').replace('T', ' ') : dateString;
    const date = new Date(cleanDate);
    const day = String(date.getDate()).padStart(2, '0');
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
    const month = monthFormatter.format(date);
    const year = date.getFullYear();
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return \`\${day}-\${month}-\${year}, \${strHours}:\${minutes} \${ampm}\`;
  };`;
            });

            if (updated) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated formatDateTime in:', fullPath);
            }
        }
    }
}

processDir('d:/react-native/Full-bla-bla-new/Travel_App/src/Screens');
