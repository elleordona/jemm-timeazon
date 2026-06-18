import test from 'node:test'
import request from 'supertest'
import app from '../server.js'

test('unknown route returns 404', async () => {
    await request(app)
        .get('/api/does-not-exist')
        .expect(404)
})
