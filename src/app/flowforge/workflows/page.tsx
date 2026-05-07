"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Zap,
  ArrowLeft,
  Plus,
  Play,
  Save,
  Trash2,
  GitBranch,
  Bot,
  Filter,
  Repeat,
  Clock,
  Webhook,
  MousePointerClick,
} from "lucide-react";
import type { WorkflowNode, NodeType, TriggerType } from "@/lib/flowforge/types";

const NODE_TYPES: { type: NodeType; label: string; icon: typeof Zap; color: string }[] = [
  { type: "trigger", label: "Trigger", icon: Zap, color: "text-yellow-400" },
  { type: "action", label: "Action", icon: Play, color: "text-blue-400" },
  { type: "condition", label: "Condition", icon: Filter, color: "text-purple-400" },
  { type: "transform", label: "Transform", icon: GitBranch, color: "text-cyan-400" },
  { type: "ai-agent", label: "AI Agent", icon: Bot, color: "text-amber-400" },
  { type: "webhook", label: "Webhook", icon: Webhook, color: "text-green-400" },
  { type: "delay", label: "Delay", icon: Clock, color: "text-gray-400" },
  { type: "loop", label: "Loop", icon: Repeat, color: "text-pink-400" },
];

const TRIGGER_TYPES: { type: TriggerType; label: string }[] = [
  { type: "manual", label: "Manual Trigger" },
  { type: "schedule", label: "Scheduled (Cron)" },
  { type: "webhook", label: "Webhook Incoming" },
  { type: "event", label: "Event-Based" },
  { type: "nano-tap", label: "Nano Tap (Mobile)" },
];

export default function WorkflowBuilderPage() {
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [triggerType, setTriggerType] = useState<TriggerType>("manual");
  const [mode, setMode] = useState<"elite" | "universal" | "nano">("universal");
  const [saving, setSaving] = useState(false);

  const addNode = (type: NodeType) => {
    const newNode: WorkflowNode = {
      id: crypto.randomUUID(),
      type,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
      config: {},
      position: { x: nodes.length * 220, y: 100 },
      connections: [],
    };
    setNodes([...nodes, newNode]);
    setSelectedNode(newNode.id);
  };

  const removeNode = (nodeId: string) => {
    setNodes(nodes.filter((n) => n.id !== nodeId));
    if (selectedNode === nodeId) setSelectedNode(null);
  };

  const updateNodeLabel = (nodeId: string, label: string) => {
    setNodes(nodes.map((n) => (n.id === nodeId ? { ...n, label } : n)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/flowforge/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workflowName,
          nodes,
          trigger_type: triggerType,
          mode,
        }),
      });
    } catch {
      // Handle error silently for now
    } finally {
      setSaving(false);
    }
  };

  const handleExecute = async () => {
    try {
      await fetch("/api/flowforge/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow: { name: workflowName, nodes, trigger_type: triggerType, mode },
          input: {},
        }),
      });
    } catch {
      // Handle error silently
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="workflow-builder">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/flowforge/dashboard" className="text-gray-400 hover:text-white">
              <ArrowLeft size={18} />
            </Link>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="bg-transparent text-lg font-bold border-none outline-none focus:ring-0"
              data-testid="workflow-name-input"
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
              className="rounded-md bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm"
              data-testid="mode-select"
            >
              <option value="elite">Elite Mode</option>
              <option value="universal">Universal Mode</option>
              <option value="nano">Nano Mode</option>
            </select>
            <button
              onClick={handleExecute}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold hover:bg-green-500 transition-colors"
              data-testid="execute-btn"
            >
              <Play size={14} /> Execute
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 transition-colors disabled:opacity-50"
              data-testid="save-btn"
            >
              <Save size={14} /> {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        {/* Node Palette */}
        <div className="col-span-3">
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-400 uppercase tracking-wider">Add Node</h3>
            <div className="space-y-2">
              {NODE_TYPES.map((nt) => (
                <button
                  key={nt.type}
                  onClick={() => addNode(nt.type)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors text-left"
                  data-testid={`add-node-${nt.type}`}
                >
                  <nt.icon size={16} className={nt.color} />
                  <span className="text-sm">{nt.label}</span>
                  <Plus size={12} className="ml-auto text-gray-600" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 mt-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-400 uppercase tracking-wider">Trigger</h3>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as TriggerType)}
              className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm"
              data-testid="trigger-select"
            >
              {TRIGGER_TYPES.map((tt) => (
                <option key={tt.type} value={tt.type}>{tt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Canvas */}
        <div className="col-span-6">
          <div className="rounded-xl border border-gray-800 bg-gray-900/30 min-h-[500px] p-6" data-testid="workflow-canvas">
            {nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                <MousePointerClick size={48} className="mb-4 opacity-30" />
                <p className="text-sm">Add nodes from the left panel to build your workflow</p>
              </div>
            ) : (
              <div className="space-y-4">
                {nodes.map((node, idx) => {
                  const nodeType = NODE_TYPES.find((nt) => nt.type === node.type);
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node.id)}
                      className={`flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer ${
                        selectedNode === node.id
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-gray-800 bg-gray-800/50 hover:border-gray-700"
                      }`}
                      data-testid={`node-${node.id}`}
                    >
                      <span className="text-xs text-gray-600 font-mono w-6">{idx + 1}</span>
                      {nodeType && <nodeType.icon size={16} className={nodeType.color} />}
                      <span className="text-sm font-medium flex-1">{node.label}</span>
                      <span className="text-xs text-gray-500 font-mono">{node.type}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNode(node.id);
                        }}
                        className="text-gray-600 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Properties Panel */}
        <div className="col-span-3">
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-400 uppercase tracking-wider">Properties</h3>
            {selectedNode ? (
              <div className="space-y-4">
                {(() => {
                  const node = nodes.find((n) => n.id === selectedNode);
                  if (!node) return <p className="text-sm text-gray-500">Node not found</p>;
                  return (
                    <>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Label</label>
                        <input
                          type="text"
                          value={node.label}
                          onChange={(e) => updateNodeLabel(node.id, e.target.value)}
                          className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm"
                          data-testid="node-label-input"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Type</label>
                        <p className="text-sm font-mono text-amber-400">{node.type}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Node ID</label>
                        <p className="text-xs font-mono text-gray-500 break-all">{node.id}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select a node to edit its properties</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
