import { ComponentMeta } from '@plasmicapp/loader-core';
import pascalcase from 'pascalcase';
import * as React from 'react';

export type ComponentLookupSpec =
  | string
  | { name: string; projectId?: string; isCode?: boolean };

interface FullNameLookupSpec {
  name: string;
  rawName?: string;
  projectId?: string;
  isCode?: boolean;
}

interface FullPathLookupSpec {
  path: string;
  projectId?: string;
}

type FullLookupSpec = FullNameLookupSpec | FullPathLookupSpec;

export function useForceUpdate() {
  const [, setTick] = React.useState(0);
  const update = React.useCallback(() => {
    setTick((tick) => tick + 1);
  }, []);
  return update;
}

export function useStableLookupSpec(spec: ComponentLookupSpec) {
  return useStableLookupSpecs(spec)[0];
}

export function useStableLookupSpecs(...specs: ComponentLookupSpec[]) {
  const [stableSpecs, setStableSpecs] = React.useState(specs);

  React.useEffect(() => {
    if (
      specs.length !== stableSpecs.length ||
      specs.some((s, i) => !areLookupSpecsEqual(s, stableSpecs[i]))
    ) {
      setStableSpecs(specs);
    }
  }, [specs, stableSpecs]);
  return stableSpecs;
}

function areLookupSpecsEqual(
  spec1: ComponentLookupSpec,
  spec2: ComponentLookupSpec
) {
  if (spec1 === spec2) {
    return true;
  }
  if (typeof spec1 !== typeof spec2) {
    return false;
  }

  const fullSpec1 = toFullLookup(spec1);
  const fullSpec2 = toFullLookup(spec2);
  return (
    ((isNameSpec(fullSpec1) &&
      isNameSpec(fullSpec2) &&
      fullSpec1.name === fullSpec2.name &&
      fullSpec1.isCode === fullSpec2.isCode) ||
      (isPathSpec(fullSpec1) &&
        isPathSpec(fullSpec2) &&
        fullSpec1.path === fullSpec2.path)) &&
    fullSpec1.projectId === fullSpec2.projectId
  );
}

function isNameSpec(lookup: FullLookupSpec): lookup is FullNameLookupSpec {
  return 'name' in lookup;
}

function isPathSpec(lookup: FullLookupSpec): lookup is FullPathLookupSpec {
  return 'path' in lookup;
}

function toFullLookup(lookup: ComponentLookupSpec): FullLookupSpec {
  const namePart = typeof lookup === 'string' ? lookup : lookup.name;
  const projectId = typeof lookup === 'string' ? undefined : lookup.projectId;
  const codeComponent = typeof lookup === 'string' ? undefined : lookup.isCode;

  if (codeComponent !== true && namePart.startsWith('/')) {
    return { path: normalizePath(namePart), projectId };
  } else {
    return {
      name: codeComponent ? namePart : normalizeName(namePart),
      rawName: namePart.trim(),
      projectId,
      isCode: codeComponent,
    };
  }
}

function normalizePath(path: string) {
  return path.trim();
}

function normalizeName(name: string) {
  // Not a full normalization, but should be good enough
  return pascalcase(name).trim();
}

export function useIsMounted(): () => boolean {
  const ref = React.useRef<boolean>(false);
  const isMounted = React.useCallback(() => ref.current, []);

  React.useEffect(() => {
    ref.current = true;
    return () => {
      ref.current = false;
    };
  }, []);

  return isMounted;
}

/**
 * Check if `lookup` resolves to `pagePath`. If it's a match, return an object
 * containing path params; otherwise, returns false.
 *
 * For example,
 * - `matchesPagePath("/hello/[name]", "/hello/world")` -> `{params: {name:
 *   "world"}}`
 * - `matchesPagePath("/hello/[name]", "/")` -> `false`
 * - `matchesPagePath("/", "")` -> `{params: {}}`
 */
export function matchesPagePath(
  pagePath: string,
  lookup: string
): { params: Record<string, string> } | false {
  // Remove trailing slashes from both `pagePath` and `lookup`.
  pagePath = pagePath.replace(/^\/*/, '').replace(/\/*$/, '');
  lookup = lookup.replace(/^\/*/, '').replace(/\/*$/, '');

  // paramNames will contain a list of parameter names; e.g. if pagePath
  // is "/products/[slug]/[variant]" it will contain ["slug", "variant"].
  const paramNames = (pagePath.match(/\[([^\]]*)\]/g) || []).map((group) =>
    group.slice(1, -1)
  );

  const pagePathRegExp = new RegExp(
    '^' + pagePath.replace(/\[[^\]]*\]/g, '([^/]+)') + '$'
  );
  const maybeVals = lookup.match(pagePathRegExp)?.slice(1);
  if (!maybeVals) {
    return false;
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < paramNames.length; i++) {
    params[paramNames[i]] = maybeVals[i];
  }

  return { params };
}

export function isDynamicPagePath(path: string): boolean {
  return !!path.match(/\[[^/]*\]/);
}

function matchesCompMeta(lookup: FullLookupSpec, meta: ComponentMeta) {
  if (lookup.projectId && meta.projectId !== lookup.projectId) {
    return false;
  }

  return isNameSpec(lookup)
    ? (lookup.name === meta.name ||
        lookup.rawName === meta.name ||
        lookup.rawName === meta.displayName) &&
        (lookup.isCode == null || lookup.isCode === meta.isCode)
    : !!(meta.path && matchesPagePath(meta.path, lookup.path));
}

export function getCompMetas(
  metas: ComponentMeta[],
  lookup: ComponentLookupSpec
) {
  const full = toFullLookup(lookup);
  return metas
    .filter((meta) => matchesCompMeta(full, meta))
    .map<ComponentMeta & { params?: Record<string, string> }>((meta) => {
      if (isNameSpec(full) || !meta.path) {
        return meta;
      }

      const match = matchesPagePath(meta.path, full.path);
      if (!match) {
        return meta;
      }

      return { ...meta, params: match.params };
    })
    .sort(
      (meta1, meta2) =>
        // We sort the matched component metas by the number of path params, so
        // if there are two pages `/products/foo` and `/products/[slug]`,
        // the first one will have higher precedence.
        Array.from(Object.keys(meta1.params || {})).length -
        Array.from(Object.keys(meta2.params || {})).length
    );
}

export function getLookupSpecName(lookup: ComponentLookupSpec) {
  if (typeof lookup === 'string') {
    return lookup;
  } else if (lookup.projectId) {
    return `${lookup.name} (project ${lookup.projectId})`;
  } else {
    return lookup.name;
  }
}

export function uniq<T>(elements: T[]): T[] {
  return Array.from(new Set(elements));
}
