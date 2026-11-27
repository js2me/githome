import { describe, expect, it } from 'vitest';
import { formatJobTrace } from './format-job-trace';

describe('formatJobTrace', () => {
  it('keeps section headings and output without terminal control sequences', () => {
    const trace =
      '\x1b[0Ksection_start:123:step_script[collapsed=true]\r\x1b[0KRunning script\r\n' +
      '\x1b[31mERROR\x1b[0m: job failed\n' +
      'section_end:124:step_script\r\x1b[0K\n';
    expect(formatJobTrace(trace)).toBe('Running script\nERROR: job failed\n\n');
  });

  it('keeps literal text and visible hyperlink labels', () => {
    const trace =
      'echo section_start:123:build\n\x1b]8;;https://example.org\x1b\\link\x1b]8;;\x07 <div>';
    expect(formatJobTrace(trace)).toBe(
      'echo section_start:123:build\nlink <div>',
    );
  });
});
