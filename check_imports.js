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

            if (content.includes('navigation.reset') || content.includes('AsyncStorage.')) {
                if (!content.includes('AsyncStorage')) {
                    content = "import AsyncStorage from '@react-native-async-storage/async-storage';\n" + content;
                    updated = true;
                }
                if (!content.includes('useNavigation') && !content.includes('navigation = ')) {
                    // This is trickier, skip for now or manually check
                    console.log('WARNING: Check navigation import in:', fullPath);
                }
            }

            if (updated) {
                fs.writeFileSync(fullPath, content);
                console.log('Fixed imports in:', fullPath);
            }
        }
    }
}

processDir(screensDir);
