import test from 'node:test'
import assert from 'node:assert'
import request from 'supertest'
import app from '../server.js'

test('GET /api/healthcheck returns ok', async () => {
    const response = await request(app)
        .get('/api/healthcheck')
        .expect(200)

    assert.deepStrictEqual(response.body, {
        status: 'ok'
    })
})
