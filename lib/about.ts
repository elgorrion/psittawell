import { psittawelContentPack } from '../content/psittawel';
import type { ContentPack } from '../content/schema';

type InstrumentSource = ContentPack['source'];

export type AboutInstrumentSource = {
  citation: string;
  doi: string;
  doiUrl: string;
  toolUrl: string;
  contentLicence: string;
  usageNotice: string;
};

export const sourceCodeUrl = 'https://github.com/elgorrion/psittawell';

export const aboutAppCredits = [
  {
    id: 'mariiaKarmanova',
    name: 'Mariia Karmanova',
    roleKey: 'about.app.credits.mariiaKarmanova.role',
  },
  {
    id: 'nikolaiVorobev',
    name: 'Nikolai "ElGorrion" Vorobev',
    roleKey: 'about.app.credits.nikolaiVorobev.role',
  },
] as const;

export function getAboutInstrumentSource(
  source: InstrumentSource = psittawelContentPack.source,
): AboutInstrumentSource {
  return {
    citation: source.citation,
    doi: source.doi,
    doiUrl: buildDoiUrl(source.doi),
    toolUrl: source.url,
    contentLicence: source.content_licence,
    usageNotice: source.usage_notice,
  };
}

export function buildDoiUrl(doi: string): string {
  return `https://doi.org/${doi.trim()}`;
}
