/**
 * Generates public/sample-100teams-*.csv — 100 teams × 10 students (1,000 learners).
 * Run: node scripts/generate-100teams-sample.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

const PARENT = "Google DeepMind: AI Research Foundations ";
const FOCAL_COURSE = "Google DeepMind: 02 Represent Your Language Data";
const COURSE_URL = "https://www.skills.google/course_templates/1452";
const CONTENT_ID = "gcp-ondemand-content/T-REPLAN-I";
const PATH_ACTIVITY = "Google DeepMind: AI Research Foundations ";
const PATH_URL = "https://www.skills.google/paths/3135";
const PATH_CONTENT = "learning-paths-run/google-deepmind-ai-research-foundations";

const rosterLines = ["Email,Status,Role,Activities completed,Last active"];
const teamLines = ["Email,Team"];
const activityLines = [
  "Member,Activity,Activity Type,Passed,Given Score,Maximum Score,Date started,Date completed,Content ID,Learning time (minutes),Content Url,Parent Type,Parent Name",
];

for (let teamIdx = 1; teamIdx <= 100; teamIdx++) {
  const teamName = `Team ${String(teamIdx).padStart(2, "0")}`;
  for (let seat = 1; seat <= 10; seat++) {
    const id = (teamIdx - 1) * 10 + seat;
    const email = `student${String(id).padStart(4, "0")}@sample.tri-ai.test`;
    const day = 14 + ((id * 3) % 6);
    const lastActive = `2026-04-${String(day).padStart(2, "0")} ${String(10 + (id % 8)).padStart(2, "0")}:${String((id * 7) % 60).padStart(2, "0")}:00 UTC`;
    rosterLines.push(`${email},Active,Member,${id % 6},${lastActive}`);
    teamLines.push(`${email},${teamName}`);

    const pathMins = (15 + (id % 85) + (id % 7) * 0.1).toFixed(1);
    const pathDay = 14 + (id % 5);
    activityLines.push(
      `${email},${PATH_ACTIVITY},Path,false,,,2026-04-${String(pathDay).padStart(2, "0")} 09:30:00 UTC,,${PATH_CONTENT},${pathMins},${PATH_URL},,`,
    );

    const score = Math.min(0.98, 0.55 + ((id * 17) % 40) / 100).toFixed(6);
    const labMins = (8 + (id % 55) + 0.2 * (seat % 4)).toFixed(1);
    const startDay = 15 + (id % 4);
    activityLines.push(
      `${email},${FOCAL_COURSE},Course,false,${score},1.0,2026-04-${String(startDay).padStart(2, "0")} 11:${String((id * 5) % 60).padStart(2, "0")}:00 UTC,,${CONTENT_ID},${labMins},${COURSE_URL},Path,${PARENT}`,
    );
  }
}

fs.writeFileSync(path.join(publicDir, "sample-100teams-roster.csv"), rosterLines.join("\n") + "\n");
fs.writeFileSync(path.join(publicDir, "sample-100teams-teams.csv"), teamLines.join("\n") + "\n");
fs.writeFileSync(path.join(publicDir, "sample-100teams-activity.csv"), activityLines.join("\n") + "\n");

console.log(
  `Wrote ${rosterLines.length - 1} roster rows, ${teamLines.length - 1} team rows, ${activityLines.length - 1} activity rows.`,
);
