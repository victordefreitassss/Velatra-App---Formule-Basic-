import { runTransaction } from 'firebase/firestore';
import { db, doc } from '../firebase';
import type { Task } from '../types';

/** Never replace a completed task or let concurrent dashboards create duplicates. */
export const createAutomaticTaskOnce = async (task: Task) => {
  const ref = doc(db, 'tasks', task.id);
  await runTransaction(db, async transaction => {
    if (!(await transaction.get(ref)).exists()) transaction.set(ref, task);
  });
};
