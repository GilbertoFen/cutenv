process.env.NODE_ENV = 'test';

import { config as dotenvConfig } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

const testEnvPath = join(__dirname, '../.env.test');
const rootTestEnvPath = join(__dirname, '..', '..', '.env.test');

if( existsSync(rootTestEnvPath)){
    dotenvConfig({path: rootTestEnvPath});
} else if(existsSync(testEnvPath)){
    dotenvConfig({path: testEnvPath});
} else{ 
    dotenvConfig();
}