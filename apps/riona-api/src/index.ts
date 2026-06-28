import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helloRouter from "./routes/hello";

dotenv.config();

app.use(express.json());

// Routes
app.use("/hello", helloRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});