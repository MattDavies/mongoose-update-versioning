'use strict';

module.exports = applyVersioning;

const incrementVersionOps = new Set([
  '$push',
  '$set',
  '$pull',
  '$pullAll',
  '$addToSet',
  '$setOnInsert'
]);

function applyVersioning(update, options, schema) {
  const versionKey = schema != null && schema.options != null && schema.options.versionKey;
  if (!versionKey) {
    return false;
  }

  if (options != null && options.version === false) {
    return false;
  }

  if (options.overwrite) {
    update[versionKey] = 0;
    return true;
  }

  let shouldInc = false;
  // Strip out any existing updates to `versionKey`, e.g. `$set: { __v: 0 }`
  for (const key of Object.keys(update)) {
    if (key.startsWith('$')) {
      const op = update[key];
      if (op[versionKey]) {
        delete op[versionKey];
      }
      if (incrementVersionOps.has(key)) {
        for (const prop of Object.keys(op)) {
          const schematype = schema.path(prop);
          if (isSchemaArray(schematype)) {
            shouldInc = true;
            break;
          }
        }
      }
    } else {
      if (key === versionKey) {
        delete update[key];
        continue;
      }

      const schematype = schema.path(key);
      if (isSchemaArray(schematype)) {
        shouldInc = true;
        break;
      }
    }
  }

  if (shouldInc) {
    update.$inc = update.$inc || {};
    update.$inc[versionKey] = 1;
  }

  return shouldInc;
}

function isSchemaArray(schematype) {
  return schematype != null &&
    (schematype.$isMongooseDocumentArray || schematype.$isMongooseArray);
}
