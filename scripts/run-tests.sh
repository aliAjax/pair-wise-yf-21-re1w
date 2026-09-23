#!/usr/bin/env bash
set -e
npx tsc -p tsconfig.test.json --noEmit
mkdir -p .testbuild
npx esbuild src/lib/__tests__/rules.test.ts --bundle --platform=node --format=cjs --packages=external --outfile=.testbuild/rules.test.cjs
node .testbuild/rules.test.cjs
npx esbuild src/lib/__tests__/seed.storage.test.ts --bundle --platform=node --format=cjs --packages=external --outfile=.testbuild/seed.test.cjs
node .testbuild/seed.test.cjs
rm -rf .testbuild
