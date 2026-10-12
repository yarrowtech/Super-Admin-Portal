import { ESLint } from 'eslint';

const results = await new ESLint().lintFiles(['.']);
const rules = {};
for (const result of results) {
  for (const message of result.messages.filter((item) => item.severity === 2)) rules[message.ruleId || 'parse'] = (rules[message.ruleId || 'parse'] || 0) + 1;
}
console.log(JSON.stringify({ rules, files: results.filter((result) => result.errorCount).map((result) => ({
  file: result.filePath.split('frontend')[1],
  errors: result.messages.filter((message) => message.severity === 2).map((message) => ({ line: message.line, rule: message.ruleId, message: message.message.split('\n')[0] })),
})) }, null, 2));
