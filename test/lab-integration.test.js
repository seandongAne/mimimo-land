import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import viteConfig from '../vite.config.js';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const mainPage = join(projectRoot, 'index.html');
const labPage = join(projectRoot, 'lab/index.html');
const pagesWorkflow = join(projectRoot, '.github/workflows/deploy.yml');

test('the character creator links clearly to the bilingual Lab', async () => {
  const html = await readFile(mainPage, 'utf8');
  const creatorStart = html.indexOf('<div id="creator">');
  const hudStart = html.indexOf('<!-- ===== In-game HUD ===== -->');

  assert.notEqual(creatorStart, -1, 'the character creator should exist');
  assert.notEqual(hudStart, -1, 'the in-game HUD marker should exist');

  const creatorHtml = html.slice(creatorStart, hudStart);
  const hudHtml = html.slice(hudStart);

  assert.match(creatorHtml, /id="labLink"/);
  assert.match(creatorHtml, /href="\.\/lab\/"/);
  assert.match(creatorHtml, /MIMIMO Lab/);
  assert.match(creatorHtml, /奇想实验室/);
  assert.doesNotMatch(hudHtml, /id="labLink"/);
});

test('the Lab shell exposes language, portal detail, and dialog integration hooks', async () => {
  const html = await readFile(labPage, 'utf8');

  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /data-language="zh"/);
  assert.match(html, /data-language="en"/);
  assert.match(html, /id="labMain"/);
  assert.match(html, /id="resultDetailDialog"/);
  assert.match(html, /id="resultDetailContent"/);
  assert.match(html, /id="passportDialog"/);
  assert.match(html, /aria-labelledby="resetTitle"/);
  assert.match(html, /aria-labelledby="passportDialogTitle"/);
  assert.match(html, /src="\.\.\/src\/lab\/lab\.js"/);
  assert.match(html, /href="\.\.\/src\/lab\/lab\.css"/);
});

test('Vite builds the game and Lab as GitHub Pages-safe HTML entry points', async () => {
  assert.equal(viteConfig.base, './');

  const input = viteConfig.build?.rollupOptions?.input;
  assert.deepEqual(input, {
    game: mainPage,
    lab: labPage,
  });

  await Promise.all(Object.values(input).map((page) => access(page)));

  const [mainHtml, labHtml] = await Promise.all([
    readFile(mainPage, 'utf8'),
    readFile(labPage, 'utf8'),
  ]);
  assert.match(mainHtml, /href="\.\/lab\/"/);
  assert.match(labHtml, /href="\.\.\/"/);
  assert.doesNotMatch(mainHtml, /href="\/lab\/"/);
  assert.doesNotMatch(labHtml, /(?:href|src)="\/lab\//);
});

test('GitHub Pages verifies and uploads the multi-entry production build', async () => {
  const workflow = await readFile(pagesWorkflow, 'utf8');

  assert.match(workflow, /- run: npm test/);
  assert.match(workflow, /- run: npm run build/);
  assert.match(workflow, /uses: actions\/upload-pages-artifact@v\d+/);
  assert.match(workflow, /path: dist/);
  assert.match(workflow, /uses: actions\/deploy-pages@v\d+/);
});
