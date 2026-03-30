import { AppBuildAgent } from "./agent";
import { FileMap, ProjectStatus } from "./types";
import { LLMError } from "./llm";

/**
 * Agent Swarm System for AI App Builder
 * Manages multiple AI agents collaborating on a single project
 */

export interface AgentRole {
  name: string;
  role: 'architect' | 'developer' | 'tester' | 'reviewer';
  promptPrefix: string;
}

export interface SwarmTask {
  id: string;
  description: string;
  role: AgentRole;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: FileMap;
  error?: string;
}

export class AgentSwarm {
  private agents: Map<string, AppBuildAgent> = new Map();
  private tasks: SwarmTask[] = [];

  private roles: AgentRole[] = [
    {
      name: 'Architect',
      role: 'architect',
      promptPrefix: 'You are an Expert Software Architect. Plan the file structure and core logic for the following project: ',
    },
    {
      name: 'Frontend Developer',
      role: 'developer',
      promptPrefix: 'You are a Senior Frontend Developer. Implement the UI components and pages using React and Tailwind CSS: ',
    },
    {
      name: 'Backend Developer',
      role: 'developer',
      promptPrefix: 'You are a Senior Backend Developer. Implement the API routes and database logic using Supabase: ',
    },
    {
      name: 'QA Engineer',
      role: 'tester',
      promptPrefix: 'You are a QA Engineer. Identify and fix potential bugs in the following code: ',
    }
  ];

  constructor(private projectId: string) {}

  /**
   * Executes a collaborative project build using the swarm
   * @param prompt The user's prompt
   * @param onProgress Callback for status updates
   * @returns The final built project as a FileMap
   */
  public async executeSwarmBuild(
    prompt: string,
    onProgress?: (status: ProjectStatus) => void
  ): Promise<FileMap> {
    const combinedFiles: FileMap = {};

    try {
      // Step 1: Planning (Architect)
      if (onProgress) {
        onProgress({ phase: 'planning', currentPass: 1, totalPasses: 4, message: 'Architect is planning the application structure...' });
      }
      
      const architectTask: SwarmTask = {
        id: 'task-architect',
        description: `Plan structure for: ${prompt}`,
        role: this.roles[0],
        status: 'running'
      };
      this.tasks.push(architectTask);
      
      // Simulate architecture planning
      const architectAgent = new AppBuildAgent();
      const plan = await architectAgent.run(`Plan the file structure for: ${prompt}. Return a basic scaffolding.`);
      Object.assign(combinedFiles, plan.files);
      architectTask.status = 'completed';
      architectTask.result = plan.files;

      // Step 2: Implementation (Frontend & Backend)
      if (onProgress) {
        onProgress({ phase: 'building', currentPass: 2, totalPasses: 4, message: 'Frontend and Backend agents are building components...' });
      }

      const devTasks = [this.roles[1], this.roles[2]].map((role, index) => {
        const task: SwarmTask = {
          id: `task-dev-${index}`,
          description: `Implement ${role.name} logic`,
          role,
          status: 'running'
        };
        this.tasks.push(task);
        return task;
      });

      // Parallel execution simulation
      const devResults = await Promise.all(devTasks.map(async (task) => {
        const agent = new AppBuildAgent();
        const result = await agent.run(`${task.role.promptPrefix} ${prompt}`);
        task.status = 'completed';
        task.result = result.files;
        return result.files;
      }));

      devResults.forEach(files => Object.assign(combinedFiles, files));

      // Step 3: Testing & Fixing (QA)
      if (onProgress) {
        onProgress({ phase: 'fixing', currentPass: 3, totalPasses: 4, message: 'QA Engineer is reviewing and fixing code...' });
      }

      const qaTask: SwarmTask = {
        id: 'task-qa',
        description: 'Review and fix implementation',
        role: this.roles[3],
        status: 'running'
      };
      this.tasks.push(qaTask);

      const qaAgent = new AppBuildAgent();
      // In a real swarm, the QA agent would analyze existing files and fix them
      // Here we just simulate it refining the project
      const finalFiles = await qaAgent.run(`Review and optimize these files: ${Object.keys(combinedFiles).join(', ')} for the project: ${prompt}`);
      Object.assign(combinedFiles, finalFiles.files);
      qaTask.status = 'completed';
      qaTask.result = finalFiles.files;

      if (onProgress) {
        onProgress({ phase: 'complete', currentPass: 4, totalPasses: 4, message: 'Project build completed successfully by the swarm!' });
      }

      return combinedFiles;
    } catch (error) {
      console.error('Swarm execution failed:', error);
      throw new LLMError(`Swarm build failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public getTasks(): SwarmTask[] {
    return [...this.tasks];
  }
}
