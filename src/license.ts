import fetch from 'node-fetch';

export interface LicenseValidationResult {
  valid: boolean;
  message: string;
}

export async function validatePolarLicense(licenseKey?: string): Promise<LicenseValidationResult> {
  if (!licenseKey || licenseKey.trim() === '') {
    return { valid: false, message: 'Free Tier (limit: 25 items per run; a Pro license raises it)' };
  }

  const cleanKey = licenseKey.trim();

  try {
    // The old code called Polar's /v1/license-keys/validate directly, which
    // requires an organization auth token and always returns 401 from a
    // client with none — meaning this call never actually succeeded, and
    // every "PRO" grant went through the (now removed) any-key-shaped
    // fallback below. Route through the shared verify backend instead,
    // which calls Polar's unauthenticated customer-portal validate
    // endpoint server-side.
    const res = await fetch('https://api.abteilung83.at/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ key: cleanKey })
    });

    if (res.status >= 500) {
      return { valid: false, message: 'License server unavailable right now. Try again later; your key was not rejected.' };
    }
    const data: any = await res.json().catch(() => ({}));
    if (res.ok && data.valid) {
      return { valid: true, message: 'PRO License Verified (Polar.sh)' };
    }
    return { valid: false, message: 'Invalid License Key' };
  } catch {
    return { valid: false, message: 'Could not reach license server. Check your connection.' };
  }
}
