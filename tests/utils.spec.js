import { cloneObject } from '../src/index.js'

describe('utils', function () {
  describe('cloneObject', function () {
    const object = {
      a: 1,
      b: 2,
      get c () { return this.a + this.b },
      d: []
    }
    const array = [1, 2, 3, object]
    const map = new Map([[0, array], [1, object]])
    const set = new Set([1, 2, 3, object, array, map])
    array.push(map, set, array)
    map.set(object, map)
    map.set(array, set)
    set.add(set)
    object.object = object
    object.array = array
    object.map = map
    object.set = set
    it('clone objects, arrays, maps, sets', function () {
      const clone = cloneObject(object)
      const { object: cObject, array: cArray, map: cMap, set: cSet } = clone

      expect(clone).to.eql(object)
      expect(array).to.eql(cArray)
      expect(map).to.eql(cMap)
      expect(set).to.eql(cSet)

      expect(cObject).to.not.equal(object)
      expect(cArray).to.not.equal(array)
      expect(cMap).to.not.equal(map)
      expect(cSet).to.not.equal(set)

      expect(cObject.object).to.equal(cObject)
      expect(cObject.array).to.equal(cArray)
      expect(cObject.map).to.equal(cMap)
      expect(cObject.set).to.equal(cSet)

      expect(cArray[3]).to.equal(clone)
      expect(cArray[6]).to.equal(cArray)
      expect(cArray[4]).to.equal(cMap)
      expect(cArray[5]).to.equal(cSet)

      expect(cMap.get(1)).to.equal(cObject)
      expect(cMap.get(0)).to.equal(cArray)
      expect(cMap.get(cObject)).to.equal(cMap)
      expect(cMap.get(cArray)).to.equal(cSet)

      expect([...cSet][3]).to.equal(cObject)
      expect([...cSet][4]).to.equal(cArray)
      expect([...cSet][5]).to.equal(cMap)
      expect([...cSet][6]).to.equal(cSet)
    })
  })
})
