import {registerStateMutator, State} from '../../redux/space_opera_base.js';

/** Set auto play enabled or not */
export const dispatchAutoplayEnabled = registerStateMutator(
    'SET_AUTOPLAY_ENABLED', (state: State, enabled?: boolean) => {
      state.config = {...state.config, autoplay: !!enabled};
    });

/** Set animation name */
export const dispatchAnimationName = registerStateMutator(
    'SET_ANIMATION_NAME', (state: State, animationName?: string) => {
      // Allow animationName === undefined to unset animationName
      if (animationName && state.animationNames.indexOf(animationName) === -1) {
        return;
      }

      state.config = {
        ...state.config,
        animationName,
      };
    });

/** Set playAnimation or not */
export const dispatchPlayAnimation = registerStateMutator(
    'PLAY_ANIMATION', (state: State, playAnimation?: boolean) => {
      // No need to copy state - we're always given a new copy.
      state.playAnimation = !!playAnimation;
    });