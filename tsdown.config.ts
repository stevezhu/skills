import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/bin/cli.ts', './src/bin/bash-complete.ts'],
});
