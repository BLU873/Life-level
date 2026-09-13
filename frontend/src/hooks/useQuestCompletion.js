import { useState, useCallback } from 'react';
import api from '../services/api';
import { playCelebrationSound } from '../utils/sound';

export function useQuestCompletion({ onComplete } = {}) {
  const [completingId, setCompletingId] = useState(null);
  const [result, setResult] = useState(null);

  const completeQuest = useCallback(
    async (quest) => {
      setCompletingId(quest.id);
      try {
        const res = await api.post(`/quests/${quest.id}/complete`);
        const data = res.data.data;
        setResult(data);
        playCelebrationSound(data);
        if (onComplete) onComplete(data);
        return data;
      } finally {
        setCompletingId(null);
      }
    },
    [onComplete]
  );

  const clearResult = useCallback(() => setResult(null), []);

  return { completingId, result, completeQuest, clearResult };
}