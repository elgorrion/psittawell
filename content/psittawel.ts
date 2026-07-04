import psittawelV1 from './psittawel.v1.json';
import { type ContentPack, validateContentPack } from './schema';

export const psittawelContentPack = psittawelV1 as ContentPack;

validateContentPack(psittawelContentPack);
