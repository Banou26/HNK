# HNK
The version 1 of the framework is accessible at https://js.fkn.app.
It is an outdated version and was an experiment to try to remake Vue 2's API using the latest technologies like
[Template Literal Tags](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals),
[Proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy),
ect, to make it lighter and able to run without a pre-transpilation step(mandatory to remove the use of 
[eval](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval)).

The v2 will be a version that focus on ease of use
(the API will mostly look like [react hooks](https://reactjs.org/docs/hooks-intro.html))
and performance, but in an modern and efficient way.
That efficiency will come from the use of the maximum amount of native APIs to reduce the work the framework has to do.
Of course, every set of feature we propose is completly optional,
you can use each part as a standalone library if you don't want the full  framework.

These APIs are :

- Userland code, The [WebWorker API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)

The entire framework will be split between the main thread(UI thread) only used for DOM and CSSOM related work, 
and multiple workers, them be [shared](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker) for multi-tab related code, 
or [dedicated](https://developer.mozilla.org/en-US/docs/Web/API/DedicatedWorkerGlobalScope) for each page logical code.

- GraphQL and cache, The [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

We will provide a set of ways to easily make PWAs, because we know it's hard make use of the cache API.
This will mainly be accompanied by an optimised system to use GraphQL schemas in your components to reduce bandwith consumption.

- Router, The [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API)

Obviously, with every framework come its router component, it'll take ideas from both react's router and vue's router.

- Templates

The templating part is a big part of the framework, 
everything is done at runtime, 
there's no pre-compilation step like in vue(eval remover) and react(mandatory for JSX).
It makes use of [template literal tags](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals), 
for every languages used, html, css, sass, pug, graphql, ect...


- [HTML Templating](https://github.com/Banou26/HNK/tree/master/packages/html)
- [CSS Templating](https://github.com/Banou26/HNK/tree/master/packages/css)
- [Pug Templating](https://github.com/Banou26/HNK/tree/master/packages/poz)
- [Sass Templating](https://github.com/Banou26/HNK/tree/master/packages/soz)

- [Components](https://github.com/Banou26/HNK/tree/master/packages/component)
- [Elements](https://github.com/Banou26/HNK/tree/master/packages/element)
- [Hooks](https://github.com/Banou26/HNK/tree/master/packages/hooks)
