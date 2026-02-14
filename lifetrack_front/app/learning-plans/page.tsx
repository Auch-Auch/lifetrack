/**
 * Learning Plans Page - DAG Visualization
 * Interactive directed acyclic graph for learning path planning
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Save, Trash2, ArrowLeft } from 'lucide-react';
import {
  getLearningPlan,
  getLearningPlans,
  createLearningPlan,
  createNode,
  deleteNode,
  updateNode,
  createEdge,
  deleteEdge,
  type LearningPlan,
  type LearningPlanNode,
  type LearningPlanEdge,
} from '../../lib/learningPlans';

// ============================================================================
// Custom Node Component
// ============================================================================

interface NodeData {
  label: string;
  title: string;
  description?: string;
  skillName?: string;
  plannedHours: number;
  completedHours: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const CustomNode = ({ data }: { data: NodeData }) => {
  const progress = data.plannedHours > 0 
    ? (data.completedHours / data.plannedHours) * 100 
    : 0;

  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-blue-500 min-w-[200px]">
      <div className="flex justify-between items-start mb-2">
        <div className="font-bold text-sm">{data.title}</div>
        <div className="flex gap-1">
          <button
            onClick={() => data.onEdit(data.label)}
            className="text-blue-600 hover:text-blue-800 text-xs"
          >
            Edit
          </button>
          <button
            onClick={() => data.onDelete(data.label)}
            className="text-red-600 hover:text-red-800 text-xs"
          >
            Del
          </button>
        </div>
      </div>
      
      {data.skillName && (
        <div className="text-xs text-gray-600 mb-2">
          📚 {data.skillName}
        </div>
      )}
      
      {data.description && (
        <div className="text-xs text-gray-500 mb-2">
          {data.description}
        </div>
      )}
      
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-600">
          {data.completedHours}h / {data.plannedHours}h
        </div>
      </div>
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

// ============================================================================
// Main Page Component
// ============================================================================

export default function LearningPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<LearningPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<LearningPlan | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNodeForm, setShowNodeForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  
  // Form state
  const [nodeForm, setNodeForm] = useState({
    title: '',
    description: '',
    skillId: '',
    plannedHours: 10,
  });

  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
  });

  // Load learning plans
  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const data = await getLearningPlans();
      setPlans(data);
      if (data.length > 0 && !selectedPlan) {
        loadPlan(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load learning plans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!planForm.name.trim()) {
      alert('Please enter a plan name');
      return;
    }

    try {
      const newPlan = await createLearningPlan({
        name: planForm.name,
        description: planForm.description || undefined,
        skillIds: [],
        schedule: {
          frequency: 'FLEXIBLE',
          durationMinutes: 60,
          preferredTimes: [],
          preferredDays: [],
          autoSchedule: false,
        },
        startDate: new Date().toISOString().split('T')[0],
      });
      
      setPlans([...plans, newPlan]);
      loadPlan(newPlan.id);
      setPlanForm({ name: '', description: '' });
      setShowPlanForm(false);
    } catch (error) {
      console.error('Failed to create learning plan:', error);
      alert('Failed to create learning plan');
    }
  };

  const loadPlan = async (planId: string) => {
    try {
      const plan = await getLearningPlan(planId);
      setSelectedPlan(plan);
      
      // Convert backend nodes to React Flow nodes
      const flowNodes: Node[] = plan.nodes.map((node) => ({
        id: node.id,
        type: 'custom',
        position: { x: node.positionX, y: node.positionY },
        data: {
          label: node.id,
          title: node.title,
          description: node.description,
          skillName: node.skill?.name,
          plannedHours: node.plannedHours,
          completedHours: node.completedHours,
          onEdit: handleEditNode,
          onDelete: handleDeleteNode,
        },
      }));
      
      // Convert backend edges to React Flow edges
      const flowEdges: Edge[] = plan.edges.map((edge) => ({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        animated: true,
        style: { stroke: '#3b82f6' },
      }));
      
      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (error) {
      console.error('Failed to load learning plan:', error);
    }
  };

  // Handle node creation
  const handleCreateNode = async () => {
    if (!selectedPlan) {
      alert('Please select or create a learning plan first');
      return;
    }

    if (!nodeForm.title.trim()) {
      alert('Please enter a node title');
      return;
    }

    try {
      // Find position for new node
      const maxX = nodes.reduce((max, n) => Math.max(max, n.position.x), 0);
      const maxY = nodes.reduce((max, n) => Math.max(max, n.position.y), 0);
      
      const newNode = await createNode({
        learningPlanId: selectedPlan.id,
        title: nodeForm.title,
        description: nodeForm.description || undefined,
        skillId: nodeForm.skillId || undefined,
        plannedHours: nodeForm.plannedHours,
        positionX: maxX + 250,
        positionY: maxY + 100,
      });

      // Add to React Flow
      setNodes((nds) => [
        ...nds,
        {
          id: newNode.id,
          type: 'custom',
          position: { x: newNode.positionX, y: newNode.positionY },
          data: {
            label: newNode.id,
            title: newNode.title,
            description: newNode.description,
            skillName: newNode.skill?.name,
            plannedHours: newNode.plannedHours,
            completedHours: newNode.completedHours,
            onEdit: handleEditNode,
            onDelete: handleDeleteNode,
          },
        },
      ]);

      // Reset form
      setNodeForm({
        title: '',
        description: '',
        skillId: '',
        plannedHours: 10,
      });
      setShowNodeForm(false);
    } catch (error) {
      console.error('Failed to create node:', error);
    }
  };

  // Handle node editing
  const handleEditNode = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      const nodeData = node.data as unknown as NodeData;
      setEditingNode(nodeId);
      setNodeForm({
        title: nodeData.title,
        description: nodeData.description || '',
        skillId: '', // TODO: Get from node data
        plannedHours: nodeData.plannedHours,
      });
      setShowNodeForm(true);
    }
  };

  // Handle node deletion
  const handleDeleteNode = async (nodeId: string) => {
    if (!confirm('Delete this node?')) return;

    try {
      await deleteNode(nodeId);
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    } catch (error) {
      console.error('Failed to delete node:', error);
    }
  };

  // Handle edge creation
  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!selectedPlan || !connection.source || !connection.target) return;

      try {
        const newEdge = await createEdge({
          learningPlanId: selectedPlan.id,
          sourceNodeId: connection.source,
          targetNodeId: connection.target,
        });

        setEdges((eds) =>
          addEdge(
            {
              ...connection,
              id: newEdge.id,
              animated: true,
              style: { stroke: '#3b82f6' },
            },
            eds
          )
        );
      } catch (error) {
        console.error('Failed to create edge:', error);
      }
    },
    [selectedPlan, setEdges]
  );

  // Handle node position update
  const handleNodeDragStop = async (event: any, node: Node) => {
    try {
      await updateNode(node.id, {
        positionX: node.position.x,
        positionY: node.position.y,
      });
    } catch (error) {
      console.error('Failed to update node position:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading learning plans...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 text-white shadow-lg px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Learning Plans</h1>
            {plans.length > 0 && (
              <select
                value={selectedPlan?.id || ''}
                onChange={(e) => loadPlan(e.target.value)}
                className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setShowPlanForm(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Plan
            </button>
          </div>
          <button
            onClick={() => {
              if (!selectedPlan) {
                alert('Please create or select a learning plan first');
                return;
              }
              setShowNodeForm(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!selectedPlan}
          >
            <Plus className="w-4 h-4" />
            Add Node
          </button>
        </div>
      </div>

      {/* DAG Visualization */}
      <div className="flex-1">
        {selectedPlan ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={handleNodeDragStop}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            <Panel position="top-right" className="bg-white p-4 rounded-lg shadow-lg">
              <div className="text-sm space-y-2">
                <div className="font-bold">{selectedPlan.name}</div>
                <div className="text-gray-600">{selectedPlan.description}</div>
                <div className="flex gap-4 text-xs">
                  <div>
                    <span className="font-semibold">Nodes:</span> {nodes.length}
                  </div>
                  <div>
                    <span className="font-semibold">Connections:</span> {edges.length}
                  </div>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center bg-white rounded-xl shadow-lg p-8">
              <p className="text-gray-600 mb-4 text-lg">No learning plans yet</p>
              <button
                onClick={() => setShowPlanForm(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create Your First Plan
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Plan Form Modal */}
      {showPlanForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Create Learning Plan</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Plan Name</label>
                <input
                  type="text"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Full-Stack Development Path"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreatePlan}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowPlanForm(false);
                  setPlanForm({ name: '', description: '' });
                }}
                className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Node Form Modal */}
      {showNodeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">
              {editingNode ? 'Edit Node' : 'Create New Node'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={nodeForm.title}
                  onChange={(e) => setNodeForm({ ...nodeForm, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Learn React Basics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={nodeForm.description}
                  onChange={(e) => setNodeForm({ ...nodeForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Planned Hours</label>
                <input
                  type="number"
                  value={nodeForm.plannedHours}
                  onChange={(e) =>
                    setNodeForm({ ...nodeForm, plannedHours: parseFloat(e.target.value) })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.5"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateNode}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                {editingNode ? 'Update' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowNodeForm(false);
                  setEditingNode(null);
                  setNodeForm({ title: '', description: '', skillId: '', plannedHours: 10 });
                }}
                className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
