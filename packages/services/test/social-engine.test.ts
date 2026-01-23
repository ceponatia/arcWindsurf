import { describe, it } from 'vitest';
import { SocialEngine } from '../src/social/social-engine.js';

describe('SocialEngine', () => {
  it('start/stop are idempotent', () => {
    const service = new SocialEngine();
    service.start();
    service.start();
    service.stop();
    service.stop();
  });
});
