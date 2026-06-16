/**
 * Jojo Multi-Agent Orchestration System
 * نظام تنسيق الوكلاء المتعددة
 * 
 * Advanced AI agent coordination with:
 * - Autonomous agents (Llama3.1 local)
 * - Task delegation
 * - Real-time collaboration
 * - Knowledge sharing
 * - Parallel execution
 */

import { Router } from 'express';
import { z } from 'zod';

// Agent types and configurations
interface Agent {
  id: string;
  name: string;
  type: 'researcher' | 'analyst' | 'executor' | 'coordinator';
  capability: string[];
  llmModel: string;
  status: 'idle' | 'active' | 'busy';
  currentTask?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignedAgent: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  subtasks: Task[];
  result?: any;
  createdAt: Date;
  completedAt?: Date;
}

interface Message {
  from: string;
  to: string;
  content: string;
  type: 'task' | 'result' | 'query' | 'feedback';
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Agent Pool Manager
class AgentPool {
  private agents: Map<string, Agent> = new Map();
  private messages: Message[] = [];
  private tasks: Map<string, Task> = new Map();

  // Initialize core agents
  initializeAgents() {
    const agents: Agent[] = [
      {
        id: 'agent-researcher',
        name: 'بحاث المعلومات',
        type: 'researcher',
        capability: ['web_search', 'data_collection', 'firecrawl_integration'],
        llmModel: 'llama3.1',
        status: 'idle'
      },
      {
        id: 'agent-analyst',
        name: 'محلل البيانات',
        type: 'analyst',
        capability: ['data_analysis', 'pattern_recognition', 'reporting'],
        llmModel: 'llama3.1',
        status: 'idle'
      },
      {
        id: 'agent-executor',
        name: 'منفذ المهام',
        type: 'executor',
        capability: ['workflow_execution', 'api_calls', 'database_operations'],
        llmModel: 'llama3.1',
        status: 'idle'
      },
      {
        id: 'agent-coordinator',
        name: 'المنسق الرئيسي',
        type: 'coordinator',
        capability: ['task_delegation', 'priority_management', 'resource_allocation'],
        llmModel: 'llama3.1',
        status: 'idle'
      }
    ];

    agents.forEach(agent => this.agents.set(agent.id, agent));
    return agents;
  }

  // Get available agent for task
  getAvailableAgent(requiredCapability: string): Agent | null {
    for (const agent of this.agents.values()) {
      if (agent.status === 'idle' && agent.capability.includes(requiredCapability)) {
        return agent;
      }
    }
    return null;
  }

  // Delegate task to agent
  delegateTask(task: Task): boolean {
    const agent = this.getAvailableAgent(task.title);
    if (!agent) return false;

    agent.status = 'active';
    agent.currentTask = task.id;
    task.assignedAgent = agent.id;
    task.status = 'active';

    return true;
  }

  // Inter-agent communication
  sendMessage(from: string, to: string, content: string, type: 'task' | 'result' | 'query' | 'feedback') {
    const message: Message = {
      from,
      to,
      content,
      type,
      timestamp: new Date()
    };

    this.messages.push(message);
    return message;
  }

  // Get agent communication history
  getCommunication(agentId: string, limit = 10): Message[] {
    return this.messages
      .filter(m => m.from === agentId || m.to === agentId)
      .slice(-limit);
  }

  // Task result aggregation
  aggregateResults(taskId: string): any {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const results = {
      mainResult: task.result,
      subtaskResults: task.subtasks.map(st => ({
        title: st.title,
        result: st.result,
        status: st.status
      })),
      executionTime: task.completedAt 
        ? (task.completedAt.getTime() - task.createdAt.getTime()) / 1000 
        : null
    };

    return results;
  }

  // Parallel task execution
  async executeParallel(tasks: Task[]): Promise<Task[]> {
    const results = await Promise.all(
      tasks.map(task => this.executeTask(task))
    );
    return results;
  }

  // Single task execution
  private async executeTask(task: Task): Promise<Task> {
    if (!this.delegateTask(task)) {
      task.status = 'failed';
      return task;
    }

    // Simulate task execution
    return new Promise(resolve => {
      setTimeout(() => {
        const agent = this.agents.get(task.assignedAgent);
        if (agent) {
          agent.status = 'idle';
          agent.currentTask = undefined;
        }
        task.status = 'completed';
        task.completedAt = new Date();
        resolve(task);
      }, Math.random() * 5000);
    });
  }

  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAgentStatus(agentId: string): Agent | null {
    return this.agents.get(agentId) || null;
  }

  getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  createTask(title: string, description: string, priority: 'low' | 'medium' | 'high' | 'critical'): Task {
    const task: Task = {
      id: `task-${Date.now()}`,
      title,
      description,
      assignedAgent: '',
      status: 'pending',
      priority,
      subtasks: [],
      createdAt: new Date()
    };

    this.tasks.set(task.id, task);
    return task;
  }
}

// Express Router Setup
const router = Router();
const agentPool = new AgentPool();

// Initialize agents on startup
agentPool.initializeAgents();

// GET /agents - List all agents
router.get('/agents', (req, res) => {
  const agents = agentPool.getAgents();
  res.json({
    success: true,
    count: agents.length,
    agents: agents.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      status: a.status,
      capabilities: a.capability,
      currentTask: a.currentTask
    }))
  });
});

// GET /agents/:id - Get specific agent status
router.get('/agents/:id', (req, res) => {
  const agent = agentPool.getAgentStatus(req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  res.json({
    success: true,
    agent: {
      id: agent.id,
      name: agent.name,
      type: agent.type,
      status: agent.status,
      capabilities: agent.capability,
      currentTask: agent.currentTask
    }
  });
});

// POST /tasks - Create and delegate task
const createTaskSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  subtasks: z.array(z.object({
    title: z.string(),
    description: z.string()
  })).optional()
});

router.post('/tasks', async (req, res) => {
  try {
    const { title, description, priority, subtasks } = createTaskSchema.parse(req.body);
    const task = agentPool.createTask(title, description, priority);

    // Create subtasks if provided
    if (subtasks && subtasks.length > 0) {
      task.subtasks = subtasks.map(st =>
        agentPool.createTask(st.title, st.description, priority)
      );
    }

    // Execute task (or parallel if has subtasks)
    let result;
    if (task.subtasks.length > 0) {
      result = await agentPool.executeParallel([task, ...task.subtasks]);
    } else {
      result = await agentPool.executeParallel([task]);
    }

    res.status(201).json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        assignedAgent: task.assignedAgent,
        subtaskCount: task.subtasks.length
      }
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /tasks - List all tasks
router.get('/tasks', (req, res) => {
  const tasks = agentPool.getTasks();
  res.json({
    success: true,
    count: tasks.length,
    tasks: tasks.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignedAgent: t.assignedAgent,
      subtaskCount: t.subtasks.length,
      createdAt: t.createdAt,
      completedAt: t.completedAt
    }))
  });
});

// GET /tasks/:id/results - Get aggregated results
router.get('/tasks/:id/results', (req, res) => {
  const results = agentPool.aggregateResults(req.params.id);
  if (!results) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({
    success: true,
    results
  });
});

// GET /agents/:id/communication - Get agent communication history
router.get('/agents/:id/communication', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const history = agentPool.getCommunication(req.params.id, limit);

  res.json({
    success: true,
    count: history.length,
    messages: history.map(m => ({
      from: m.from,
      to: m.to,
      type: m.type,
      timestamp: m.timestamp,
      content: m.content.substring(0, 100) + '...'
    }))
  });
});

// POST /agents/:from/message/:to - Send message between agents
const messageSchema = z.object({
  content: z.string(),
  type: z.enum(['task', 'result', 'query', 'feedback'])
});

router.post('/agents/:from/message/:to', (req, res) => {
  try {
    const { content, type } = messageSchema.parse(req.body);
    const message = agentPool.sendMessage(req.params.from, req.params.to, content, type);

    res.status(201).json({
      success: true,
      message: {
        from: message.from,
        to: message.to,
        type: message.type,
        timestamp: message.timestamp
      }
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /orchestration/status - Overall orchestration status
router.get('/orchestration/status', (req, res) => {
  const agents = agentPool.getAgents();
  const tasks = agentPool.getTasks();

  const stats = {
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === 'active').length,
    idleAgents: agents.filter(a => a.status === 'idle').length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'completed').length,
    activeTasks: tasks.filter(t => t.status === 'active').length,
    failedTasks: tasks.filter(t => t.status === 'failed').length,
    successRate: tasks.length > 0 
      ? (tasks.filter(t => t.status === 'completed').length / tasks.length * 100).toFixed(2)
      : 0
  };

  res.json({
    success: true,
    timestamp: new Date(),
    stats
  });
});

export default router;
