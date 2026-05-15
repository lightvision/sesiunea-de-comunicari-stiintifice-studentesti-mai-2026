import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const stylesPath = path.join(root, "site-prezentare", "styles.css");
const presentationPath = path.join(root, "site-prezentare", "presentation.qmd");

function readRule(selector) {
  const source = fs.readFileSync(stylesPath, "utf8");
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`(?:^|\\n)${escapedSelector}\\s*\\{([^}]*)\\}`, "m"));

  assert.ok(match, `${selector} rule should exist`);
  return match[1];
}

test("closing slide content is centered in the slide, not the left content column", () => {
  const closingRule = readRule(".closing");

  assert.match(closingRule, /align-self:\s*center;/);
});

test("presentation loads the permutation sort demo asset", () => {
  const source = fs.readFileSync(presentationPath, "utf8");

  assert.match(source, /assets\/permutation-sort\.js/);
});

test("example 1 embeds a permutation demo container", () => {
  const source = fs.readFileSync(presentationPath, "utf8");

  assert.match(source, /Exemplul 1: sortarea numerelor/);
  assert.match(source, /\.permutation-demo-layout/);
  assert.match(source, /\.permutation-demo\b/);
});

test("permutation demo layout has a two-column desktop layout", () => {
  const rule = readRule(".permutation-demo-layout");

  assert.match(rule, /display:\s*grid;/);
  assert.match(rule, /grid-template-columns:/);
});

test("presentation loads the continuous parameters demo asset", () => {
  const source = fs.readFileSync(presentationPath, "utf8");

  assert.match(source, /assets\/continuous-parameters\.js/);
});

test("example 2 embeds a continuous parameters demo container", () => {
  const source = fs.readFileSync(presentationPath, "utf8");

  assert.match(source, /Exemplul 2: parametri continui/);
  assert.match(source, /\.continuous-demo-layout/);
  assert.match(source, /\.continuous-demo\b/);
});

test("continuous parameters demo layout has a two-column desktop layout", () => {
  const rule = readRule(".continuous-demo-layout");

  assert.match(rule, /display:\s*grid;/);
  assert.match(rule, /grid-template-columns:/);
});
