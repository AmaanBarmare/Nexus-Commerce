export type EmailType = 'marketing' | 'transactional';

export type FlowManifestNodeData = {
  action?: 'send_email' | 'webhook' | 'tag_customer';
  emailType?: EmailType;
  templateId?: string;
  templateName?: string;
  [key: string]: unknown;
};

export type FlowManifestNode = {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay';
  label: string;
  position: { x: number; y: number };
  config?: Record<string, any>;
  data?: FlowManifestNodeData;
};

export type FlowManifestEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
};

export type FlowManifest = {
  name: string;
  nodes: FlowManifestNode[];
  edges: FlowManifestEdge[];
};

export type FlowIssueSeverity = 'error' | 'warning' | 'info';

export type FlowIssue = {
  nodeId?: string;
  severity: FlowIssueSeverity;
  message: string;
};

