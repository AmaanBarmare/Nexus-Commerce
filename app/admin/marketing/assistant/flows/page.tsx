'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlowProvider,
  ReactFlow,
  Background,
  Node,
  Edge,
  MarkerType,
  Panel,
  Position,
  Handle,
  applyNodeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Sparkles, AlertCircle, Gauge, Zap, Mail, Clock, Share2, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { FlowManifest, FlowIssue, EmailType } from '@/types/flow';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import type { NodeProps, NodeTypes } from '@xyflow/react';
import { CanvasChatPanel } from './CanvasChatPanel';
import { EmailEditor } from './EmailEditor';

const severityWeight: Record<FlowIssue['severity'], number> = {
  error: 3,
  warning: 2,
  info: 1,
};

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

type FlowState = {
  id: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'DISABLED';
  manifest: FlowManifest;
};

type TemplateSummary = {
  id: string;
  name: string;
  emailType: EmailType;
};

type CanvasNodeData = {
  label: string;
  kind: 'trigger' | 'action' | 'condition' | 'delay';
  emailType?: EmailType;
  system?: string;
  issue?: FlowIssue;
  locked?: boolean;
};

type ParsedCommand =
  | { kind: 'set'; path: string; value: string }
  | { kind: 'guardConsent' }
  | { kind: 'addWait'; amount: number; unit: 'd' | 'h' };

type AssistantContext = {
  flow: { id: string; name: string };
  selected: null | {
    id: string;
    type: FlowManifest['nodes'][number]['type'];
    label: string;
    data?: FlowManifest['nodes'][number]['data'];
    inDegree: number;
    outDegree: number;
  };
};

function generateId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneManifest(manifest: FlowManifest): FlowManifest {
  return JSON.parse(JSON.stringify(manifest)) as FlowManifest;
}

function parseCommand(input: string): ParsedCommand | null {
  const trimmed = input.trim();
  const mSet = trimmed.match(/^\/set\s+([\w.]+)\s+(.+)/i);
  if (mSet) {
    const [, path, rawValue] = mSet;
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    return { kind: 'set', path: path.toLowerCase(), value };
  }

  if (/^\/guard\s+consent/i.test(trimmed)) {
    return { kind: 'guardConsent' };
  }

  const mAddWait = trimmed.match(/^\/add\s+wait\s+(\d+)([dh])/i);
  if (mAddWait) {
    return {
      kind: 'addWait',
      amount: Number(mAddWait[1]),
      unit: mAddWait[2].toLowerCase() as 'd' | 'h',
    };
  }

  return null;
}

function buildAssistantContext(flowState: FlowState | null, selectedNodeId?: string | null): AssistantContext | null {
  if (!flowState) return null;

  const { manifest } = flowState;
  const selected = selectedNodeId
    ? manifest.nodes.find((node) => node.id === selectedNodeId)
    : undefined;

  return {
    flow: { id: flowState.id, name: flowState.name },
    selected: selected
      ? {
          id: selected.id,
          type: selected.type,
          label: selected.label,
          data: selected.data,
          inDegree: manifest.edges.filter((edge) => edge.targetId === selected.id).length,
          outDegree: manifest.edges.filter((edge) => edge.sourceId === selected.id).length,
        }
      : null,
  };
}

function topIssue(issues: FlowIssue[] | undefined) {
  if (!issues || issues.length === 0) {
    return undefined;
  }
  return issues.slice().sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity])[0];
}

const nodeIcons: Record<CanvasNodeData['kind'], React.ReactNode> = {
  trigger: <Zap className="h-4 w-4" />,
  action: <Share2 className="h-4 w-4" />,
  condition: <Gauge className="h-4 w-4" />,
  delay: <Clock className="h-4 w-4" />,
};

function FlowNodeCard({ data, selected }: NodeProps) {
  const nodeData = data as CanvasNodeData;
  const issue = nodeData.issue;
  const isMarketingEmail = nodeData.kind === 'action' && nodeData.emailType === 'marketing';
  const isSystemLock = nodeData.system === 'marketing_consent' || nodeData.locked === true;

  return (
    <div
      className={`relative min-w-[200px] rounded-lg border bg-white px-3 py-2 shadow-sm transition ${
        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !rounded-full !bg-slate-400"
        style={{ opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !rounded-full !bg-slate-400"
        style={{ opacity: 0 }}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
          {nodeIcons[nodeData.kind]}
          <span>{nodeData.label}</span>
        </div>
        <Badge variant="secondary" className="text-[11px] uppercase">
          {nodeData.kind}
        </Badge>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {isMarketingEmail && (
          <Badge className="bg-amber-100 text-amber-800">
            <Mail className="mr-1 h-3 w-3" />
            Marketing
          </Badge>
        )}
        {isSystemLock && (
          <Badge variant="outline" className="gap-1 border-dashed text-xs text-slate-600">
            Requires subscription
          </Badge>
        )}
        {issue && (
          <Badge variant="destructive" className="gap-1 text-xs">
            <AlertCircle className="h-3 w-3" /> {issue.severity}
          </Badge>
        )}
      </div>

      {issue && (
        <p className="mt-2 text-xs text-red-600">{issue.message}</p>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = { alyra: FlowNodeCard as NodeTypes[string] };

export default function FlowsAssistantPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [flow, setFlow] = useState<FlowState | null>(null);
  const [templates, setTemplates] = useState<Record<string, TemplateSummary>>({});
  const [rfNodes, setRfNodes] = useState<Node<CanvasNodeData>[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge[]>([]);
  const suppressSelectionChangeRef = useRef(false);
  const [validation, setValidation] = useState<{ ok: boolean; issues: FlowIssue[] } | null>(null);
  const [issuesByNode, setIssuesByNode] = useState<Record<string, FlowIssue[]>>({});
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [selectedNodeId, internalSetSelectedNodeId] = useState<string | null>(null);
  const selectedNodeIdRef = useRef<string | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [selectionHint, setSelectionHint] = useState<string | null>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setSelectedNodeId = useCallback((value: string | null) => {
    selectedNodeIdRef.current = value;
    internalSetSelectedNodeId(value);
  }, []);

  // (moved below updateCanvasFromManifest)

  const showSelectionHint = useCallback((message: string) => {
    setSelectionHint(message);
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
    }
    hintTimeoutRef.current = setTimeout(() => {
      setSelectionHint(null);
      hintTimeoutRef.current = null;
    }, 3000);
  }, []);

  const selectedNode = useMemo(() => {
    if (!flow || !selectedNodeId) return null;
    return flow.manifest.nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [flow, selectedNodeId, setSelectedNodeId]);

  const updateCanvasFromManifest = useCallback(
    (manifest: FlowManifest, nodeIssues: Record<string, FlowIssue[]>, options?: { selectedId?: string | null }) => {
      const selectedId =
        options && 'selectedId' in options ? options.selectedId ?? null : selectedNodeIdRef.current;

      setRfNodes(
        manifest.nodes.map((node) => {
          const canvasNodeData: CanvasNodeData = {
            label: node.label,
            kind: node.type,
            emailType: node.data?.emailType as EmailType | undefined,
            system: typeof node.data?.system === 'string' ? (node.data?.system as string) : undefined,
            issue: topIssue(nodeIssues[node.id]),
            locked: node.data?.system === 'marketing_consent' || node.data?.locked === true,
          };
          const controlledNode: Node<CanvasNodeData> = {
            id: node.id,
            type: 'alyra',
            position: node.position ?? { x: 0, y: 0 },
            data: canvasNodeData,
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            draggable: canvasNodeData.locked ? false : true,
          };
          if (selectedId) {
            controlledNode.selected = node.id === selectedId;
          }
          return controlledNode;
        })
      );

      const styledEdges: Edge[] = manifest.edges.map((edge) => {
        const normalizedLabel = edge.label
          ? String(edge.label).trim().toLowerCase()
          : undefined;

        return {
          id: edge.id,
          source: edge.sourceId,
          target: edge.targetId,
          label: normalizedLabel,
          type: 'smoothstep',
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#64748b',
            width: 16,
            height: 16,
          },
          style: {
            strokeWidth: 2,
            stroke: '#64748b',
            strokeDasharray: '6 4',
          },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 6,
          labelBgStyle: {
            fill: 'rgba(100,116,139,0.12)',
            stroke: 'transparent',
          },
          labelStyle: {
            fill: '#475569',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
          },
        };
      });

      // Fallback: if the assistant returns nodes but no edges, synthesize a visible left-to-right connection
      let edgesToRender = styledEdges;
      if (styledEdges.length === 0 && manifest.nodes.length >= 2) {
        const sorted = manifest.nodes
          .slice()
          .sort(
            (a, b) => (a.position?.x ?? 0) - (b.position?.x ?? 0)
          );
        edgesToRender = [];
        for (let i = 0; i < sorted.length - 1; i++) {
          edgesToRender.push({
            id: `auto-edge-${sorted[i].id}-${sorted[i + 1].id}`,
            source: sorted[i].id,
            target: sorted[i + 1].id,
            label: 'true',
            type: 'smoothstep',
            animated: false,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#64748b',
              width: 16,
              height: 16,
            },
            style: {
              strokeWidth: 2,
              stroke: '#64748b',
              strokeDasharray: '6 4',
            },
          });
        }
      }

      setRfEdges(edgesToRender);
    },
    []
  );

  // Load an existing flow for editing if ?flowId= is present
  useEffect(() => {
    const flowId = searchParams.get('flowId');
    if (!flowId) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/flows/${flowId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load flow');
        if (cancelled) return;
        const manifest = json.flow?.manifest as FlowManifest;
        const loaded: FlowState = {
          id: json.flow.id,
          name: json.flow.name,
          status: json.flow.status,
          manifest,
        };
        // Build template summaries by fetching names
        const templateIds = Array.from(
          new Set(
            manifest.nodes
              .filter((n: any) => n?.type === 'action' && n?.data?.templateId)
              .map((n: any) => String(n.data.templateId))
          )
        );
        const summaries: Record<string, TemplateSummary> = {};
        await Promise.all(
          templateIds.map(async (id) => {
            try {
              const tRes = await fetch(`/api/templates/${id}`);
              const tJson = await tRes.json();
              if (tRes.ok) {
                summaries[id] = { id, name: tJson.name ?? id, emailType: (tJson.meta?.emailType as EmailType) ?? 'transactional' };
              }
            } catch {
              // ignore individual template failures
            }
          })
        );
        setTemplates(summaries);
        setFlow(loaded);
        updateCanvasFromManifest(manifest, {}, { selectedId: null });
      } catch (e) {
        console.error('Failed to load flow for editing', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, updateCanvasFromManifest]);

  const appendMessage = useCallback((message: ConversationMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  useEffect(() => {
    if (!flow) {
      setSelectedNodeId(null);
      return;
    }
    if (selectedNodeId && !flow.manifest.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [flow, selectedNodeId]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();
      const isTypingTarget =
        tagName === 'input' ||
        tagName === 'textarea' ||
        target?.isContentEditable;

      if (
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        if (!isTypingTarget) {
          event.preventDefault();
          chatInputRef.current?.focus();
        }
      }

      if (event.key === 'Escape' && document.activeElement === chatInputRef.current) {
        event.preventDefault();
        chatInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    const handleFsChange = () => {
      const fullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(fullscreen);
      if (!fullscreen) {
        setSelectedNodeId(null);
        setTemplateDialogOpen(false);
        setActiveTemplateId(null);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, [setSelectedNodeId]);

  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
      }
    };
  }, []);

  const handleGenerate = useCallback(
    async (inputPrompt: string, context: AssistantContext | null) => {
      const promptText = inputPrompt.trim();
      if (!promptText) return;

      setIsGenerating(true);
      setValidation(null);
      setIssuesByNode({});

      try {
        const response = await fetch('/api/flows/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            context ? { prompt: promptText, context } : { prompt: promptText }
          ),
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to generate flow');
        }

        const manifest = payload.flow.manifest as FlowManifest;
        const generatedFlow: FlowState = {
          id: payload.flow.id,
          name: payload.flow.name,
          status: payload.flow.status,
          manifest,
        };

        const templateMap: Record<string, TemplateSummary> = {};
        (payload.templates as any[]).forEach((template: any) => {
          templateMap[template.id] = {
            id: template.id,
            name: template.name,
            emailType: template.emailType,
          };
        });

        setTemplates(templateMap);
        setFlow(generatedFlow);
        setHasPendingChanges(false);
        setSelectedNodeId(null);
        updateCanvasFromManifest(manifest, {}, { selectedId: null });

        appendMessage({
          role: 'assistant',
          content: `Created flow “${payload.flow.name}” with ${manifest.nodes.length} nodes and ${manifest.edges.length} connections.`,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('Flow generation failed', error);
        appendMessage({
          role: 'assistant',
          content: `Unable to create flow: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [appendMessage, setSelectedNodeId, updateCanvasFromManifest]
  );

  const handleSubmit = useCallback(async () => {
    const userInput = prompt.trim();
    if (!userInput) {
      return;
    }

    const timestamp = Date.now();
    appendMessage({ role: 'user', content: userInput, timestamp });
    setPrompt('');

    const command = parseCommand(userInput);

    if (command) {
      if (!flow) {
        appendMessage({
          role: 'assistant',
          content: 'No flow yet. Generate a flow before applying inline commands.',
          timestamp: Date.now(),
        });
        return;
      }

      if (!selectedNodeId) {
        appendMessage({
          role: 'assistant',
          content: 'Select a node first, then rerun the command.',
          timestamp: Date.now(),
        });
        return;
      }

      const nextManifest = cloneManifest(flow.manifest);
      const node = nextManifest.nodes.find((n) => n.id === selectedNodeId);

      if (!node) {
        appendMessage({
          role: 'assistant',
          content: 'Could not locate the selected node in the manifest.',
          timestamp: Date.now(),
        });
        return;
      }

      let assistantResponse = '';
      let changed = false;

      if (command.kind === 'set') {
        if (command.path === 'label') {
          node.label = command.value;
          assistantResponse = `Updated node label to “${command.value}”.`;
          changed = true;
        } else if (command.path === 'email.template' || command.path === 'email.templateid') {
          if (node.type !== 'action') {
            assistantResponse = 'Email template can only be set on an email action node.';
          } else {
            node.data = {
              ...(node.data ?? {}),
              templateId: command.value,
            };
            assistantResponse = 'Linked email action to the specified template.';
            changed = true;
          }
        } else if (command.path === 'email.type') {
          if (node.type !== 'action') {
            assistantResponse = 'Email type updates apply only to email action nodes.';
          } else {
            const normalised = command.value.toLowerCase();
            if (normalised !== 'marketing' && normalised !== 'transactional') {
              assistantResponse = 'Email type must be either “marketing” or “transactional”.';
            } else {
              node.data = {
                ...(node.data ?? {}),
                emailType: normalised as EmailType,
              };
              assistantResponse = `Email type set to ${normalised}.`;
              changed = true;
            }
          }
        } else {
          assistantResponse = `Unknown field “${command.path}”.`;
        }
      }

      if (command.kind === 'guardConsent') {
        if (node.type !== 'action' || node.data?.action !== 'send_email') {
          assistantResponse = 'Consent guard only applies to email action nodes.';
        } else if (node.data?.emailType !== 'marketing') {
          assistantResponse = 'Consent guard is only required for marketing emails.';
        } else {
          const incoming = nextManifest.edges.filter((edge) => edge.targetId === node.id);
          const hasGuard = incoming.some((edge) => {
            const parent = nextManifest.nodes.find((n) => n.id === edge.sourceId);
            return (
              parent &&
              parent.type === 'condition' &&
              (parent.data?.system === 'marketing_consent' ||
                parent.data?.locked === true ||
                parent.label.toLowerCase().includes('consent'))
            );
          });

          if (hasGuard) {
            assistantResponse = 'Marketing consent guard already exists upstream.';
          } else {
            const consentNodeId = generateId('consent');
            const consentNode = {
              id: consentNodeId,
              type: 'condition' as const,
              label: 'Requires consent',
              position: {
                x: (node.position?.x ?? 0) - 200,
                y: node.position?.y ?? 0,
              },
              data: {
                system: 'marketing_consent',
                locked: true,
                field: 'marketingSubscribed',
                operator: 'equals',
                value: true,
              },
              config: {
                field: 'marketingSubscribed',
                operator: 'equals',
                value: true,
              },
            };

            nextManifest.nodes.push(consentNode as FlowManifest['nodes'][number]);

            for (const edge of nextManifest.edges) {
              if (edge.targetId === node.id) {
                edge.targetId = consentNodeId;
              }
            }

            nextManifest.edges.push({
              id: generateId('edge'),
              sourceId: consentNodeId,
              targetId: node.id,
              label: 'Requires consent',
            });

            assistantResponse = 'Inserted marketing consent guard.';
            changed = true;
          }
        }
      }

      if (command.kind === 'addWait') {
        const waitNodeId = generateId('delay');
        const unitLabel = command.unit === 'd' ? 'day' : 'hour';
        const waitNode = {
          id: waitNodeId,
          type: 'delay' as const,
          label: `Wait ${command.amount} ${command.amount === 1 ? unitLabel : `${unitLabel}s`}`,
          position: {
            x: (node.position?.x ?? 0) + 240,
            y: node.position?.y ?? 0,
          },
          data: {
            system: 'delay',
            delay: {
              amount: command.amount,
              unit: command.unit === 'd' ? 'days' : 'hours',
            },
          },
        };

        nextManifest.nodes.push(waitNode as FlowManifest['nodes'][number]);

        const outgoingEdges = nextManifest.edges.filter((edge) => edge.sourceId === node.id);
        for (const edge of outgoingEdges) {
          edge.sourceId = waitNodeId;
        }

        nextManifest.edges.push({
          id: generateId('edge'),
          sourceId: node.id,
          targetId: waitNodeId,
          label: waitNode.label,
        });

        assistantResponse = `Inserted ${waitNode.label.toLowerCase()} after the selected node.`;
        setSelectedNodeId(waitNodeId);
        changed = true;
      }

      if (changed) {
        setFlow((prev) => (prev ? { ...prev, manifest: nextManifest } : prev));
        setValidation(null);
        setIssuesByNode({});
        updateCanvasFromManifest(nextManifest, {});
        setHasPendingChanges(true);
        appendMessage({
          role: 'assistant',
          content: assistantResponse || 'Applied edit.',
          timestamp: Date.now(),
        });
      } else if (assistantResponse) {
        appendMessage({
          role: 'assistant',
          content: assistantResponse,
          timestamp: Date.now(),
        });
      }

      return;
    }

    const context = buildAssistantContext(flow, selectedNodeId);
    await handleGenerate(userInput, context);
  }, [appendMessage, flow, handleGenerate, prompt, selectedNodeId, setSelectedNodeId, updateCanvasFromManifest]);
  const updateNodeInManifest = useCallback(
    (
      nodeId: string,
      updater: (node: FlowManifest['nodes'][number]) => FlowManifest['nodes'][number],
      options?: { skipCanvasUpdate?: boolean }
    ) => {
      setFlow((prev) => {
        if (!prev) return prev;
        const nodes = prev.manifest.nodes.map((node) => (node.id === nodeId ? updater(node) : node));
        const manifest = { ...prev.manifest, nodes };
        if (!options?.skipCanvasUpdate) {
          updateCanvasFromManifest(manifest, issuesByNode);
        }
        return { ...prev, manifest };
      });
      setHasPendingChanges(true);
    },
    [issuesByNode, updateCanvasFromManifest]
  );

  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!isFullscreen) {
        return;
      }
      updateNodeInManifest(
        node.id,
        (current) => ({
          ...current,
          position: node.position,
        }),
        { skipCanvasUpdate: true }
      );
    },
    [isFullscreen, updateNodeInManifest]
  );

  const handleNodesChange = useCallback((changes: any) => {
    setRfNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const saveFlow = useCallback(async () => {
    if (!flow) return null;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/flows/${flow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifest: flow.manifest }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save flow');
      }

      const updatedManifest = payload.flow.manifest as FlowManifest;
      const updatedFlow: FlowState = {
        id: payload.flow.id,
        name: payload.flow.name,
        status: payload.flow.status,
        manifest: updatedManifest,
      };
      setFlow(updatedFlow);
      updateCanvasFromManifest(updatedManifest, issuesByNode);
      setHasPendingChanges(false);
      return updatedFlow;
    } finally {
      setIsSaving(false);
    }
  }, [flow, issuesByNode, updateCanvasFromManifest]);

  const handleValidate = useCallback(async () => {
    if (!flow) return;
    setIsValidating(true);
    try {
      if (hasPendingChanges) {
        await saveFlow();
      }

      const response = await fetch(`/api/flows/${flow.id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifest: flow.manifest }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to validate flow');
      }

      const nodeIssueMap = payload.issues.reduce(
        (acc: Record<string, FlowIssue[]>, issue: FlowIssue) => {
          if (issue.nodeId) {
            acc[issue.nodeId] = acc[issue.nodeId] ? [...acc[issue.nodeId], issue] : [issue];
          }
          return acc;
        },
        {}
      );

      setIssuesByNode(nodeIssueMap);
      setValidation(payload);
      updateCanvasFromManifest(flow.manifest, nodeIssueMap);
    } catch (error) {
      console.error('Validation failed', error);
    } finally {
      setIsValidating(false);
    }
  }, [flow, hasPendingChanges, saveFlow, updateCanvasFromManifest]);

  const handleActivate = useCallback(async () => {
    if (!flow) return;
    setIsActivating(true);
    try {
      const response = await fetch(`/api/flows/${flow.id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to activate flow');
      }

      setFlow((prev) => (prev ? { ...prev, status: 'ACTIVE', manifest: prev.manifest } : prev));
      setActivateOpen(false);
    } catch (error) {
      console.error('Activation error', error);
    } finally {
      setIsActivating(false);
    }
  }, [flow]);

  return (
    <ReactFlowProvider>
      <div className="flex min-h-screen flex-col bg-slate-950 text-white">
        <header className="border-b border-white/10 bg-slate-950/80 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </div>
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">Alyra</p>
                <h1 className="text-xl font-semibold">Flows & Emails Assistant</h1>
                <Button
                  variant="outline"
                  className="border-white/20 bg-transparent text-white hover:bg-white/10"
                  onClick={() => router.push('/admin/marketing')}
                >
                  Back to Marketing
                </Button>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="border-white/40 bg-white/10 text-white hover:bg-white/20"
                  onClick={handleValidate}
                  disabled={!flow || isValidating}
                >
                  {isValidating ? 'Validating...' : 'Validate'}
                </Button>
                <Button
                  className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                  disabled={!flow || !validation?.ok || flow.status === 'ACTIVE'}
                  onClick={() => setActivateOpen(true)}
                >
                  Confirm & Activate
                </Button>
              </div>
              <Badge
                variant={flow?.status === 'ACTIVE' ? 'default' : 'secondary'}
                className="bg-emerald-500/20 text-emerald-300"
              >
                {flow?.status ?? 'DRAFT'}
              </Badge>
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-6">
          <div className="flex flex-1 flex-col gap-4">
            <Card className="flex flex-1 flex-col overflow-hidden bg-white text-slate-900">
              <CardHeader className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {flow?.name ?? 'New Flow'}
                  </p>
                  <CardTitle className="text-lg font-semibold">Conversation</CardTitle>
                  <p className="text-sm text-slate-500">
                    Describe the automation you need. The assistant designs the flow and emails in Alyra’s brand voice.
                  </p>
                </div>
                
              </CardHeader>
              <CardContent className="relative flex-1 p-0">
                <div ref={canvasContainerRef} className="relative h-full min-h-[640px] bg-white">
                  <ReactFlow
                    nodes={rfNodes}
                    edges={rfEdges}
                    nodeTypes={nodeTypes}
                    nodesDraggable={isFullscreen}
                    onNodeDragStop={handleNodeDragStop}
                    onNodesChange={handleNodesChange}
                    onSelectionChange={({ nodes }) => {
                      if (suppressSelectionChangeRef.current) {
                        return;
                      }
                      if (!isFullscreen) {
                        if (nodes && nodes.length > 0) {
                          showSelectionHint('Enter fullscreen to inspect and edit nodes.');
                        }
                        if (selectedNodeIdRef.current) {
                          setSelectedNodeId(null);
                        }
                        return;
                      }
                      const nextId = nodes && nodes.length > 0 ? nodes[0].id : null;
                      if (nextId !== selectedNodeIdRef.current) {
                        setSelectedNodeId(nextId);
                      }
                    }}
                    onPaneClick={(event) => {
                      const target = event.target as HTMLElement | null;
                      if (!target) return;
                      if (target.closest('.react-flow__node') || target.closest('.react-flow__edge')) {
                        return;
                      }
                      suppressSelectionChangeRef.current = true;
                      // Clear after the current tick so React Flow's internal selection update doesn't reselect.
                      requestAnimationFrame(() => {
                        suppressSelectionChangeRef.current = false;
                      });
                      setSelectedNodeId(null);
                    }}
                    fitView
                    className="h-full"
                  >
                    <Background gap={16} color="#d1d5db" />
                    <Panel position="top-right" className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium text-white shadow-lg">
                      {rfEdges.length} connection{rfEdges.length === 1 ? '' : 's'}
                    </Panel>
                  {selectionHint && (
                      <Panel position="top-center" className="rounded-full bg-slate-900/90 px-4 py-2 text-xs font-medium text-white shadow-lg transition">
                        {selectionHint}
                      </Panel>
                    )}
                    <Panel position="bottom-right">
                      <Button
                        variant="outline"
                        className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                        onClick={async () => {
                          if (document.fullscreenElement) {
                            await document.exitFullscreen();
                          } else {
                            await canvasContainerRef.current?.requestFullscreen?.();
                          }
                        }}
                        title={isFullscreen ? 'Exit full screen' : 'Full screen'}
                      >
                        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                      </Button>
                    </Panel>
                    <CanvasChatPanel
                      messages={messages}
                      prompt={prompt}
                      setPrompt={setPrompt}
                      onSubmit={handleSubmit}
                      busy={isGenerating}
                      textareaRef={chatInputRef}
                    />
                  </ReactFlow>

                  {selectedNode && (
                    <div className="pointer-events-auto absolute right-6 top-6 w-72 rounded-3xl border border-slate-200 bg-white/95 p-4 text-sm shadow-xl backdrop-blur">
                      {selectedNode.type === 'action' && selectedNode.data?.action === 'send_email' && selectedNode.data?.templateId && (
                        <span className="sr-only">
                          {templates[selectedNode.data.templateId as string]?.name ?? 'Email template'}
                        </span>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-semibold text-slate-900">{selectedNode.label}</p>
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">{selectedNode.type}</p>
                        </div>
                        <Badge variant="secondary" className="uppercase">
                          {selectedNode.type}
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-2">
                        <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          Display name
                        </label>
                        <Input
                          value={selectedNode.label}
                          onChange={(event) =>
                            updateNodeInManifest(selectedNode.id, (node) => ({
                              ...node,
                              label: event.target.value,
                            }))
                          }
                          className="h-8 border-slate-200 text-sm"
                        />
                      </div>

                      {selectedNode.type === 'action' && selectedNode.data?.action === 'send_email' && (
                        <div className="mt-3 space-y-3 text-xs text-slate-600">
                          <div>
                            <p className="font-semibold text-slate-500 uppercase tracking-wide">Email type</p>
                            <p className="text-sm text-slate-700">
                              {(selectedNode.data?.emailType as string) ?? 'Not specified'}
                            </p>
                          </div>

                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                            <p className="font-semibold uppercase tracking-wide text-slate-500">Template</p>
                            <p className="mt-1 text-sm text-slate-700">
                              {selectedNode.data?.templateId
                                ? templates[selectedNode.data.templateId as string]?.name ?? selectedNode.data.templateId
                                : 'Not linked'}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 h-8 text-xs"
                              onClick={() => {
                                if (!selectedNode.data?.templateId) {
                                  return;
                                }

                                const openTemplateDialog = () => {
                                  setActiveTemplateId(selectedNode.data!.templateId as string);
                                  setTemplateDialogOpen(true);
                                };

                                if (!isFullscreen) {
                                  const container = canvasContainerRef.current;
                                  if (container?.requestFullscreen) {
                                    container
                                      .requestFullscreen()
                                      .then(() => {
                                        openTemplateDialog();
                                      })
                                      .catch((error) => {
                                        console.error('Failed to enter fullscreen before opening template', error);
                                        showSelectionHint('Full screen is required to edit templates.');
                                      });
                                  } else {
                                    showSelectionHint('Full screen is required to edit templates.');
                                  }
                                } else {
                                  openTemplateDialog();
                                }
                              }}
                              disabled={!selectedNode.data?.templateId}
                            >
                              View template
                            </Button>
                          </div>
                    </div>
                  )}

                  {selectedNode.type === 'trigger' && (
                    <div className="mt-3 space-y-3 text-xs text-slate-600">
                      <div>
                        <p className="font-semibold text-slate-500 uppercase tracking-wide">Trigger event</p>
                        <p className="text-sm text-slate-700">
                          {selectedNode.config?.event ?? 'order_created'}
                        </p>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700">
                        {selectedNode.config?.description ??
                          (selectedNode.config?.event === 'manual_start'
                            ? 'Run this flow manually whenever you want to send it.'
                            : selectedNode.config?.event === 'order_created'
                            ? 'Runs automatically every time a new order is created.'
                            : 'Runs whenever this trigger event fires.')}
                      </div>
                    </div>
                  )}
                    </div>
                  )}

                  {templateDialogOpen && activeTemplateId && (
                    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-6 py-10">
                      <div className="flex h-full max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {templates[activeTemplateId]?.name ?? 'Email template'}
                            </h3>
                            <p className="text-sm text-slate-500">
                              Adjust the MJML design. Changes are saved to this template.
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="uppercase">
                              {templates[activeTemplateId]?.emailType ?? 'template'}
                            </Badge>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setTemplateDialogOpen(false);
                                setActiveTemplateId(null);
                              }}
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                        <div className="flex-1 overflow-hidden p-6">
                          <div className="h-full overflow-auto rounded-xl border border-slate-200 bg-white p-4">
                            <EmailEditor key={activeTemplateId} templateId={activeTemplateId} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
      </main>

        <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm & Activate Flow</DialogTitle>
              <DialogDescription className="text-slate-600">
                Publishing will start sending emails when triggers fire. Confirm this flow is correct.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setActivateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleActivate} disabled={isActivating}>
                {isActivating ? 'Activating...' : 'Confirm & Activate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ReactFlowProvider>
  );
}
