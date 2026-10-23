/* eslint-disable @typescript-eslint/no-require-imports -- Node's test runner loads this CommonJS harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { Readable } = require("node:stream");
const ts = require("typescript");
const { NextResponse } = require("next/server");

function roundRoute() {
  const lookups = [];
  const source = readFileSync(path.join(__dirname, "../app/api/round-documents/[ledgerEntryId]/route.ts"), "utf8");
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const dependencies = {
    "node:stream": { Readable },
    "next/server": { NextResponse },
    "@/lib/auth/currentMember": { getCurrentMember: async () => ({
      memberId: "00001", authUid: "verified-member", role: "user", status: "active", mustChangePassword: false,
    }) },
    "@/lib/roundDocuments": {
      RoundDocumentError: class extends Error {},
      getRoundDocuments: async (id, member) => {
        lookups.push({ id, member });
        return [{ id: "allowed-file", name: "Series A agreement.pdf" }];
      },
    },
    "@/lib/serverDrive": { streamDriveFile: async id => {
      assert.equal(id, "allowed-file");
      return { stream: Readable.from(Buffer.from("original document")), mimeType: "application/pdf", name: "Series A agreement.pdf" };
    } },
  };
  vm.runInNewContext(javascript, { exports, console, require(id) {
    assert.ok(id in dependencies, `Unexpected route dependency: ${id}`);
    return dependencies[id];
  } });
  return { lookups, get: (id, query = "") => exports.GET(
    { nextUrl: new URL(`https://app.example/api/round-documents/${encodeURIComponent(id)}${query}`) },
    { params: Promise.resolve({ ledgerEntryId: id }) }
  ) };
}

const compactId = "47af2c195b3a4c908184fa5e906bd8de";
const hyphenatedId = "47af2c19-5b3a-4c90-8184-fa5e906bd8de";

for (const id of [compactId, hyphenatedId, compactId.toUpperCase()]) {
  test(`lists round documents for UUID format ${id}`, async () => {
    const route = roundRoute();
    const response = await route.get(id);
    assert.equal(response.status, 200);
    const { documents } = await response.json();
    assert.equal(documents[0].name, "Series A agreement.pdf");
    assert.equal(documents[0].url, `/api/round-documents/${id}?fileId=allowed-file`);
    assert.equal(route.lookups[0].id, id);
    assert.equal(route.lookups[0].member.authUid, "verified-member");
  });
}

test("document links from a compact UUID round stream successfully", async () => {
  const route = roundRoute();
  const response = await route.get(compactId, "?fileId=allowed-file");
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "original document");
});

test("compact UUID acceptance does not allow a file outside the permitted round", async () => {
  const route = roundRoute();
  const response = await route.get(compactId, "?fileId=other-round-file");
  assert.equal(response.status, 404);
});

test("malformed round IDs are rejected before database or Drive lookup", async () => {
  const route = roundRoute();
  for (const id of ["", "undefined", "Series A", compactId.slice(1), `${compactId}a`, compactId.replace("4", "z"), `${compactId}/extra`, hyphenatedId.replace("-", "")]) {
    assert.equal((await route.get(id)).status, 400, id);
  }
  assert.equal(route.lookups.length, 0);
});
