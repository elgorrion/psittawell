type RequireContext = {
  (id: string): unknown;
  keys(): string[];
};

type ManifestEntry = {
  file: string;
  page: number;
  credit: string;
};

type InstrumentImageManifest = Record<string, ManifestEntry>;

type InstrumentImageRegistry = {
  images: Map<string, number>;
  credits: Map<string, string>;
};

const instrumentAssets = createInstrumentImageRegistry(loadInstrumentAssetContext());

export function getInstrumentImage(imageRef: string): number | null {
  return instrumentAssets.images.get(imageRef) ?? null;
}

export function getInstrumentImageCredit(imageRef: string): string | null {
  return instrumentAssets.credits.get(imageRef) ?? null;
}

export function createInstrumentImageRegistry(
  context: RequireContext | null,
): InstrumentImageRegistry {
  const images = new Map<string, number>();
  const credits = new Map<string, string>();

  if (!context) {
    return { images, credits };
  }

  for (const key of context.keys()) {
    if (!key.endsWith('.png')) {
      continue;
    }

    const imageRef = key.replace(/^\.\//, '').replace(/\.png$/, '');
    const imageModule = context(key);

    if (typeof imageModule === 'number') {
      images.set(imageRef, imageModule);
    }
  }

  const manifest = readManifest(context);

  if (manifest) {
    for (const [imageRef, entry] of Object.entries(manifest)) {
      if (typeof entry.credit === 'string' && entry.credit.length > 0) {
        credits.set(imageRef, entry.credit);
      }
    }
  }

  return { images, credits };
}

function loadInstrumentAssetContext(): RequireContext | null {
  if (typeof require.context !== 'function') {
    return null;
  }

  return require.context('../assets/instrument', false, /^\.\/(?:manifest\.json|[^/]+\.png)$/);
}

function readManifest(context: RequireContext): InstrumentImageManifest | null {
  if (!context.keys().includes('./manifest.json')) {
    return null;
  }

  const manifest = context('./manifest.json');

  if (!isManifest(manifest)) {
    return null;
  }

  return manifest;
}

function isManifest(value: unknown): value is InstrumentImageManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return false;
    }

    const candidate = entry as Partial<ManifestEntry>;

    return (
      typeof candidate.file === 'string' &&
      typeof candidate.page === 'number' &&
      typeof candidate.credit === 'string'
    );
  });
}
