import {registerStateMutator, State} from '../../redux/space_opera_base';

/** Dispatch a state mutator to set model-viewer poster. */
const SET_POSTER = 'SET_POSTER';
export const dispatchSetPoster =
    registerStateMutator(SET_POSTER, (state: State, poster?: string) => {
      state.config = {...state.config, poster};
    });

/** Dispatch a state mutator to set setPosterTrigger. */
const SET_REVEAL = 'SET_REVEAL';
export const dispatchSetReveal =
    registerStateMutator(SET_REVEAL, (state: State, reveal?: string) => {
      state.config = {...state.config, reveal};
    });
