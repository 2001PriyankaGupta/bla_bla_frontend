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

            // Find axios catch blocks
            // Simple approach: look for `catch (error) {` or `catch (e) {`
            // and see if they contain console.log or console.error
            // We want to insert the 401 check

            const catchRegex = /catch\s*\((error|e)\)\s*\{([\s\S]*?)\}/g;

            content = content.replace(catchRegex, (match, errVar, body) => {
                if (body.includes('401')) return match; // Already handled

                const insertion = `\n      if (${errVar}.response && ${errVar}.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }\n`;

                // Insert at the beginning of the body
                return `catch (${errVar}) {${insertion}${body}}`;
            });

            if (content !== fs.readFileSync(fullPath, 'utf8')) {
                fs.writeFileSync(fullPath, content);
                console.log('Added 401 handling to:', fullPath);
            }
        }
    }
}

processDir(screensDir);
