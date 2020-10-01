import {registerStateMutator, State} from './space_opera_base';

/** Dispatch a state mutator to set model-viewer poster. */
export const dispatchSetPoster =
    registerStateMutator('SET_POSTER', (state: State, poster?: string) => {
      state.config = {...state.config, poster};
    });

/** Dispatch a state mutator to set setPosterTrigger. */
export const dispatchSetReveal =
    registerStateMutator('SET_REVEAL', (state: State, reveal?: string) => {
      state.config = {...state.config, reveal};
    });
