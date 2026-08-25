import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useDonors } from './DonorContext';
import { API_URL, ADMIN_PASSCODE } from '../config';
import {
  normalizeEmergencyCase,
  normalizeCamp,
  normalizeVoluntaryDonation,
} from '../utils/operations';

const OperationsContext = createContext(null);

const STORAGE_CASES_KEY = 'rudhirasena_emergency_cases_v1';
const STORAGE_CAMPS_KEY = 'rudhirasena_camps_v1';
const STORAGE_VOL_KEY = 'rudhirasena_voluntary_logs_v1';

// Seed demonstration operational records if sheet is fresh
const SEED_CASES = [
  {
    id: 'CASE-001',
    patientName: 'Karthik Narayanan',
    hospital: 'Regional Cancer Centre (RCC), Trivandrum',
    bloodGroup: 'O+',
    unitsNeeded: 2,
    urgency: 'Critical',
    status: 'In Progress',
    requiredDate: new Date().toISOString().slice(0, 10),
    contactPerson: '+91 94471 23456 (Dr. Mathew)',
    notes: 'Platelet requirement for leukemia chemotherapy. Immediate requirement.',
    assignedDonorId: 'RUD-002',
    assignedDonorName: 'Niranjan S S',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'CASE-002',
    patientName: 'Ananya S',
    hospital: 'Govt. Medical College, Trivandrum',
    bloodGroup: 'B-',
    unitsNeeded: 1,
    urgency: 'Urgent',
    status: 'Open',
    requiredDate: new Date().toISOString().slice(0, 10),
    contactPerson: '+91 98460 98765',
    notes: 'Emergency bypass surgery requirement. Negative group required.',
    assignedDonorId: '',
    assignedDonorName: '',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'CASE-003',
    patientName: 'Suresh Kumar',
    hospital: 'KIMS Health, Trivandrum',
    bloodGroup: 'A+',
    unitsNeeded: 2,
    urgency: 'Standard',
    status: 'Fulfilled',
    requiredDate: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
    contactPerson: '+91 97450 11223',
    notes: 'Orthopedic procedure requirement. Completed successfully.',
    assignedDonorId: 'RUD-001',
    assignedDonorName: 'Arjun Menon',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

const SEED_CAMPS = [
  {
    id: 'CAMP-001',
    name: 'MBCET Annual NSS Mega Blood Drive 2026',
    date: new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10),
    venue: 'MBCET College Auditorium, Pezhakkappilly',
    partnerBloodBank: 'Govt. Medical College Blood Bank, TVM',
    targetUnits: 100,
    collectedUnits: 0,
    status: 'Upcoming',
    notes: 'Annual campus donation drive organized by NSS Unit 232 & Rudhirasena.',
    donorIds: ['RUD-001', 'RUD-002'],
  },
  {
    id: 'CAMP-002',
    name: 'World Blood Donor Day Special Camp',
    date: new Date(Date.now() - 86400000 * 45).toISOString().slice(0, 10),
    venue: 'Seminar Hall 1, Admin Block',
    partnerBloodBank: 'SCTIMST Blood Bank',
    targetUnits: 60,
    collectedUnits: 54,
    status: 'Completed',
    notes: '54 units collected for pediatric cardiac surgeries.',
    donorIds: ['RUD-001'],
  },
];

const SEED_VOL_LOGS = [
  {
    id: 'VOL-001',
    donorId: 'RUD-002',
    donorName: 'Niranjan S S',
    bloodGroup: 'O+',
    donationDate: '2026-03-31',
    venue: 'Regional Cancer Centre (RCC)',
    donationType: 'Whole Blood',
    units: 1,
    certificateUrl: '',
    notes: 'Voluntary walk-in donation for emergency ward.',
  },
];

export function OperationsProvider({ children }) {
  const { authToken } = useAuth();
  const { donors, updateDonor } = useDonors();

  const [cases, setCases] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_CASES_KEY);
      return cached ? JSON.parse(cached) : SEED_CASES;
    } catch {
      return SEED_CASES;
    }
  });

  const [camps, setCamps] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_CAMPS_KEY);
      return cached ? JSON.parse(cached) : SEED_CAMPS;
    } catch {
      return SEED_CAMPS;
    }
  });

  const [voluntaryLogs, setVoluntaryLogs] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_VOL_KEY);
      return cached ? JSON.parse(cached) : SEED_VOL_LOGS;
    } catch {
      return SEED_VOL_LOGS;
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
          auth_token: authToken || ADMIN_PASSCODE,
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
    const newCase = normalizeEmergencyCase({
      ...caseData,
      id: `CASE-${String(cases.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
    });

    setCases((prev) => [newCase, ...prev]);
    await sendBackendSync('create_case', newCase);
    return newCase;
  }, [cases.length, sendBackendSync]);

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
    const newLog = normalizeVoluntaryDonation({
      ...donationData,
      id: `VOL-${String(voluntaryLogs.length + 1).padStart(3, '0')}`,
    });

    setVoluntaryLogs((prev) => [newLog, ...prev]);

    // Auto-update donor's Last Donated Date and Venue in the main database
    if (newLog.donorId) {
      try {
        await updateDonor(newLog.donorId, {
          'Last Donated Date': newLog.donationDate,
          Last_Donated_Date: newLog.donationDate,
          'Last Donation Venue': newLog.venue,
          Last_Donation_Venue: newLog.venue,
          'Last Donation Type': newLog.donationType,
          Last_Donation_Type: newLog.donationType,
          'Certificate URL': newLog.certificateUrl || '',
          Certificate_URL: newLog.certificateUrl || '',
        });
      } catch (err) {
        console.warn('Could not update donor for voluntary log:', err.message);
      }
    }

    await sendBackendSync('log_donation', newLog);
    return newLog;
  }, [voluntaryLogs.length, updateDonor, sendBackendSync]);

  /**
   * Create a Blood Donation Camp
   */
  const addCamp = useCallback(async (campData) => {
    const newCamp = normalizeCamp({
      ...campData,
      id: `CAMP-${String(camps.length + 1).padStart(3, '0')}`,
    });

    setCamps((prev) => [newCamp, ...prev]);
    await sendBackendSync('create_camp', newCamp);
    return newCamp;
  }, [camps.length, sendBackendSync]);

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
