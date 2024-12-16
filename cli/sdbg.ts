import { homedir } from "node:os";
import { spawn } from "node:child_process";
import DebugSession from "@/lib/debug-session";

const engineBaseDir = `${homedir()}/.solidity-ide`;
const dotNetExePath = `${engineBaseDir}/engine/dotnet`;
const sdbgDllPath = `${engineBaseDir}/engine/SolidityDebugger.dll`;

const projectPath = `${homedir()}/SolidityProjects/MyContract3`;
const contractName = "basicTest";

const processExe = dotNetExePath;
const processArgs = [sdbgDllPath, "-P", projectPath, "-C", contractName];

const main = async () => {
  const sdbg = spawn(processExe, processArgs, {
    cwd: engineBaseDir,
  });

  const debugSession = new DebugSession();
  debugSession.start(sdbg.stdout, sdbg.stdin);

  const initializeResponse = await debugSession.sendInitializeRequest({
    adapterID: "walnut-lite",
  });
  console.log("initializeResponse", initializeResponse);

  const configurationDoneResponse =
    await debugSession.sendConfigurationDoneRequest();
  console.log("configurationDoneResponse", configurationDoneResponse);

  const launchResponse = await debugSession.sendLaunchRequest({
    program: `${projectPath}/contracts-dbg/basicTest/basicTest.t.sol`,
    stopOnEntry: true,
    trace: true,
  });
  console.log("launchResponse", launchResponse);

  const {
    body: { threadId },
  } = await debugSession.waitForThread();
  console.log("threadId", threadId);

  debugSession.on("close", () => {
    console.log("Debug session closed");
  });

  for (let step = 0; true; ++step) {
    const variables = await debugSession.getVariables(threadId);
    console.log("LOCAL VARIABLES:", variables.local);
    console.log("STATE VARIABLES:", variables.state);
    await debugSession.sendStepInRequest({
      threadId,
    });
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
