import test from 'node:test'
import assert from 'node:assert'
import request from 'supertest'
import app from '../server.js'

test('healthcheck returns status ok', async () => {
    const response = await request(app)
        .get('/api/healthcheck')

    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.body.status, 'ok')
})
