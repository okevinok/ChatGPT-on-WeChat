import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";
import { getGptSummary } from "./openai";

dotenv.config();

/**
 * The API key for accessing the Dify.ai API.
 */
const apiKey = process.env.DIFY_API_KEY;

/**
 * The file path of the text file to be summarized.
 */
const filePath = process.argv[2];

if (!filePath) {
  console.log("Please provide a file path.");
  process.exit(1);
}
if (!fs.existsSync(filePath)) {
  console.log("The file path provided does not exist.");
  process.exit(1);
}

/**
 * The content of the text file to be summarized.
 */
const fileContent = fs.readFileSync(filePath, "utf-8");

/**
 * The raw data to be sent to the Dify.ai API.
 */
const raw = JSON.stringify({
  inputs: {},
  query: `<input>${fileContent}</input>`,
  response_mode: "blocking",
  user: "abc-123",
});

/**
 * Sends a request to the Dify.ai API to summarize the text file.
 */
const run = async () => {
  console.log("Summarizing...\n\n\n");

  try {
    const result = await getGptSummary(fileContent)
    // const result = res.data.answer.replace(/\n\n/g, "\n").trim();
    console.log(result);
  } catch (e: any) {
    console.error("Error:" + e.message);
  }
};
run();
