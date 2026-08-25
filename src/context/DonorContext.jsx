import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { API_URL } from '../config';
import { normalizeDonor } from '../utils/donor';

const DonorContext = createContext(null);

async function fetchDonors() {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`API responded with status ${response.status}`);
  }
  const json = await response.json();

  let rawList = [];
  // Handle both direct array format and { data: [...] } / { status: 'success', data: [...] } format
  if (Array.isArray(json)) {
    rawList = json;
  } else if (json && Array.isArray(json.data)) {
    rawList = json.data;
  } else if (json && json.status === 'error') {
    throw new Error(json.error || 'Failed to fetch donor records from Google Sheets.');
  } else {
    throw new Error('Unexpected API response format: received ' + JSON.stringify(json));
  }

  // Normalize all incoming records to canonical format
  return rawList.map((donor, idx) => normalizeDonor(donor, idx));
}

export function DonorProvider({ children }) {
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
      const data = await fetchDonors();
      setDonors(data);
      setLastUpdated(new Date());
      setStatus('success');
    } catch (err) {
      setError(err.message || 'Unable to reach the donor API.');
      if (!silent) {
        setStatus('error');
      }
    }
  }, []);

  const addDonor = useCallback(async (payload) => {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }
    const data = await response.json();
    if (!data || data.success === false || data.status === 'error') {
      throw new Error((data && data.error) || 'Registration failed.');
    }
    return data;
  }, []);

  const updateDonor = useCallback(async (donorId, payload) => {
    const fullPayload = {
      action: 'update',
      ID: donorId,
      Donor_ID: donorId,
      ...payload,
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(fullPayload),
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
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
  }, []);

  useEffect(() => {
    loadDonors();
  }, [loadDonors]);

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
