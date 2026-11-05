/* eslint-disable @typescript-eslint/no-require-imports -- Standalone provider regression tests. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const filename = path.resolve('functions/src/lib/openRouter.ts');
const subject = new Module(filename, module);
subject.filename = filename;
subject.paths = Module._nodeModulePaths(path.dirname(filename));
const nativeRequire = subject.require.bind(subject);
let now, waits, requests, responses, logs;
subject.require = name => name === 'node:timers/promises' ? {
  setTimeout: async (ms, value, { signal }) => {
    signal.throwIfAborted(); waits.push(ms); now += ms; return value;
  },
} : nativeRequire(name);
subject._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { generateContent, generateChatReply } = subject.exports;
const realFetch = global.fetch, realNow = Date.now, realWarn = console.warn;
const options = {
  apiKey: 'synthetic-private-key', model: 'deepseek/deepseek-v4.1-flash', providerSlug: 'pinned-provider',
  systemPrompt: 'synthetic confidential prompt', responseMimeType: 'application/json',
  parts: ['Analyze all five files', ...Array.from({ length: 5 }, (_, i) => ({ inlineData: { mimeType: 'application/pdf', data: Buffer.from('private-file-' + i).toString('base64') } }))],
};
const success = () => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '{"records":[],"warnings":[]}' } }] }));
const failed = (code = 502, type = 'provider_unavailable', partial = null) => new Response(JSON.stringify({
  id: 'synthetic-generation', model: options.model, provider: 'ModelRun',
  choices: [{ finish_reason: 'error', error: { code, message: 'Network connection lost.', metadata: { error_type: type } }, message: { content: partial, reasoning: 'private reasoning' } }],
}));
function reset(queue) { now = 1000000; waits = []; requests = []; responses = queue; logs = []; }
async function reject(code, pattern) {
  await assert.rejects(generateContent(options), e => e.code === code && pattern.test(e.message));
}
async function main() {
  Date.now = () => now;
  console.warn = (...args) => logs.push(JSON.stringify(args));
  global.fetch = async (url, init) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    requests.push({ body: JSON.parse(init.body), signal: init.signal });
    const next = responses.shift();
    assert(next, 'Unexpected extra request');
    return typeof next === 'function' ? next(init) : next;
  };
  try {
    // Production Vesteck shape: HTTP 200, choice-level 502, no visible content.
    reset([failed(), success()]);
    assert.deepEqual(JSON.parse(await generateContent(options)), { records: [], warnings: [] });
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[0].body, requests[1].body);
    assert.equal(requests[0].body.messages[1].content.filter(p => p.type === 'file').length, 5);
    assert.deepEqual(requests[1].body.provider, { order: ['pinned-provider'], allow_fallbacks: false });
    assert.deepEqual(waits, [750]);
    assert(!logs.join('').includes('private'));
    assert(!logs.join('').includes('Network connection lost'));

    reset([failed(502, 'provider_unavailable', '{"records":['), success()]);
    await generateContent(options); assert.equal(requests.length, 2, 'Discard partial content on provider failure');
    reset([new Response(JSON.stringify({ error: { code: 503, metadata: { error_type: 'provider_overloaded' } } })), success()]);
    await generateContent(options); assert.equal(requests.length, 2);
    reset([new Response('gateway down', { status: 502 }), success()]);
    await generateContent(options); assert.equal(requests.length, 2);
    reset([() => { throw new TypeError('synthetic connection reset'); }, success()]);
    await generateContent(options); assert.equal(requests.length, 2);
    reset([failed(), failed()]);
    await reject('unavailable', /temporarily failed or disconnected/); assert.equal(requests.length, 2);

    for (const [status, type, code] of [[401, 'authentication', 'failed-precondition'], [402, 'payment_required', 'failed-precondition'], [403, 'permission_denied', 'failed-precondition'], [400, 'context_length_exceeded', 'failed-precondition']]) {
      reset([failed(status, type)]); await reject(code, /OpenRouter|limit/); assert.equal(requests.length, 1);
    }
    for (const content of [null, 'partial json']) {
      reset([new Response(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content } }] }))]);
      await reject('failed-precondition', /output limit/); assert.equal(requests.length, 1);
    }
    reset([new Response(JSON.stringify({ choices: [{ finish_reason: 'content_filter', message: { content: null } }] }))]);
    await reject('failed-precondition', /declined/); assert.equal(requests.length, 1);
    reset([new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '  ', reasoning: '{"records":[]}' } }] })), success()]);
    await generateContent(options); assert.equal(requests.length, 2, 'Reasoning is never used as the answer');
    reset([new Response(JSON.stringify({ choices: [{ message: { content: [{ type: 'text', text: 'ok' }] } }] }))]);
    assert.equal(await generateContent(options), 'ok');

    reset([new Response('{}', { status: 429, headers: { 'Retry-After': '2' } }), success()]);
    await generateContent(options); assert.deepEqual(waits, [2000]);
    reset([new Response('{}', { status: 429, headers: { 'Retry-After': new Date(1000000 + 3000).toUTCString() } }), success()]);
    await generateContent(options); assert.deepEqual(waits, [3000]);
    reset([new Response('{}', { status: 429, headers: { 'Retry-After': '400' } })]);
    await reject('resource-exhausted', /temporarily/); assert.equal(requests.length, 1); assert.equal(waits.length, 0);
    reset([() => { now += 59000; return failed(); }]);
    await reject('unavailable', /temporarily/); assert.equal(requests.length, 1, 'Do not restart the time budget');

    reset([init => new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true }))]);
    await assert.rejects(generateContent({ ...options, timeoutMs: 20 }), e => e.code === 'deadline-exceeded');
    assert.equal(requests.length, 1);
    reset([init => ({ ok: true, headers: new Headers(), json: () => new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true })) })]);
    await assert.rejects(generateContent({ ...options, timeoutMs: 20 }), e => e.code === 'deadline-exceeded');
    assert.equal(requests.length, 1, 'Body reads stay inside the deadline');

    reset([failed(), success()]);
    await generateChatReply({ apiKey: options.apiKey, model: options.model, systemPrompt: 'system', history: [{ role: 'model', text: 'previous answer' }], message: 'next question' });
    assert.equal(requests[0].body.messages[1].role, 'assistant');
    assert.deepEqual(requests[0].body, requests[1].body);
    console.log('OpenRouter checks passed: Vesteck provider disconnect, five-file retry, partial/error envelopes, bounded retries/deadline, Retry-After, terminal errors, output limits, safe logs and chat compatibility.');
  } finally { global.fetch = realFetch; Date.now = realNow; console.warn = realWarn; }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
