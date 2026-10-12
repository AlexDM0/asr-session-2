/**
 * These texts are stored on new claims and shown verbatim, so every one is pinned here; a change to
 * a title or a step then fails here first.
 */
import { describe, expect, it } from 'bun:test';

import { NEW_CLAIM_CONTENT } from './newClaimContent';

describe('NEW_CLAIM_CONTENT', () => {
  it('titles each category', () => {
    expect(NEW_CLAIM_CONTENT.titles).toEqual({
      home:      'Schade aan huis',
      car:       'Schade met auto',
      travel:    'Schade op reis',
      liability: 'Schade aan een ander',
    });
  });

  it('words the four steps', () => {
    expect(NEW_CLAIM_CONTENT.reportedStep.title).toBe('Schade gemeld');
    expect(NEW_CLAIM_CONTENT.receivedStep).toEqual({
      title:       'Melding ontvangen',
      description: 'We wijzen je melding toe aan een behandelaar',
    });
    expect(NEW_CLAIM_CONTENT.additionalInformationStep).toEqual({
      title:       'Aanvullende informatie',
      description: 'Als we meer van je nodig hebben, hoor je het van ons',
    });
    expect(NEW_CLAIM_CONTENT.assessmentStep).toEqual({
      title:       'Beoordeling en uitbetaling',
      description: 'Binnen 5 werkdagen na ontvangst',
    });
  });

  it('describes the first step with the long date and time of the report', () => {
    expect(NEW_CLAIM_CONTENT.reportedStep.description('2026-10-08T14:03')).toBe('8 oktober 2026, 14:03');
  });

  it('counts one received photo in the singular', () => {
    expect(NEW_CLAIM_CONTENT.photosReceived(1)).toBe('1 foto ontvangen');
  });

  it('counts two received photos in the plural', () => {
    expect(NEW_CLAIM_CONTENT.photosReceived(2)).toBe('2 foto\'s ontvangen');
  });
});
