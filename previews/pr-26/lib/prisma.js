import { PrismaClient } from "@prisma/client";
let client;
export function getPrismaClient() {
    if (!client) {
        client = new PrismaClient();
    }
    return client;
}
