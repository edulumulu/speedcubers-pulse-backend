import axios from 'axios';
import { WCA_ID_REGEX } from '../config/constants.js';

const WCA_API_BASE = process.env.WCA_API_BASE_URL || 'https://www.worldcubeassociation.org/api/v0';

/**
 * Validates a WCA ID format before making any network call.
 * Format: 4 digits + 2+ uppercase letters + 2 digits (e.g. 2022LUCA04)
 */
function isValidWcaIdFormat(wcaId) {
  return WCA_ID_REGEX.test(wcaId);
}

/**
 * Fetches public WCA person data.
 * Returns null if not found or invalid.
 * Never throws — errors are caught and return null.
 */
export async function fetchWcaPerson(wcaId) {
  if (!isValidWcaIdFormat(wcaId)) return null;

  try {
    const { data } = await axios.get(`${WCA_API_BASE}/persons/${wcaId}`, {
      timeout: 5000,
    });
    return {
      wcaId: data.person?.wca_id ?? wcaId,
      name: data.person?.name ?? null,
      countryIso2: data.person?.country_iso2 ?? null,
      avatarUrl: data.person?.avatar?.url ?? null,
    };
  } catch {
    return null;
  }
}

// WCA event IDs used in rankings API (e.g. '333', '222', '444')
const WCA_EVENT_MAP = {
  '3x3': '333',
  '2x2': '222',
  '4x4': '444',
  '5x5': '555',
  '6x6': '666',
  '7x7': '777',
  '3x3oh': '333oh',
  'mega': 'minx',
  'pyra': 'pyram',
  'skewb': 'skewb',
  'sq1': 'sq1',
  'clock': 'clock',
};

/**
 * Fetches the WCA official average ranking for a person in a given event.
 * Returns { rank, average } or null if not found.
 */
export async function fetchWcaEventRanking(wcaId, event) {
  if (!isValidWcaIdFormat(wcaId)) return null;

  const wcaEvent = WCA_EVENT_MAP[event] ?? event;

  try {
    const { data } = await axios.get(`${WCA_API_BASE}/persons/${wcaId}`, {
      timeout: 5000,
    });

    const rankings = data.rankings ?? [];
    const eventRanking = rankings.find(
      (r) => r.event_id === wcaEvent && r.type === 'average',
    );

    if (!eventRanking) return null;

    return {
      rank: eventRanking.world_rank ?? null,
      average: eventRanking.best ? eventRanking.best / 100 : null, // centiseconds → seconds
    };
  } catch {
    return null;
  }
}
