import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const labScriptPath = fileURLToPath(new URL('../src/lab/lab.js', import.meta.url));
const labPagePath = fileURLToPath(new URL('../lab/index.html', import.meta.url));
const labStylesPath = fileURLToPath(new URL('../src/lab/lab.css', import.meta.url));

const [labScript, labPage, labStyles] = await Promise.all([
  readFile(labScriptPath, 'utf8'),
  readFile(labPagePath, 'utf8'),
  readFile(labStylesPath, 'utf8'),
]);

const zhCopy = labScript.slice(
  labScript.indexOf('  zh: {'),
  labScript.indexOf('  en: {'),
);
const enCopy = labScript.slice(
  labScript.indexOf('  en: {'),
  labScript.indexOf('\n};\n\nconst defaultState'),
);

function assertCopyPair(zh, en) {
  assert.match(zhCopy, new RegExp(zh));
  assert.match(enCopy, new RegExp(en));
}

function copyKeys(block, prefix) {
  return [...block.matchAll(new RegExp(`^\\s{4}(${prefix}[A-Z]\\w*):`, 'gm'))]
    .map((match) => match[1])
    .sort();
}

test('Lab exposes a stable, isolated persistence contract', () => {
  assert.match(labScript, /const STORAGE_KEY = ['"]mimimo\.lab\.progress\.v1['"]/);
  assert.match(
    labScript,
    /const MACHINE_TESTS\s*=\s*(?:Object\.freeze\()?\s*\[\s*['"]normal['"]\s*,\s*['"]mischief['"]\s*\]\s*\)?/,
  );

  const exportStatement = labScript.match(/export\s*\{([^}]+)\}/)?.[1] ?? '';
  const exportedNames = exportStatement.split(',').map((name) => name.trim());
  for (const name of ['STORAGE_KEY', 'copy', 'defaultState', 'MACHINE_TESTS']) {
    assert.ok(exportedNames.includes(name), `${name} should remain exported`);
  }

  for (const field of [
    'language',
    'normalTestRun',
    'mischiefTestRun',
    'privacyCheckRun',
    'dataChoice',
  ]) {
    assert.match(labScript, new RegExp(`\\b${field}:`));
  }

  assert.match(labScript, /localStorage\.getItem\(STORAGE_KEY\)/);
  assert.match(labScript, /localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(state\)\)/);
  assert.match(labScript, /localStorage\.removeItem\(STORAGE_KEY\)/);
  assert.match(labScript, /state\.language = button\.dataset\.language;\s*saveState\(\)/s);
  assert.match(labScript, /resetDialog\.returnValue = ['"]['"];\s*resetDialog\.showModal\(\)/s);
  assert.match(labScript, /resetDialog\.addEventListener\(['"]cancel['"][\s\S]*resetDialog\.close\(['"]cancel['"]\)/);
  assert.match(labScript, /const language = state\.language;[\s\S]*state = \{ \.\.\.defaultState, language \}/);
  assert.doesNotMatch(labScript, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(labScript, /mimimo\.save\.v1/);
});

test('all four learning stages and the experiment machine are bilingual', () => {
  for (const [zh, en] of [
    ['先猜', 'Predict'],
    ['动手试', 'Try It'],
    ['找证据', 'Find Evidence'],
    ['再决定', 'Decide'],
    ['正常测试', 'Normal Test'],
    ['捣乱测试', 'Mischief Test'],
    ['数据去了哪里', 'Where the data goes'],
    ['失败时的备用办法', 'Fallback if it fails'],
    ['私人信息', 'private information'],
    ['(?:没有|不产生) AI 费用', 'no AI cost'],
  ]) {
    assertCopyPair(zh, en);
  }

  const zhMachineKeys = copyKeys(zhCopy, 'machine');
  const enMachineKeys = copyKeys(enCopy, 'machine');
  assert.ok(zhMachineKeys.length >= 4, 'the machine should have localized UI copy');
  assert.deepEqual(enMachineKeys, zhMachineKeys, 'machine copy keys should match in both languages');

  assert.match(labPage, /data-language="zh"/);
  assert.match(labPage, /data-language="en"/);
  assert.match(labPage, /aria-live="polite"/);
});

test('revealed portal results open an accessible centered detail dialog', () => {
  assert.match(labScript, /<button class="door-output-card is-revealed"/);
  assert.match(labScript, /data-output-detail=/);
  assert.match(labScript, /const key = `\$\{type\}-\$\{index \+ 1\}`/);
  assert.match(labScript, /querySelectorAll\(['"]\[data-output-detail\]['"]\)/);
  assert.match(labScript, /dataset\.outputDetail/);
  assert.match(labScript, /resultDetailDialog\.showModal\(\)/);

  assert.match(labPage, /<dialog[^>]+id="resultDetailDialog"/);
  assert.match(labPage, /id="resultDetailContent"/);
  assert.match(labPage, /aria-labelledby=/);
});

test('the magic experiment machine exposes normal and mischief interactions', () => {
  assert.match(
    labScript,
    /const MACHINE_ASSET_URL = new URL\(['"]\.\.\/\.\.\/lab\/assets\/magic-experiment-machine\.png['"], import\.meta\.url\)\.href/,
  );
  assert.match(labScript, /<img src="\$\{escapeHtml\(MACHINE_ASSET_URL\)\}"/);
  assert.match(labScript, /data-machine-test=/);
  assert.match(labScript, /id="machineLever"/);
  assert.match(labScript, /machine-try-token/);
  assert.match(labScript, /machine-flow/);
  assert.match(labScript, /\[data-machine-test\]/);

  for (const effect of ['input', 'output', 'data', 'cost', 'fallback']) {
    assert.match(labScript, new RegExp(`\\['${effect}',`));
  }
  assert.match(labScript, /data-machine-effect="\$\{key\}"/);
  assert.match(labScript, /const browserRoute = state\.dataChoice === ['"]browser['"]/);
  assert.match(labScript, /mischief \? c\.causeFallbackOn : c\.causeFallbackOff/);

  assert.match(labScript, /normalTestRun\s*=\s*true/);
  assert.match(labScript, /mischiefTestRun\s*=\s*true/);
  assert.match(labScript, /privacyCheckRun\s*=\s*true/);
  assert.match(
    labScript,
    /state\.normalTestRun[\s\S]*state\.mischiefTestRun[\s\S]*state\.privacyCheckRun[\s\S]*state\.dataChoice === ['"]browser['"]/,
  );

  // This is an offline teaching machine: blank input is not sent or charged,
  // private-data samples are flagged, and a checked rule answer is the fallback.
  assertCopyPair('空白输入不发送', 'Send nothing for blank input');
  assertCopyPair('真实姓名和学校', 'real name and school');
  assertCopyPair('已经检查过的规则答案', 'checked rule answer');
  assert.doesNotMatch(labScript, /\bfetch\s*\(/);
  assert.doesNotMatch(labScript, /\bWebSocket\b|socket\.io|sendBeacon/);
});

test('selection and progress controls expose state beyond color alone', () => {
  assert.match(labScript, /aria-pressed/);
  assert.match(labScript, /selected-label/);
  assert.match(labScript, /aria-current="step"/);
  assert.match(labStyles, /prefers-reduced-motion/);
});
