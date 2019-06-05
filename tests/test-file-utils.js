const mock = require('mock-fs')
const fileUtils = require('../src/file-utils')

describe('fileUtils', () => {

  before(()=> {
    mock({
      'tmp/commands': {
        'command-group-1': {},
        'command-group-2': {
          'command-1': 'command 1 content',
          'properties': '{"url": "www.qatonic.com"}'
        },
        'file-not-parsed': 'groups should only be directories',
      },
      'tmp/runners': {
        'runner-group-1': {
          'runner-1': 'runner 1 content',
          'runner-2': 'runner 2 content',
          'a-dir': {}
        },
        'runner-group-2': {}
      },
      'other': {
        'random-dir-with-dirs-and-files': {
          'dir1': {},
          'dir2': {},
          'file1': '',
          'file2': '',
          'dir3': {}
        }
      }
    })
  })

  after(() => {
    mock.restore()
  })

  describe('#listDirs()', () => {
    it('retrieve directories', done => {
      fileUtils.listDirs('tmp', 'commands').then(files => {
        assert.deepEqual(files, ['command-group-1', 'command-group-2'])
        done()
      }).catch(done)
    })
  })

  describe('#listFiles()', () => {
    it('retrieve files', done => {
      fileUtils.listFiles('tmp', 'runners', 'runner-group-1').then(files => {
        assert.deepEqual(files, ['runner-1', 'runner-2'])
        done()
      }).catch(done)
    })
  })

  describe('#listContent()', () => {
    it('retrieve both files and directories', done => {
      fileUtils.listContent('tmp', 'runners', 'runner-group-1')
        .then(files => {
          assert.deepEqual(files, ['a-dir', 'runner-1', 'runner-2'])
          done()
        })
        .catch(done)
    })
  })

  describe('#readFile()', () => {
    it('retrieve property file', done => {
      fileUtils.readFile('properties', 'tmp', 'commands', 'command-group-2')
        .then(data => {
          assert.deepEqual(data, '{"url": "www.qatonic.com"}')
          done()
        })
        .catch(done)
    })
  })

  describe('#_listDirContent', () => {

    it('throw when no path is provided', done => {
      fileUtils._listDirContent()
        .then(() => done(new Error('expected method to reject.')))
        .catch(err => {
          assert.equal(err, 'Need to specify search path')
          done()
        }).catch(done)
    })

    it('retrieve both files and dirs', done => {
      const listDirs = true, listFiles = true
      fileUtils._listDirContent(listDirs, listFiles, 'other', 'random-dir-with-dirs-and-files')
        .then(data => {
          assert.isArray(data)
          assert.lengthOf(data, 5)
          done()
        })
        .catch(done)
    })

    it('retrieve files only', done => {
      const listDirs = false, listFiles = true
      fileUtils._listDirContent(listDirs, listFiles, 'other', 'random-dir-with-dirs-and-files')
        .then(data => {
          assert.isArray(data)
          assert.lengthOf(data, 2)
          done()
        })
        .catch(done)
    })

    it('retrieve directories only', done => {
      const listDirs = true, listFiles = false
      fileUtils._listDirContent(listDirs, listFiles, 'other', 'random-dir-with-dirs-and-files')
        .then(data => {
          assert.isArray(data)
          assert.lengthOf(data, 3)
          done()
        })
        .catch(done)
    })


  })


})
