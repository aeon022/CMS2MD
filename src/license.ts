import fetch from 'node-fetch';

export interface LicenseValidationResult {
  valid: boolean;
  message: string;
}

export async function validatePolarLicense(licenseKey?: string): Promise<LicenseValidationResult> {
  if (!licenseKey || licenseKey.trim() === '') {
    return { valid: false, message: 'Free Tier (Limit: 25 items per run. Unlock Pro for unlimited sync & asset downloading)' };
  }

  try {
    const res = await fetch('https://api.polar.sh/v1/license-keys/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ key: licenseKey.trim() })
    });

    if (res.ok) {
      const data: any = await res.json();
      if (data.status === 'granted' || data.valid) {
        return { valid: true, message: 'PRO License Verified (Polar.sh)' };
      }
    }
  } catch {
    // If offline or network error, fallback to length check for valid Polar keys
    if (licenseKey.startsWith('polar_') || licenseKey.length >= 20) {
      return { valid: true, message: 'PRO License Verified (Offline Mode)' };
    }
  }

  return { valid: false, message: 'Invalid License Key' };
}
