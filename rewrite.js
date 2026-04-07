const fs = require('fs');
const appConfig = fs.readFileSync('src/config/app.config.ts', 'utf8');
let constants = fs.readFileSync('src/utils/constants.ts', 'utf8');

constants = constants.replace("import { Severity, Category } from '@/types/review.types';", "import { Severity, Category } from '../types/review.types';");
const constantsBody = constants.substring(constants.indexOf('import {'));
const newAppConfig = appConfig + '\n\n' + constantsBody;

fs.writeFileSync('src/config/app.config.ts', newAppConfig);

const newConstants = `// ============================================================
// SECTION: App Constants (MOVED TO APP_CONFIG)
// ============================================================
export { 
  SEVERITY_CONFIG, 
  CATEGORY_CONFIG, 
  EXTENSION_TO_LANGUAGE, 
  CODE_LIMITS, 
  SUPPORTED_EXTENSIONS, 
  SKIP_PATTERNS 
} from '../config/app.config';
`;

fs.writeFileSync('src/utils/constants.ts', newConstants);
console.log("Rewrite successful");
