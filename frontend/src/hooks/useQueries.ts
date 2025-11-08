import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { Principal } from '@icp-sdk/core/principal';
import type { Pattern } from '../backend';

export function usePatternQueries() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const loadPatternQuery = useQuery<Pattern>({
    queryKey: ['pattern', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) {
        return Array(4).fill(null).map(() => Array(16).fill(false));
      }
      const pattern = await actor.getPattern(identity.getPrincipal(), 'default');
      return pattern || Array(4).fill(null).map(() => Array(16).fill(false));
    },
    enabled: !!actor && !isFetching && !!identity,
  });

  const loadTempoQuery = useQuery<bigint>({
    queryKey: ['tempo', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return BigInt(120);
      return actor.getTempo(identity.getPrincipal());
    },
    enabled: !!actor && !isFetching && !!identity,
  });

  const savePatternMutation = useMutation({
    mutationFn: async ({
      user,
      patternName,
      pattern,
    }: {
      user: Principal;
      patternName: string;
      pattern: Pattern;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      await actor.savePattern(user, patternName, pattern);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pattern'] });
    },
  });

  const saveTempoMutation = useMutation({
    mutationFn: async ({ user, tempo }: { user: Principal; tempo: bigint }) => {
      if (!actor) throw new Error('Actor not initialized');
      await actor.setTempo(user, tempo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tempo'] });
    },
  });

  return {
    loadPatternQuery,
    loadTempoQuery,
    savePatternMutation,
    saveTempoMutation,
  };
}
