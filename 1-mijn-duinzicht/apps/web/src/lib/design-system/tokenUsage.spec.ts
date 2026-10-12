/**
 * The design system holds no literal colours or lengths, and happy-dom loads no CSS, so this spec
 * reads the stylesheets as text: every design-system stylesheet except `tokens.css` may reach a
 * colour or length only through a token, and `tokens.css` must define exactly the 124 tokens listed
 * here, each once. The detector is proven on synthetic CSS
 * first, so a passing scan cannot come from a detector that finds nothing.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join }                      from 'node:path';

import { describe, expect, it } from 'bun:test';

const CONTRACT_TOKEN_NAMES = [
  // Colours
  '--ink',
  '--muted',
  '--body-2',
  '--line',
  '--line-soft',
  '--surface',
  '--surface-grey',
  '--cream',
  '--amber',
  '--amber-dark',
  '--amber-icon',
  '--sage',
  '--green',
  '--red',
  '--toggle-off',
  '--step-todo',
  '--field-border',
  '--ok-bg',
  '--ok-fg',
  '--warn-bg',
  '--warn-fg',
  '--err-bg',
  '--err-fg',
  '--info-bg',
  '--info-fg',
  '--neutral-bg',
  '--neutral-fg',
  // Typography
  '--font-head',
  '--font-body',
  '--font-icon',
  '--weight-regular',
  '--weight-medium',
  '--weight-semibold',
  '--weight-bold',
  '--font-size-display',
  '--font-size-h1',
  '--font-size-h2',
  '--font-size-h2-detail',
  '--font-size-title-large',
  '--font-size-title',
  '--font-size-title-small',
  '--font-size-lead',
  '--font-size-large',
  '--font-size-step-heading',
  '--font-size-body',
  '--font-size-medium',
  '--font-size-small',
  '--font-size-caption',
  '--font-size-wordmark',
  '--font-size-wordmark-tagline',
  '--line-height-display',
  '--line-height-lead',
  '--line-height-compact',
  '--line-height-wordmark',
  '--letter-spacing-wordmark',
  '--letter-spacing-tagline',
  // Icon sizes
  '--icon-size-small',
  '--icon-size-medium',
  '--icon-size-default',
  '--icon-size-large',
  '--icon-size-extra-large',
  // Spacing: the scale, then the off-scale steps
  '--space-4',
  '--space-8',
  '--space-12',
  '--space-14',
  '--space-16',
  '--space-20',
  '--space-24',
  '--space-28',
  '--space-32',
  '--space-40',
  '--space-48',
  '--space-64',
  '--space-2',
  '--space-6',
  '--space-10',
  '--space-11',
  '--space-18',
  '--space-22',
  '--space-26',
  // Borders, radius, shadows
  '--border-hairline',
  '--border-field',
  '--border-emphasis',
  '--active-bar',
  '--radius',
  '--radius-round',
  '--radius-toggle',
  '--shadow-sm',
  '--shadow-md',
  // Layout
  '--max',
  '--max-narrow',
  '--max-readable',
  '--page-min-height',
  '--gutter',
  '--utility-bar-height',
  '--main-bar-height',
  '--compact-header-height',
  '--breakpoint',
  '--avatar-size',
  '--avatar-name-skeleton-width',
  '--avatar-number-skeleton-width',
  '--icon-circle-small',
  '--icon-circle-medium',
  '--icon-circle-large',
  '--touch-target',
  '--toggle-width',
  '--toggle-height',
  '--toggle-knob',
  '--toggle-inset',
  '--progress-bar-height',
  '--focus-outline-width',
  '--focus-outline-offset',
  '--lead-max-width',
  '--policy-grid-min-column',
  '--overview-card-grid-min-column',
  '--selected-row-bar',
  '--policy-list-min-width',
  '--policy-list-max-width',
  '--fact-min-width',
  '--tile-min-width',
  '--callout-text-min-width',
  '--key-column-min-width',
  '--key-column-max-width',
  '--postcode-field-width',
] as const;

const CONTRACT_TOKEN_COUNT = 124;

const ALLOWED_LITERAL_LENGTHS: ReadonlySet<string> = new Set(['100%', '1fr']);

const HEXADECIMAL_COLOUR_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;

const COLOUR_FUNCTION_PATTERN = /\b(?:rgba?|hsla?)\(/g;

const LENGTH_WITH_UNIT_PATTERN = /(?<![\w-])-?(?:\d+\.?\d*|\.\d+)(?:px|rem|em|vh|vw|vmin|vmax|ch|ex|pt|pc|cm|mm|in|%|fr)(?![\w-])/g;

const TOKEN_REFERENCE_PATTERN = /var\(\s*--[\w-]+\s*\)/g;

function literalValuesIn(stylesheetText: string): string[] {
  const declarationsText = stylesheetText.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(TOKEN_REFERENCE_PATTERN, 'token');
  const colourLiterals = [...declarationsText.matchAll(HEXADECIMAL_COLOUR_PATTERN), ...declarationsText.matchAll(COLOUR_FUNCTION_PATTERN)];
  const lengthLiterals = [...declarationsText.matchAll(LENGTH_WITH_UNIT_PATTERN)].filter((match) => !ALLOWED_LITERAL_LENGTHS.has(match[0]));
  return [...colourLiterals, ...lengthLiterals].map((match) => match[0]);
}

function designSystemStylesheetNames(): string[] {
  return readdirSync(import.meta.dir).filter((fileName) => fileName.endsWith('.css') && fileName !== 'tokens.css').sort();
}

function definedTokenNamesIn(stylesheetText: string): string[] {
  return [...stylesheetText.matchAll(/(?<![\w-])(--[\w-]+)\s*:/g)].map((match) => match[1] ?? '');
}

describe('token usage', () => {
  it('detects hexadecimal colours, colour functions and lengths with a unit, naming each literal', () => {
    const syntheticStylesheet = '.example { color: #abc; background: rgba(0, 0, 0, .5); padding: 3px 1.5rem; width: 50%; top: -2px; }';

    expect(literalValuesIn(syntheticStylesheet)).toEqual(['#abc', 'rgba(', '3px', '1.5rem', '50%', '-2px']);
  });

  it('allows token references, unitless numbers and the keyword-like values 0, 100%, 1fr, auto, none and inherit', () => {
    const syntheticStylesheet = [
      '.example { padding: var(--space-4) var( --space-8 ); margin: 0; width: 100%; flex: 1; font-weight: 300; }',
      '.example[data-size=\'space16\'] { grid-template-columns: minmax(0, 1fr); height: auto; border: none; color: inherit; }',
      '/* a comment may mention 12px or #fff */',
    ].join('\n');

    expect(literalValuesIn(syntheticStylesheet)).toEqual([]);
  });

  it('flags a literal hidden in a token fallback', () => {
    expect(literalValuesIn('.example { gap: var(--space-4, 4px); }')).toEqual(['4px']);
  });

  it('finds no literal colour or length in any design-system stylesheet other than tokens.css', () => {
    const stylesheetNames = designSystemStylesheetNames();
    const findings = stylesheetNames.flatMap((stylesheetName) =>
      literalValuesIn(readFileSync(join(import.meta.dir, stylesheetName), 'utf8')).map((literalValue) => `${stylesheetName}: ${literalValue}`));

    expect(stylesheetNames).toContain('global.css');
    expect(findings).toEqual([]);
  });

  it('lists the 124 design tokens, each name once', () => {
    expect(CONTRACT_TOKEN_NAMES).toHaveLength(CONTRACT_TOKEN_COUNT);
    expect(new Set(CONTRACT_TOKEN_NAMES).size).toBe(CONTRACT_TOKEN_COUNT);
  });

  it('defines every design token in tokens.css exactly once and no other token', () => {
    const definedTokenNames = definedTokenNamesIn(readFileSync(join(import.meta.dir, 'tokens.css'), 'utf8'));
    const tokenNamesDefinedTwice = definedTokenNames.filter((tokenName, index) => definedTokenNames.indexOf(tokenName) !== index);

    expect(tokenNamesDefinedTwice).toEqual([]);
    expect([...definedTokenNames].sort()).toEqual([...CONTRACT_TOKEN_NAMES].sort());
  });
});
