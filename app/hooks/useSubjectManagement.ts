import { useState, Dispatch, SetStateAction } from 'react';
import toast from 'react-hot-toast';
import { ID, Subject, Grade } from '../components/types';
import { fetchJson, usePending } from '../components/hooks';
import { getPrefillFor } from '../libs/prefill';

interface SubjectManagement {
  assignOpen: boolean;
  allSubjects: Subject[];
  assignGradeId: ID;
  selectedSubjectIds: Set<ID>;
  subjectFilter: string;
  removeOpen: boolean;
  removeGradeId: ID;
  removeSubjectFilter: string;
  removeCandidates: Subject[];
  removeSelected: Set<ID>;
  setAssignOpen: Dispatch<SetStateAction<boolean>>;
  setAllSubjects: Dispatch<SetStateAction<Subject[]>>;
  setAssignGradeId: Dispatch<SetStateAction<ID>>;
  setSelectedSubjectIds: Dispatch<SetStateAction<Set<ID>>>;
  setSubjectFilter: Dispatch<SetStateAction<string>>;
  setRemoveOpen: Dispatch<SetStateAction<boolean>>;
  setRemoveGradeId: Dispatch<SetStateAction<ID>>;
  setRemoveSubjectFilter: Dispatch<SetStateAction<string>>;
  setRemoveCandidates: Dispatch<SetStateAction<Subject[]>>;
  setRemoveSelected: Dispatch<SetStateAction<Set<ID>>>;
  openAssignModal: () => Promise<void>;
  openRemoveModal: () => Promise<void>;
  submitAssignSubjects: (formGradeId: ID, setAssignedSubjects: Dispatch<SetStateAction<Subject[]>>, setSubjects: Dispatch<SetStateAction<Subject[]>>, setPlanData: Dispatch<SetStateAction<Record<ID, any>>>) => Promise<void>;
  loadRemoveCandidates: (gradeId: ID) => Promise<void>;
  submitRemoveSubjects: (formGradeId: ID, setAssignedSubjects: Dispatch<SetStateAction<Subject[]>>, setSubjects: Dispatch<SetStateAction<Subject[]>>, setPlanData: Dispatch<SetStateAction<Record<ID, any>>>) => Promise<void>;
}

export function useSubjectManagement(): SubjectManagement {
  const [assignOpen, setAssignOpen] = useState(false);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [assignGradeId, setAssignGradeId] = useState<ID>('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<ID>>(new Set());
  const [subjectFilter, setSubjectFilter] = useState('');
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeGradeId, setRemoveGradeId] = useState<ID>('');
  const [removeSubjectFilter, setRemoveSubjectFilter] = useState('');
  const [removeCandidates, setRemoveCandidates] = useState<Subject[]>([]);
  const [removeSelected, setRemoveSelected] = useState<Set<ID>>(new Set());
  const { track } = usePending();

  const openAssignModal = async () => {
    try {
      const subs = await fetchJson<Subject[]>('/api/subjects');
      setAllSubjects([...subs].sort((a, b) => a.name.localeCompare(b.name)));
      setAssignGradeId('');
      setSelectedSubjectIds(new Set());
      setSubjectFilter('');
      setAssignOpen(true);
    } catch (e) {
      toast.error(String((e as any)?.message || e));
    }
  };

  const openRemoveModal = async () => {
    try {
      setRemoveGradeId('');
      setRemoveSubjectFilter('');
      setRemoveCandidates([]);
      setRemoveSelected(new Set());
      setRemoveOpen(true);
    } catch (e) {
      toast.error(String((e as any)?.message || e));
    }
  };

  const submitAssignSubjects = async (
    formGradeId: ID,
    setAssignedSubjects: Dispatch<SetStateAction<Subject[]>>,
    setSubjects: Dispatch<SetStateAction<Subject[]>>,
    setPlanData: Dispatch<SetStateAction<Record<ID, any>>>
  ) => {
    if (!assignGradeId) {
      toast.error('Please select a grade');
      return;
    }
    if (selectedSubjectIds.size === 0) {
      toast.error('Please select at least one subject');
      return;
    }
    try {
      await toast.promise(
        track(fetchJson('/api/grades/assign-subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gradeId: assignGradeId, subjectIds: Array.from(selectedSubjectIds) }),
        })),
        {
          loading: 'Assigning subjects…',
          success: 'Subjects assigned',
          error: (e) => `Failed to assign: ${String((e as any)?.message || e)}`,
        }
      );
      if (formGradeId === assignGradeId) {
        const subs = await fetchJson<Subject[]>(`/api/grades/${assignGradeId}/subjects`);
        const ordered = [...subs].sort((a, b) => a.name.localeCompare(b.name));
        setAssignedSubjects(ordered);
        setSubjects(ordered);
        setPlanData(prev => {
          const next = { ...prev };
          for (const sub of ordered) if (!next[sub.id]) next[sub.id] = getPrefillFor(sub.name);
          return next;
        });
      }
      setAssignOpen(false);
    } catch {}
  };

  const loadRemoveCandidates = async (gradeId: ID) => {
    if (!gradeId) {
      setRemoveCandidates([]);
      return;
    }
    try {
      const subs = await fetchJson<Subject[]>(`/api/grades/${gradeId}/subjects`);
      setRemoveCandidates([...subs].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      toast.error(String((e as any)?.message || e));
    }
  };

  const submitRemoveSubjects = async (
    formGradeId: ID,
    setAssignedSubjects: Dispatch<SetStateAction<Subject[]>>,
    setSubjects: Dispatch<SetStateAction<Subject[]>>,
    setPlanData: Dispatch<SetStateAction<Record<ID, any>>>
  ) => {
    if (!removeGradeId) {
      toast.error('Please select a grade');
      return;
    }
    if (removeSelected.size === 0) {
      toast.error('Please select at least one subject');
      return;
    }
    try {
      await toast.promise(
        track(fetchJson('/api/grades/remove-subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gradeId: removeGradeId, subjectIds: Array.from(removeSelected) }),
        })),
        {
          loading: 'Removing subjects…',
          success: 'Subjects removed',
          error: (e) => `Failed to remove: ${String((e as any)?.message || e)}`,
        }
      );
      if (formGradeId === removeGradeId) {
        const subs = await fetchJson<Subject[]>(`/api/grades/${removeGradeId}/subjects`);
        const ordered = [...subs].sort((a, b) => a.name.localeCompare(b.name));
        setAssignedSubjects(ordered);
        setSubjects(ordered);
        setPlanData(prev => {
          const next: Record<ID, any> = {};
          for (const s of ordered) next[s.id] = prev[s.id] ?? getPrefillFor(s.name);
          return next;
        });
      }
      setRemoveOpen(false);
    } catch {}
  };

  return {
    assignOpen,
    allSubjects,
    assignGradeId,
    selectedSubjectIds,
    subjectFilter,
    removeOpen,
    removeGradeId,
    removeSubjectFilter,
    removeCandidates,
    removeSelected,
    setAssignOpen,
    setAllSubjects,
    setAssignGradeId,
    setSelectedSubjectIds,
    setSubjectFilter,
    setRemoveOpen,
    setRemoveGradeId,
    setRemoveSubjectFilter,
    setRemoveCandidates,
    setRemoveSelected,
    openAssignModal,
    openRemoveModal,
    submitAssignSubjects,
    loadRemoveCandidates,
    submitRemoveSubjects,
  };
}