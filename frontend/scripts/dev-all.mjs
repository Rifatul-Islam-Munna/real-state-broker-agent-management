import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const frontendDirectory = path.resolve(scriptDirectory, "..")
const operationsDirectory = path.resolve(frontendDirectory, "../nestjs-backend")
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm"

const processes = [
  spawn(npmCommand, ["run", "dev:frontend"], {
    cwd: frontendDirectory,
    stdio: "inherit",
  }),
  spawn(npmCommand, ["run", "start:dev"], {
    cwd: operationsDirectory,
    stdio: "inherit",
  }),
]

let stopping = false

function stop(exitCode = 0) {
  if (stopping) return
  stopping = true
  for (const child of processes) {
    if (!child.killed) child.kill("SIGTERM")
  }
  process.exitCode = exitCode
}

for (const child of processes) {
  child.on("error", (error) => {
    console.error("Could not start a development service:", error.message)
    stop(1)
  })
  child.on("exit", (code) => {
    if (!stopping && code !== 0) stop(code ?? 1)
  })
}

process.on("SIGINT", () => stop(0))
process.on("SIGTERM", () => stop(0))
