import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useDonors } from './DonorContext';
import { API_URL } from '../config';
import {
  normalizeEmergencyCase,
  normalizeCamp,
  normalizeVoluntaryDonation,
} from '../utils/operations';

const OperationsContext = createContext(null);

const STORAGE_CASES_KEY = 'rudhirasena_emergency_cases_v2';
const STORAGE_CAMPS_KEY = 'rudhirasena_camps_v2';
const STORAGE_VOL_KEY = 'rudhirasena_voluntary_logs_v2';

// No seed/demo data — Operations start empty until real records are created.

function getNextId(list = [], prefix = 'ITEM') {
  let maxNum = 0;
  if (Array.isArray(list)) {
    list.forEach((item) => {
      const match = new RegExp(`^${prefix}-(\\d+)$`, 'i').exec(String(item?.id || item?.ID || ''));
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
  }
  return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
}

function deduplicateListWithPrefix(list = [], prefix = 'ITEM') {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  let maxNum = 0;

  list.forEach((item) => {
    const match = new RegExp(`^${prefix}-(\\d+)$`, 'i').exec(String(item?.id || item?.ID || ''));
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });

  return list.map((item) => {
    if (!item || typeof item !== 'object') return item;
    let currentId = item.id || item.ID;
    if (!currentId || seen.has(currentId)) {
      maxNum++;
      currentId = `${prefix}-${String(maxNum).padStart(3, '0')}`;
    }
    seen.add(currentId);
    return {
      ...item,
      id: currentId,
    };
  });
}

export function OperationsProvider({ children }) {
  const { authToken } = useAuth();
  const { donors, updateDonor } = useDonors();

  const [cases, setCases] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_CASES_KEY);
      return cached ? deduplicateListWithPrefix(JSON.parse(cached), 'CASE') : [];
    } catch {
      return [];
    }
  });

  const [camps, setCamps] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_CAMPS_KEY);
      return cached ? deduplicateListWithPrefix(JSON.parse(cached), 'CAMP') : [];
    } catch {
      return [];
    }
  });

  const [voluntaryLogs, setVoluntaryLogs] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_VOL_KEY);
      return cached ? deduplicateListWithPrefix(JSON.parse(cached), 'VOL') : [];
    } catch {
      return [];
    }
  });

  // Keep local storage in sync
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CASES_KEY, JSON.stringify(cases));
    } catch {}
  }, [cases]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CAMPS_KEY, JSON.stringify(camps));
    } catch {}
  }, [camps]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_VOL_KEY, JSON.stringify(voluntaryLogs));
    } catch {}
  }, [voluntaryLogs]);

  // Sync with backend API when online
  const sendBackendSync = useCallback(async (action, payload) => {
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action,
          sessionToken: authToken,
          auth_token: authToken,
          ...payload,
        }),
      });
    } catch (err) {
      console.warn(`Operations backend sync note (${action}):`, err.message);
    }
  }, [authToken]);

  /**
   * Create an Emergency Case
   */
  const addEmergencyCase = useCallback(async (caseData) => {
    let createdCase = null;
    setCases((prev) => {
      const targetId = caseData.id && !prev.some((c) => c.id === caseData.id)
        ? caseData.id
        : getNextId(prev, 'CASE');
      createdCase = normalizeEmergencyCase({
        ...caseData,
        id: targetId,
        createdAt: new Date().toISOString(),
      });
      return [createdCase, ...prev];
    });

    if (createdCase) {
      await sendBackendSync('create_case', createdCase);
    }
    return createdCase;
  }, [sendBackendSync]);

  /**
   * Update an Emergency Case
   */
  const updateEmergencyCase = useCallback(async (caseId, updates) => {
    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, ...updates } : c))
    );
    await sendBackendSync('update_case', { id: caseId, ...updates });
  }, [sendBackendSync]);

  /**
   * Assign or Reassign a Donor to an Emergency Case (strictly from database)
   */
  const assignDonorToCase = useCallback(async (caseId, donor, markStatus = 'In Progress') => {
    if (!donor) return;
    const donorId = donor.ID || donor.Donor_ID;
    const donorName = donor.Name || donor.Full_Name;

    // Update case record
    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              assignedDonorId: donorId,
              assignedDonorName: donorName,
              status: markStatus,
            }
          : c
      )
    );

    // If marked fulfilled, update donor's Last Donated Date & Venue
    if (markStatus === 'Fulfilled') {
      const todayStr = new Date().toISOString().slice(0, 10);
      const targetCase = cases.find((c) => c.id === caseId);
      const hospitalVenue = targetCase ? targetCase.hospital : 'Emergency Donation';

      try {
        await updateDonor(donorId, {
          'Last Donated Date': todayStr,
          Last_Donated_Date: todayStr,
          'Last Donation Venue': hospitalVenue,
          Last_Donation_Venue: hospitalVenue,
          'Last Donation Type': 'Whole Blood',
          Last_Donation_Type: 'Whole Blood',
        });
      } catch (err) {
        console.warn('Could not auto-update donor cooling cycle:', err.message);
      }
    }

    await sendBackendSync('assign_case_donor', {
      caseId,
      assignedDonorId: donorId,
      assignedDonorName: donorName,
      status: markStatus,
    });
  }, [cases, updateDonor, sendBackendSync]);

  /**
   * Log a Voluntary Blood Donation
   */
  const addVoluntaryDonation = useCallback(async (donationData) => {
    let createdLog = null;
    setVoluntaryLogs((prev) => {
      const targetId = donationData.id && !prev.some((l) => l.id === donationData.id)
        ? donationData.id
        : getNextId(prev, 'VOL');
      createdLog = normalizeVoluntaryDonation({
        ...donationData,
        id: targetId,
      });
      return [createdLog, ...prev];
    });

    // Auto-update donor's Last Donated Date and Venue in the main database
    if (createdLog && createdLog.donorId) {
      try {
        await updateDonor(createdLog.donorId, {
          'Last Donated Date': createdLog.donationDate,
          Last_Donated_Date: createdLog.donationDate,
          'Last Donation Venue': createdLog.venue,
          Last_Donation_Venue: createdLog.venue,
          'Last Donation Type': createdLog.donationType,
          Last_Donation_Type: createdLog.donationType,
          'Certificate URL': createdLog.certificateUrl || '',
          Certificate_URL: createdLog.certificateUrl || '',
        });
      } catch (err) {
        console.warn('Could not update donor for voluntary log:', err.message);
      }
    }

    if (createdLog) {
      await sendBackendSync('log_donation', createdLog);
    }
    return createdLog;
  }, [updateDonor, sendBackendSync]);

  /**
   * Create a Blood Donation Camp
   */
  const addCamp = useCallback(async (campData) => {
    let createdCamp = null;
    setCamps((prev) => {
      const targetId = campData.id && !prev.some((c) => c.id === campData.id)
        ? campData.id
        : getNextId(prev, 'CAMP');
      createdCamp = normalizeCamp({
        ...campData,
        id: targetId,
      });
      return [createdCamp, ...prev];
    });

    if (createdCamp) {
      await sendBackendSync('create_camp', createdCamp);
    }
    return createdCamp;
  }, [sendBackendSync]);

  /**
   * Create Multiple Blood Donation Camps in One Batch (e.g. from Auto-Organize)
   */
  const addMultipleCamps = useCallback(async (campsList) => {
    if (!Array.isArray(campsList) || campsList.length === 0) return [];
    const created = [];
    setCamps((prev) => {
      let currentList = [...prev];
      campsList.forEach((campData) => {
        const targetId = campData.id && !currentList.some((c) => c.id === campData.id)
          ? campData.id
          : getNextId(currentList, 'CAMP');
        const norm = normalizeCamp({
          ...campData,
          id: targetId,
        });
        created.push(norm);
        currentList = [norm, ...currentList];
      });
      return currentList;
    });

    for (const c of created) {
      await sendBackendSync('create_camp', c);
    }
    return created;
  }, [sendBackendSync]);

  /**
   * Update a Camp
   */
  const updateCamp = useCallback(async (campId, updates) => {
    setCamps((prev) =>
      prev.map((c) => (c.id === campId ? { ...c, ...updates } : c))
    );
    await sendBackendSync('update_camp', { id: campId, ...updates });
  }, [sendBackendSync]);

  /**
   * Add a Registered Donor to a Camp Roster
   */
  const addDonorToCampRoster = useCallback(async (campId, donor) => {
    if (!donor) return;
    const donorId = donor.ID || donor.Donor_ID;

    setCamps((prev) =>
      prev.map((camp) => {
        if (camp.id !== campId) return camp;
        if (camp.donorIds.includes(donorId)) return camp;
        return {
          ...camp,
          donorIds: [...camp.donorIds, donorId],
          collectedUnits: (Number(camp.collectedUnits) || 0) + 1,
        };
      })
    );

    // Auto-update donor's Last Donated Date & Venue
    const targetCamp = camps.find((c) => c.id === campId);
    if (targetCamp) {
      try {
        await updateDonor(donorId, {
          'Last Donated Date': targetCamp.date,
          Last_Donated_Date: targetCamp.date,
          'Last Donation Venue': `${targetCamp.name} (${targetCamp.venue})`,
          Last_Donation_Venue: `${targetCamp.name} (${targetCamp.venue})`,
          'Last Donation Type': 'Whole Blood',
          Last_Donation_Type: 'Whole Blood',
        });
      } catch (err) {}
    }

    await sendBackendSync('add_to_camp_roster', { campId, donorId });
  }, [camps, updateDonor, sendBackendSync]);

  /**
   * Update a Voluntary Blood Donation Log
   */
  const updateVoluntaryDonation = useCallback(async (donationId, updates) => {
    setVoluntaryLogs((prev) =>
      prev.map((log) => (log.id === donationId ? { ...log, ...updates } : log))
    );
    await sendBackendSync('update_donation', { id: donationId, ...updates });
  }, [sendBackendSync]);

  /**
   * Delete an Emergency Case
   */
  const deleteEmergencyCase = useCallback(async (caseId) => {
    setCases((prev) => prev.filter((c) => c.id !== caseId));
    await sendBackendSync('delete_record', { id: caseId, recordType: 'Emergency_Case' });
  }, [sendBackendSync]);

  /**
   * Delete a Voluntary Donation Log
   */
  const deleteVoluntaryDonation = useCallback(async (donationId) => {
    setVoluntaryLogs((prev) => prev.filter((l) => l.id !== donationId));
    await sendBackendSync('delete_record', { id: donationId, recordType: 'Voluntary_Donation' });
  }, [sendBackendSync]);

  /**
   * Delete a Camp
   */
  const deleteCamp = useCallback(async (campId) => {
    setCamps((prev) => prev.filter((c) => c.id !== campId));
    await sendBackendSync('delete_record', { id: campId, recordType: 'Camp' });
  }, [sendBackendSync]);

  /**
   * Remove a Donor from Camp Roster
   */
  const removeDonorFromCampRoster = useCallback(async (campId, donorId) => {
    setCamps((prev) =>
      prev.map((camp) => {
        if (camp.id !== campId) return camp;
        return {
          ...camp,
          donorIds: camp.donorIds.filter((id) => id !== donorId),
          collectedUnits: Math.max(0, (Number(camp.collectedUnits) || 1) - 1),
        };
      })
    );
    await sendBackendSync('remove_from_camp_roster', { campId, donorId });
  }, [sendBackendSync]);

  /**
   * Add Multiple Donors to a Camp Roster (Bulk / Excel import)
   */
  const addMultipleDonorsToCampRoster = useCallback(async (campId, donorIdsList) => {
    if (!Array.isArray(donorIdsList) || donorIdsList.length === 0) return;

    setCamps((prev) =>
      prev.map((camp) => {
        if (camp.id !== campId) return camp;
        const combined = Array.from(new Set([...camp.donorIds, ...donorIdsList]));
        return {
          ...camp,
          donorIds: combined,
          collectedUnits: combined.length,
        };
      })
    );

    await sendBackendSync('add_multiple_to_camp_roster', { campId, donorIds: donorIdsList });
  }, [sendBackendSync]);

  const value = {
    cases,
    camps,
    voluntaryLogs,
    addEmergencyCase,
    updateEmergencyCase,
    deleteEmergencyCase,
    assignDonorToCase,
    addVoluntaryDonation,
    updateVoluntaryDonation,
    deleteVoluntaryDonation,
    addCamp,
    addMultipleCamps,
    updateCamp,
    deleteCamp,
    addDonorToCampRoster,
    addMultipleDonorsToCampRoster,
    removeDonorFromCampRoster,
  };

  return (
    <OperationsContext.Provider value={value}>
      {children}
    </OperationsContext.Provider>
  );
}

export function useOperations() {
  const context = useContext(OperationsContext);
  if (!context) {
    throw new Error('useOperations must be used within an OperationsProvider');
  }
  return context;
}
