import { ethers } from "hardhat";
import request from "supertest";
import { app } from "../src/app";

describe("App tests", () => {
  it('runs the app', async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
  })
})
