const path = require('path')
const fs = require('fs')
const util = require('util')
const readFile = util.promisify(fs.readFile)
const readdir = util.promisify(fs.readdir)
const lstat = util.promisify(fs.lstat)

class FileUtils {

  listDirs(...dirs) {
    const listDirs = true, listFiles = false
    return this._listDirContent(listDirs, listFiles, ...dirs)
  }

  listFiles(...dirs) {
    const listDirs = false, listFiles = true
    return this._listDirContent(listDirs, listFiles, ...dirs)
  }

  listContent(...dirs) {
    const listDirs = true, listFiles = true
    return this._listDirContent(listDirs, listFiles, ...dirs)
  }

  readFile(file, ...dirs) {
    const paths = []
    dirs.forEach(d => paths.push(d))
    paths.push(file)
    const fullPath = path.join.apply(this, paths)

    return new Promise((resolve, reject) => {
      readFile(fullPath)
        .then(data => resolve(data.toString('utf8')))
        .catch(err => reject(err))
    })
  }

  _listDirContent(listDirs = true, listFiles = true, ...dirs) {
    const paths = []
    for(let i = 0; i !== dirs.length; i++)
      paths.push(dirs[i])

    const fullPath = path.join.apply(this, paths)

    return new Promise((resolve, reject) => {
      if(fullPath === '.')
        reject('Need to specify search path')

      readdir(fullPath)
        .then(files => {
          const files_ = []

          const promiseArr = files.map(f => {
            const filename = path.join(fullPath, f)
            return lstat(filename)
              .then(stat => {
                if(stat.isDirectory()) {
                  if(listDirs)
                    files_.push(f)
                } else {
                  if(listFiles)
                    files_.push(f)
                }
              })
          })
          Promise.all(promiseArr).then(() => resolve(files_))
        })
        .catch(err => reject(err))
    })
  }
}

module.exports = new FileUtils()
