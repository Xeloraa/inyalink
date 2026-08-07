import type { WorkLinkPlatform } from '@inyalink/shared';
import { AppError } from '../middleware/errors.js';

const RESOLVE_TIMEOUT_MS = 8_000;

/** Host patterns for named platforms. `website` and `other` accept any http(s) host. */
const PLATFORM_HOSTS: Partial<Record<WorkLinkPlatform, RegExp>> = {
  github: /(^|\.)github\.com$/i,
  behance: /(^|\.)behance\.net$/i,
  dribbble: /(^|\.)dribbble\.com$/i,
  instagram: /(^|\.)instagram\.com$/i,
  facebook: /(^|\.)(facebook\.com|fb\.com|fb\.me)$/i,
  linkedin: /(^|\.)linkedin\.com$/i,
};

export function assertPlatformUrl(
  platform: WorkLinkPlatform,
  url: string,
): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError(400, 'INVALID_URL', 'Invalid URL');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new AppError(400, 'INVALID_URL', 'URL must be http or https');
  }
  const pattern = PLATFORM_HOSTS[platform];
  if (pattern && !pattern.test(parsed.hostname)) {
    throw new AppError(
      400,
      'PLATFORM_HOST_MISMATCH',
      `URL host does not match ${platform}`,
    );
  }
}

/**
 * Confirm the URL resolves over the network. Any HTTP response counts
 * (including 401/403/999 from platforms that block bots) — we only fail on
 * DNS/network/timeout. Never scrapes or stores remote content.
 */
export async function assertUrlResolves(url: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESOLVE_TIMEOUT_MS);
  const headers = {
    'User-Agent': 'InyaLink-LinkCheck/1.0',
    Accept: '*/*',
  };

  try {
    let response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers,
    });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers,
      });
    }
    // Got headers back — URL resolves. Do not read the body.
    void response;
  } catch {
    throw new AppError(
      400,
      'URL_UNREACHABLE',
      'Could not reach that URL. Check the link and try again.',
    );
  } finally {
    clearTimeout(timer);
  }
}
