import { Test } from "@nestjs/testing";
import { MongooseModule } from "@nestjs/mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

describe('Integration sample', () => {
    let mongod: MongoMemoryServer;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();

        await Test.createTestingModule({
            imports: [
                MongooseModule.forRoot(uri),
            ]
        }).compile();
    });


    afterEach(async () => {
        const collections = await mongoose.connection.db?.collections();
        await Promise.all(collections?.map((collection) => collection.deleteMany({})) || []);
    });
    afterAll(async () => {
        await mongoose.connection.close();
        await mongod.stop();

    });

    it('should run', () => {
        expect(true).toBe(true);
    });
});

