import {reduxStore} from '../../space_opera_base.js';

/** Mostly for unit tests. */
export const RESET_STATE_ACTION_TYPE = 'RESET_SPACE_OPERA_STATE';
export function dispatchResetState() {
  reduxStore.dispatch({type: RESET_STATE_ACTION_TYPE});
}