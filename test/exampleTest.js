import { expect } from 'chai';
import supertest from 'supertest';
import app from '../server.js';


const request = supertest(app);

describe('Tests API', () => {
    it('devrait retourner 200 sur GET /', async () => {
        const response = await request.get('/');
        expect(response.status).to.equal(200);
    });
});