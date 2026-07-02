const fs = require('fs');
const readline = require('readline');

const transcriptPath = 'C:\\Users\\Atul Pawar\\.gemini\\antigravity-ide\\brain\\d5991fbb-ec9b-48b7-b1b0-97c67491e03c\\.system_generated\\logs\\transcript.jsonl';

const fileStream = fs.createReadStream(transcriptPath);
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index >= 626) {
      if (obj.source === 'MODEL' && obj.type === 'PLANNER_RESPONSE') {
        console.log(`\n=== STEP ${obj.step_index} ===`);
        console.log(obj.content);
      } else if (obj.type === 'BROWSER_SUBAGENT' || obj.type === 'SYSTEM_MESSAGE') {
        console.log(`\n=== STEP ${obj.step_index} (${obj.type}) ===`);
        console.log(obj.content ? obj.content.substring(0, 500) : '');
      }
    }
  } catch (err) {
    // ignore
  }
});
