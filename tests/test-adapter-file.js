const mock = require('mock-fs')
const AdapterFile = require('../src/adapter-file')
const { Qualifier } = require('@qatonic/core')

const COMMAND_G1_C1_PROPS = {
  prop1: 'v1',
  prop2: 'v2'
}
const COMMAND_G1_C1_PROPS_STR = JSON.stringify(COMMAND_G1_C1_PROPS)
const COMMAND_G1_C1 = {
  group: 'command-group-1',
  name: 'command-1',
  plugin: 'plgin',
  props: COMMAND_G1_C1_PROPS_STR
}

const COMMAND_G2_C1_PROPS = {
  prop3: 'v3',
  prop4: 'v4'
}
const COMMAND_G2_C1_PROPS_STR = JSON.stringify(COMMAND_G2_C1_PROPS)
const COMMAND_G2_C1 = {
  group: 'command-group-2',
  name: 'command-1',
  plugin: 'plgin',
  props: COMMAND_G2_C1_PROPS_STR
}

const RUNNER_G1_RUN_1 = {
  steps: [
    {
      type: 'http',
      props: { prop1: 'my prop 1' }
    },{
      type: 'http',
      props: { prop2: 'my prop 2' }
    },{
      type: 'http',
      props: { prop3: 'my prop 3' }
    }
  ]
}
const RUNNER_G1_RUN_1_STR = JSON.stringify(RUNNER_G1_RUN_1)

const RUNNER_G1_RUN_2 = {
  steps: [
    {
      type: 'http',
      props: { prop1: 'my prop 1' }
    }
  ]
}
const RUNNER_G1_RUN_2_STR = JSON.stringify(RUNNER_G1_RUN_2)

describe('AdapterFile', () => {

  before(()=> {
    mock({
      'tmp': {
        'commands': {
          'command-group-1': {
            'command-1.json': JSON.stringify(COMMAND_G1_C1),
            'properties.json': '{"timeout":1200}'
          },
          'command-group-2': {
            'command-1.json': JSON.stringify(COMMAND_G2_C1),
            'properties.json': '{"url": "www.qatonic.com","timeout":1200}'
          },
          'file-not-parsed': 'groups should only be directories'
        },
        'runners': {
          'runner-group-1': {
            'runner-1.json': RUNNER_G1_RUN_1_STR,
            'runner-2.json': RUNNER_G1_RUN_2_STR
          },
          'runner-group-2': {}
        },
        'envs' : {
          'devel': {
            'properties.json': '{"plgin":{"url":"devel-props.qatonic.com"}}',
            'vars': {'misc.json': '{"var1":"valueofvar1","var2":"valueofvar2"}'}
          },
          'other-env': {
            'properties.json': '"plgin":{"url": "other-env-props.qatonic.com"}',
            'vars': {
              'misc.json': '{"var3":"valueofvar3","var4":"valueofvar4"}',
              'mygrp.json': '{"var5":"valueofvar5","var6":"valueofvar6"}'
            }
          }
        },
        'qatonic.json': '{"runners":["group1.runner1"]}',
        'qatonic-other.json': '{"runners":["group1.runner1"], "ignore":["group2.runner1"]}'
      }
    })

    this.loader = new AdapterFile('tmp')
  })

  after(() => mock.restore())

  describe('#commandGroups()', () => {
    it('retrieve command groups', done => {
      this.loader.commandGroups().then(files => {
        assert.deepEqual(files, ['command-group-1', 'command-group-2'])
        done()
      }).catch(done)
    })
  })

  describe('#runnerGroups()', () => {
    it('retrieve runner groups', done => {
      this.loader.runnerGroups().then(files => {
        assert.deepEqual(files, ['runner-group-1', 'runner-group-2'])
        done()
      }).catch(done)
    })
  })

  describe('#commands()', () => {
    it('retrieve commands', done => {
      this.loader.commands('command-group-2').then(files => {
        assert.deepEqual(files, ['command-1'])
        done()
      }).catch(done)
    })
  })

  describe('#command()', () => {

    it('load command', done => {
      const q = Qualifier.parse('command-group-1.command-1')
      this.loader.command(q)
        .then(c => {
          assert.strictEqual(c.qualifier.group, 'command-group-1')
          assert.strictEqual(c.qualifier.name, 'command-1')
          assert.strictEqual(c.plugin, 'plgin')
          assert.strictEqual(c.props._raw, COMMAND_G1_C1_PROPS_STR)
          done()
        }).catch(done)
    })
  })

  describe('#runner()', () => {

    it('load runner', done => {
      const q = Qualifier.parse('runner-group-1.runner-1')
      this.loader.runner(q)
        .then(r => {
          assert.lengthOf(r.steps, 3)
          done()
        }).catch(done)
    })

    it('reject for unknown runner', done => {
      this.loader.runner(Qualifier.parse('g.r'))
        .then(() => done(new Error('expected method to reject.')))
        .catch(err => {
          assert.isDefined(err)
          assert.equal(err, 'ENOENT, no such file or directory \'tmp/runners/g/r.json\'')
          done()
        })
      })
  })

  describe('#runners()', () => {
    it('retrieve runners', done => {
      this.loader.runners('runner-group-1').then(files => {
        assert.deepEqual(files, ['runner-1', 'runner-2'])
        done()
      }).catch(done)
    })
  })

  describe('#properties()', () => {
    it('use commandGroup\'s properties', done => {
      this.loader.properties('plgin', 'command-group-2')
        .then(props => {
          assert.deepEqual(props, {
            url: 'www.qatonic.com',
            timeout: 1200
          })
          done()
        })
        .catch(done)
    })

    it('use commandGroup\'s properties and global\'s one', done => {
      this.loader.properties('plgin', 'command-group-1')
        .then(props => {
          assert.deepEqual(props, {
            url: 'devel-props.qatonic.com',
            timeout: 1200
          })
          done()
        }).catch(done)
    })
  })

  describe('#context()', () => {

    it('load vars', done => {
      this.loader.context()
        .then(ctx => {
          assert.deepEqual(ctx, {
            var1:'valueofvar1',
            var2:'valueofvar2'
          })
          done()
        }).catch(done)
    })

    it('load other env\'s context', done => {
      const loader = new AdapterFile('tmp', 'other-env')
      loader.context()
        .then(ctx => {
          assert.deepEqual(ctx, {
            var3:'valueofvar3',
            var4:'valueofvar4',
            var5:'valueofvar5',
            var6:'valueofvar6'
          })
          done()
        }).catch(done)
    })

  })

  describe('#command()', () => {

    it('retrieve command by qualifier', done => {
      const q = Qualifier.parse('command-group-2.command-1')
      this.loader.command(q)
        .then(c => {
          assert.strictEqual(c.qualifier.group, 'command-group-2')
          assert.strictEqual(c.qualifier.name, 'command-1')
          assert.strictEqual(c.plugin, 'plgin')
          assert.strictEqual(c.props._raw, COMMAND_G2_C1_PROPS_STR)
          done()
        })
        .catch(done)
    })

  })

  describe('#_listNoExt()', () => {

    it('remove json extension', (done) => {
      const files = [
        'filename1.json',
        'filename2.json'
      ]
      const p = new Promise(res => res(files))
      this.loader._listNoExt(p)
        .then(list => {
          assert.deepEqual(list, ['filename1', 'filename2'])
          done()
        })
        .catch(done)
    })

    it('throw when a file is not a json', (done) => {
      const files = [
        'filename1.json',
        'filename2.yaml'
      ]
      const p = new Promise(res => res(files))
      this.loader._listNoExt(p)
        .then(() => done(new Error('expected method to reject.')))
        .catch(err => {
          assert.isDefined(err)
          assert.equal(err, '`filename2.yaml` is not a json file')
          done()
        })
        .catch(done)
    })
  })

  describe('#config()', () => {

    it('load default', done => {
      this.loader.config()
        .then(c => {
          assert.deepEqual(c, {
            ignore: [],
            runners: ['group1.runner1']
          })
          done()
        }).catch(done)
    })

    it('load specific', done => {
      this.loader.config('qatonic-other')
        .then(c => {
          assert.deepEqual(c, {
            ignore: ['group2.runner1'],
            runners: ['group1.runner1']
          })
          done()
        }).catch(done)
    })

    it('throw when not found', done => {
      this.loader.config('nonexistingconfig')
        .then(() => done(new Error('expected method to reject.')))
        .catch(err => {
          assert.isDefined(err)
          assert.equal(err, 'ENOENT, no such file or directory \'tmp/nonexistingconfig.json\'')
          done()
        })
    })
  })

})
