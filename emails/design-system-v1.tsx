import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components';
import { render } from '@react-email/render';
import type { TemplateManifest, EmailBlock } from '@/lib/schemas/marketing';

/**
 * React Email component that renders a TemplateManifest to HTML
 * Supports all block types: heading, text, CTA, divider, footer
 */

interface DesignSystemEmailProps {
  manifest: TemplateManifest;
  preview?: string;
}

/**
 * Render a single email block
 */
function EmailBlockRenderer({ block }: { block: EmailBlock }) {
  switch (block.type) {
    case 'heading': {
      const HeadingComponent =
        block.level === 'h1'
          ? Heading
          : block.level === 'h2'
          ? ({ children, ...props }: any) => (
              <Heading as="h2" {...props}>
                {children}
              </Heading>
            )
          : ({ children, ...props }: any) => (
              <Heading as="h3" {...props}>
                {children}
              </Heading>
            );

      return (
        <HeadingComponent
          style={{
            color: '#000000',
            fontSize: block.level === 'h1' ? '32px' : block.level === 'h2' ? '24px' : '20px',
            fontWeight: 'bold',
            margin: '0 0 16px 0',
            textAlign: block.align,
          }}
        >
          {block.text}
        </HeadingComponent>
      );
    }

    case 'text':
      return (
        <Text
          style={{
            color: '#333333',
            fontSize: '16px',
            lineHeight: '24px',
            margin: '0 0 16px 0',
            textAlign: block.align,
          }}
        >
          {block.content}
        </Text>
      );

    case 'cta': {
      const buttonStyles: Record<string, string> = {
        primary: {
          backgroundColor: '#000000',
          color: '#ffffff',
          border: 'none',
        },
        secondary: {
          backgroundColor: '#666666',
          color: '#ffffff',
          border: 'none',
        },
        outline: {
          backgroundColor: 'transparent',
          color: '#000000',
          border: '2px solid #000000',
        },
      };

      const style = buttonStyles[block.style] || buttonStyles.primary;

      return (
        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button
            href={block.url}
            style={{
              ...style,
              padding: '12px 24px',
              borderRadius: '4px',
              textDecoration: 'none',
              display: 'inline-block',
              fontWeight: '600',
            }}
          >
            {block.text}
          </Button>
        </Section>
      );
    }

    case 'divider':
      return (
        <Hr
          style={{
            borderColor: '#eeeeee',
            margin: `${block.spacing}px 0`,
          }}
        />
      );

    case 'footer':
      return (
        <Section style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #eeeeee' }}>
          {block.content && (
            <Text
              style={{
                color: '#666666',
                fontSize: '14px',
                lineHeight: '20px',
                margin: '0 0 8px 0',
                textAlign: 'center',
              }}
            >
              {block.content}
            </Text>
          )}
          {block.unsubscribeUrl && (
            <Text
              style={{
                color: '#999999',
                fontSize: '12px',
                textAlign: 'center',
                margin: '8px 0 0 0',
              }}
            >
              <Link href={block.unsubscribeUrl} style={{ color: '#999999' }}>
                Unsubscribe
              </Link>
            </Text>
          )}
          <Text
            style={{
              color: '#999999',
              fontSize: '12px',
              textAlign: 'center',
              margin: '8px 0 0 0',
            }}
          >
            © {new Date().getFullYear()} Alyra. All rights reserved.
          </Text>
        </Section>
      );

    default:
      return null;
  }
}

/**
 * Main email component
 */
export function DesignSystemEmail({ manifest, preview }: DesignSystemEmailProps) {
  const { design_system, blocks } = manifest;
  const { theme } = design_system;

  return (
    <Html>
      <Head />
      {preview && <Preview>{preview}</Preview>}
      <Body
        style={{
          backgroundColor: theme.colors.background,
          fontFamily: theme.fonts.body,
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '40px 20px',
            backgroundColor: theme.colors.background,
          }}
        >
          {blocks.map((block, index) => (
            <EmailBlockRenderer key={index} block={block} />
          ))}
        </Container>
      </Body>
    </Html>
  );
}

/**
 * Render email manifest to HTML string
 */
export async function renderEmail(
  manifest: TemplateManifest,
  preview?: string
): Promise<string> {
  return render(<DesignSystemEmail manifest={manifest} preview={preview} />);
}

