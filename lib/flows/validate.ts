import { FlowIssue, FlowManifest, FlowManifestNode } from '@/types/flow';

function buildAncestorMap(manifest: FlowManifest) {
  const incoming = new Map<string, string[]>();

  for (const edge of manifest.edges) {
    const list = incoming.get(edge.targetId);
    if (list) {
      list.push(edge.sourceId);
    } else {
      incoming.set(edge.targetId, [edge.sourceId]);
    }
  }

  return incoming;
}

function collectAncestors(
  nodeId: string,
  incoming: Map<string, string[]>,
  nodesById: Map<string, FlowManifestNode>
) {
  const visited = new Set<string>();
  const ancestors: FlowManifestNode[] = [];
  const stack = [...(incoming.get(nodeId) || [])];

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    const currentNode = nodesById.get(currentId);
    if (currentNode) {
      ancestors.push(currentNode);
      const nextIds = incoming.get(currentId);
      if (nextIds) {
        for (const nextId of nextIds) {
          if (!visited.has(nextId)) {
            stack.push(nextId);
          }
        }
      }
    }
  }

  return ancestors;
}

function hasConsentGuard(nodes: FlowManifestNode[]) {
  return nodes.some((node) => {
    if (node.type !== 'condition') {
      return false;
    }

    const label = node.label.toLowerCase();
    const hasSegment =
      node.data &&
      ('segment' in node.data || 'segments' in node.data) &&
      JSON.stringify(node.data).toLowerCase().includes('email subscribers');

    const dataString = JSON.stringify(node.data ?? {}).toLowerCase();
    const hasFieldCheck =
      node.data &&
      ('field' in node.data || 'expression' in node.data || 'rule' in node.data) &&
      (dataString.includes('marketing_subscribed') || dataString.includes('marketingsubscribed'));

    const isLockedGuard = node.data && typeof node.data === 'object' && node.data['locked'] === true;

    return (
      label.includes('marketing_subscribed') ||
      label.includes('marketingsubscribed') ||
      label.includes('requires consent') ||
      label.includes('marketing consent') ||
      hasSegment ||
      hasFieldCheck ||
      isLockedGuard
    );
  });
}

export function validateFlow(manifest: FlowManifest) {
  const issues: FlowIssue[] = [];
  const nodesById = new Map(manifest.nodes.map((node) => [node.id, node]));
  const incoming = buildAncestorMap(manifest);

  for (const node of manifest.nodes) {
    if (node.type === 'action' && node.data?.action === 'send_email') {
      const emailType = node.data?.emailType;

      if (!node.data?.templateId) {
        issues.push({
          nodeId: node.id,
          severity: 'error',
          message: 'Email action must reference a saved template.',
        });
      }

      if (emailType === 'marketing') {
        const ancestors = collectAncestors(node.id, incoming, nodesById);
        if (!hasConsentGuard(ancestors)) {
          issues.push({
            nodeId: node.id,
            severity: 'error',
            message:
              'Marketing email requires a subscription filter (marketingSubscribed === true) on at least one upstream condition.',
          });
        }
      }
    }
  }

  // Global informational warnings
  const hasEmailNodes = manifest.nodes.some(
    (node) => node.type === 'action' && node.data?.action === 'send_email'
  );

  if (hasEmailNodes) {
    issues.push({
      severity: 'info',
      message:
        'Email actions automatically skip recipients flagged as bounced or complained at runtime.',
    });
  }

  const ok = !issues.some((issue) => issue.severity === 'error');

  return { ok, issues };
}

