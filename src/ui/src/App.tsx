import React, { useState } from 'react';
import { Header } from './components/Header';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { ExecutionPanel } from './components/ExecutionPanel';
import { ToolPanel } from './components/ToolPanel';
import type { WorkflowNode, ExecutionStep } from './types';

const INITIAL_NODES: WorkflowNode[] = [
  {
    id: 'input',
    type: 'input',
    label: 'User Input',
    x: 80,
    y: 200,
    config: {},
  },
  {
    id: 'agent',
    type: 'agent',
    label: 'Research Agent',
    x: 350,
    y: 200,
    config: {
      systemPrompt: 'You are a research assistant.',
      model: 'gpt-4o',
      tools: ['web_search', 'calculator'],
    },
  },
  {
    id: 'output',
    type: 'output',
    label: 'Response',
    x: 620,
    y: 200,
    config: {},
  },
];

const DEMO_STEPS: ExecutionStep[] = [
  {
    id: '1',
    type: 'thinking',
    content: 'Analyzing the user query to determine the best approach...',
    timestamp: Date.now() - 5000,
    durationMs: 820,
  },
  {
    id: '2',
    type: 'tool_call',
    content: 'web_search({ query: "latest AI agent frameworks 2024" })',
    timestamp: Date.now() - 4000,
    durationMs: 1200,
    toolName: 'web_search',
    toolArgs: { query: 'latest AI agent frameworks 2024' },
  },
  {
    id: '3',
    type: 'observation',
    content:
      'Found 5 results about AI agent frameworks including LangChain, CrewAI, AutoGPT, and agent-flow.',
    timestamp: Date.now() - 2500,
    durationMs: 0,
  },
  {
    id: '4',
    type: 'tool_call',
    content: 'calculator({ expression: "4 * 2.5 + 1.2" })',
    timestamp: Date.now() - 2000,
    durationMs: 15,
    toolName: 'calculator',
    toolArgs: { expression: '4 * 2.5 + 1.2' },
  },
  {
    id: '5',
    type: 'observation',
    content: 'Result: 11.2',
    timestamp: Date.now() - 1800,
    durationMs: 0,
  },
  {
    id: '6',
    type: 'thinking',
    content: 'Synthesizing search results into a comprehensive summary...',
    timestamp: Date.now() - 1500,
    durationMs: 1100,
  },
  {
    id: '7',
    type: 'complete',
    content:
      'Based on my research, the top AI agent frameworks in 2024 are LangChain, CrewAI, AutoGPT, and agent-flow...',
    timestamp: Date.now() - 200,
    durationMs: 0,
  },
];

export default function App() {
  const [nodes, setNodes] = useState<WorkflowNode[]>(INITIAL_NODES);
  const [steps, setSteps] = useState<ExecutionStep[]>(DEMO_STEPS);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunDemo = () => {
    setIsRunning(true);
    setSteps([]);

    // Simulate execution steps appearing over time
    DEMO_STEPS.forEach((step, i) => {
      setTimeout(() => {
        setSteps((prev) => [...prev, step]);
        if (i === DEMO_STEPS.length - 1) {
          setIsRunning(false);
        }
      }, (i + 1) * 800);
    });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header onRun={handleRunDemo} isRunning={isRunning} />
      <div className="flex-1 flex overflow-hidden">
        <ToolPanel />
        <div className="flex-1 flex flex-col overflow-hidden">
          <WorkflowCanvas
            nodes={nodes}
            onNodesChange={setNodes}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
          />
          <ExecutionPanel steps={steps} isRunning={isRunning} />
        </div>
      </div>
    </div>
  );
}
