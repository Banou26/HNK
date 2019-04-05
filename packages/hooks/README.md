# Hooks

## Introduction

Hooks are based on [React](https://reactjs.org/) [Hooks](https://reactjs.org/docs/hooks-intro.html) and [RxJS](https://github.com/ReactiveX/rxjs) [observables](https://github.com/tc39/proposal-observable)

```js
import { withHooks, useState, useEffect } from 'hnk'

const observable = withHooks(() => {
  const [ count, setCount ] = useState(0)
  
  withEffect(() => {
    const interval = setInterval(() => setCount(count => count + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  return count
})

observable.subscribe(value => console.log(value))
```
