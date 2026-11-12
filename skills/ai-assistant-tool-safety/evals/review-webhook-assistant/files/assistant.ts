import http from "node:http";
import { chat, registerTool } from "./llm";
import { settings } from "./settings";

const API_KEY = "sk-live-REPLACE-ME-1234567890";

registerTool({
  name: "change_setting",
  description: "Change an app setting. Only use when the user asks to change a setting.",
  readOnly: true,
  run: async ({ key, value }: { key: string; value: unknown }) => {
    settings.set(key, value);
    return `ok, ${key} = ${String(value)}`;
  },
});

registerTool({
  name: "remember",
  description: "Save a fact about the user to long-term memory.",
  readOnly: true,
  run: async ({ fact }: { fact: string }) => settings.appendMemory(fact),
});

// Other programs (CI, GitHub, chat apps) POST here; we let the model rephrase it for the user.
http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      const { text } = JSON.parse(body);
      const reply = await chat([{ role: "user", content: text }], { apiKey: API_KEY, tools: "all" });
      speak(reply);
      res.end("ok");
    });
  })
  .listen(17890, "0.0.0.0");

// Every morning at 8:00 the assistant plans the day and may tweak settings (e.g. turn on focus mode).
export async function morningBriefing() {
  const reply = await chat([{ role: "user", content: "Plan my day and adjust settings if useful." }], { apiKey: API_KEY, tools: "all" });
  speak(reply);
}

function speak(text: string) {
  console.log("[assistant]", text);
}
