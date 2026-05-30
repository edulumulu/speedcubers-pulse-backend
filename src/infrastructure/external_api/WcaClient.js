import axios from 'axios';

const WCA_API_BASE = process.env.WCA_API_BASE_URL || 'https://www.worldcubeassociation.org/api/v0';

/**
 * Validates a WCA ID format before making any network call.
 * Format: 4 digits + 2+ uppercase letters + 2 digits (e.g. 2022LUCA04)
 */
function isValidWcaIdFormat(wcaId) {
  return /^[0-9]{4}[A-Z]{2,}[0-9]{2}$/.test(wcaId);
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
