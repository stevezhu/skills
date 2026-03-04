#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FILENAME_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{6}Z_[a-z][a-z0-9-]*_[a-z][a-z0-9-]+\.md$/;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA = path.join(__dirname, 'schema.json');

function main() {
  const target = process.argv[2] || '.agent-logbook';

  if (!fs.existsSync(target)) {
    console.error(`Error: path not found: ${target}`);
    process.exit(2);
  }

  const logbookRoot = '.agent-logbook';
  const tmpdir = path.join(
    fs.existsSync(logbookRoot) ? logbookRoot : '.',
    `.tmp-validate-fm-${Date.now()}`,
  );

  fs.mkdirSync(tmpdir, { recursive: true });

  let filenameFailed = 0;

  try {
    const files = findMarkdownFiles(target);

    for (const file of files) {
      const filename = path.basename(file);
      if (!FILENAME_RE.test(filename)) {
        console.log(`FAIL (filename) ${file}`);
        filenameFailed++;
      } else {
        const jsonPath = path.join(tmpdir, `${path.parse(filename).name}.json`);
        try {
          execSync(`yq -o=json --front-matter=extract '.' "${file}" > "${jsonPath}"`);
        } catch (error) {
          console.error(`Error extracting frontmatter from ${file}`);
        }
      }
    }

    let schemaFailed = 0;
    const jsonFiles = fs.readdirSync(tmpdir).filter((f) => f.endsWith('.json'));

    if (jsonFiles.length > 0) {
      try {
        execSync(`pnpm dlx ajv-cli validate -s "${SCHEMA}" -d "${tmpdir}/*.json"`, {
          stdio: 'inherit',
        });
      } catch (error) {
        schemaFailed = 1;
      }
    }

    process.exit(filenameFailed + schemaFailed > 0 ? 1 : 0);
  } finally {
    if (fs.existsSync(tmpdir)) {
      fs.rmSync(tmpdir, { recursive: true, force: true });
    }
  }
}

function findMarkdownFiles(dir: string): string[] {
  const results: string[] = [];
  const list = fs.readdirSync(dir);

  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      if (file !== 'templates' && file !== 'node_modules' && file !== '.git') {
        results.push(...findMarkdownFiles(filePath));
      }
    } else if (file.endsWith('.md') && file !== 'README.md') {
      results.push(filePath);
    }
  }

  return results.sort();
}

main();
