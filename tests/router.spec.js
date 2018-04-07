import { registerElement, Router, poz, RouterView } from '../src/index.js'

describe.skip('router', function () {
  let container, originalURL, routerComponent1, routerMountComponent, router
  before(function () {
    // originalURL = window.location.pathname
    // window.history.replaceState({}, '', '/')

    routerComponent1 = registerElement({
      name: 'router-component-1',
      template: _ => poz`div 1`
    })

    router = Router({
      routes: [
        {
          path: '/debug.html',
          component: routerComponent1
        }
      ]
    })

    routerMountComponent = registerElement({
      name: 'router-mount-component',
      template: _ => poz`router-view`,
      router
    })

    container = document.createElement(routerMountComponent.name)
    document.body.appendChild(container)
  })
  after(function () {
    // document.body.removeChild(container)
    // setTimeout(_ => window.history.replaceState({}, '', originalURL), 0)
    // window.history.replaceState({}, '', originalURL)
    // window.location.href = originalURL
  })
  it('render router-component-1 as only child of router-view', function (done) {
    const routerView = container.childNodes[0]
    expect(routerView).to.instanceOf(RouterView)
    console.log(router)
    console.log(router.currentRoute)
    console.log(router.matched)
    setTimeout(_ => {
      console.log(router)
      console.log(router.currentRoute)
      console.log(router.matched)
      done()
    //   console.log(routerView.childNodes[0])
    //   expect(routerView.childNodes[0]).to.instanceOf(routerComponent1)
    //   done()
    }, 0)
    // console.log([...routerView.childNodes])
    // expect(routerView.childNodes[0]).to.instanceOf(routerComponent1)
  })
})
