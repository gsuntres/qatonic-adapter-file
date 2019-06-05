const path = require('path')
const util = require('util')
const _ = require('lodash')
const fileUtils = require('./file-utils')
const readFile = util.promisify(require('fs').readFile)
const {
  AdapterBase,
  Command,
  Runner,
  display
} = require('@qatonic/core')

class AdapterFile extends AdapterBase {

  constructor(project, env) {
    super(project, env)
    this._name = 'File'
  }

  commandGroups() {
    return fileUtils.listDirs(this._project, this.commandsDir)
  }

  runnerGroups() {
    return fileUtils.listDirs(this._project, this.runnersDir)
  }

  commands(commandGroup) {
    return this._excludeProperties(this._listNoExt(fileUtils.listFiles(this._project, this.commandsDir, commandGroup)))
  }

  context() {
    let context = {}

    return new Promise(async (resolve, reject) => {
      const files = await this._listNoExt(fileUtils.listFiles(this.varsPath))
      const getFilesPromises = []
      files.forEach(f => getFilesPromises.push(fileUtils.readFile(`${f}.json`, this.varsPath)))
      Promise.all(getFilesPromises)
        .then(vars => {
          try {
            vars.forEach(v => context = Object.assign(context, JSON.parse(v)))
          } catch(err) {
            reject(err)
          }
          resolve(context)
        }).catch(reject)
    })
  }

  runners(runnerGroup) {
    return this._listNoExt(fileUtils.listFiles(this._project, this.runnersDir, runnerGroup))
  }

  command(qualifier) {
    return new Promise(async (resolve, reject) => {
      try {
        const fileContent = await fileUtils.readFile(`${qualifier.name}.json`, this._project, this.commandsDir, qualifier.group)
        const o = JSON.parse(fileContent)
        // add group and name
        o['group'] = qualifier.group
        o['name'] = qualifier.name
        const c = Command.parse(o)
        resolve(c)
      } catch(err) {
        reject(err)
      }
    })
  }

  runner(qualifier) {
    return new Promise(async (resolve, reject) => {
      const {
        group,
        name
      } = qualifier

      try {
        const runner = new Runner(group, name)
        const runnerContent = await fileUtils.readFile(`${name}.json`, this._project, this.runnersDir, group)
        const runnerObj = JSON.parse(runnerContent)

        const steps = _.get(runnerObj, 'steps')
        if(!_.isArray(steps)) {
          return reject(`steps in ${runner} need to be an array.`)
        }

        steps.forEach(s => runner.addStep(s))

        resolve(runner)
      } catch(err) {
        reject(err.message)
      }
    })
  }

  properties(pluginName, commandGroup = undefined) {
    if(typeof pluginName === 'undefined') {
      throw new Error('Plugin name is required')
    }

    let props = ''
    return new Promise(async resolve => {
      // 1. check in envs
      try {
        display.vv('Checking for any global properties.json.')
        const globalProps = await fileUtils.readFile('properties.json', this._project, 'envs', this._env)
        props = JSON.parse(globalProps)[pluginName]
      } catch(err) {
        display.vv('No global properties! Keep looking...')
        // swallow when file not found
        if(err.code !== 'ENOENT') throw new Error(`Environment properties: ${err.message}`)
      }

      // 2. check in command group
      if(typeof commandGroup !== 'undefined') {
        display.vv(`Checking for properties.json in ${commandGroup}`)
        try {
          const groupProps = await fileUtils.readFile('properties.json', this._project, 'commands', commandGroup)
          props = Object.assign(props, JSON.parse(groupProps))
        } catch(err) {
          // swallow when file not found
          display.vv('No properties there either!')
          if(err.code !== 'ENOENT') throw new Error(`Group properties: ${err.message}`)
        }
      }

      resolve(props)
    })
  }

  config(name = 'qatonic') {
    return new Promise(async (resolve, reject) => {
        try {
          const configPath = path.join(this._project, `${name}.json`)
          display.vv(`loading configuration from ${configPath}`)
          const data = await readFile(configPath)
          const mergedProps = this._mergeConfigProps(JSON.parse(data.toString('utf8')))
          resolve(mergedProps)
        } catch(err) {
          reject(err.message)
        }
    })
  }

  _listNoExt(promise) {
    return new Promise((resolve, reject) => {
      promise
        .then(files => {
          const arr_ = []
          for(let i = 0; i !== files.length; i++) {
            const f = files[i]
            let basename
            try {
              if(path.extname(f) !== '.json') throw new Error()
              basename = path.basename(f, '.json')
              arr_.push(basename)
            } catch(err) {
              reject(`\`${f}\` is not a json file`)
            }
          }
          resolve(arr_)
        })
        .catch(err => reject(err))
    })
  }

  get commandsDir() {
    return 'commands'
  }

  get runnersDir() {
    return 'runners'
  }

  get varsDir() {
    return 'vars'
  }

  get envsDir() {
    return 'envs'
  }

  get varsPath() {
    return path.join(this._project, this.envsDir, this._env, this.varsDir)
  }
}

module.exports = AdapterFile
