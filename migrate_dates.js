const fs = require('fs');
const path = require('path');

const screensDir = 'd:/react-native/Full-bla-bla-new/Travel_App/src/Screens';

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let updated = false;

            // Pattern 1: Files with local formatDateTime defined
            if (content.includes('const formatDateTime =')) {
                // If it's a file I updated before, it has a long multiline definition.
                // We'll replace the local function and use the utility instead.

                // Matches multiline `const formatDateTime = ... };`
                const localFuncRegex = /const\s+formatDateTime\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?return\s+[^;]+;\s*\};/g;
                content = content.replace(localFuncRegex, '');

                // Add Import at the top if not present
                if (!content.includes("from '../utils/DateUtils'")) {
                    content = "import { formatDateTime } from '../utils/DateUtils';\n" + content;
                }
                updated = true;
            }

            // Pattern 2: Replace direct `.toLocaleString()` calls with `formatDateTime(...)`
            // Specifically look for `new Date(...).toLocaleString()`
            const localeRegex = /new\s+Date\(([^)]+)\)\.toLocaleString\([^)]*\)/g;
            if (localeRegex.test(content)) {
                content = content.replace(localeRegex, 'formatDateTime($1)');
                if (!content.includes("from '../utils/DateUtils'")) {
                    content = "import { formatDateTime } from '../utils/DateUtils';\n" + content;
                }
                updated = true;
            }

            if (updated) {
                fs.writeFileSync(fullPath, content);
                console.log('Migrated to global formatDateTime in:', fullPath);
            }
        }
    }
}

processDir(screensDir);
