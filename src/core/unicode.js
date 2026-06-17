// Pure Unicode-steganography scanner. No DOM access.
// Detects zero-width chars, bidi overrides, and the Unicode Tags block
// (U+E0000–U+E007F) commonly used to smuggle invisible ASCII into text.

/** Zero-width / invisible joiners and the BOM. */
const ZERO_WIDTH = new Set([
  0x200b, // ZERO WIDTH SPACE
  0x200c, // ZERO WIDTH NON-JOINER
  0x200d, // ZERO WIDTH JOINER
  0xfeff, // ZERO WIDTH NO-BREAK SPACE / BOM
]);

/** Bidirectional override / isolate controls. */
const BIDI = new Set([
  0x202a, // LRE
  0x202b, // RLE
  0x202c, // PDF
  0x202d, // LRO
  0x202e, // RLO
  0x2066, // LRI
  0x2067, // RLI
  0x2068, // FSI
  0x2069, // PDI
]);

const TAGS_START = 0xe0000;
const TAGS_END = 0xe007f;

/**
 * Decode a Unicode Tags-block codepoint to its ASCII equivalent, or '' for the
 * non-printable language/cancel tags (U+E0001, U+E007F).
 * U+E0020..U+E007E map to ASCII 0x20..0x7E.
 * @param {number} cp
 * @returns {string}
 */
function decodeTag(cp) {
  if (cp === 0xe0001 || cp === 0xe007f) return '';
  if (cp >= 0xe0020 && cp <= 0xe007e) return String.fromCharCode(cp - 0xe0000);
  return '';
}

/**
 * Scan a string for invisible/steganographic codepoints.
 * @param {string} text
 * @returns {{
 *   zeroWidth: { codepoint: number, index: number }[],
 *   bidi: { codepoint: number, index: number }[],
 *   tags: { codepoint: number, index: number }[],
 *   decodedTags: string,
 *   reasons: string[]
 * }}
 */
export function scanUnicode(text) {
  const result = { zeroWidth: [], bidi: [], tags: [], decodedTags: '', reasons: [] };
  if (!text) return result;

  let decoded = '';
  // Iterate by code point so astral chars (the Tags block) are handled correctly.
  let index = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (ZERO_WIDTH.has(cp)) {
      result.zeroWidth.push({ codepoint: cp, index });
    } else if (BIDI.has(cp)) {
      result.bidi.push({ codepoint: cp, index });
    } else if (cp >= TAGS_START && cp <= TAGS_END) {
      result.tags.push({ codepoint: cp, index });
      decoded += decodeTag(cp);
    }
    index += ch.length; // advance by UTF-16 code units to keep indices DOM-aligned
  }
  result.decodedTags = decoded;

  if (result.zeroWidth.length) {
    result.reasons.push(`zero-width characters (${result.zeroWidth.length})`);
  }
  if (result.bidi.length) {
    result.reasons.push(`bidirectional override characters (${result.bidi.length})`);
  }
  if (result.tags.length) {
    const preview = decoded ? `: "${decoded}"` : '';
    result.reasons.push(`Unicode Tags payload (${result.tags.length} chars)${preview}`);
  }

  return result;
}

/**
 * Convenience: true if the text contains any steganographic codepoints.
 * @param {string} text
 * @returns {boolean}
 */
export function hasHiddenUnicode(text) {
  const r = scanUnicode(text);
  return r.zeroWidth.length > 0 || r.bidi.length > 0 || r.tags.length > 0;
}
