import { Project } from "./types";

const store: Record<string, Project> = {};

export function saveProject(project: Omit<Project, "createdAt">): Project {
  const newProject: Project = {
    ...project,
    createdAt: new Date().toISOString(),
  };
  store[project.id] = newProject;
  return newProject;
}

export function loadProject(id: string): Project | undefined {
  return store[id];
}

export function getAllProjects(): Project[] {
  return Object.values(store).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
