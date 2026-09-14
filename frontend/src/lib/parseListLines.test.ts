import { describe, expect, it } from 'vitest'
import { parseListLines, stripListMarker } from './parseListLines'

describe('stripListMarker', () => {
  it('strips numbered markers', () => {
    expect(stripListMarker('1. Warm tortillas')).toBe('Warm tortillas')
    expect(stripListMarker('1) Warm tortillas')).toBe('Warm tortillas')
    expect(stripListMarker('12. Fill and fold')).toBe('Fill and fold')
    expect(stripListMarker('2] Season')).toBe('Season')
  })

  it('strips bullet markers', () => {
    expect(stripListMarker('- tortillas')).toBe('tortillas')
    expect(stripListMarker('* salsa')).toBe('salsa')
    expect(stripListMarker('• onion')).toBe('onion')
    expect(stripListMarker('– cheese')).toBe('cheese')
    expect(stripListMarker('— beans')).toBe('beans')
    expect(stripListMarker('-flour')).toBe('flour')
  })

  it('does not treat letter prefixes as list markers', () => {
    expect(stripListMarker('a. sauce')).toBe('a. sauce')
    expect(stripListMarker('B) Mix dry ingredients')).toBe(
      'B) Mix dry ingredients'
    )
  })

  it('preserves decimal quantities that look like numbered markers', () => {
    expect(stripListMarker('1.5 cups flour')).toBe('1.5 cups flour')
  })

  it('trims surrounding whitespace and extra spaces after markers', () => {
    expect(stripListMarker('  1)  flour  ')).toBe('flour')
    expect(stripListMarker('1.   sugar')).toBe('sugar')
  })

  it('leaves plain text unchanged', () => {
    expect(stripListMarker('2 cups flour')).toBe('2 cups flour')
    expect(stripListMarker('salt')).toBe('salt')
  })

  it('turns marker-only lines into empty strings', () => {
    expect(stripListMarker('-')).toBe('')
    expect(stripListMarker('*')).toBe('')
  })
})

describe('parseListLines', () => {
  it('splits newline-delimited lines and strips markers', () => {
    const text = `1. Warm tortillas
2) Fill and fold
- Serve hot`

    expect(parseListLines(text)).toEqual([
      'Warm tortillas',
      'Fill and fold',
      'Serve hot'
    ])
  })

  it('drops blank lines', () => {
    expect(parseListLines('flour\n\n\nsugar\n')).toEqual(['flour', 'sugar'])
  })

  it('drops marker-only lines', () => {
    expect(parseListLines('flour\n-\n* salsa')).toEqual(['flour', 'salsa'])
  })

  it('handles CRLF newlines', () => {
    expect(parseListLines('a\r\nb\r\n')).toEqual(['a', 'b'])
  })

  it('returns an empty array for blank input', () => {
    expect(parseListLines('')).toEqual([])
    expect(parseListLines('   \n  \n')).toEqual([])
  })
})
