import {
  createInstrumentImageRegistry,
  getInstrumentImage,
  getInstrumentImageCredit,
} from '../lib/instrumentImages';

describe('instrument image registry', () => {
  it('returns null for missing bundled assets in the current runtime', () => {
    expect(getInstrumentImage('img_missing')).toBeNull();
    expect(getInstrumentImageCredit('img_missing')).toBeNull();
  });

  it('returns empty maps when the asset context is unavailable', () => {
    const registry = createInstrumentImageRegistry(null);

    expect(registry.images.get('img_missing')).toBeUndefined();
    expect(registry.credits.get('img_missing')).toBeUndefined();
  });

  it('maps PNG assets by image_ref and reads manifest credits', () => {
    const registry = createInstrumentImageRegistry(
      createContext({
        './img_s2_plumage_mild.png': 101,
        './manifest.json': {
          img_s2_plumage_mild: {
            file: 'img_s2_plumage_mild.png',
            page: 4,
            credit: 'Photo by Example',
          },
        },
      }),
    );

    expect(registry.images.get('img_s2_plumage_mild')).toBe(101);
    expect(registry.images.get('img_missing')).toBeUndefined();
    expect(registry.credits.get('img_s2_plumage_mild')).toBe('Photo by Example');
  });

  it('tolerates an empty instrument directory', () => {
    const registry = createInstrumentImageRegistry(createContext({}));

    expect(registry.images.size).toBe(0);
    expect(registry.credits.size).toBe(0);
  });

  it('tolerates a missing manifest', () => {
    const registry = createInstrumentImageRegistry(
      createContext({
        './img_s4_puzzles.png': 202,
      }),
    );

    expect(registry.images.get('img_s4_puzzles')).toBe(202);
    expect(registry.credits.get('img_s4_puzzles')).toBeUndefined();
  });
});

function createContext(modules: Record<string, unknown>) {
  const context = ((id: string) => modules[id]) as ((id: string) => unknown) & {
    keys(): string[];
  };

  context.keys = () => Object.keys(modules);

  return context;
}
