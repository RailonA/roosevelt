/* eslint-env mocha */

const assert = require('assert')
const appCleaner = require('./util/cleanupTestApp')
const { fork } = require('child_process')
const fs = require('fs-extra')
const generateTestApp = require('./util/generateTestApp')
const path = require('path')
const request = require('supertest')

describe('form pages', function () {
  const appDir = path.join(__dirname, 'app/errorPages')
  // options to pass into test app generator
  const options = { rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true }

  beforeEach(function (done) {
    // copy the mvc directory into the test app directory for each test
    fs.copySync(path.join(__dirname, './util/mvc'), path.join(appDir, 'mvc'))
    done()
  })

  // afterEach(done => {
  //   (async () => {
  //     // wipe out the test app directory
  //     await appCleaner('sourceParams')

  //     done()
  //   })()
  // })

  it.only('should render the form test page', function (done) {
    // this.timeout(90000)
    // generate the test app
    generateTestApp({
      appDir,
      makeBuildArtifacts: true,
      viewEngine: [
        'html: teddy'
      ],
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app starts and sends a message back to the parent try and request the test page
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .get('/form')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.send('stop')
          }
          // test that the values rendered on the page are correct
          const test1 = res.text.includes('CSRF Test')
          const test2 = res.text.includes('Login Form')
          const test3 = res.text.includes('User Name:')
          const test4 = res.text.includes('Password:')
          assert.strictEqual(test1, true)
          assert.strictEqual(test2, true)
          assert.strictEqual(test3, true)
          assert.strictEqual(test4, true)
          testApp.send('stop')
        })

      //   when the child process exits, finish the test
      testApp.on('exit', () => {
        done()
      })
    })
  })
})
