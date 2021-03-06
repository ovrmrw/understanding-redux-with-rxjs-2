import { Subject } from 'rxjs';


class Increment {
  constructor() { }
  value;
}

class Decrement {
  constructor() { }
  value;
}

type Action = Increment | Decrement;


const dispatcher = new Subject<Action>();

const num: number = 0;


dispatcher.scan((state, action) => {
  if (action instanceof Increment) {
    return state + 1;
  } else {
    return state;
  }
}, num);


dispatcher.next(new Increment());
