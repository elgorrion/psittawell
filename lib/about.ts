import { psittawelContentPack } from '../content/psittawel';
import type { ContentPack } from '../content/schema';

type InstrumentSource = ContentPack['source'];

export type AboutInstrumentSource = {
  citation: string;
  doi: string;
  doiUrl: string;
  toolUrl: string;
  contentLicence: string;
};

export function getAboutInstrumentSource(
  source: InstrumentSource = psittawelContentPack.source,
): AboutInstrumentSource {
  return {
    citation: source.citation,
    doi: source.doi,
    doiUrl: buildDoiUrl(source.doi),
    toolUrl: source.url,
    contentLicence: source.content_licence,
  };
}

export function buildDoiUrl(doi: string): string {
  return `https://doi.org/${doi.trim()}`;
}
