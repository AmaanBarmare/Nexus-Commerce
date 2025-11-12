let mjmlLoader: Promise<typeof import('mjml')> | null = null;

async function ensureMjml() {
  if (!mjmlLoader) {
    mjmlLoader = import('mjml');
  }
  return mjmlLoader;
}

export async function compileMjml(mjml: string): Promise<string> {
  const { default: mjml2html } = await ensureMjml();
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

