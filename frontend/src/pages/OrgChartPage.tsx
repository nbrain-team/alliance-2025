import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, Dialog, Flex, Heading, IconButton, Separator, Text, TextField, TextArea, Select } from '@radix-ui/themes';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  MarkerType,
  Position,
  Handle,
  Node,
  Edge,
  Connection,
  OnConnect,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { PlusIcon, ArrowLeftIcon, TrashIcon } from '@radix-ui/react-icons';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';

type OrgMember = {
  id: string;
  name: string;
  title: string;
  department?: string;
  email?: string;
  directLine?: string;
  extension?: string;
  mobile?: string;
  timezone?: string;
};

type OrgNodeData = {
  member: OrgMember;
};

const STORAGE_KEYS = {
  nodes: 'orgChart:nodes',
  edges: 'orgChart:edges',
  version: 'orgChart:version'
};
const CURRENT_SEED_VERSION = 'new-org-v1';

function OrgNode({ data }: { data: OrgNodeData }) {
  return (
    <Card style={{ width: 220, border: '1px solid var(--gray-6)', backgroundColor: 'white' }}>
      <Box p="3">
        <Text size="3" weight="bold">{data.member.name || 'New Member'}</Text>
        <Text size="2" color="gray" style={{ display: 'block', marginTop: '2px' }}>
          {data.member.title || 'Title'}{data.member.department ? ` • ${data.member.department}` : ''}
        </Text>
      </Box>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </Card>
  );
}

const nodeTypes = { orgNode: OrgNode } as const;

function buildSeed(): { nodes: Node<OrgNodeData>[]; edges: Edge[] } {
  const makeNode = (id: string, x: number, y: number, name: string, title: string, dept?: string): Node<OrgNodeData> => ({
    id,
    type: 'orgNode',
    position: { x, y },
    data: { member: { id, name, title, department: dept } }
  });

  const nodes: Node<OrgNodeData>[] = [
    makeNode('ceo', 700, 40, 'TBD', 'Chief Executive Officer'),
    makeNode('cfo', 320, 200, 'TBD', 'Chief Financial Officer', 'Finance'),
    makeNode('coo', 560, 200, 'TBD', 'Chief Operating Officer', 'Operations'),
    makeNode('cto', 800, 200, 'TBD', 'Chief Technology Officer', 'Engineering'),
    makeNode('cmo', 1040, 200, 'TBD', 'Chief Marketing Officer', 'Marketing'),
    makeNode('chro', 1280, 200, 'TBD', 'Chief HR Officer', 'HR'),

    makeNode('controller', 200, 360, 'TBD', 'Controller', 'Finance'),
    makeNode('fpna', 320, 360, 'TBD', 'FP&A Manager', 'Finance'),
    makeNode('accountant', 440, 360, 'TBD', 'Senior Accountant', 'Finance'),

    makeNode('opsmgr', 560, 360, 'TBD', 'Operations Manager', 'Operations'),
    makeNode('facilities', 680, 360, 'TBD', 'Facilities Manager', 'Operations'),
    makeNode('csmanager', 800, 360, 'TBD', 'Customer Success Manager', 'Operations'),

    makeNode('engmgr', 800, 360 + 160, 'TBD', 'Engineering Manager', 'Engineering'),
    makeNode('qalead', 920, 360 + 160, 'TBD', 'QA Lead', 'Engineering'),
    makeNode('devops', 680, 360 + 160, 'TBD', 'DevOps Lead', 'Engineering'),
    makeNode('pmgr', 560, 360 + 160, 'TBD', 'Product Manager', 'Product'),

    makeNode('mktmgr', 1040, 360, 'TBD', 'Marketing Manager', 'Marketing'),
    makeNode('content', 1160, 360, 'TBD', 'Content Lead', 'Marketing'),
    makeNode('seo', 1280, 360, 'TBD', 'SEO Lead', 'Marketing'),

    makeNode('recruiter', 1280, 360 + 160, 'TBD', 'Senior Recruiter', 'HR'),
    makeNode('hrgen', 1160, 360 + 160, 'TBD', 'HR Generalist', 'HR'),

    makeNode('salesdir', 920, 360, 'TBD', 'Sales Director', 'Sales'),
    makeNode('salesrep1', 920, 520, 'TBD', 'Account Executive', 'Sales')
  ];

  const edges: Edge[] = [
    { id: 'e-ceo-cfo', source: 'ceo', target: 'cfo', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-ceo-coo', source: 'ceo', target: 'coo', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-ceo-cto', source: 'ceo', target: 'cto', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-ceo-cmo', source: 'ceo', target: 'cmo', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-ceo-chro', source: 'ceo', target: 'chro', markerEnd: { type: MarkerType.ArrowClosed } },

    { id: 'e-cfo-controller', source: 'cfo', target: 'controller', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-cfo-fpna', source: 'cfo', target: 'fpna', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-cfo-accountant', source: 'cfo', target: 'accountant', markerEnd: { type: MarkerType.ArrowClosed } },

    { id: 'e-coo-opsmgr', source: 'coo', target: 'opsmgr', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-coo-facilities', source: 'coo', target: 'facilities', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-coo-csmanager', source: 'coo', target: 'csmanager', markerEnd: { type: MarkerType.ArrowClosed } },

    { id: 'e-cto-devops', source: 'cto', target: 'devops', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-cto-pmgr', source: 'cto', target: 'pmgr', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-cto-engmgr', source: 'cto', target: 'engmgr', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-cto-qalead', source: 'cto', target: 'qalead', markerEnd: { type: MarkerType.ArrowClosed } },

    { id: 'e-cmo-mktmgr', source: 'cmo', target: 'mktmgr', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-cmo-content', source: 'cmo', target: 'content', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-cmo-seo', source: 'cmo', target: 'seo', markerEnd: { type: MarkerType.ArrowClosed } },

    { id: 'e-chro-recruiter', source: 'chro', target: 'recruiter', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-chro-hrgen', source: 'chro', target: 'hrgen', markerEnd: { type: MarkerType.ArrowClosed } },

    { id: 'e-ceo-salesdir', source: 'ceo', target: 'salesdir', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-salesdir-salesrep1', source: 'salesdir', target: 'salesrep1', markerEnd: { type: MarkerType.ArrowClosed } }
  ];

  return { nodes, edges };
}

const loadFromStorage = (): { nodes: Node<OrgNodeData>[] | null; edges: Edge[] | null } => {
  try {
    const nodesRaw = localStorage.getItem(STORAGE_KEYS.nodes);
    const edgesRaw = localStorage.getItem(STORAGE_KEYS.edges);
    return {
      nodes: nodesRaw ? JSON.parse(nodesRaw) : null,
      edges: edgesRaw ? JSON.parse(edgesRaw) : null
    };
  } catch {
    return { nodes: null, edges: null };
  }
};

const persistToStorage = (nodes: Node<OrgNodeData>[], edges: Edge[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.nodes, JSON.stringify(nodes));
    localStorage.setItem(STORAGE_KEYS.edges, JSON.stringify(edges));
  } catch {
    // ignore
  }
};

const OrgChartPage: React.FC = () => {
  const navigate = useNavigate();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFormat, setImportFormat] = useState<'csv' | 'json'>('csv');
  const [importText, setImportText] = useState('');

  const seed = useMemo(buildSeed, []);
  const stored = useMemo(loadFromStorage, []);

  const [nodes, setNodes, onNodesChange] = useNodesState<OrgNodeData>(stored.nodes || seed.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(stored.edges || seed.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

  // New nodes will appear near the top-left if viewport info is unavailable

  useEffect(() => {
    persistToStorage(nodes, edges);
  }, [nodes, edges]);

  // Load CSV from public/new-org.csv using explicit id/parent id mapping
  useEffect(() => {
    const storedVersion = localStorage.getItem(STORAGE_KEYS.version);
    const hasStored = !!localStorage.getItem(STORAGE_KEYS.nodes);
    if (storedVersion === CURRENT_SEED_VERSION && hasStored) return;
    if (storedVersion !== CURRENT_SEED_VERSION) {
      localStorage.removeItem(STORAGE_KEYS.nodes);
      localStorage.removeItem(STORAGE_KEYS.edges);
    }
    async function loadCsvExact() {
      try {
        const res = await fetch('/new-org.csv');
        if (!res.ok) return;
        const text = await res.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        const rows = (parsed.data as any[]).filter(Boolean);
        const norm = (s: any) => String(s ?? '').trim();
        const recs = rows.map((r) => {
          const id = norm(r['id'] || r['ID']);
          let parentId = norm(r['parent id'] || r['parentId'] || r['ParentId'] || r['Parent ID']);
          if (parentId === '' || parentId === '0') parentId = undefined as any;
          const name = [norm(r['First Name']), norm(r['Last Name'])].filter(Boolean).join(' ');
          const title = norm(r['Title']);
          const department = norm(r['Dept.']) || undefined;
          const email = norm(r['Email']) || undefined;
          const directLine = norm(r['Direct Line']) || undefined;
          const extension = norm(r['Extension']) || undefined;
          const mobile = norm(r['Mobile']) || undefined;
          const timezone = norm(r['Location / Time Zone']) || undefined;
          return { id, parentId, name, title, department, email, directLine, extension, mobile, timezone } as OrgMember & { parentId?: string };
        }).filter(r => r.id && r.name);
        const { nodes: n, edges: e } = autoLayout(recs);
        setNodes(n);
        setEdges(e);
        localStorage.setItem(STORAGE_KEYS.version, CURRENT_SEED_VERSION);
      } catch (err) {
        console.error('Failed to load new-org.csv', err);
      }
    }
    loadCsvExact();
  }, []);

  const onConnect: OnConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<OrgNodeData>) => {
    setSelectedNodeId(node.id);
  }, []);

  const updateSelectedNode = (partial: Partial<OrgMember>) => {
    if (!selectedNode) return;
    setNodes(prev => prev.map(n => n.id === selectedNode.id ? {
      ...n,
      data: { member: { ...n.data.member, ...partial } }
    } : n));
  };

  const handleDeleteSelected = () => {
    if (!selectedNode) return;
    const id = selectedNode.id;
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
    setNodes(prev => prev.filter(n => n.id !== id));
    setSelectedNodeId(null);
  };

  const handleAddMember = () => {
    setShowAddDialog(true);
  };

  const confirmAddMember = () => {
    const id = uuidv4();
    const newNode: Node<OrgNodeData> = {
      id,
      type: 'orgNode',
      position: { x: 80, y: 100 },
      data: { member: { id, name: newName || 'New Member', title: newTitle || 'Title' } }
    };
    setNodes(prev => [...prev, newNode]);
    setShowAddDialog(false);
    setNewName('');
    setNewTitle('');
  };

  const reloadCsv = async () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.nodes);
      localStorage.removeItem(STORAGE_KEYS.edges);
      localStorage.setItem(STORAGE_KEYS.version, '');
      // trigger effect by manual load
      const res = await fetch('/new-org.csv');
      if (!res.ok) return;
      const text = await res.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      const rows = (parsed.data as any[]).filter(Boolean);
      const norm = (s: any) => String(s ?? '').trim();
      const recs = rows.map((r) => {
        const id = norm(r['id'] || r['ID']);
        let parentId = norm(r['parent id'] || r['parentId'] || r['ParentId'] || r['Parent ID']);
        if (parentId === '' || parentId === '0') parentId = undefined as any;
        const name = [norm(r['First Name']), norm(r['Last Name'])].filter(Boolean).join(' ');
        const title = norm(r['Title']);
        const department = norm(r['Dept.']) || undefined;
        const email = norm(r['Email']) || undefined;
        const phone = norm(r['Mobile']) || norm(r['Direct Line']) || undefined;
        return { id, parentId, name, title, department, email, phone } as OrgMember & { parentId?: string };
      }).filter(r => r.id && r.name);
      const { nodes: n, edges: e } = autoLayout(recs);
      setNodes(n);
      setEdges(e);
      localStorage.setItem(STORAGE_KEYS.version, CURRENT_SEED_VERSION);
      setSelectedNodeId(null);
    } catch {}
  };

  function computeLevels(records: Array<{ id: string; parentId?: string | null }>): Map<string, number> {
    const idToParent = new Map<string, string | null>();
    records.forEach(r => idToParent.set(r.id, (r.parentId as string | null) || null));
    const levels = new Map<string, number>();
    const roots: string[] = [];
    for (const [id, pid] of idToParent.entries()) {
      if (!pid || !idToParent.has(pid)) roots.push(id);
    }
    const queue: Array<{ id: string; level: number }> = [];
    roots.forEach(id => queue.push({ id, level: 0 }));
    while (queue.length) {
      const { id, level } = queue.shift()!;
      if (levels.has(id)) continue;
      levels.set(id, level);
      for (const [childId, parent] of idToParent.entries()) {
        if (parent === id) queue.push({ id: childId, level: level + 1 });
      }
    }
    return levels;
  }

  function autoLayout(records: Array<OrgMember & { parentId?: string | null }>): { nodes: Node<OrgNodeData>[]; edges: Edge[] } {
    const dx = 240;
    const dy = 160;
    const levels = computeLevels(records);
    const levelToIds = new Map<number, string[]>();
    for (const rec of records) {
      const level = levels.get(rec.id) ?? 0;
      if (!levelToIds.has(level)) levelToIds.set(level, []);
      levelToIds.get(level)!.push(rec.id);
    }
    const idToPosition = new Map<string, { x: number; y: number }>();
    const maxWidth = Math.max(...Array.from(levelToIds.values()).map(a => a.length));
    for (const [level, ids] of levelToIds.entries()) {
      const totalWidth = (ids.length - 1) * dx;
      const startX = 700 - totalWidth / 2; // center around ~700
      ids.forEach((id, idx) => {
        idToPosition.set(id, { x: startX + idx * dx, y: 40 + level * dy });
      });
    }
    const nodes: Node<OrgNodeData>[] = records.map(rec => ({
      id: rec.id,
      type: 'orgNode',
      position: idToPosition.get(rec.id) || { x: 80, y: 100 },
      data: { member: { id: rec.id, name: rec.name, title: rec.title, department: rec.department, email: rec.email, directLine: rec.directLine, extension: rec.extension, mobile: rec.mobile, timezone: rec.timezone } }
    }));
    const edges: Edge[] = [];
    for (const rec of records) {
      if (rec['parentId']) {
        edges.push({ id: `e-${rec.parentId}-${rec.id}`, source: rec.parentId as string, target: rec.id, markerEnd: { type: MarkerType.ArrowClosed } });
      }
    }
    return { nodes, edges };
  }

  const handleImport = () => {
    try {
      if (importFormat === 'csv') {
        const parsed = Papa.parse(importText.trim(), { header: true, skipEmptyLines: true });
        const recs = (parsed.data as any[]).map(r => ({
          id: String(r.id || r.ID || r.Id).trim(),
          name: String(r.name || r.Name).trim(),
          title: String(r.title || r.Title).trim(),
          department: (r.department || r.Department || '').trim() || undefined,
          email: (r.email || r.Email || '').trim() || undefined,
          directLine: (r.directLine || r['Direct Line'] || '').trim() || undefined,
          extension: (r.extension || r.Extension || '').trim() || undefined,
          mobile: (r.mobile || r.Mobile || '').trim() || undefined,
          timezone: (r.timezone || r['Time Zone'] || r['Location / Time Zone'] || '').trim() || undefined,
          parentId: (r.parentId || r.ParentId || r.parent || '').trim() || undefined
        })).filter(r => r.id && r.name);
        const { nodes: n, edges: e } = autoLayout(recs);
        setNodes(n);
        setEdges(e);
      } else {
        const json = JSON.parse(importText);
        const arr: Array<any> = Array.isArray(json) ? json : (json.members || []);
        const recs = arr.map(r => ({
          id: String(r.id).trim(),
          name: String(r.name).trim(),
          title: String(r.title || '').trim(),
          department: (r.department || '').trim() || undefined,
          email: (r.email || '').trim() || undefined,
          directLine: (r.directLine || '').trim() || undefined,
          extension: (r.extension || '').trim() || undefined,
          mobile: (r.mobile || '').trim() || undefined,
          timezone: (r.timezone || '').trim() || undefined,
          parentId: (r.parentId || '').trim() || undefined
        })).filter(r => r.id && r.name);
        const { nodes: n, edges: e } = autoLayout(recs);
        setNodes(n);
        setEdges(e);
      }
      setShowImportDialog(false);
      setImportText('');
    } catch (e) {
      // swallow error; in real app you'd show a toast
      console.error('Import failed', e);
    }
  };

  const handleExport = () => {
    const data = nodes.map(n => ({
      id: n.id,
      name: n.data.member.name,
      title: n.data.member.title,
      department: n.data.member.department,
      email: n.data.member.email,
      directLine: n.data.member.directLine,
      extension: n.data.member.extension,
      mobile: n.data.member.mobile,
      timezone: n.data.member.timezone
    }));
    const links = edges.map(e => ({ parentId: e.source, id: e.target }));
    const json = JSON.stringify({ members: data.map(d => ({ ...d, parentId: links.find(l => l.id === d.id)?.parentId || null })) }, null, 2);
    navigator.clipboard.writeText(json).catch(() => {});
  };

  return (
    <Flex direction="column" style={{ height: '100vh', backgroundColor: 'var(--gray-1)' }}>
      <Box style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--gray-4)', backgroundColor: 'white' }}>
        <Flex align="center" justify="between">
          <Flex align="center" gap="3">
            <IconButton variant="soft" onClick={() => navigate('/hr-onboarding')}>
              <ArrowLeftIcon />
            </IconButton>
            <Heading size="6">Organization Chart</Heading>
          </Flex>
          <Flex align="center" gap="2">
            <Button onClick={handleAddMember}>
              <PlusIcon />
              Add Member
            </Button>
            <Button variant="soft" onClick={reloadCsv}>Reload CSV</Button>
            <Button variant="soft" onClick={() => setShowImportDialog(true)}>Import</Button>
            <Button variant="soft" onClick={handleExport}>Copy JSON</Button>
          </Flex>
        </Flex>
      </Box>

      <Flex style={{ flex: 1, position: 'relative' }}>
        <Box style={{ flex: 1 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
            nodeTypes={nodeTypes}
          >
            <Background variant="dots" gap={16} size={1} />
            <MiniMap pannable zoomable />
            <Controls showInteractive />
          </ReactFlow>
        </Box>

        {selectedNode && (
          <Box style={{ width: '360px', borderLeft: '1px solid var(--gray-4)', backgroundColor: 'white' }}>
            <Box p="4">
              <Heading size="4">Member Details</Heading>
              <Text size="2" color="gray">Click a field to edit</Text>
              <Separator my="3" />

              <Box mb="3">
                <Text size="2" color="gray">Full Name</Text>
                <TextField.Root value={selectedNode.data.member.name} onChange={(e) => updateSelectedNode({ name: e.target.value })} />
              </Box>
              <Box mb="3">
                <Text size="2" color="gray">Title</Text>
                <TextField.Root value={selectedNode.data.member.title} onChange={(e) => updateSelectedNode({ title: e.target.value })} />
              </Box>
              <Box mb="3">
                <Text size="2" color="gray">Department</Text>
                <TextField.Root value={selectedNode.data.member.department || ''} onChange={(e) => updateSelectedNode({ department: e.target.value })} />
              </Box>
              <Box mb="3">
                <Text size="2" color="gray">Email</Text>
                <TextField.Root value={selectedNode.data.member.email || ''} onChange={(e) => updateSelectedNode({ email: e.target.value })} />
              </Box>
              <Box mb="3">
                <Text size="2" color="gray">Direct Line</Text>
                <TextField.Root value={selectedNode.data.member.directLine || ''} onChange={(e) => updateSelectedNode({ directLine: e.target.value })} />
              </Box>
              <Box mb="3">
                <Text size="2" color="gray">Extension</Text>
                <TextField.Root value={selectedNode.data.member.extension || ''} onChange={(e) => updateSelectedNode({ extension: e.target.value })} />
              </Box>
              <Box mb="3">
                <Text size="2" color="gray">Cell Phone</Text>
                <TextField.Root value={selectedNode.data.member.mobile || ''} onChange={(e) => updateSelectedNode({ mobile: e.target.value })} />
              </Box>
              <Box mb="4">
                <Text size="2" color="gray">Time Zone</Text>
                <Select.Root value={selectedNode.data.member.timezone || ''} onValueChange={(v) => updateSelectedNode({ timezone: v })}>
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Item value="Pacific">Pacific</Select.Item>
                    <Select.Item value="Mountain">Mountain</Select.Item>
                    <Select.Item value="Central">Central</Select.Item>
                    <Select.Item value="Eastern">Eastern</Select.Item>
                    <Select.Item value="India">India</Select.Item>
                    <Select.Item value="Mexico / Central">Mexico / Central</Select.Item>
                    <Select.Item value="Chicago / Central">Chicago / Central</Select.Item>
                    <Select.Item value="CA / Pacific">CA / Pacific</Select.Item>
                    <Select.Item value="FL / EST">FL / EST</Select.Item>
                    <Select.Item value="Nevada / CST">Nevada / CST</Select.Item>
                    <Select.Item value="AZ / MST">AZ / MST</Select.Item>
                    <Select.Item value="MI / Eastern">MI / Eastern</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Box>

              <Flex gap="2" justify="end">
                <Button color="red" variant="soft" onClick={handleDeleteSelected}>
                  <TrashIcon />
                  Delete
                </Button>
              </Flex>
            </Box>
          </Box>
        )}
      </Flex>

      <Dialog.Root open={showAddDialog} onOpenChange={setShowAddDialog}>
        <Dialog.Content style={{ maxWidth: 460 }}>
          <Dialog.Title>Add New Member</Dialog.Title>
          <Flex direction="column" gap="3" mt="3">
            <Box>
              <Text size="2" color="gray">Full Name</Text>
              <TextField.Root placeholder="Jane Doe" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </Box>
            <Box>
              <Text size="2" color="gray">Title</Text>
              <TextField.Root placeholder="Job Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </Box>
          </Flex>
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft">Cancel</Button>
            </Dialog.Close>
            <Button onClick={confirmAddMember}>Add</Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={showImportDialog} onOpenChange={setShowImportDialog}>
        <Dialog.Content style={{ maxWidth: 720 }}>
          <Dialog.Title>Import Organization</Dialog.Title>
          <Text size="2" color="gray">Format: CSV headers id,name,title,department,parentId or JSON array with the same fields.</Text>
          <Flex gap="3" mt="3" align="center">
            <Text size="2">Format</Text>
            <Select.Root value={importFormat} onValueChange={(v) => setImportFormat(v as any)}>
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="csv">CSV</Select.Item>
                <Select.Item value="json">JSON</Select.Item>
              </Select.Content>
            </Select.Root>
          </Flex>
          <Box mt="3">
            <TextArea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="id,name,title,department,parentId\nceo,Jane Smith,Chief Executive Officer,,\ncfo,John Doe,Chief Financial Officer,Finance,ceo" style={{ width: '100%', height: '240px' }} />
          </Box>
          <Flex gap="3" mt="3" justify="end">
            <Dialog.Close>
              <Button variant="soft">Cancel</Button>
            </Dialog.Close>
            <Button onClick={handleImport}>Import</Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
};

export default OrgChartPage;


