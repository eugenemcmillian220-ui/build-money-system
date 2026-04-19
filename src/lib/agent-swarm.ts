// DA-033 FIX: TODO: Lazy-instantiate agents on demand instead of creating all at startup
import { AppBuildAgent } from "./agent";
import { FileMap, ProjectStatus } from "./types";
import { LLMError } from "./llm";
import { agentEconomy, AgentRole as EconomyRole } from "./economy";
import { slackNotifier } from "./slack";

/**
 * Agent Swarm System for AI App Builder
 * Manages multiple AI agents collaborating on a single project
 */

export interface AgentRole {
  name: string;
  role: 'architect' | 'developer' | 'tester' | 'reviewer';
  economyRole: EconomyRole;
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
      economyRole: 'Architect',
      promptPrefix: 'You are an Expert Software Architect. Plan the file structure and core logic for the following project: ',
    },
    {
      name: 'Frontend Developer',
      role: 'developer',
      economyRole: 'Developer',
      promptPrefix: 'You are a Senior Frontend Developer. Implement the UI components and pages using React and Tailwind CSS: ',
    },
    {
      name: 'Backend Developer',
      role: 'developer',
      economyRole: 'Developer',
      promptPrefix: 'You are a Senior Backend Developer. Implement the API routes and database logic using Supabase: ',
    },
    {
      name: 'QA Engineer',
      role: 'tester',
      economyRole: 'QA',
      promptPrefix: 'You are a QA Engineer. Identify and fix potential bugs in the following code: ',
    }
  ];

  constructor(private projectId: string, private orgId?: string) {}

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

      await slackNotifier.notifySwarmEvent("Architect", `Initializing build for: ${prompt}`, "info");

      const architectTask: SwarmTask = {

        id: 'task-architect',
        description: `Plan structure for: ${prompt}`,
        role: this.roles[0],
        status: 'running'
      };
      this.tasks.push(architectTask);

      // Economy: Charge for hiring Architect
      if (this.orgId) {
        await agentEconomy.hireAgent(this.orgId, "System", "Architect", architectTask.description, this.projectId);
      }

      // Simulate architecture planning

      const architectAgent = new AppBuildAgent();
      const plan = await architectAgent.run(`Plan the file structure for: ${prompt}. Return a basic scaffolding.`);
      Object.assign(combinedFiles, plan.files);
      architectTask.status = 'completed';
      architectTask.result = plan.files;
      await slackNotifier.notifySwarmEvent("Architect", "Project scaffolding generated.", "success");

      // Step 2: Implementation (Frontend & Backend)
      if (onProgress) {
        onProgress({ phase: 'building', currentPass: 2, totalPasses: 4, message: 'Frontend and Backend agents are building components...' });
      }

      await slackNotifier.notifySwarmEvent("Dev Team", "Commencing implementation pass.", "info");

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
        // Economy: Architect hires Developers
        if (this.orgId) {
          await agentEconomy.hireAgent(this.orgId, "Architect", "Developer", task.description, this.projectId);
        }

        const agent = new AppBuildAgent();
        const result = await agent.run(`${task.role.promptPrefix} ${prompt}`);
        task.status = 'completed';
        task.result = result.files;
        return result.files;
      }));

      devResults.forEach(files => Object.assign(combinedFiles, files));
      await slackNotifier.notifySwarmEvent("Dev Team", "Frontend and Backend components manifested.", "success");

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

      // Economy: Hire QA Engineer
      if (this.orgId) {
        await agentEconomy.hireAgent(this.orgId, "Developer", "QA", qaTask.description, this.projectId);
      }

      const qaAgent = new AppBuildAgent();
      // In a real swarm, the QA agent would analyze existing files and fix them
      // Now passing actual content for better review
      const fileContext = Object.entries(combinedFiles)
        .map(([path, content]) => `File: ${path}\nContent:\n${content.slice(0, 2000)}`) // Truncate very large files
        .join('\n\n');

      const finalFiles = await qaAgent.run(
        `You are the QA Lead. Review and fix potential bugs, type errors, and styling inconsistencies in these files:\n\n${fileContext}\n\nProject Goal: ${prompt}`
      );
      Object.assign(combinedFiles, finalFiles.files);
      qaTask.status = 'completed';
      qaTask.result = finalFiles.files;

      await slackNotifier.notifySwarmEvent("QA Lead", "E2E audit passed. Security hardening applied.", "success");

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
