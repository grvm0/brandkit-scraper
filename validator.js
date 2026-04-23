import Ajv from 'ajv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ajv = new Ajv({ allErrors: true });

/**
 * Validates the generated brand kit against the schema definition
 * @param {Object} data - The brand kit JSON object
 * @throws {Error} - If the object does not conform to the schema
 */
export function validateBrandKit(data) {
  const schemaPath = path.join(__dirname, 'brand_identity_schema.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  
  const validate = ajv.compile(schema);
  const valid = validate(data);
  
  if (!valid) {
    console.error("Schema Validation Errors:");
    console.error(ajv.errorsText(validate.errors, { separator: '\n' }));
    throw new Error('Brand Kit validation failed.');
  }
  
  return true;
}
