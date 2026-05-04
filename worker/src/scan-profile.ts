/**
 * Scans Claude_Projects for STACK.md and package.json files.
 * Outputs raw project data as JSON to stdout.
 * Claude Code in the session synthesizes this into a builder profile.
 */
import { readdirSync, readFileSync, existsSync } from "fs";
import path from "path";

const PROJECTS_DIR = "C:\\Users\\Kasutaja\\Claude_Projects";

function scanProjects(): { name: string; stackMd: string; deps: string[] }[] {
  const projects: { name: string; stackMd: string; deps: string[] }[] = [];
  const entries = readdirSync(PROJECTS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const projectDir = path.join(PROJECTS_DIR, entry.name);
    const stackPath = path.join(projectDir, "STACK.md");
    const pkgPath = path.join(projectDir, "package.json");

    const hasStack = existsSync(stackPath);
    const hasPkg = existsSync(pkgPath);

    if (!hasStack && !hasPkg) continue;

    let stackMd = "";
    let deps: string[] = [];

    if (hasStack) {
      stackMd = readFileSync(stackPath, "utf-8");
    }

    if (hasPkg) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        deps = [
          ...Object.keys(pkg.dependencies || {}),
          ...Object.keys(pkg.devDependencies || {}),
        ];
      } catch {
        // ignore
      }
    }

    projects.push({ name: entry.name, stackMd: stackMd.slice(0, 2000), deps });
  }

  return projects;
}

const projects = scanProjects();
console.log(JSON.stringify({ count: projects.length, projects }));
