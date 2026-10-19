import { Test } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { RecipesModule } from '../../src/recipes/recipes.module';

describe('Integration sample', () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        RecipesModule,
      ],
    }).compile();
  });

  afterEach(async () => {
    const collections = (await mongoose.connection.db?.collections()) ?? [];
    await Promise.all(collections.map((c) => c.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await mongod.stop();
  });

  it('DB en memoria arranca', () => {
    expect(true).toBe(true);
  });
});