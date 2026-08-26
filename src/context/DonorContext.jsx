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
import { useAuth } from './AuthContext';

const DonorContext = createContext(null);

async function fetchDonors(token) {
  const url = new URL(API_URL);
  if (token) {
    url.searchParams.set('sessionToken', token);
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

  return rawList.map((row, idx) => normalizeDonor(row, idx));
}

export function DonorProvider({ children }) {
  const { isAuthenticated, authToken } = useAuth();
  const [donors, setDonors] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDonors = useCallback(async (options = {}) => {
    const silent = Boolean(options.silent);
    if (!silent) {
      setStatus('loading');
      setError('');
    }
    try {
      const data = await fetchDonors(authToken);
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
      sessionToken: authToken,
      auth_token: authToken,
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
      sessionToken: authToken,
      auth_token: authToken,
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

  const batchAddOrUpdateDonors = useCallback(async (donorList) => {
    if (!Array.isArray(donorList) || donorList.length === 0) return;

    // Optimistically update local donor state
    setDonors((prev) => {
      const updated = [...prev];
      donorList.forEach((incoming) => {
        const id = incoming.ID || incoming.Donor_ID;
        const norm = normalizeDonor(incoming);
        const incomingContact = String(incoming.Contact || '').replace(/\D/g, '').slice(-10);
        const idx = updated.findIndex(
          (d) =>
            (id && (d.ID === id || d.Donor_ID === id)) ||
            (incomingContact && incomingContact.length === 10 && String(d.Contact || '').replace(/\D/g, '').slice(-10) === incomingContact)
        );
        if (idx !== -1) {
          updated[idx] = { ...updated[idx], ...norm };
        } else {
          updated.unshift(norm);
        }
      });
      return updated;
    });

    // Single fast atomic batch sync to backend
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'batch_upsert_donors',
          sessionToken: authToken,
          auth_token: authToken,
          donors: donorList,
        }),
      });
    } catch (err) {
      console.warn('Batch donor import sync note:', err.message);
    }
  }, [authToken]);

  const deleteDonor = useCallback(async (donorId) => {
    if (!donorId) return;

    // Optimistically remove from local state
    setDonors((prev) => prev.filter((d) => (d.ID || d.Donor_ID) !== donorId));

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'delete_donor',
        sessionToken: authToken,
        auth_token: authToken,
        donorId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned error status ${response.status}`);
    }

    const data = await response.json();
    if (data && (data.status === 'error' || data.success === false)) {
      throw new Error(data.error || 'Failed to delete donor.');
    }
    return data;
  }, [authToken]);

  const bulkDeleteDonors = useCallback(async (donorIds) => {
    if (!Array.isArray(donorIds) || donorIds.length === 0) return;

    const idSet = new Set(donorIds);
    // Optimistically remove all from local state
    setDonors((prev) => prev.filter((d) => !idSet.has(d.ID || d.Donor_ID)));

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'bulk_delete_donors',
        sessionToken: authToken,
        auth_token: authToken,
        donorIds,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned error status ${response.status}`);
    }

    const data = await response.json();
    if (data && (data.status === 'error' || data.success === false)) {
      throw new Error(data.error || 'Failed to bulk delete donors.');
    }
    return data;
  }, [authToken]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDonors();
    }
  }, [isAuthenticated, loadDonors]);

  const value = useMemo(
    () => ({
      donors,
      status,
      error,
      lastUpdated,
      loadDonors,
      addDonor,
      updateDonor,
      deleteDonor,
      bulkDeleteDonors,
      batchAddOrUpdateDonors,
    }),
    [donors, status, error, lastUpdated, loadDonors, addDonor, updateDonor, deleteDonor, bulkDeleteDonors, batchAddOrUpdateDonors]
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
