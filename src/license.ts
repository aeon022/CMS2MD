import fetch from 'node-fetch';

export interface LicenseValidationResult {
  valid: boolean;
  message: string;
}

// aeon022's Polar.sh organization (public: customers need it to validate keys, no secret involved).
const POLAR_ORG_ID = 'aa792ea4-650e-492e-a955-9b3d564e943e';
const POLAR_VALIDATE_URL = 'https://api.polar.sh/v1/customer-portal/license-keys/validate';
// Benefit IDs that unlock this tool. Empty = any granted key of the organization (Bundle, Family, ...)
// until a dedicated product exists; then list its benefit ID here.
const ALLOWED_BENEFIT_IDS: string[] = [];

export async function validatePolarLicense(licenseKey?: string): Promise<LicenseValidationResult> {
  const key = (licenseKey || process.env.POLAR_LICENSE_KEY || '').trim();
  if (key === '') {
    return { valid: false, message: 'Free Tier (limit: 25 items per run; a Pro license raises it)' };
  }

  try {
    const res = await fetch(POLAR_VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, organization_id: POLAR_ORG_ID }),
      timeout: 10000
    });
    if (res.status >= 500) {
      return { valid: false, message: 'Polar is unavailable right now. Try again later; your key was not rejected.' };
    }
    const data: any = await res.json().catch(() => ({}));
    if (res.ok && data.status === 'granted') {
      if (ALLOWED_BENEFIT_IDS.length === 0 || ALLOWED_BENEFIT_IDS.includes(data.benefit_id)) {
        return { valid: true, message: 'PRO License Verified (Polar.sh)' };
      }
      return { valid: false, message: 'This license key does not include CMS2MD Pro.' };
    }
    return { valid: false, message: 'Invalid License Key' };
  } catch {
    return { valid: false, message: 'Could not reach Polar. Check your connection.' };
  }
}
