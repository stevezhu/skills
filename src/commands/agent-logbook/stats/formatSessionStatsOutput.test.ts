import { describe, expect, test } from 'vitest';

import { formatSessionStatsOutput } from './formatSessionStatsOutput.ts';
import type { StatsResult } from './SessionStatsPlugin.ts';

describe('formatSessionStatsOutput', () => {
  test('formats minimal stats correctly', () => {
    const result: StatsResult = {
      models: ['gpt-4'],
      sections: [
        {
          label: 'USAGE',
          entries: [['Tokens', 100]],
        },
      ],
      summary: null,
      grandTotal: 100,
    };

    const output = formatSessionStatsOutput('TestAgent', 'session-123', result);
    expect(output).toMatchInlineSnapshot(`
      "
      TestAgent Session Stats: session-123
      ========================================
      Models Used:  gpt-4
      ----------------------------------------
      USAGE:
        Tokens               100
      ----------------------------------------
      GRAND TOTAL TOKENS:  100
      ========================================
      "
    `);
  });

  test('formats multiple models and extra metadata', () => {
    const result: StatsResult = {
      models: ['gpt-4', 'gpt-3.5'],
      meta: [['Custom Key', 'Custom Value']],
      sections: [
        {
          label: 'SECTION 1',
          entries: [['Val 1', 50]],
        },
      ],
      summary: null,
      grandTotal: 50,
    };

    const output = formatSessionStatsOutput('TestAgent', 'session-123', result);
    expect(output).toMatchInlineSnapshot(`
      "
      TestAgent Session Stats: session-123
      ========================================
      Models Used:  gpt-4, gpt-3.5
      Custom Key:  Custom Value
      ----------------------------------------
      SECTION 1:
        Val 1                50
      ----------------------------------------
      GRAND TOTAL TOKENS:  50
      ========================================
      "
    `);
  });

  test('formats multi-line models (ClaudeCode style)', () => {
    const result: StatsResult = {
      models: ['claude-3-5-sonnet', 'claude-3-haiku'],
      meta: [
        ['Models', 'Main: claude-3-5-sonnet'],
        ['', 'Subagents: claude-3-haiku'],
      ],
      sections: [
        {
          label: 'MAIN',
          entries: [['Tokens', 10]],
        },
      ],
      summary: null,
      grandTotal: 10,
    };

    const output = formatSessionStatsOutput('ClaudeCode', 'session-abc', result);
    expect(output).toMatchInlineSnapshot(`
      "
      ClaudeCode Session Stats: session-abc
      ========================================
      Models Used:  Main: claude-3-5-sonnet
                    Subagents: claude-3-haiku
      ----------------------------------------
      MAIN:
        Tokens               10
      ----------------------------------------
      GRAND TOTAL TOKENS:  10
      ========================================
      "
    `);
  });

  test('formats large numbers with locale grouping', () => {
    const result: StatsResult = {
      models: ['gpt-4'],
      sections: [
        {
          label: 'USAGE',
          entries: [['Large Val', 1234567]],
        },
      ],
      summary: {
        label: 'SUM',
        entries: [['Total', 1234567]],
      },
      grandTotal: 1234567,
    };

    const output = formatSessionStatsOutput('TestAgent', 'session-123', result);
    expect(output).toMatchInlineSnapshot(`
      "
      TestAgent Session Stats: session-123
      ========================================
      Models Used:  gpt-4
      ----------------------------------------
      USAGE:
        Large Val            1,234,567
      ----------------------------------------
      SUM:
        Total                1,234,567
      ----------------------------------------
      GRAND TOTAL TOKENS:  1,234,567
      ========================================
      "
    `);
  });

  test('includes summary section when provided', () => {
    const result: StatsResult = {
      models: ['gpt-4'],
      sections: [
        {
          label: 'SECTION',
          entries: [['A', 1]],
        },
      ],
      summary: {
        label: 'SUMMARY LABEL',
        entries: [['Final Count', 2]],
      },
      grandTotal: 2,
    };

    const output = formatSessionStatsOutput('TestAgent', 'session-123', result);
    expect(output).toMatchInlineSnapshot(`
      "
      TestAgent Session Stats: session-123
      ========================================
      Models Used:  gpt-4
      ----------------------------------------
      SECTION:
        A                    1
      ----------------------------------------
      SUMMARY LABEL:
        Final Count          2
      ----------------------------------------
      GRAND TOTAL TOKENS:  2
      ========================================
      "
    `);
  });

  test('handles string grandTotal', () => {
    const result: StatsResult = {
      models: ['gpt-4'],
      sections: [],
      summary: null,
      grandTotal: '$0.05',
    };

    const output = formatSessionStatsOutput('TestAgent', 'session-123', result);
    expect(output).toMatchInlineSnapshot(`
      "
      TestAgent Session Stats: session-123
      ========================================
      Models Used:  gpt-4
      ----------------------------------------
      GRAND TOTAL TOKENS:  $0.05
      ========================================
      "
    `);
  });

  test('formats a complex ClaudeCode session with multiple sections and large numbers', () => {
    const result: StatsResult = {
      models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
      meta: [
        ['Models', 'Main: claude-opus-4-6'],
        ['', 'Subagents: claude-sonnet-4-6, claude-haiku-4-5-20251001'],
      ],
      sections: [
        {
          label: 'MAIN SESSION',
          entries: [
            ['Input Tokens', 102],
            ['Output Tokens', 7169],
            ['Cache Creation Input', 603360],
            ['Cache Read Input', 4244512],
          ],
        },
        {
          label: 'SUBAGENTS (5 total)',
          entries: [
            ['Input Tokens', 94],
            ['Output Tokens', 4644],
            ['Cache Creation Input', 154983],
            ['Cache Read Input', 425694],
          ],
        },
      ],
      summary: {
        label: 'TOTAL USAGE',
        entries: [
          ['Total Input Tokens', 196],
          ['Total Output Tokens', 11813],
          ['Total Cache Creation', 758343],
          ['Total Cache Read', 4670206],
        ],
      },
      grandTotal: 5440558,
    };

    const output = formatSessionStatsOutput(
      'ClaudeCode',
      '060d3f6b-eea4-4a8c-8c42-77cbcf3213e2',
      result,
    );

    expect(output).toMatchInlineSnapshot(`
      "
      ClaudeCode Session Stats: 060d3f6b-eea4-4a8c-8c42-77cbcf3213e2
      ========================================
      Models Used:  Main: claude-opus-4-6
                    Subagents: claude-sonnet-4-6, claude-haiku-4-5-20251001
      ----------------------------------------
      MAIN SESSION:
        Input Tokens         102
        Output Tokens        7,169
        Cache Creation Input 603,360
        Cache Read Input     4,244,512
      ----------------------------------------
      SUBAGENTS (5 total):
        Input Tokens         94
        Output Tokens        4,644
        Cache Creation Input 154,983
        Cache Read Input     425,694
      ----------------------------------------
      TOTAL USAGE:
        Total Input Tokens   196
        Total Output Tokens  11,813
        Total Cache Creation 758,343
        Total Cache Read     4,670,206
      ----------------------------------------
      GRAND TOTAL TOKENS:  5,440,558
      ========================================
      "
    `);
  });
});
