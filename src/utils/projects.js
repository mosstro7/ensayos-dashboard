const PROJECTS_KEY = 'ensayos_projects';

function load() {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    return raw ? JSON.parse(raw) : { activeId: null, projects: [] };
  } catch {
    return { activeId: null, projects: [] };
  }
}

function save(state) {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[Projects] No se pudo guardar:', e);
  }
}

/** Devuelve todos los proyectos agrupados por cliente */
export function getProjectsByClient() {
  const { projects } = load();
  const grouped = {};
  for (const p of projects) {
    if (!grouped[p.client]) grouped[p.client] = [];
    grouped[p.client].push(p);
  }
  for (const client of Object.keys(grouped)) {
    grouped[client].sort((a, b) =>
      new Date(b.lastUsedAt) - new Date(a.lastUsedAt)
    );
  }
  return grouped;
}

/** Devuelve el proyecto activo, o null */
export function getActiveProject() {
  const { activeId, projects } = load();
  return projects.find(p => p.id === activeId) ?? null;
}

/** Crea un nuevo proyecto. Devuelve el proyecto creado. */
export function createProject({ client, execution, config }) {
  const state = load();
  const newProject = {
    id: `proj_${Date.now()}`,
    client: client.trim(),
    execution: execution.trim(),
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    config,
  };
  state.projects.push(newProject);
  state.activeId = newProject.id;
  save(state);
  return newProject;
}

/** Activa un proyecto existente por id */
export function activateProject(id) {
  const state = load();
  const project = state.projects.find(p => p.id === id);
  if (!project) return null;
  project.lastUsedAt = new Date().toISOString();
  state.activeId = id;
  save(state);
  return project;
}

/** Elimina un proyecto por id */
export function deleteProject(id) {
  const state = load();
  state.projects = state.projects.filter(p => p.id !== id);
  if (state.activeId === id) {
    state.activeId = state.projects[0]?.id ?? null;
  }
  save(state);
}

/** Actualiza la config del proyecto activo (para cuando cambien GIDs, etc.) */
export function updateActiveConfig(config) {
  const state = load();
  const project = state.projects.find(p => p.id === state.activeId);
  if (project) {
    project.config = { ...project.config, ...config };
    project.lastUsedAt = new Date().toISOString();
    save(state);
  }
}
