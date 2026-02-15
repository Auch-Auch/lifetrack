/**
 * Learning Plans Page - DAG Visualization
 * Interactive directed acyclic graph for learning path planning
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  Handle,
  Position,
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
import { getSkills, type Skill } from '../../lib/skills';
import { getActivityStats } from '../../lib/activities';

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
    <>
      {/* Connection handles for edges */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
      />
      
      <div className="px-4 py-3 shadow-lg rounded-lg bg-gray-800 border-2 border-blue-400 min-w-[200px]">
        <div className="flex justify-between items-start mb-2">
          <div className="font-bold text-sm text-white">{data.title}</div>
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                data.onEdit(data.label);
              }}
              className="text-blue-400 hover:text-blue-300 text-xs px-1 cursor-pointer"
              type="button"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                data.onDelete(data.label);
              }}
              className="text-red-400 hover:text-red-300 text-xs px-1 cursor-pointer"
              type="button"
            >
              Del
            </button>
          </div>
        </div>
        
        {data.skillName && (
          <div className="text-xs text-blue-300 mb-2 font-medium">
            📚 {data.skillName}
          </div>
        )}
        
        {data.description && (
          <div className="text-xs text-gray-400 mb-2">
            {data.description}
          </div>
        )}
        
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-300">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-400">
            {data.completedHours}h / {data.plannedHours}h
          </div>
        </div>
      </div>
    </>
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
  const selectedPlanRef = useRef<LearningPlan | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNodeForm, setShowNodeForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillHoursMap, setSkillHoursMap] = useState<Map<string, number>>(new Map());
  
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

  // Load learning plans and skills
  useEffect(() => {
    const loadData = async () => {
      // Load skills and skill hours first
      const hoursMap = await loadSkills();
      // Then load plans so skill hours are available
      await loadPlans(hoursMap);
    };
    loadData();
  }, []);

  const loadSkills = async (): Promise<Map<string, number>> => {
    try {
      const data = await getSkills();
      setSkills(data);
      // Load skill hours from activities
      return await loadSkillHours();
    } catch (error) {
      console.error('Failed to load skills:', error);
      return new Map<string, number>();
    }
  };

  const loadSkillHours = async (): Promise<Map<string, number>> => {
    try {
      // Get activity stats for the last year to calculate skill hours
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      
      const stats = await getActivityStats(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      const hoursMap = new Map<string, number>();
      stats.skillBreakdown.forEach(skill => {
        hoursMap.set(skill.skillId, skill.totalHours);
      });
      setSkillHoursMap(hoursMap);
      return hoursMap;
    } catch (error) {
      console.error('Failed to load skill hours:', error);
      return new Map<string, number>();
    }
  };

  // Handle node editing
  const handleEditNode = useCallback((nodeId: string) => {
    // Use ref to get current value instead of stale closure
    const currentPlan = selectedPlanRef.current;
    if (!currentPlan) {
      console.error('No plan selected');
      return;
    }
    
    // Find the node in the backend data
    const backendNode = currentPlan.nodes.find(n => n.id === nodeId);
    
    if (backendNode) {
      setEditingNode(nodeId);
      setNodeForm({
        title: backendNode.title,
        description: backendNode.description || '',
        skillId: backendNode.skillId || '',
        plannedHours: backendNode.plannedHours,
      });
      setShowNodeForm(true);
    } else {
      console.error('Backend node not found for id:', nodeId);
    }
  }, []);

  // Handle node deletion
  const handleDeleteNode = useCallback(async (nodeId: string) => {
    if (!confirm('Delete this node?')) return;

    try {
      await deleteNode(nodeId);
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    } catch (error) {
      console.error('Failed to delete node:', error);
    }
  }, [setNodes, setEdges]);

  const loadPlans = async (hoursMap?: Map<string, number>) => {
    try {
      setIsLoading(true);
      const data = await getLearningPlans();
      setPlans(data);
      if (data.length > 0 && !selectedPlan) {
        loadPlan(data[0].id, hoursMap);
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

  const loadPlan = async (planId: string, hoursMap?: Map<string, number>) => {
    try {
      const plan = await getLearningPlan(planId);
      setSelectedPlan(plan);
      selectedPlanRef.current = plan;
      
      // Use provided hours map or fall back to state
      const activeHoursMap = hoursMap || skillHoursMap;
      
      // Convert backend nodes to React Flow nodes
      const flowNodes: Node[] = plan.nodes.map((node) => {
        // Get completed hours from skill activities
        const completedHours = node.skillId ? (activeHoursMap.get(node.skillId) || 0) : node.completedHours;
        
        return {
          id: node.id,
          type: 'custom',
          position: { x: node.positionX, y: node.positionY },
          data: {
            label: node.id,
            title: node.title,
            description: node.description,
            skillName: node.skill?.name,
            plannedHours: node.plannedHours,
            completedHours: completedHours,
            onEdit: handleEditNode,
            onDelete: handleDeleteNode,
          },
        };
      });
      
      // Convert backend edges to React Flow edges
      const flowEdges: Edge[] = plan.edges.map((edge) => ({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        animated: true,
        style: { 
          stroke: '#60a5fa',
          strokeWidth: 2,
        },
        type: 'smoothstep',
      }));
      
      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (error) {
      console.error('Failed to load learning plan:', error);
    }
  };

  // Handle node creation and update
  const handleSaveNode = async () => {
    if (!selectedPlan) {
      alert('Please select or create a learning plan first');
      return;
    }

    if (!nodeForm.title.trim()) {
      alert('Please enter a node title');
      return;
    }

    if (!nodeForm.skillId) {
      alert('Please select a skill. All nodes must be linked to a skill.');
      return;
    }

    try {
      if (editingNode) {
        // Update existing node
        const updatedNode = await updateNode(editingNode, {
          title: nodeForm.title,
          description: nodeForm.description || undefined,
          skillId: nodeForm.skillId,
          plannedHours: nodeForm.plannedHours,
        });

        // Find the skill name for display
        const skill = skills.find(s => s.id === nodeForm.skillId);
        const completedHours = skillHoursMap.get(nodeForm.skillId) || 0;

        // Update in React Flow
        setNodes((nds) =>
          nds.map((node) =>
            node.id === editingNode
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    title: updatedNode.title,
                    description: updatedNode.description,
                    skillName: skill?.name,
                    plannedHours: updatedNode.plannedHours,
                    completedHours: completedHours,
                  },
                }
              : node
          )
        );
        
        // Reload the plan to get updated data
        await loadPlan(selectedPlan.id);
      } else {
        // Create new node
        // Find position for new node
        const maxX = nodes.reduce((max, n) => Math.max(max, n.position.x), 0);
        const maxY = nodes.reduce((max, n) => Math.max(max, n.position.y), 0);
        
        const newNode = await createNode({
          learningPlanId: selectedPlan.id,
          title: nodeForm.title,
          description: nodeForm.description || undefined,
          skillId: nodeForm.skillId,
          plannedHours: nodeForm.plannedHours,
          positionX: maxX + 250,
          positionY: maxY + 100,
        });

        // Find the skill name for display
        const skill = skills.find(s => s.id === nodeForm.skillId);
        const completedHours = skillHoursMap.get(nodeForm.skillId) || 0;

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
              skillName: skill?.name,
              plannedHours: newNode.plannedHours,
              completedHours: completedHours,
              onEdit: handleEditNode,
              onDelete: handleDeleteNode,
            },
          },
        ]);
      }

      // Reset form
      setNodeForm({
        title: '',
        description: '',
        skillId: '',
        plannedHours: 10,
      });
      setEditingNode(null);
      setShowNodeForm(false);
    } catch (error) {
      console.error('Failed to save node:', error);
      alert('Failed to save node');
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
              style: { 
                stroke: '#60a5fa',
                strokeWidth: 2,
              },
              type: 'smoothstep',
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

  // Handle edge deletion
  const handleEdgesDelete = useCallback(
    async (edgesToDelete: Edge[]) => {
      for (const edge of edgesToDelete) {
        try {
          await deleteEdge(edge.id);
        } catch (error) {
          console.error('Failed to delete edge:', error);
        }
      }
    },
    []
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-lg text-white">Loading learning plans...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <style jsx global>{`
        .react-flow__handle {
          width: 12px !important;
          height: 12px !important;
          background: #3b82f6 !important;
          border: 2px solid #60a5fa !important;
        }
        .react-flow__handle:hover {
          background: #60a5fa !important;
          border-color: #93c5fd !important;
          width: 16px !important;
          height: 16px !important;
        }
        .react-flow__edge-path {
          stroke: #60a5fa !important;
          stroke-width: 2 !important;
        }
        .react-flow__edge.selected .react-flow__edge-path {
          stroke: #93c5fd !important;
          stroke-width: 3 !important;
        }
        .react-flow__controls {
          background: #1f2937 !important;
          border: 1px solid #374151 !important;
        }
        .react-flow__controls-button {
          background: #1f2937 !important;
          color: #fff !important;
          border-bottom: 1px solid #374151 !important;
        }
        .react-flow__controls-button:hover {
          background: #374151 !important;
        }
        .react-flow__controls-button svg {
          fill: #fff !important;
        }
      `}</style>
      {/* Header */}
      <div className="bg-gray-950 text-white shadow-lg px-6 py-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-gray-400 hover:text-white transition-colors"
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
      <div className="flex-1 bg-gray-900">
        {selectedPlan ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onEdgesDelete={handleEdgesDelete}
            onConnect={onConnect}
            onNodeDragStop={handleNodeDragStop}
            nodeTypes={nodeTypes}
            fitView
            style={{ background: '#111827' }}
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Controls />
            <MiniMap 
              className="bg-gray-800 border border-gray-700"
              maskColor="rgba(17, 24, 39, 0.8)"
              nodeColor="#1f2937"
            />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#374151" />
            <Panel position="top-right" className="bg-gray-800 border border-gray-700 p-4 rounded-lg shadow-lg">
              <div className="text-sm space-y-2 text-white">
                <div className="font-bold">{selectedPlan.name}</div>
                <div className="text-gray-400">{selectedPlan.description}</div>
                <div className="flex gap-4 text-xs text-gray-400">
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
            <div className="text-center bg-gray-800 border border-gray-700 rounded-xl shadow-lg p-8">
              <p className="text-gray-300 mb-4 text-lg">No learning plans yet</p>
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-white">Create Learning Plan</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Plan Name</label>
                <input
                  type="text"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Full-Stack Development Path"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Description</label>
                <textarea
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="flex-1 border border-gray-600 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Node Form Modal */}
      {showNodeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-white">
              {editingNode ? 'Edit Node' : 'Create New Node'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">
                  Skill <span className="text-red-400">*</span>
                </label>
                <select
                  value={nodeForm.skillId}
                  onChange={(e) => setNodeForm({ ...nodeForm, skillId: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a skill...</option>
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name} {skill.level ? `(${skill.level})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Every node must be linked to a skill
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={nodeForm.title}
                  onChange={(e) => setNodeForm({ ...nodeForm, title: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Learn React Basics"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Description</label>
                <textarea
                  value={nodeForm.description}
                  onChange={(e) => setNodeForm({ ...nodeForm, description: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">
                  Planned Hours <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={nodeForm.plannedHours}
                  onChange={(e) =>
                    setNodeForm({ ...nodeForm, plannedHours: parseFloat(e.target.value) })
                  }
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.5"
                  required
                />
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 mt-4">
              <p className="text-xs text-gray-400">
                💡 <strong className="text-gray-300">Tip:</strong> Connect nodes by dragging from one node's edge to another. 
                Nodes can have multiple incoming and outgoing connections.
              </p>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveNode}
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
                className="flex-1 border border-gray-600 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
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
