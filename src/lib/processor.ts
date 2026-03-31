import { FileMap, validateFilePaths } from "./types";
import { attachBackend } from "./backend";
import { applyIntegrations } from "./integrations";

export interface PostProcessOptions {
  description?: string;
  schema?: string;
  integrations?: string[];
}

const HOOK_PATTERN = /\b(useState|useEffect|useCallback|useMemo|useRef|useContext|useReducer)\b/;
const USE_CLIENT_PATTERN = /^\s*['"]use client['"]/m;

function ensureUseClient(files: FileMap): FileMap {
  const result: FileMap = {};
  for (const [path, content] of Object.entries(files)) {
    if (path.endsWith(".tsx") && HOOK_PATTERN.test(content) && !USE_CLIENT_PATTERN.test(content)) {
      result[path] = `"use client";\n\n${content}`;
    } else {
      result[path] = content;
    }
  }
  return result;
}

export function postProcessFiles(files: FileMap, options: PostProcessOptions = {}): FileMap {
  const { description, schema, integrations } = options;

  let processed = attachBackend({ files, description, schema, integrations });
  processed = applyIntegrations(processed, integrations);
  processed = ensureUseClient(processed);

  const pathValidation = validateFilePaths(processed);
  if (!pathValidation.success) {
    const invalidPaths = pathValidation.errors
      .map((e) => {
        const match = e.match(/Invalid path: ([^ ]+)/);
        return match ? match[1] : null;
      })
      .filter((p): p is string => p !== null);

    for (const p of invalidPaths) {
      delete processed[p];
    }
  }

  return processed;
}
