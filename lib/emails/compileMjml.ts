let mjmlLoader: Promise<typeof import('mjml')> | null = null;

async function ensureMjml() {
  if (!mjmlLoader) {
    mjmlLoader = import('mjml');
  }
  return mjmlLoader;
}

/**
 * Fast, safe attribute-level normalization that never blocks for long.
 * Handles common AI-hallucinated attribute issues without touching
 * the structural nesting of the MJML (which can cause catastrophic
 * regex backtracking on templates with Handlebars blocks).
 */
function normalizeMjmlAttributes(mjml: string) {
  let normalized = mjml;

  // SECURITY: Remove mj-include tags to prevent directory traversal vulnerability (CVE-2025-67898)
  normalized = normalized.replace(/<\/?mj-include[^>]*>/gi, '');

  normalized = normalized.replace(/(\s[a-zA-Z0-9:-]+)='([^']*)'/g, (_, attr, value) => `${attr}="${value}"`);

  normalized = normalized.replace(/(\s[a-zA-Z0-9:-]+)=([0-9]+(?:px|pt|em|rem|%)?)/g, (_, attr, value) => {
    return `${attr}="${value}"`;
  });

  normalized = normalized.replace(/(\s[a-zA-Z0-9:-]+)="([^"]*)'(?=\s|>)/g, (_, attr, value) => `${attr}="${value}"`);

  // MJML does not support `class` on mj-* tags; it uses `css-class`.
  normalized = normalized.replace(
    /<(mj-[\w-]+)([^>]*?)\sclass="([^"]+)"([^>]*)>/g,
    (_m, tag, before, cls, after) => `<${tag}${before} css-class="${cls}"${after}>`
  );

  // Remove illegal font-family on <mj-body>
  normalized = normalized.replace(
    /<(mj-body)([^>]*?)\sfont-family="[^"]*"([^>]*)>/g,
    (_m, tag, before, after) => `<${tag}${before}${after}>`
  );

  // Remove illegal `inline` attribute occasionally hallucinated by models
  normalized = normalized.replace(
    /<(mj-[\w-]+)([^>]*?)\sinline="[^"]*"([^>]*)>/g,
    (_m, tag, before, after) => `<${tag}${before}${after}>`
  );

  // Normalize font-family values: strip inner quotes, collapse double commas, trim
  normalized = normalized.replace(/\sfont-family="([^"]*)"/g, (_m, value) => {
    let v = String(value);
    v = v.replace(/["'\u201c\u201d]/g, '');
    v = v.replace(/\s*,\s*,+/g, ',');
    v = v.replace(/\s{2,}/g, ' ');
    v = v.replace(/^\s*,\s*/g, '').replace(/\s*,\s*$/g, '');
    return ` font-family="${v}"`;
  });

  // Unwrap any <mj-wrapper> tags regardless of location (keep children)
  normalized = normalized.replace(/<\/?mj-wrapper[^>]*>/g, '');

  return normalized;
}

/**
 * Compiles MJML to HTML with security mitigations.
 *
 * Security notes:
 * - mj-include tags are stripped to prevent directory traversal (CVE-2025-67898)
 * - minify is disabled to avoid html-minifier vulnerabilities
 *
 * Resilience: uses only fast attribute-level normalization to avoid catastrophic
 * regex backtracking on AI-generated MJML with Handlebars template blocks.
 * Soft validation errors are logged as warnings, never thrown.
 */
export async function compileMjml(rawMjml: string): Promise<string> {
  const { default: mjml2html } = await ensureMjml();
  const mjml = normalizeMjmlAttributes(rawMjml);

  const { html, errors } = mjml2html(mjml, {
    validationLevel: 'soft',
    minify: false,
  });

  if (errors.length > 0) {
    console.warn(
      `[compileMjml] ${errors.length} soft validation warning(s):`,
      errors.map((e) => `[${e.tagName}] ${e.message}`).join('; ')
    );
  }

  return html;
}
