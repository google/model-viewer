import {registerStateMutator, State} from './space_opera_base';

/** Dispatch a state mutator to set model-viewer poster. */
export const dispatchSetPoster =
    registerStateMutator('SET_POSTER', (state: State, poster?: string) => {
      state.config = {...state.config, poster};
    });

/** Dispatch a state mutator to set setPosterTrigger. */
export const dispatchSetPosterTrigger = registerStateMutator(
    'SET_POSTER_TRIGGER', (state: State, trigger?: boolean) => {
      state.setPosterTrigger = !!trigger;
    });

/** Dispatch a state mutator to set displayPoster. */
export const dispatchSetDisplayPoster = registerStateMutator(
    'SET_DISPLAY_POSTER', (state: State, displayPoster?: boolean) => {
      state.displayPoster = !!displayPoster;
    });
