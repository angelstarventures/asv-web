#!/usr/bin/env node
// Materializes dataconnect/dataconnect.yaml from dataconnect/dataconnect.yaml.template,
// substituting the placeholder values for this deployment. For ASV the rendered output
// must be byte-for-byte identical to the committed file it replaces (verify before relying
// on the generated version).
//
// Usage:
//   node scripts/render-dataconnect-config.js \
//     --service-id asv-tracker \
//     --location us-east1 \
//     --database asvtrackerdb \
//     --instance-id asv-tracker-sql
//
// All flags default to ASV's current values so a plain `node scripts/render-dataconnect-config.js`
// with no args regenerates the ASV config exactly.

const { readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const TEMPLATE_PATH = join(__dirname, "..", "dataconnect", "dataconnect.yaml.template");
const OUTPUT_PATH = join(__dirname, "..", "dataconnect", "dataconnect.yaml");

const ASV_DEFAULTS = {
  serviceId: "asv-tracker",
  location: "us-east1",
  database: "asvtrackerdb",
  instanceId: "asv-tracker-sql",
};

function parseArgs(argv) {
  const get = (flag) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };
  return {
    serviceId: get("--service-id") ?? ASV_DEFAULTS.serviceId,
    location: get("--location") ?? ASV_DEFAULTS.location,
    database: get("--database") ?? ASV_DEFAULTS.database,
    instanceId: get("--instance-id") ?? ASV_DEFAULTS.instanceId,
  };
}

function render(template, vars) {
  return template
    .replace(/\{\{SERVICE_ID\}\}/g, vars.serviceId)
    .replace(/\{\{LOCATION\}\}/g, vars.location)
    .replace(/\{\{DATABASE\}\}/g, vars.database)
    .replace(/\{\{INSTANCE_ID\}\}/g, vars.instanceId);
}

async function run() {
  const vars = parseArgs(process.argv.slice(2));

  console.log("Rendering dataconnect/dataconnect.yaml with:");
  console.log(`  SERVICE_ID  = ${vars.serviceId}`);
  console.log(`  LOCATION    = ${vars.location}`);
  console.log(`  DATABASE    = ${vars.database}`);
  console.log(`  INSTANCE_ID = ${vars.instanceId}`);
  console.log("");

  const template = readFileSync(TEMPLATE_PATH, "utf-8");
  const output = render(template, vars);
  writeFileSync(OUTPUT_PATH, output, "utf-8");

  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log("Verify: run `git diff dataconnect/dataconnect.yaml` to confirm the rendered");
  console.log("output matches what was previously checked in (for ASV it should be identical).");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});