let mjmlLoader: Promise<typeof import('mjml')> | null = null;

async function ensureMjml() {
  if (!mjmlLoader) {
    mjmlLoader = import('mjml');
  }
  return mjmlLoader;
}

function normalizeMjml(mjml: string) {
  let normalized = mjml;

  // SECURITY: Remove mj-include tags to prevent directory traversal vulnerability (CVE-2025-67898)
  // This makes the vulnerability unexploitable even if someone tries to inject mj-include
  normalized = normalized.replace(/<\/?mj-include[^>]*>/gi, '');

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

  // Remove illegal `inline` attribute occasionally hallucinated by models (e.g., on <mj-table>)
  normalized = normalized.replace(
    /<(mj-[\w-]+)([^>]*?)\sinline="[^"]*"([^>]*)>/g,
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

  // ============================================================================
  // COMPREHENSIVE MJML STRUCTURE FIXES
  // Correct structure: mj-body > mj-section > mj-column > content
  // ============================================================================

  // Content elements that must be inside mj-column (shared across fixes)
  const contentElements = ['mj-text', 'mj-image', 'mj-button', 'mj-divider', 'mj-spacer', 'mj-hero', 'mj-navbar', 'mj-social', 'mj-table', 'mj-accordion', 'mj-carousel'];

  // Normalize self-closing content tags (e.g., <mj-divider />) to explicit open/close tags
  // so that structural fixes below can reliably detect and wrap them.
  for (const element of contentElements) {
    const selfClosingRegex = new RegExp(`<${element}([^>]*?)/>`, 'gi');
    normalized = normalized.replace(selfClosingRegex, (_match, attrs) => {
      return `<${element}${attrs}></${element}>`;
    });
  }

  // Fix 1: mj-section cannot be inside mj-column
  // Pattern: <mj-column><mj-section>...</mj-section></mj-column>
  // Solution: Unwrap mj-section, keep its content in mj-column
  normalized = normalized.replace(
    /<mj-column[^>]*>\s*<mj-section([^>]*)>([\s\S]*?)<\/mj-section>\s*<\/mj-column>/gi,
    (match, sectionAttrs, sectionContent) => {
      return `<mj-section${sectionAttrs}>${sectionContent}</mj-section>`;
    }
  );

  // Fix 2: mj-column cannot be directly inside mj-body (must be inside mj-section)
  // Pattern: <mj-body><mj-column>...</mj-column></mj-body>
  // Solution: Wrap mj-column in mj-section
  // First, handle the simple case where mj-body directly contains mj-column with no sections
  normalized = normalized.replace(
    /<mj-body([^>]*)>([\s\S]*?)<\/mj-body>/gi,
    (match, bodyAttrs, bodyContent) => {
      // If body content has mj-column but no mj-section, wrap all columns
      if (bodyContent.includes('<mj-column') && !bodyContent.includes('<mj-section')) {
        // Wrap each mj-column in mj-section
        return `<mj-body${bodyAttrs}>${bodyContent.replace(
          /<mj-column([^>]*)>([\s\S]*?)<\/mj-column>/gi,
          (colMatch, colAttrs, colContent) => {
            return `<mj-section><mj-column${colAttrs}>${colContent}</mj-column></mj-section>`;
          }
        )}</mj-body>`;
      }
      return match;
    }
  );
  
  // Then handle cases where mj-column appears between sections or after sections
  // Use iterative approach to catch all cases
  let fix2Previous = '';
  let fix2Iterations = 0;
  while (normalized !== fix2Previous && fix2Iterations < 10) {
    fix2Previous = normalized;
    
    // Match mj-column that's not inside a section (direct child of mj-body or between sections)
    normalized = normalized.replace(
      /<mj-body([^>]*)>([\s\S]*?)<\/mj-body>/gi,
      (match, bodyAttrs, bodyContent) => {
        // Find all mj-column tags and check if they're inside sections
        let fixed = bodyContent;
        let lastIndex = 0;
        let result = '';
        
        const columnRegex = /<mj-column[^>]*>[\s\S]*?<\/mj-column>/gi;
        let columnMatch;
        
        while ((columnMatch = columnRegex.exec(bodyContent)) !== null) {
          const beforeColumn = bodyContent.substring(lastIndex, columnMatch.index);
          const columnTag = columnMatch[0];
          
          // Count sections before this column
          const beforeText = bodyContent.substring(0, columnMatch.index);
          const openSections = (beforeText.match(/<mj-section[^>]*>/gi) || []).length;
          const closeSections = (beforeText.match(/<\/mj-section>/gi) || []).length;
          const isInSection = openSections > closeSections;
          
          result += beforeColumn;
          
          if (!isInSection) {
            result += `<mj-section>${columnTag}</mj-section>`;
          } else {
            result += columnTag;
          }
          
          lastIndex = columnMatch.index + columnMatch[0].length;
        }
        
        result += bodyContent.substring(lastIndex);
        return `<mj-body${bodyAttrs}>${result}</mj-body>`;
      }
    );
    
    fix2Iterations++;
  }

  // Fix 4: mj-section inside mj-section (not allowed, unwrap inner section)
  // Pattern: <mj-section><mj-section>...</mj-section></mj-section>
  normalized = normalized.replace(
    /<mj-section([^>]*)>([\s\S]*?)<mj-section([^>]*)>([\s\S]*?)<\/mj-section>([\s\S]*?)<\/mj-section>/gi,
    (match, outerAttrs, before, innerAttrs, innerContent, after) => {
      // Unwrap inner section, keep its content
      return `<mj-section${outerAttrs}>${before}${innerContent}${after}</mj-section>`;
    }
  );

  // Fix 5: Content directly inside mj-section without mj-column
  // Strategy:
  // 1) Backwards-compat simple pattern for the common case where a section contains
  //    a single content element and no columns at all.
  // 2) A more robust pass that scans each section and wraps any content elements
  //    that are not currently inside an open mj-column.
  contentElements.forEach((element) => {
    // Simple case: mj-section that directly contains the content element (not inside mj-column)
    normalized = normalized.replace(
      new RegExp(
        `<mj-section([^>]*)>([\\s\\S]*?)<${element}([^>]*)>([\\s\\S]*?)<\\/${element}>([\\s\\S]*?)<\\/mj-section>`,
        'gi'
      ),
      (match, sectionAttrs, before, elemAttrs, elemContent, after) => {
        // Check if there's already a mj-column in before/after
        const hasColumn = before.includes('<mj-column') || after.includes('<mj-column');
        if (!hasColumn) {
          // Wrap the content element in mj-column
          return `<mj-section${sectionAttrs}>${before}<mj-column><${element}${elemAttrs}>${elemContent}</${element}></mj-column>${after}</mj-section>`;
        }
        return match;
      }
    );

    // Robust case: for each section, find this element when it is not nested in a column
    normalized = normalized.replace(
      /<mj-section([^>]*)>([\s\S]*?)<\/mj-section>/gi,
      (match, sectionAttrs, sectionContent) => {
        const escapedElement = element.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const elementRegex = new RegExp(
          `<${escapedElement}([^>]*)>([\\s\\S]*?)<\\/${escapedElement}>`,
          'gi'
        );

        const matches: Array<{
          index: number;
          fullMatch: string;
          attrs: string;
          content: string;
          needsWrap: boolean;
        }> = [];

        let elementMatch;
        while ((elementMatch = elementRegex.exec(sectionContent)) !== null) {
          const beforeText = sectionContent.substring(0, elementMatch.index);
          const openColumns = (beforeText.match(/<mj-column[^>]*>/gi) || []).length;
          const closeColumns = (beforeText.match(/<\/mj-column>/gi) || []).length;

          // If there is no currently-open mj-column at this point, this element is a
          // direct child of mj-section and must be wrapped.
          const needsWrap = openColumns <= closeColumns;

          matches.push({
            index: elementMatch.index,
            fullMatch: elementMatch[0],
            attrs: elementMatch[1],
            content: elementMatch[2],
            needsWrap,
          });
        }

        if (matches.length === 0 || !matches.some((m) => m.needsWrap)) {
          return match;
        }

        // Build the result by processing matches from end to start (to preserve indices)
        let result = sectionContent;
        for (let i = matches.length - 1; i >= 0; i--) {
          const m = matches[i];
          if (!m.needsWrap) continue;

          const wrapped = `<mj-column><${element}${m.attrs}>${m.content}</${element}></mj-column>`;
          result =
            result.substring(0, m.index) +
            wrapped +
            result.substring(m.index + m.fullMatch.length);
        }

        return `<mj-section${sectionAttrs}>${result}</mj-section>`;
      }
    );
  });

  // Fix 6: mj-column inside mj-column (not allowed, unwrap inner column)
  // Pattern: <mj-column><mj-column>...</mj-column></mj-column>
  // Run this fix iteratively to catch deeply nested or repeated occurrences.
  let nestedColumnPrevious = '';
  let nestedColumnIterations = 0;
  while (normalized !== nestedColumnPrevious && nestedColumnIterations < 10) {
    nestedColumnPrevious = normalized;
    normalized = normalized.replace(
      /<mj-column([^>]*)>([\s\S]*?)<mj-column([^>]*)>([\s\S]*?)<\/mj-column>([\s\S]*?)<\/mj-column>/gi,
      (_match, outerAttrs, before, _innerAttrs, innerContent, after) => {
        // Unwrap inner column, keep its content inside the outer column
        return `<mj-column${outerAttrs}>${before}${innerContent}${after}</mj-column>`;
      }
    );
    nestedColumnIterations++;
  }

  // Fix 7: Content elements directly inside mj-body (must be in mj-section > mj-column)
  // Pattern: <mj-body><mj-text>...</mj-text></mj-body>
  // Solution: Wrap each unwrapped content element in mj-section > mj-column
  for (const element of contentElements) {
    normalized = normalized.replace(
      /<mj-body([^>]*)>([\s\S]*?)<\/mj-body>/gi,
      (match, bodyAttrs, bodyContent) => {
        const elementRegex = new RegExp(`<${element.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^>]*)>([\\s\\S]*?)<\\/${element.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}>`, 'gi');
        
        // Collect all matches with their positions first
        const matches: Array<{index: number; fullMatch: string; attrs: string; content: string; needsWrap: boolean}> = [];
        let elementMatch;
        
        while ((elementMatch = elementRegex.exec(bodyContent)) !== null) {
          const beforeText = bodyContent.substring(0, elementMatch.index);
          const openSections = (beforeText.match(/<mj-section[^>]*>/gi) || []).length;
          const closeSections = (beforeText.match(/<\/mj-section>/gi) || []).length;
          const openColumns = (beforeText.match(/<mj-column[^>]*>/gi) || []).length;
          const closeColumns = (beforeText.match(/<\/mj-column>/gi) || []).length;
          
          const needsWrap = openSections <= closeSections && openColumns <= closeColumns;
          
          matches.push({
            index: elementMatch.index,
            fullMatch: elementMatch[0],
            attrs: elementMatch[1],
            content: elementMatch[2],
            needsWrap,
          });
        }
        
        if (matches.length === 0 || !matches.some(m => m.needsWrap)) {
          return match;
        }
        
        // Build the result by processing matches from end to start (to preserve indices)
        let result = bodyContent;
        for (let i = matches.length - 1; i >= 0; i--) {
          const m = matches[i];
          if (m.needsWrap) {
            const wrapped = `<mj-section><mj-column><${element}${m.attrs}>${m.content}</${element}></mj-column></mj-section>`;
            result = result.substring(0, m.index) + wrapped + result.substring(m.index + m.fullMatch.length);
          }
        }
        
        return `<mj-body${bodyAttrs}>${result}</mj-body>`;
      }
    );
  }

  // Final iterative pass to catch any remaining nested structure issues
  let finalPrevious = '';
  let finalIterations = 0;
  while (normalized !== finalPrevious && finalIterations < 5) {
    finalPrevious = normalized;
    
    // Re-apply fix 2 for any remaining direct mj-column in mj-body
    normalized = normalized.replace(
      /<mj-body([^>]*)>([\s\S]*?)<\/mj-body>/gi,
      (match, bodyAttrs, bodyContent) => {
        // Check if there are any mj-column tags not in sections
        if (bodyContent.includes('<mj-column')) {
          // Simple approach: wrap any mj-column that's not immediately after <mj-section>
          return `<mj-body${bodyAttrs}>${bodyContent.replace(
            /(^|<\/mj-section>)([\s\S]*?)<mj-column([^>]*)>([\s\S]*?)<\/mj-column>/gi,
            (match, before, between, colAttrs, colContent) => {
              if (!between.includes('<mj-section')) {
                return `${before}${between}<mj-section><mj-column${colAttrs}>${colContent}</mj-column></mj-section>`;
              }
              return match;
            }
          )}</mj-body>`;
        }
        return match;
      }
    );
    
    finalIterations++;
  }

  return normalized;
}

/**
 * Compiles MJML to HTML with security mitigations.
 * 
 * Security notes:
 * - mj-include tags are stripped to prevent directory traversal (CVE-2025-67898)
 * - minify is disabled to avoid html-minifier vulnerabilities
 * - All input is sanitized through normalizeMjml before compilation
 */
export async function compileMjml(rawMjml: string): Promise<string> {
  const { default: mjml2html } = await ensureMjml();
  let mjml = normalizeMjml(rawMjml);
  
  // Try compilation
  let { html, errors } = mjml2html(mjml, {
    validationLevel: 'soft',
    minify: false, // Disabled to avoid html-minifier ReDoS vulnerability
  });

  // If we still have errors, try aggressive fixes based on error type
  const nestingErrors = errors.filter(
    (error) => error.message?.includes('cannot be used inside')
  );

  if (nestingErrors.length > 0) {
    // Apply aggressive fixes based on specific error types
    for (const error of nestingErrors) {
      const tagName = error.tagName;
      const message = error.message || '';

      // Fix: mj-column cannot be inside mj-body
      if (tagName === 'mj-column' && message.includes('mj-body')) {
        // More aggressive: find ALL mj-column tags in mj-body and wrap them
        mjml = mjml.replace(
          /<mj-body([^>]*)>([\s\S]*?)<\/mj-body>/gi,
          (match, bodyAttrs, bodyContent) => {
            // Wrap every mj-column that's not already in a mj-section
            let fixed = bodyContent;
            let result = '';
            let lastIndex = 0;
            
            const columnRegex = /<mj-column[^>]*>[\s\S]*?<\/mj-column>/gi;
            let columnMatch;
            
            while ((columnMatch = columnRegex.exec(bodyContent)) !== null) {
              const beforeColumn = bodyContent.substring(lastIndex, columnMatch.index);
              const columnTag = columnMatch[0];
              
              // Check if this column is inside a section
              const beforeText = bodyContent.substring(0, columnMatch.index);
              const openSections = (beforeText.match(/<mj-section[^>]*>/gi) || []).length;
              const closeSections = (beforeText.match(/<\/mj-section>/gi) || []).length;
              const isInSection = openSections > closeSections;
              
              result += beforeColumn;
              
              if (!isInSection) {
                result += `<mj-section>${columnTag}</mj-section>`;
              } else {
                result += columnTag;
              }
              
              lastIndex = columnMatch.index + columnMatch[0].length;
            }
            
            result += bodyContent.substring(lastIndex);
            return `<mj-body${bodyAttrs}>${result}</mj-body>`;
          }
        );
      }

      // Fix: mj-section cannot be inside mj-column
      if (tagName === 'mj-section' && message.includes('mj-column')) {
        mjml = mjml.replace(
          /<mj-column([^>]*)>([\s\S]*?)<mj-section[^>]*>([\s\S]*?)<\/mj-section>([\s\S]*?)<\/mj-column>/gi,
          (match, colAttrs, before, sectionContent, after) => {
            return `<mj-column${colAttrs}>${before}${sectionContent}${after}</mj-column>`;
          }
        );
      }

      // Fix: mj-section cannot be inside mj-section
      if (tagName === 'mj-section' && message.includes('mj-section')) {
        mjml = mjml.replace(
          /<mj-section([^>]*)>([\s\S]*?)<mj-section([^>]*)>([\s\S]*?)<\/mj-section>([\s\S]*?)<\/mj-section>/gi,
          (match, outerAttrs, before, innerAttrs, innerContent, after) => {
            return `<mj-section${outerAttrs}>${before}${innerContent}${after}</mj-section>`;
          }
        );
      }

      // Fix: mj-column cannot be inside mj-column
      if (tagName === 'mj-column' && message.includes('mj-column')) {
        mjml = mjml.replace(
          /<mj-column([^>]*)>([\s\S]*?)<mj-column([^>]*)>([\s\S]*?)<\/mj-column>([\s\S]*?)<\/mj-column>/gi,
          (match, outerAttrs, before, innerAttrs, innerContent, after) => {
            return `<mj-column${outerAttrs}>${before}${innerContent}${after}</mj-column>`;
          }
        );
      }

      // Fix: Content elements (mj-text, mj-button, mj-table, mj-divider, etc.) cannot be directly inside mj-body
      // They must be inside mj-section > mj-column
      const contentTagNames = ['mj-text', 'mj-button', 'mj-table', 'mj-divider', 'mj-image', 'mj-spacer', 'mj-hero', 'mj-navbar', 'mj-social', 'mj-accordion', 'mj-carousel'];
      if (contentTagNames.includes(tagName) && message.includes('mj-body')) {
        // Find all instances of this tag directly inside mj-body and wrap them
        mjml = mjml.replace(
          /<mj-body([^>]*)>([\s\S]*?)<\/mj-body>/gi,
          (match, bodyAttrs, bodyContent) => {
            // Use a more sophisticated approach to find tags that are direct children of mj-body
            // We'll replace the tag pattern when it's not inside mj-section
            let fixed = bodyContent;
            const tagRegex = new RegExp(`<${tagName}([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
            
            let result = '';
            let lastIndex = 0;
            let tagMatch;
            
            while ((tagMatch = tagRegex.exec(bodyContent)) !== null) {
              const beforeTag = bodyContent.substring(lastIndex, tagMatch.index);
              const tagFull = tagMatch[0];
              const tagAttrs = tagMatch[1];
              const tagContent = tagMatch[2];
              
              // Check if this tag is inside a mj-section or mj-column
              const beforeText = bodyContent.substring(0, tagMatch.index);
              const openSections = (beforeText.match(/<mj-section[^>]*>/gi) || []).length;
              const closeSections = (beforeText.match(/<\/mj-section>/gi) || []).length;
              const openColumns = (beforeText.match(/<mj-column[^>]*>/gi) || []).length;
              const closeColumns = (beforeText.match(/<\/mj-column>/gi) || []).length;
              
              const isInSection = openSections > closeSections;
              const isInColumn = openColumns > closeColumns;
              
              result += beforeTag;
              
              // If not in section or column, wrap it properly
              if (!isInSection && !isInColumn) {
                result += `<mj-section><mj-column><${tagName}${tagAttrs}>${tagContent}</${tagName}></mj-column></mj-section>`;
              } else if (isInSection && !isInColumn) {
                // In section but not in column, wrap in column
                result += `<mj-column><${tagName}${tagAttrs}>${tagContent}</${tagName}></mj-column>`;
              } else {
                // Already properly nested
                result += tagFull;
              }
              
              lastIndex = tagMatch.index + tagMatch[0].length;
            }
            
            result += bodyContent.substring(lastIndex);
            return `<mj-body${bodyAttrs}>${result}</mj-body>`;
          }
        );
      }
    }

    // Try compilation again after fixes
    const result = mjml2html(mjml, {
      validationLevel: 'soft',
      minify: false,
    });
    html = result.html;
    errors = result.errors;
  }

  if (errors.length > 0) {
    const message = errors.map((error) => `[${error.tagName}] ${error.message}`).join('\n');
    throw new Error(`MJML compilation failed:\n${message}`);
  }

  return html;
}

