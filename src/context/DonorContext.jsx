import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ADMIN_PASSCODE, API_URL } from '../config';
import { normalizeDonor } from '../utils/donor';
import { useAuth } from './AuthContext';

const DonorContext = createContext(null);

async function fetchDonors(token) {
  const url = new URL(API_URL);
  if (token) {
    url.searchParams.set('key', token);
    url.searchParams.set('client_id', 'nss_web_app');
  }

  const response = await fetch(url.toString());
  if (response.status === 429) {
    throw new Error('Rate limit reached: Too many requests. Please wait a minute.');
  }
  if (!response.ok) {
    throw new Error(`API error (${response.status}): Could not retrieve donor data.`);
  }

  const json = await response.json();

  let rawList = [];
  if (Array.isArray(json)) {
    rawList = json;
  } else if (json && Array.isArray(json.data)) {
    rawList = json.data;
  } else if (json && json.status === 'error') {
    throw new Error(json.error || 'Failed to fetch donor records from Google Sheets.');
  } else {
    throw new Error('Unexpected API response format.');
  }

  return rawList.map((donor, idx) => normalizeDonor(donor, idx));
}

export function DonorProvider({ children }) {
  const { authToken, isAuthenticated } = useAuth();
  const [donors, setDonors] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDonors = useCallback(async (options = {}) => {
    const silent = Boolean(options.silent);
    if (!silent) {
      setStatus('loading');
      setError('');
    }
    try {
      const data = await fetchDonors(authToken || ADMIN_PASSCODE);
      setDonors(data);
      setLastUpdated(new Date());
      setStatus('success');
    } catch (err) {
      setError(err.message || 'Unable to reach the donor API.');
      if (!silent) {
        setStatus('error');
      }
    }
  }, [authToken]);

  const addDonor = useCallback(async (payload) => {
    const fullPayload = {
      action: 'register',
      auth_token: authToken || ADMIN_PASSCODE,
      ...payload,
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(fullPayload),
    });

    if (response.status === 429) {
      throw new Error('Rate limit reached: Too many donor registrations. Please wait a minute.');
    }

    if (!response.ok) {
      throw new Error(`Server returned error status ${response.status}`);
    }

    const data = await response.json();
    if (!data || data.success === false || data.status === 'error') {
      throw new Error((data && data.error) || 'Registration failed.');
    }
    return data;
  }, [authToken]);

  const updateDonor = useCallback(async (donorId, payload) => {
    const fullPayload = {
      action: 'update',
      auth_token: authToken || ADMIN_PASSCODE,
      ID: donorId,
      Donor_ID: donorId,
      ...payload,
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(fullPayload),
    });

    if (response.status === 429) {
      throw new Error('Rate limit reached: Too many update requests. Please wait a minute.');
    }

    if (!response.ok) {
      throw new Error(`Server returned error status ${response.status}`);
    }

    const data = await response.json();
    if (data && (data.status === 'error' || data.success === false)) {
      throw new Error(data.error || 'Failed to update donor details.');
    }

    // Optimistically update local donor state
    const normalized = normalizeDonor({
      ID: donorId,
      Donor_ID: donorId,
      ...payload,
      'Next Eligible Date': data.nextEligibleDate || payload['Next Eligible Date'] || 'Eligible',
    });

    setDonors((prev) =>
      prev.map((d) => (d.ID === donorId || d.Donor_ID === donorId ? { ...d, ...normalized } : d))
    );

    return data;
  }, [authToken]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDonors();
    }
  }, [isAuthenticated, loadDonors]);

  const value = useMemo(
    () => ({ donors, status, error, lastUpdated, loadDonors, addDonor, updateDonor }),
    [donors, status, error, lastUpdated, loadDonors, addDonor, updateDonor]
  );

  return <DonorContext.Provider value={value}>{children}</DonorContext.Provider>;
}

export function useDonors() {
  const context = useContext(DonorContext);
  if (!context) {
    throw new Error('useDonors must be used within DonorProvider');
  }
  return context;
}
