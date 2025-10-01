import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getDataFilePath(fileName: string) {
  return path.join(__dirname, `../../data/${fileName}`);
}
