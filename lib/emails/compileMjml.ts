let mjmlLoader: Promise<typeof import('mjml')> | null = null;

async function ensureMjml() {
  if (!mjmlLoader) {
    mjmlLoader = import('mjml');
  }
  return mjmlLoader;
}

function normalizeMjml(mjml: string) {
  let normalized = mjml;

  normalized = normalized.replace(/(\s[a-zA-Z0-9:-]+)='([^']*)'/g, (_, attr, value) => `${attr}="${value}"`);

  normalized = normalized.replace(/(\s[a-zA-Z0-9:-]+)=([0-9]+(?:px|pt|em|rem|%)?)/g, (_, attr, value) => {
    return `${attr}="${value}"`;
  });

  normalized = normalized.replace(/(\s[a-zA-Z0-9:-]+)="([^"]*)'(?=\s|>)/g, (_, attr, value) => `${attr}="${value}"`);

  // MJML does not support `class` on mj-* tags; it uses `css-class`.
  // Convert `class="..."` to `css-class="..."` on any <mj-*> opening tag.
  normalized = normalized.replace(
    /<(mj-[\w-]+)([^>]*?)\sclass="([^"]+)"([^>]*)>/g,
    (_m, tag, before, cls, after) => `<${tag}${before} css-class="${cls}"${after}>`
  );

  // Remove illegal font-family on <mj-body>
  normalized = normalized.replace(
    /<(mj-body)([^>]*?)\sfont-family="[^"]*"([^>]*)>/g,
    (_m, tag, before, after) => `<${tag}${before}${after}>`
  );

  // Normalize any font-family values anywhere:
  // - strip inner quotes
  // - collapse double commas
  // - trim extra spaces and stray leading/trailing commas
  normalized = normalized.replace(/\sfont-family="([^"]*)"/g, (_m, value) => {
    let v = String(value);
    v = v.replace(/["'“”]/g, '');
    v = v.replace(/\s*,\s*,+/g, ',');
    v = v.replace(/\s{2,}/g, ' ');
    v = v.replace(/^\s*,\s*/g, '').replace(/\s*,\s*$/g, '');
    return ` font-family="${v}"`;
  });

  // Unwrap any <mj-wrapper> tags regardless of location (keep children)
  normalized = normalized.replace(/<\/?mj-wrapper[^>]*>/g, '');

  return normalized;
}

export async function compileMjml(rawMjml: string): Promise<string> {
  const { default: mjml2html } = await ensureMjml();
  const mjml = normalizeMjml(rawMjml);
  const { html, errors } = mjml2html(mjml, {
    validationLevel: 'soft',
    minify: false,
  });

  if (errors.length > 0) {
    const message = errors.map((error) => `[${error.tagName}] ${error.message}`).join('\n');
    throw new Error(`MJML compilation failed:\n${message}`);
  }

  return html;
}

