'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ReactFlowProvider, ReactFlow, Background, Node, Edge, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Sparkles, AlertCircle, CheckCircle2, Gauge, Zap, Mail, Clock, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { FlowManifest, FlowIssue, EmailType } from '@/types/flow';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import type { NodeProps, NodeTypes } from '@xyflow/react';

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
      className={`min-w-[200px] rounded-lg border bg-white px-3 py-2 shadow-sm transition ${
        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
      }`}
    >
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
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [flow, setFlow] = useState<FlowState | null>(null);
  const [templates, setTemplates] = useState<Record<string, TemplateSummary>>({});
  const [rfNodes, setRfNodes] = useState<Node<CanvasNodeData>[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge[]>([]);
  const [validation, setValidation] = useState<{ ok: boolean; issues: FlowIssue[] } | null>(null);
  const [issuesByNode, setIssuesByNode] = useState<Record<string, FlowIssue[]>>({});
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = useMemo(() => {
    if (!flow || !selectedNodeId) return null;
    return flow.manifest.nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [flow, selectedNodeId]);

  const updateCanvasFromManifest = useCallback(
    (manifest: FlowManifest, nodeIssues: Record<string, FlowIssue[]>) => {
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
          return {
            id: node.id,
            type: 'alyra',
            position: node.position ?? { x: 0, y: 0 },
            data: canvasNodeData,
            draggable: canvasNodeData.locked ? false : true,
          };
        })
      );

      setRfEdges(
        manifest.edges.map((edge) => ({
          id: edge.id,
          source: edge.sourceId,
          target: edge.targetId,
          label: edge.label,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#0f172a',
            width: 22,
            height: 22,
          },
          style: {
            strokeWidth: 2,
            stroke: '#0f172a',
          },
        }))
      );
    },
    []
  );

  const appendMessage = useCallback((message: ConversationMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  useEffect(() => {
    setRfNodes((nodes) =>
      nodes.map((node) => ({
        ...node,
        selected: selectedNodeId ? node.id === selectedNodeId : false,
      }))
    );
  }, [selectedNodeId]);

  useEffect(() => {
    if (!flow) {
      setSelectedNodeId(null);
      return;
    }
    if (selectedNodeId && !flow.manifest.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [flow, selectedNodeId]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setValidation(null);
    setIssuesByNode({});

    const userMessage: ConversationMessage = {
      role: 'user',
      content: prompt.trim(),
      timestamp: Date.now(),
    };
    appendMessage(userMessage);

    try {
      const response = await fetch('/api/flows/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
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
      updateCanvasFromManifest(manifest, {});
      setPrompt('');
      setSelectedNodeId(manifest.nodes[0]?.id ?? null);

      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: `Created flow “${payload.flow.name}” with ${manifest.nodes.length} nodes and ${manifest.edges.length} connections.`,
        timestamp: Date.now(),
      };
      appendMessage(assistantMessage);
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
  }, [appendMessage, prompt, updateCanvasFromManifest]);

  const updateNodeInManifest = useCallback(
    (nodeId: string, updater: (node: FlowManifest['nodes'][number]) => FlowManifest['nodes'][number]) => {
      setFlow((prev) => {
        if (!prev) return prev;
        const nodes = prev.manifest.nodes.map((node) => (node.id === nodeId ? updater(node) : node));
        const manifest = { ...prev.manifest, nodes };
        updateCanvasFromManifest(manifest, issuesByNode);
        return { ...prev, manifest };
      });
      setHasPendingChanges(true);
    },
    [issuesByNode, updateCanvasFromManifest]
  );

  const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    updateNodeInManifest(node.id, (current) => ({
      ...current,
      position: node.position,
    }));
  }, [updateNodeInManifest]);

  const handleNodesChange = useCallback((changes: any) => {
    setRfNodes((nds) => nds.map((node) => {
      const change = changes.find((c: any) => c.id === node.id && c.position);
      if (change?.position) {
        return { ...node, position: change.position };
      }
      return node;
    }));
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
                <div className="relative h-full min-h-[640px] bg-slate-100">
                  <ReactFlow
                    nodes={rfNodes}
                    edges={rfEdges}
                    nodeTypes={nodeTypes}
                    onNodeDragStop={handleNodeDragStop}
                    onNodesChange={handleNodesChange}
                    onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                    onSelectionChange={({ nodes }) => {
                      if (!nodes || nodes.length === 0) {
                        setSelectedNodeId(null);
                      } else {
                        setSelectedNodeId(nodes[0].id);
                      }
                    }}
                    fitView
                    className="h-full"
                  >
                    <Background gap={16} />
                  </ReactFlow>

                  {selectedNode && (
                    <div className="pointer-events-auto absolute right-6 top-6 w-72 rounded-3xl border border-slate-200 bg-white/95 p-4 text-sm shadow-xl backdrop-blur">
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
                        <div className="mt-3 space-y-1 text-xs text-slate-600">
                          <p className="font-semibold text-slate-500 uppercase tracking-wide">Email type</p>
                          <p className="text-sm text-slate-700">
                            {(selectedNode.data?.emailType as string) ?? 'Not specified'}
                          </p>
                        </div>
                      )}

                      {selectedNode.type === 'trigger' && (
                        <div className="mt-3 space-y-1 text-xs text-slate-600">
                          <p className="font-semibold text-slate-500 uppercase tracking-wide">Trigger event</p>
                          <p className="text-sm text-slate-700">
                            {selectedNode.config?.event ?? 'order_created'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-0 flex flex-col justify-end">
                    <div className="pointer-events-auto mx-auto mb-8 w-full max-w-xl rounded-3xl border border-white/10 bg-slate-950/85 p-5 text-white shadow-2xl backdrop-blur">
                      <div className="max-h-48 space-y-2 overflow-y-auto pr-2">
                        {messages.map((message, index) => (
                          <div
                            key={index}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-5 ${
                                message.role === 'user'
                                  ? 'bg-white text-slate-900'
                                  : 'bg-slate-800/80 text-white'
                              }`}
                            >
                              {message.content}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 space-y-3">
                        <Textarea
                          value={prompt}
                          onChange={(event) => setPrompt(event.target.value)}
                          placeholder="Describe the flow you want..."
                          rows={3}
                          className="border-white/10 bg-slate-900/70 text-sm text-white placeholder:text-white/40 focus-visible:ring-white/30"
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault();
                              handleGenerate();
                            }
                          }}
                        />
                        <Button
                          onClick={handleGenerate}
                          disabled={isGenerating || !prompt.trim()}
                          className="w-full bg-white text-slate-900 hover:bg-slate-200"
                        >
                          {isGenerating ? 'Generating...' : 'Generate Flow'}
                        </Button>
                      </div>
                    </div>
                  </div>
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
