import 'core-js';
import 'zone.js/dist/zone-node';
import * as lodash from 'lodash';
import { Observable, Subject, BehaviorSubject } from 'rxjs/Rx';
declare const Zone: any;


///////////////////////////////// Action
class IncrementAction {
  constructor(public num: number) { }
}

class OtherAction {
  constructor() { }
}

type Action = IncrementAction | OtherAction;


///////////////////////////////// State
interface IncrementState {
  counter: number;
}

interface OtherState {
  foo: string;
  bar: number;
}

interface AppState {
  increment: IncrementState;
  other?: OtherState;
}


const initialState: AppState = {
  increment: {
    counter: 0
  }
};


///////////////////////////////// Redux
Zone.current.fork({ name: 'myZone' }).runGuarded(() => {

  console.log('zone name:', Zone.current.name); /* OUTPUT> zone name: myZone */

  const dispatcher$ = new Subject<Action | Promise<Action>>(); // Dispatcher
  const provider$ = new BehaviorSubject<AppState>(initialState); // Provider


  const dispatcherQueue$ = // Queue
    dispatcher$
      .concatMap(action => { // async actions are resolved here.
        if (action instanceof Promise || action instanceof Observable) {
          return Observable.from(action);
        } else {
          return Observable.of(action);
        }
      })
      .share();


  Observable // ReducerContainer
    .zip<AppState>(...[
      dispatcherQueue$.scan<IncrementState>((state, action) => { // Reducer
        if (action instanceof IncrementAction) {
          return { counter: state.counter + action.num };
        } else {
          return state;
        }
      }, initialState.increment),
      (increment): AppState => { // projection
        return Object.assign<{}, AppState, {}>({}, initialState, { increment }); // always create new state object!
      }
    ])
    .subscribe(newState => {
      provider$.next(newState);
    });


  provider$
    .map(appState => appState.increment)
    .distinctUntilChanged((oldValue, newValue) => lodash.isEqual(oldValue, newValue)) // restrict same values to pass through.
    .subscribe(state => {
      console.log('counter:', state.counter); /* (First time) OUTPUT> counter: 0 */
    });


  /* 
    OUTPUT: 0 -> 1 -> 2 -> 4 -> 3 
    outputs are not determined by async resolution order but by action dispatched order.
  */
  dispatcher$.next(promiseAction(new IncrementAction(1), 100));  /* OUTPUT> counter: 1 */
  dispatcher$.next(new IncrementAction(1));  /* OUTPUT> counter: 2 */
  dispatcher$.next(promiseAction(new IncrementAction(0), 50));  /* OUTPUT> (restricted) */
  dispatcher$.next(observableAction(new IncrementAction(2), 70));  /* OUTPUT> counter: 4 */
  dispatcher$.next(new IncrementAction(-1)); /* OUTPUT> counter: 3 */
});



///////////////////////////////// Helper
function promiseAction(action: Action, timeout: number): Promise<Action> {
  return new Promise<Action>(resolve => {
    setTimeout(() => resolve(action), timeout);
  });
}

function observableAction(action: Action, timeout: number): Observable<Action> {
  return Observable.of(action).delay(timeout);
}
