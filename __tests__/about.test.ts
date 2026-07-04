import { psittawelContentPack } from '../content/psittawel';
import { buildDoiUrl, getAboutInstrumentSource } from '../lib/about';

describe('about metadata', () => {
  it('uses the content-pack source as the attribution source of truth', () => {
    const source = getAboutInstrumentSource();

    expect(source.citation).toBe(psittawelContentPack.source.citation);
    expect(source.doi).toBe(psittawelContentPack.source.doi);
    expect(source.toolUrl).toBe(psittawelContentPack.source.url);
    expect(source.contentLicence).toBe(psittawelContentPack.source.content_licence);
    expect(source.doiUrl).toBe(buildDoiUrl(psittawelContentPack.source.doi));
  });

  it('builds DOI links from the supplied DOI value', () => {
    expect(buildDoiUrl(' 10.1234/example.5678 ')).toBe(
      'https://doi.org/10.1234/example.5678',
    );
  });
});
