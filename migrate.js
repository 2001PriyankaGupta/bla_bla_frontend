const fs = require('fs');
const path = require('path');

const dir = 'd:/react-native/Full-bla-bla-new/Travel_App/src/Screens';

function migrateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    const hasSafeAreaViewString = content.includes('SafeAreaView');
    const hasContextImport = content.includes('react-native-safe-area-context');

    if (hasSafeAreaViewString && !hasContextImport) {
        let oldContent = content;
        content = content.replace(/import\s+{([^}]+)}\s+from\s+['"]react-native['"]/gm, (match, p1) => {
            if (p1.includes('SafeAreaView')) {
                const parts = p1.split(',').map(s => s.trim()).filter(s => s !== 'SafeAreaView' && s !== '');
                if (parts.length > 0) {
                    return `import { SafeAreaView } from 'react-native-safe-area-context';\nimport { ${parts.join(',\n    ')} } from 'react-native'`;
                } else {
                    return `import { SafeAreaView } from 'react-native-safe-area-context'`;
                }
            }
            return match;
        });

        if (content !== oldContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Migrated: ', filePath);
        }
    }
}

const files = fs.readdirSync(dir);
files.forEach(file => {
    if (file.endsWith('.js')) {
        migrateFile(path.join(dir, file));
    }
});
