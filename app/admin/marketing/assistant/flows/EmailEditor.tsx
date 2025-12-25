'use client';

import { useEffect, useRef, useState } from 'react';
// NOTE: grapesjs and grapesjs-mjml touch `window` at module scope.
// To avoid SSR "window is not defined" errors, we import them lazily inside `useEffect`.
// We intentionally do NOT import them at the top level.
import 'grapesjs/dist/css/grapes.min.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type EmailEditorProps = {
  templateId: string;
  onSaved?: (payload: { mjml: string; html: string; meta: Record<string, unknown> }) => void;
};

type TemplateResponse = {
  id: string;
  mjml: string;
  html: string;
  meta: Record<string, any>;
};

export function EmailEditor({ templateId, onSaved }: EmailEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [background, setBackground] = useState('#0E0E0E');
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');
  const [mjml, setMjml] = useState<string>('');
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    async function loadTemplate() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/templates/${templateId}`);
        const template = (await response.json()) as TemplateResponse;

        if (!response.ok) {
          throw new Error((template as any)?.error || 'Failed to load template');
        }

        // Save template payload for preview/edit
        setMjml(template.mjml || '');
        setHtml(template.html || '');

        // Only initialise the heavy editor when in edit mode
        if (mode !== 'edit') {
          return;
        }

        // Ensure the container exists (when rendering inside overlays it can be attached next frame)
        if (!containerRef.current) {
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }
        if (!isMounted || !containerRef.current) return;

        if (editorRef.current) {
          editorRef.current.destroy();
          editorRef.current = null;
        }

        // Dynamically import grapesjs and the MJML plugin on the client only
        const [{ default: grapesjs }, { default: grapesjsMjml }] = await Promise.all([
          import('grapesjs'),
          import('grapesjs-mjml'),
        ]);

        const editor = grapesjs.init({
          container: containerRef.current,
          height: '70vh',
          fromElement: false,
          storageManager: { type: null },
          plugins: [grapesjsMjml],
          // Use the official plugin key to avoid runtime issues
          pluginsOpts: { 'grapesjs-mjml': {} },
        });

        editorRef.current = editor;
        editor.setComponents(template.mjml);

        const templateBg =
          template.meta?.theme?.background ||
          template.meta?.background ||
          '#0E0E0E';

        setBackground(templateBg);
        editor.Canvas.getBody().style.backgroundColor = templateBg;
      } catch (err) {
        console.error('Email editor load error', err);
        setError(err instanceof Error ? err.message : 'Failed to load editor');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadTemplate();

    return () => {
      isMounted = false;
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [templateId, mode]);

  const handleSave = async () => {
    if (!editorRef.current) return;

    try {
      setSaving(true);
      const mjml = (editorRef.current as any).getMjml?.() ?? editorRef.current.getHtml();
      const html = editorRef.current.getHtml();

      const meta = {
        theme: {
          background,
        },
      };

      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mjml,
          meta,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save template');
      }

      editorRef.current.Canvas.getBody().style.backgroundColor = background;

      onSaved?.({
        mjml,
        html,
        meta,
      });
    } catch (err) {
      console.error('Email editor save error', err);
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleBackgroundChange = (value: string) => {
    setBackground(value);
    if (editorRef.current) {
      editorRef.current.Canvas.getBody().style.backgroundColor = value;
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading editor...</div>;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-500">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload Editor
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={mode === 'preview' ? 'default' : 'outline'}
            onClick={() => setMode('preview')}
            className="h-8"
          >
            Preview
          </Button>
          <Button
            variant={mode === 'edit' ? 'default' : 'outline'}
            onClick={() => setMode('edit')}
            className="h-8"
          >
            Edit MJML
          </Button>
        </div>
        <label className="text-sm font-medium text-muted-foreground">
          Background
        </label>
        <Input
          type="color"
          value={background}
          onChange={(event) => handleBackgroundChange(event.target.value)}
          className="h-8 w-16 cursor-pointer p-1"
        />
        <Button onClick={handleSave} disabled={saving || mode !== 'edit'}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
      {mode === 'preview' ? (
        <div className="rounded-md border border-border bg-white">
          <iframe
            title="email-preview"
            className="h-[70vh] w-full"
            style={{ backgroundColor: background }}
            srcDoc={html || '<div style=\"padding:24px;color:#64748b;font:14px ui-sans-serif,system-ui\">This template has no HTML yet.</div>'}
          />
        </div>
      ) : (
        <div className="rounded-md border border-border bg-white">
          <div ref={containerRef} />
        </div>
      )}
    </div>
  );
}

